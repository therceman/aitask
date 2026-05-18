#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { initCommand } from './commands/init';
import { createCommand } from './commands/create';
import { publishCommand } from './commands/publish';
import { listCommand } from './commands/list';
import { assignCommand } from './commands/assign';
import { statusCommand } from './commands/status';
import { doneCommand } from './commands/done';
import { rejectCommand } from './commands/reject';
import { validateCommand } from './commands/validate';
import { templatesCommand } from './commands/templates';
import { startCommand } from './commands/start';
import { reviewCommand } from './commands/review';
import { reworkCommand } from './commands/rework';
import { blockCommand } from './commands/block';
import { unblockCommand } from './commands/unblock';
import { queueCommand } from './commands/queue';
import { auditCommand } from './commands/audit';

interface ParseResult {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

const KNOWN_COMMANDS = [
  'init', 'create', 'publish', 'list', 'assign', 'status', 'done', 'reject', 'validate', 'templates', 'help',
  'start', 'review', 'rework', 'block', 'unblock', 'queue', 'audit',
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

  if (!KNOWN_COMMANDS.includes(command)) {
    console.error(`Error: Unknown command "${command}". Run "aitask help" for usage.`);
    process.exit(1);
  }

  let i = 1;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[i + 1];
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
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
  start <id>              Start a task: ready -> progress
  review <id>             Send to review: progress -> review
  rework <id>             Send back to rework: review -> rework
  done <id>               Complete: progress|review|rework -> done
  block <id> [reason]     Block a task: any active -> blocked
  unblock <id>            Unblock: blocked -> ready
  queue                   Show all state folders with task counts
  audit                   Scan all state folders for consistency issues

Task Management Commands:
  init                    Scaffold tasks/ directory and template stubs
  create <title>          Create a draft task in tasks/draft/
  publish <id>            Publish draft to tasks/todo/ (deepseek naming)
  list                    Show active task queue (tasks/todo/)
  assign <id> <user>      Assign a task
  status <id> <status>    Set status (todo|in_progress|done|rejected|rework)
  reject <id>             Move task to tasks/rework/
  validate <id>           Check task completeness (report, assignee, etc.)
  templates <subcommand>  List or materialize templates
  help                    Show this help message

Create options:
  --assign <user>         Assignee
  --desc <text>           Description / objective
  --tags <a,b,c>          Comma-separated tags

Publish options:
  --dir <path>            Target repo directory (auto-detect by default)

List options:
  --status <status>       Filter by status
  --assignee <user>       Filter by assignee
  --dir <dir>             Directory to list (todo, done, rework, default: todo)
  --json                  JSON output

Templates subcommands:
  list                    List built-in templates
  materialize [names...]  Write template files to target repo
    --dir <path>          Target directory (default: project root)
    --force               Overwrite existing files

Lifecycle Workflow:
  aitask start 5                  # start task, moves ready/ -> progress/
  aitask review deepseek_001_foo  # send to review
  aitask done deepseek_001_foo    # complete
  aitask block 3 "waiting for UX" # block with reason
  aitask unblock 3                # unblock back to ready/

Full Workflow:
  aitask create "My feature"     # create draft in tasks/draft/
  aitask publish 1               # publish draft to tasks/todo/
  aitask list                    # view active queue
  aitask done <id>               # finalize

Audit:
  aitask audit                  # scan for folder/state mismatches, missing reports, timestamp violations
  aitask done <id>              # requires report (error if missing)
  aitask done <id> --force      # skip report check

Examples:
  aitask init
  aitask create "Add login feature" --assign alice
  aitask publish 1
  aitask list
  aitask list --dir draft
  aitask list --dir done
  aitask assign deepseek_001_add_login_feature alice
  aitask status deepseek_001_add_login_feature in_progress
  aitask done deepseek_001_add_login_feature
  aitask reject deepseek_002_bad_idea
  aitask validate deepseek_001_add_login_feature
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

      case 'publish':
        publishCommand(args[0], flags);
        break;

      case 'list':
        listCommand(flags);
        break;

      case 'assign':
        assignCommand(args[0], args[1]);
        break;

      case 'status':
        statusCommand(args[0], args[1]);
        break;

      case 'done':
        doneCommand(args[0], flags);
        break;

      case 'reject':
        rejectCommand(args[0]);
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
        auditCommand();
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
