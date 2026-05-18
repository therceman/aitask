# aitask

**Repo task lifecycle CLI** — manage tasks in `tasks/` with markdown files and report workflow.

Replaces manual file moves and queue editing with scripted lifecycle commands.

## Quick start

```bash
# Global install (from repo root)
npm install -g .

# Or run without install
node dist/aitask.cjs <command>
```

## Commands

| Command                    | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `aitask init`              | Scaffold `tasks/` directory and template stubs       |
| `aitask create <title>`    | Create a draft task in `tasks/draft/`                |
| `aitask publish <id>`      | Publish draft to `tasks/todo/` (deepseek naming)     |
| `aitask list`              | Show active task queue (`tasks/todo/`)               |
| `aitask assign <id> <user>` | Assign a task to someone                            |
| `aitask status <id> <s>`   | Set status: `todo`, `in_progress`, `done`, `rejected`, `rework` |
| `aitask start <id>`        | Start task: ready/ → progress/                        |
| `aitask review <id>`       | Send to review: progress/ → review/                   |
| `aitask rework <id>`       | Send back to rework: review/ → rework/                |
| `aitask done <id>`         | Finalize: requires report (use `--force` to skip check) |
| `aitask done <id> --force` | Complete even without report (warning shown)        |
| `aitask reject <id>`       | Move task to `tasks/rework/`                         |
| `aitask block <id>`        | Block a task: any active → blocked/                   |
| `aitask unblock <id>`      | Unblock: blocked/ → ready/                            |
| `aitask validate <id>`     | Check completeness (report, assignee, etc.)          |
| `aitask templates list`    | List built-in templates                              |
| `aitask templates materialize [names...]` | Write template files to repo            |
| `aitask queue`             | Show compact per-folder summary with overdue markers |
| `aitask audit`             | Scan all state folders for consistency issues        |
| `aitask help`              | Show help                                            |

## Task lifecycle

### Flow diagram

```
                ┌─────────────┐
                │   backlog/  │
                └──────┬──────┘
                       │
                   ┌───▼────┐
                   │ ready/ │
                   └───┬────┘
                       │ start
                   ┌───▼──────┐
              ┌────│ progress/│────┐
              │    └───┬──────┘    │
              │        │ review    │
              │    ┌───▼────┐      │
         unblock   │ review/│      │ block
              │    └───┬────┘      │
              │        │ rework    │
              │    ┌───▼────┐      │
              └────│ rework/│      │
                   └───┬────┘      │
                       │ done      │
                   ┌───▼───┐  ┌───▼──────┐
                   │ done/ │  │ blocked/ │
                   └───────┘  └──────────┘
```

### Legacy flow (draft → todo)

```
create ──→ tasks/draft/              # draft task + report_draft
              │
              └── publish <id> ──→ tasks/todo/   # deepseek_ID_slug naming
                                      │
                                      ├── assign <user>
                                      ├── status in_progress
                                      │
                                      ├── done ──→ tasks/done/
                                      │              (report_draft → report, move pair)
                                      │
                                      └── reject ──→ tasks/rework/
```

## File layout

```
tasks/
├── draft/         # Draft tasks (before publishing)
│   ├── task_NNN.md
│   └── task_NNN_report_draft.md
├── todo/          # Active published tasks
│   ├── deepseek_NNN_slug.md
│   └── deepseek_NNN_slug_report_draft.md
├── done/          # Completed tasks + reports
├── rework/        # Rejected / needs-fix tasks
├── archive/       # Archived tasks
├── backlog/       # Backlog tasks
├── superseded/    # Superseded tasks
├── task_template.md
├── report_stub.md
└── post_review_report_stub.md
```

## Templates

Templates are embedded in the CLI binary. Three built-in templates are available:

| Template                   | Filename                 | Purpose                          |
| -------------------------- | ------------------------ | -------------------------------- |
| `task_template`            | `task_template.md`       | Skeleton for new task definitions |
| `report_stub`              | `report_stub.md`         | Standard report sections          |
| `post_review_report_stub`  | `post_review_report_stub.md` | Post-task deep code review    |

Use `aitask templates list` to see available templates. Use `aitask templates materialize` to write them to disk, optionally filtering by name:

```bash
aitask templates materialize                    # write all templates
aitask templates materialize report_stub        # write only report_stub
aitask templates materialize --force            # overwrite existing
aitask templates materialize --dir /some/path   # target directory
```

## Examples

```bash
# Initialize
aitask init

# Draft workflow
aitask create "Add login feature" --assign alice
aitask publish 1                    # → tasks/todo/deepseek_001_add_login_feature.md

# Create more drafts (auto-incremented IDs)
aitask create "Fix bug"
aitask create "Write docs"
aitask publish 2
aitask publish 3

# View queues
aitask list                          # active tasks in todo/
aitask list --dir draft              # draft tasks
aitask list --dir done --json        # completed (JSON)

# Workflow
aitask assign deepseek_001_add_login_feature bob
aitask status deepseek_001_add_login_feature in_progress
aitask done deepseek_001_add_login_feature   # finalize

# Reject / rework
aitask reject deepseek_002_fix_bug

# Validate
aitask validate deepseek_001_add_login_feature

# Audit
aitask audit                          # scan for issues
aitask audit ; echo "exit: $?"       # check exit code (0=pass, 1=fail)

# Done with report guard
aitask done T001                      # requires report, fails if missing
aitask done T001 --force              # skip report check

# Queue overview
aitask queue

# Cross-repo publish
aitask publish 3 --dir /path/to/other/repo
```

## Install (global)

```bash
# From the repo:
npm install -g .

# Verify:
aitask --version
```

## Development

```bash
npm install
npm run build
npm test
bash smoke.sh
```
