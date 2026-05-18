# ADR-001-2: Task Lifecycle State Machine and Audit Gates

## Status
Accepted

## Owner
Core CLI Team

## Date
2026-05-18

## Related
- ADR-001 (AITASK Task Management CLI Architecture) (`docs/adr/ADR-001-aitask-task-management-cli-architecture.md`)
- ADR-001-1 (Local Timestamps and Task Audit Rules) (`docs/adr/ADR-001-1-local-timestamps-and-task-audit.md`)

## Pack Summary
Defines the full task lifecycle state machine with nine state folders, valid state transitions, lifecycle commands with transition guards, and audit gates that enforce consistency between task state, timestamps, and reports.

## Decision Contract

### State folders
Nine canonical state folders under `tasks/`:

```
tasks/
├── draft/      initial creation
├── backlog/    deferred for later
├── ready/      ready for work
├── progress/   actively being worked
├── blocked/    waiting on external dependency
├── review/     awaiting review
├── rework/     returned for fixes
├── done/       completed
├── superseded/ replaced by another task
```

### State machine (valid transitions)

```
                  ┌──────────┐
                  │  draft   │
                  └────┬─────┘
                       │ publish
                       ▼
                  ┌──────────┐
         ┌───────│  backlog │◄────────┐
         │       └────┬─────┘         │
         │            │ start         │
         │            ▼               │
         │       ┌──────────┐         │
         │       │  ready   │         │
         │       └────┬─────┘         │
         │            │ start         │
         │            ▼               │
         │       ┌──────────┐         │
         │       │ progress │         │
         │       └──┬───────┘         │
         │     ┌────┼──┬──┐           │
         │     │    │  │  │           │
         │     ▼    ▼  ▼  ▼           │
         │  done  review  blocked     │
         │           │     │          │
         │           │     │ unblock  │
         │           │     ▼          │
         │           │  progress ◄────┘
         │           │
         │           │ rework
         │           ▼
         │       ┌──────────┐
         └───────│  rework  │────► superseded
                 └──────────┘
```

### Lifecycle commands

| Command   | Source states               | Target state | Guard                              |
|-----------|-----------------------------|--------------|------------------------------------|
| `start`   | backlog, ready              | progress     | -                                  |
| `review`  | progress                    | review       | -                                  |
| `rework`  | review                      | rework       | -                                  |
| `done`    | progress, review, rework    | done         | Report presence required           |
| `block`   | progress                    | blocked      | -                                  |
| `unblock` | blocked                     | progress     | -                                  |
| `supersede`| rework                     | superseded   | -                                  |

### Transition guards
- `done`: requires a report file present in the task directory (exact filename `report.md`)
- Any command invoked from a state not listed as a source must error with a descriptive message
- `unblock` from a non-blocked state must error

### Audit command
`aitask audit` checks:

1. **Folder/state mismatch**: task filename implies a state but directory path says otherwise (e.g. `todo/task_001_foo.md` does not match because `todo/` is not a valid state folder)
2. **Missing report**: task in `done/` missing `report.md`
3. **Report mismatch**: task in `done/` has a report but it is empty or lacks required sections
4. **Stale tasks**: task in `progress/` with `created_at` older than 7 days and no `progress/` timestamp update
5. **Timestamp ordering**: `created_at ≤ started_at ≤ review_at ≤ completed_at` must hold within audit tolerance

### Queue output format
```
TASK-001 │ progress  │ 2026-05-18 08:10 │ Implement auth
TASK-002 │ blocked   │ 2026-05-17 14:00 │ Wait for API key
TASK-003 │ review    │ 2026-05-18 09:00 │ Review PR #42
```
Columns: task id, state, last transition timestamp, title

## Scope

### In Scope
- Nine canonical state folders
- State machine with valid transitions
- Lifecycle commands (start, review, rework, done, block, unblock, supersede)
- Transition guards and error messages
- Audit command with five checks
- Done guard requiring report presence
- Queue output format specification

### Out of Scope
- Template content validation for reports
- Auto-generation of transition timestamps
- Web dashboard for state visualization
- Git-based state inference
- Automatic stale task notification

## Engine Core Rules
1. Task state is determined by directory path only (path-derived state)
2. Each lifecycle command validates the current state before transitioning
3. `done` transition requires a non-empty report file
4. Invalid transitions produce descriptive errors
5. Audit runs all five checks and reports all violations
6. Queue output is tabular with fixed columns

## Forbidden
- Direct file manipulation to change task state (must use lifecycle commands)
- Moving a task to `done/` without a report
- Invalid state transitions accepted silently
- Adding new state folders without updating this ADR

## Data / Type Contract
```
tasks/
├── backlog/<slug>.md
├── ready/<slug>.md
├── progress/<slug>.md
├── blocked/<slug>.md
├── review/<slug>.md
├── rework/<slug>.md
├── done/<slug>.md
│   └── report.md (required)
├── superseded/<slug>.md
└── draft/<id>_<slug>.md
```

## Validation Contract
- `npm run -s adr_contract:check` validates ADR contract structure
- Lifecycle command tests: each command from invalid state must error
- Audit check tests: each audit rule has a corresponding test case
- Transition guard unit tests: done without report, unblock from non-blocked

## Implementation Process
1. Add state folder constants and transition table
2. Implement path-derived state resolver
3. Add lifecycle commands (start, review, rework, done, block, unblock, supersede)
4. Add transition guard checks to each command
5. Implement `aitask audit` with five checks
6. Add `aitask queue` with formatted output
7. Wire commands into CLI scaffold

## Task Coverage
- NO-ADR-T025: Lock this ADR (current task)
- Future: Implement state folder constants and transition table
- Future: Implement lifecycle commands with guards
- Future: Implement audit command
- Future: Implement queue command

## Detailed Design
The state machine extends the original ADR-001 directory structure by introducing intermediate workflow states (backlog, ready, progress, blocked, review, rework) between draft/todo and done. Each command enforces valid transitions via explicit guard checks. The audit command provides holistic consistency validation across all tasks.

## Rationale
- Path-derived state eliminates frontmatter authority conflicts
- Explicit transition guards prevent accidental state corruption
- Done guard with report requirement ensures completion evidence
- Audit provides actionable inconsistency detection
- Queue output gives at-a-glance task status for daily workflow

## Examples
```
aitask start tasks/ready/task_005_add_login.md
→ moved to tasks/progress/task_005_add_login.md

aitask done tasks/progress/task_005_add_login.md
→ Error: report.md not found. Create a report before marking done.

aitask audit
→ OK: all tasks consistent (no violations)

aitask queue
TASK-005 │ progress  │ 2026-05-18 10:00 │ Add login
```

## Migration Notes
- Existing tasks in `todo/` are treated as `ready/` state equivalent
- Tasks in `done/` without reports are flagged by audit but not auto-rejected
- No automatic migration from flat directory structures

## Open Questions
- Should `supersede` be available from any state?
- Auto-archive for tasks stuck in `review/` beyond configurable timeout?
- Add `--force` flag to bypass transition guards for recovery?

## Final Lock
Task lifecycle uses nine state folders (draft, backlog, ready, progress, blocked, review, rework, done, superseded) with a defined state machine. Six lifecycle commands (start, review, rework, done, block, unblock) plus supersede enforce valid transitions with guards. The `done` command requires report presence. Audit checks five consistency rules. Queue outputs tabular task status.
