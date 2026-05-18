import { resolveTask } from '../tasks';
import { loadConfig, writeConfig, isManagerActive, requireManager, configPath, AitaskConfig, ManagerConfig } from '../config';
import * as path from 'path';
import { spawn } from 'child_process';

function parseCommandTemplate(template: string, vars: Record<string, string>): { command: string; args: string[] } {
  let cmd = template;
  for (const [key, val] of Object.entries(vars)) {
    cmd = cmd.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }

  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  for (const ch of cmd) {
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (ch === ' ' && !inQuote) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);

  return { command: parts[0] || '', args: parts.slice(1) };
}

export function managerCommand(
  args: string[],
  flags: Record<string, string | boolean>,
): void {
  const sub = args[0];

  if (!sub || sub === 'help') {
    console.log(`
Usage: aitask manager <subcommand> [options]

Subcommands:
  set <id> --env <ENV_NAME> [--name "<name>"]
  show
  verify
  contact set-command -- <command>
  contact show
  contact test
  call <id> --message "<msg>"
  call <id> --transition <name> --report <path>
`);
    return;
  }

  switch (sub) {
    case 'set':
      managerSetCommand(args.slice(1), flags);
      break;
    case 'show':
      managerShowCommand();
      break;
    case 'verify':
      managerVerifyCommand();
      break;
    case 'contact':
      managerContactCommand(args.slice(1), flags);
      break;
    case 'call':
      managerCallCommand(args.slice(1), flags);
      break;
    default:
      console.error(`Error: Unknown manager subcommand "${sub}".`);
      console.error('Usage: aitask manager <set|show|verify|contact|call>');
      process.exit(1);
  }
}

function managerSetCommand(
  args: string[],
  flags: Record<string, string | boolean>,
): void {
  const id = args[0];
  if (!id) {
    console.error('Error: Manager ID required');
    console.error('Usage: aitask manager set <id> --env <ENV_NAME> [--name "<name>"]');
    process.exit(1);
  }

  const envName = flags.env as string | undefined;
  if (!envName) {
    console.error('Error: --env <ENV_NAME> is required');
    process.exit(1);
  }

  const name = flags.name as string | undefined;
  const config: AitaskConfig = {
    manager: {
      env: envName,
      id,
      name,
    },
  };

  writeConfig(config);
  const cfgPath = configPath();
  console.log(`Manager configuration written to ${cfgPath}`);
  console.log(`  id: ${id}`);
  console.log(`  env: ${envName}`);
  if (name) console.log(`  name: ${name}`);
}

function managerShowCommand(): void {
  const config = loadConfig();
  if (!config.manager) {
    console.log('No manager configured.');
    return;
  }

  console.log('Manager configuration:');
  console.log(`  id: ${config.manager.id}`);
  console.log(`  env: ${config.manager.env}`);
  if (config.manager.name) console.log(`  name: ${config.manager.name}`);
  if (config.manager.contact?.command) {
    console.log(`  contact command: ${config.manager.contact.command}`);
  }

  const active = isManagerActive(config);
  console.log(`  active: ${active ? 'yes' : 'no'}`);
}

function managerVerifyCommand(): void {
  const config = loadConfig();
  const ok = isManagerActive(config);
  if (ok) {
    console.log('Manager is active.');
    process.exit(0);
  } else {
    if (!config.manager?.env || !config.manager?.id) {
      console.error('Manager not configured.');
    } else {
      console.error(`Manager is NOT active. Set ${config.manager.env}=${config.manager.id} in environment.`);
    }
    process.exit(1);
  }
}

function managerContactCommand(
  args: string[],
  flags: Record<string, string | boolean>,
): void {
  const sub = args[0];

  if (!sub || sub === 'help') {
    console.log(`
Usage: aitask manager contact <subcommand>

Subcommands:
  set-command -- <command>    Set contact command (use -- to separate)
  show                        Show contact command
  test                        Test contact command
`);
    return;
  }

  switch (sub) {
    case 'set-command': {
      const cmdArgs = args.slice(1);
      if (cmdArgs.length === 0) {
        console.error('Error: Contact command required.');
        console.error('Usage: aitask manager contact set-command -- <command>');
        console.error('Example: aitask manager contact set-command -- airelay prompt "{{manager.id}}" "{{message}}"');
        process.exit(1);
      }
      const command = cmdArgs.join(' ');
      const config = loadConfig();
      if (!config.manager) {
        console.error('Error: Configure manager first with "aitask manager set"');
        process.exit(1);
      }
      if (!config.manager.contact) config.manager.contact = {};
      config.manager.contact.command = command;
      writeConfig(config);
      console.log('Contact command set.');
      break;
    }
    case 'show': {
      const config = loadConfig();
      const cmd = config.manager?.contact?.command;
      if (cmd) {
        console.log(`Contact command: ${cmd}`);
      } else {
        console.log('No contact command configured.');
      }
      break;
    }
    case 'test': {
      const config = loadConfig();
      const cmd = config.manager?.contact?.command;
      if (!cmd) {
        console.error('Error: No contact command configured.');
        process.exit(1);
      }
      if (!config.manager?.id) {
        console.error('Error: Manager not configured.');
        process.exit(1);
      }
      const parsed = parseCommandTemplate(cmd, {
        'manager.id': config.manager.id,
        message: '__test_message__',
      });
      console.log(`Would execute: ${parsed.command} ${parsed.args.join(' ')}`);
      console.log('Test OK — command would be called with test message.');
      break;
    }
    default:
      console.error(`Error: Unknown contact subcommand "${sub}".`);
      process.exit(1);
  }
}

function managerCallCommand(
  args: string[],
  flags: Record<string, string | boolean>,
): void {
  const id = args[0];
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask manager call <id> --message "<msg>"');
    console.error('       aitask manager call <id> --transition <name> --report <path>');
    process.exit(1);
  }

  const config = loadConfig();
  if (!config.manager?.contact?.command) {
    console.error('Error: No contact command configured. Use "aitask manager contact set-command" first.');
    process.exit(1);
  }
  if (!config.manager?.id) {
    console.error('Error: Manager not configured. Use "aitask manager set" first.');
    process.exit(1);
  }

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  const message = flags.message as string | undefined;
  const transition = flags.transition as string | undefined;
  const report = flags.report as string | undefined;

  let callMessage: string;
  if (transition) {
    callMessage = `${id}_${transition}`;
    if (report) {
      const resolvedReport = path.resolve(report);
      callMessage += ` report=${resolvedReport}`;
    }
  } else if (message) {
    callMessage = `${id}_message ${message}`;
  } else {
    console.error('Error: Provide --message "<msg>" or --transition <name> [--report <path>]');
    process.exit(1);
  }

  const parsed = parseCommandTemplate(config.manager.contact.command, {
    'manager.id': config.manager.id,
    message: callMessage,
  });

  console.log(`Calling manager for task ${id}...`);
  console.log(`  command: ${parsed.command}`);
  console.log(`  args: ${parsed.args.join(' ')}`);

  const child = spawn(parsed.command, parsed.args, {
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', (err) => {
    console.error(`Error: Failed to execute contact command: ${err.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Contact command exited with code ${code}`);
      process.exit(code || 1);
    }
  });
}
