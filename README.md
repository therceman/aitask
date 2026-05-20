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
| `aitask init`              | Scaffold `tasks/` directory, `aitask.yml`, and stubs |
| `aitask create <title>`    | Create a task (default `tasks/draft/`)               |
| `aitask list`              | Show active tasks across all state folders           |
| `aitask ready <id>`        | Manager-gated: backlog → ready                       |
| `aitask start <id>`        | Start task: backlog\|ready → progress                |
| `aitask review <id>`       | Send to review: progress → review                    |
| `aitask rework <id>`       | Send back to rework: review → rework                 |
| `aitask done <id>`         | Complete: requires report (`--force` to skip)        |
| `aitask block <id>`        | Block a task: progress → blocked                     |
| `aitask unblock <id>`      | Unblock: blocked → progress                          |
| `aitask supersede <id>`    | Manager-gated: any → superseded                      |
| `aitask validate <id>`     | Full structural validation per ADR-001               |
| `aitask audit`             | Scan all state folders for consistency issues        |
| `aitask show <id>`         | Token-safe task display (`--sections`, `--full`)     |
| `aitask path <id>`         | Print resolved absolute file path                    |
| `aitask rules`             | Print manager contact and display guidance           |
| `aitask templates <sub>`   | List or materialize built-in templates               |
| `aitask manager <sub>`     | Configure and interact with task manager             |
| `aitask check contract`    | Validate task contract (Status, Objective, Scope, Checklist) |
| `aitask check contract <id>` | Validate contract for a specific task              |
| `aitask help`              | Show help                                            |

## Task Lifecycle State Machine

### Canonical state folders

Eight canonical state folders under `tasks/`:

```
tasks/
├── backlog/    deferred for later
├── ready/      ready for work
├── progress/   actively being worked
├── blocked/    waiting on external dependency
├── review/     awaiting review
├── rework/     returned for fixes
├── done/       completed
├── superseded/ replaced by another task
```

State is derived from folder path only — no frontmatter `status` field is used.

### Flow diagram

```
                    ┌──────────┐
                    │ backlog  │
                    └────┬─────┘
                         │ ready
                         ▼
                    ┌──────────┐
                    │  ready   │
                    └────┬─────┘
                         │ start
                         ▼
                    ┌──────────┐
              ┌────►│ progress │◄────┐
              │     └────┬─────┘     │
              │          │ review    │ start
              │          ▼           │
              │     ┌──────────┐     │
              │     │  review  │     │
              │     └──┬────┬──┘     │
              │        │    │        │
              │ done   │    │ rework │
              ▼        │    ▼        │
         ┌──────────┐  │ ┌──────────┐│
         │   done   │  │ │  rework  │┘
         └──────────┘  │ └──────────┘
                       │
                       │ block
                       ▼
                  ┌──────────┐
                  │ blocked  │
                  └────┬─────┘
                       │ unblock
                       ▼
              returns to blocked_from
              or ready as fallback
```

Any non-done active state can move to superseded:

```
backlog ─┐
ready ───┤
progress ┤
blocked ─┼──► superseded
review ──┤
rework ──┘
```

### Lifecycle commands

| Command     | Source states               | Target state | Guard                              |
|-------------|-----------------------------|--------------|------------------------------------|
| `ready`     | backlog                     | ready        | Manager-gated                      |
| `start`     | ready, rework               | progress     | -                                  |
| `review`    | progress                    | review       | -                                  |
| `rework`    | review                      | rework       | -                                  |
| `done`      | progress, review, rework    | done         | Report presence required           |
| `block`     | progress                    | blocked      | -                                  |
| `unblock`   | blocked                     | blocked_from or ready fallback | -                     |
| `supersede` | backlog, ready, progress, blocked, review, rework | superseded | Manager-gated      |

### Compatibility aliases

- `tasks/todo/` — compatibility alias for `ready/` state
- `tasks/archive/` — legacy directory, not part of active state machine

## File layout

```
tasks/
├── draft/         # Initial task creation
├── backlog/       # Deferred for later
├── todo/          # Published tasks (ready/ alias)
├── ready/         # Ready for work
├── progress/      # Actively being worked
├── blocked/       # Waiting on external dependency
├── review/        # Awaiting review
├── rework/        # Returned for fixes
├── done/          # Completed tasks + reports
├── superseded/    # Superseded tasks
├── archive/       # Archived tasks (legacy)
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

# Task creation
aitask create "Add login feature"
aitask create "Fix bug"
aitask create "Write docs"

# View tasks
aitask list                          # active tasks
aitask list --dir done --json        # completed (JSON)

# Lifecycle workflow
aitask ready task_001_add_login_feature       # backlog → ready
aitask start task_001_add_login_feature       # ready → progress
aitask review task_001_add_login_feature      # progress → review
aitask done task_001_add_login_feature        # finalize

# Block / unblock
aitask block task_002_fix_bug "waiting for UX"
aitask unblock task_002_fix_bug

# Validate / audit
aitask validate task_001_add_login_feature
aitask audit                          # scan for issues

# Done with report guard
aitask done T001                      # requires report, fails if missing
aitask done T001 --force              # skip report check
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
