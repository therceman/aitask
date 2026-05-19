#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { initCommand } from './commands/init';
import { createCommand } from './commands/create';
import { listCommand } from './commands/list';
import { doneCommand } from './commands/done';
import { validateCommand } from './commands/validate';
import { templatesCommand } from './commands/templates';
import { startCommand } from './commands/start';
import { reviewCommand } from './commands/review';
import { reworkCommand } from './commands/rework';
import { blockCommand } from './commands/block';
import { unblockCommand } from './commands/unblock';
import { queueCommand } from './commands/queue';
import { auditCommand } from './commands/audit';
import { supersedeCommand } from './commands/supersede';
import { readyCommand } from './commands/ready';
import { showCommand } from './commands/show';
import { pathCommand } from './commands/path';
import { rulesCommand } from './commands/rules';
import { managerCommand } from './commands/manager';
import { checklistCommand } from './commands/checklist';

interface ParseResult {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

const LEGACY_COMMANDS: Record<string, string> = {
  publish: "publish is removed. Use: aitask ready <id> to move backlog->ready",
  assign: "assign is removed. Assignee tracking is not part of ADR-001.",
  reject: "reject is removed. Use: aitask rework <id> --reason '<reason>'",
};

const KNOWN_COMMANDS = [
  'init', 'create', 'list', 'done', 'validate', 'templates', 'help',
  'start', 'review', 'rework', 'block', 'unblock', 'supersede', 'queue', 'audit',
  'ready', 'show', 'path', 'rules', 'manager',
  'checklist',
];

function parseArgs(argv: string[]): ParseResult {
  const args = argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    return { command: 'help', args: [], flags: {} };
  }

  if (command === '--version' || command === '-v') {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    console.log(`aitask v${pkg.version}`);
    process.exit(0);
  }

  if (command in LEGACY_COMMANDS) {
    console.error(`Error: ${LEGACY_COMMANDS[command]}`);
    process.exit(1);
  }

  if (!KNOWN_COMMANDS.includes(command)) {
    console.error(`Error: Unknown command "${command}". Run "aitask help" for usage.`);
    process.exit(1);
  }

  let i = 1;
  let doubleDash = false;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--') {
      doubleDash = true;
      i++;
      continue;
    }
    if (!doubleDash && arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else if (!doubleDash && arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else {
      positional.push(arg);
      i++;
    }
  }

  if (flags.f) flags.force = flags.f;

  return { command, args: positional, flags };
}

function showHelp(): void {
  console.log(`
aitask - Repo task lifecycle CLI

Manage tasks in tasks/ directory with markdown files and report workflow.

Usage:
  aitask <command> [options]

Lifecycle Commands:
  ready <id>              Manager-gated: backlog -> ready
  start <id>              Start a task: backlog|ready -> progress
  review <id>             Send to review: progress -> review
  rework <id>             Send back to rework: review -> rework
  done <id>               Complete: progress|review|rework -> done
  block <id> [reason]     Block a task: progress -> blocked
  unblock <id>            Unblock: blocked -> progress
  supersede <id>          Manager-gated: any -> superseded
  queue                   Show tabular task queue with state, timestamp, title
  audit                   Scan task folders for consistency issues

Task Management Commands:
  init                    Scaffold tasks/ directory, aitask.yml, and template stubs
  create <title>          Create a draft task in tasks/draft/ or tasks/ready/
  list                    Show active tasks across all state folders
  validate <id>           Full structural validation per ADR-001
  templates <subcommand>  List or materialize templates
  show <id>               Token-safe task display (--sections, --full)
  path <id>               Print resolved absolute file path
  rules                   Print manager contact and display guidance
  manager <subcommand>    Configure and interact with task manager
  checklist <subcommand>  Show/update/check task checklist
  help                    Show this help message

Create options:
  --assign <user>         Assignee
  --desc <text>           Description / objective
  --tags <a,b,c>          Comma-separated tags
  --adr=<N>               ADR number for task ID
  --no-adr                Do not include ADR in task ID
  --ready                 Create in ready/ instead of draft/

List options:
  --assignee <user>       Filter by assignee
  --dir <dir>             Directory to list (default: all active)
  --json                  JSON output

Audit options:
  --active-only           Audit active states only (skip done/archive history)

Templates subcommands:
  list                    List built-in templates
  materialize [names...]  Write template files to target repo
    --dir <path>          Target directory (default: project root)
    --force               Overwrite existing files

Show options:
  --sections <names>      Comma-separated sections (default: frontmatter,goal,scope,acceptance)
  --full                  Display entire file

Manager subcommands:
  set <id> --env <NAME> [--name "<name>"]  Configure manager
  show                                      Show manager config
  verify                                    Check if manager env matches
  contact set-command -- <command>          Set contact command
  contact show                              Show contact command
  contact test                              Test contact command
  call <id> --message "<msg>"               Call manager with message
  call <id> --transition <t> --report <p>   Call manager with transition report

Checklist subcommands:
  show <id>                                 Show checklist items
  update <id>                               Replace checklist items from stdin
  check <id>                                Fail when unchecked items exist
  check <id> <n> <file> <lines>             Verify one checked entry evidence anchor

Lifecycle Workflow:
  aitask start 5                  # start task, moves ready/ -> progress/
  aitask review task_001_foo  # send to review
  aitask done task_001_foo    # complete
  aitask block 3 "waiting for UX" # block with reason
  aitask unblock 3                # unblock back to ready/

Examples:
  aitask init
  aitask create "Add login feature"
  aitask list
  aitask list --dir draft
  aitask list --dir done
  aitask done task_001_add_login_feature
  aitask validate task_001_add_login_feature
  aitask templates list
  aitask templates materialize --force
`);
}

async function runCli(): Promise<void> {
  const { command, args, flags } = parseArgs(process.argv);

  try {
    switch (command) {
      case 'help':
        showHelp();
        break;

      case 'init':
        initCommand(flags.force === true);
        break;

      case 'create':
        createCommand(args[0], flags);
        break;

      case 'list':
        listCommand(flags);
        break;

      case 'done':
        doneCommand(args[0], flags);
        break;

      case 'validate':
        validateCommand(args[0]);
        break;

      case 'templates':
        templatesCommand(args, flags);
        break;

      case 'start':
        startCommand(args[0]);
        break;

      case 'review':
        reviewCommand(args[0]);
        break;

      case 'rework':
        reworkCommand(args[0]);
        break;

      case 'block':
        blockCommand(args[0], args[1]);
        break;

      case 'unblock':
        unblockCommand(args[0]);
        break;

      case 'queue':
        queueCommand();
        break;

      case 'audit':
        auditCommand({ activeOnly: flags['active-only'] === true });
        break;

      case 'supersede':
        supersedeCommand(args[0], flags);
        break;

      case 'ready':
        readyCommand(args[0]);
        break;

      case 'show':
        showCommand(args[0], flags);
        break;

      case 'path':
        pathCommand(args[0]);
        break;

      case 'rules':
        rulesCommand();
        break;

      case 'manager':
        managerCommand(args, flags);
        break;

      case 'checklist':
        checklistCommand(args);
        break;

      default:
        showHelp();
        break;
    }
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
  }
}

export { runCli, parseArgs };

if (require.main === module) {
  runCli();
}
