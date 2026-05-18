# AITASK Project Structure

## Source
- `src/` — TypeScript source files
- `dist/` — Compiled JavaScript output

### Core
- `src/cli.ts` — CLI entry point, arg parser, command registry
- `src/index.ts` — Application bootstrap
- `src/types.ts` — Type definitions, lifecycle transitions, task dirs
- `src/tasks.ts` — Task file operations (CRUD, scan, find, move, lifecycle transition)
- `src/timestamps.ts` — Timestamp formatting (YYYY-MM-DD HH:mm:ss) and frontmatter updates
- `src/timeline.ts` — Timeline entry append for task files
- `src/config.ts` — aitask.yml config loading, parsing, serialization, manager gate

### Commands
- `src/commands/init.ts` — Scaffold tasks/ directory, aitask.yml, and template stubs
- `src/commands/create.ts` — Create draft task with --adr, --no-adr, --ready flags
- `src/commands/list.ts` — List tasks with folder-derived state (default: all active)
- `src/commands/ready.ts` — Manager-gated backlog→ready transition
- `src/commands/start.ts` — Start task: backlog|ready → progress
- `src/commands/review.ts` — Send to review: progress → review
- `src/commands/rework.ts` — Send back to rework: review → rework
- `src/commands/done.ts` — Complete task (requires report)
- `src/commands/block.ts` — Block task: progress → blocked
- `src/commands/unblock.ts` — Unblock: blocked → progress
- `src/commands/supersede.ts` — Manager-gated any→superseded
- `src/commands/queue.ts` — Tabular queue overview
- `src/commands/audit.ts` — Structural audit across all state folders
- `src/commands/validate.ts` — Full ADR structural validation
- `src/commands/show.ts` — Token-safe task display (--sections, --full)
- `src/commands/path.ts` — Print resolved absolute file path
- `src/commands/rules.ts` — Print manager contact and display guidance
- `src/commands/manager.ts` — Full manager config and call interface
- `src/commands/templates.ts` — List and materialize built-in templates

### Templates
- `src/templates/index.ts` — Template registry and materialization
- `src/templates/task_template.ts` — Standard task definition template
- `src/templates/report_stub.ts` — Standard report template
- `src/templates/post_review_report_stub.ts` — Post-task deep code review template
- `src/templates/rules.ts` — Manager contact and display guidance template

## Docs
- `docs/adr/` — Architecture Decision Records
  - `ADR-001-aitask-task-management-cli-architecture.md` — AITASK CLI Architecture
  - `ADR-001-1-local-timestamps-and-task-audit.md` — Local Timestamps and Audit
- `docs/MAP.md` — Documentation map

## Config
- `package.json` — NPM package definition and scripts
- `tsconfig.json` — TypeScript configuration
- `.eslintrc.json` — ESLint configuration
- `jest.config.js` — Jest test configuration

## Tests
- `test/` — Jest unit tests
- `smoke.sh` — Smoke test script

## Scripts
- `scripts/` — Build and utility scripts

## Tasks
- `tasks/` — Task workflow directories (draft, backlog, ready, todo, progress, blocked, review, rework, done, superseded, archive)
- `task_template.md` — Task template stub
- `report_stub.md` — Report template stub
- `post_review_report_stub.md` — Post-review report stub
- `rules.md` — Rules guidance stub
