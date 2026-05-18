# ADR-001: AITASK Task Management CLI Architecture

## Status
Accepted

## Owner
Core CLI Team

## Date
2026-05-10

## Related
- handoff.md (original ADR source)
- README.md
- ADR-001-1 (Local Timestamps and Task Audit Rules) (`docs/adr/ADR-001-1-local-timestamps-and-task-audit.md`)
- ADR-001-2 (Task Lifecycle State Machine and Audit Gates) (`docs/adr/ADR-001-2-task-lifecycle-state-machine-and-audit-gates.md`)

## Pack Summary
AITASK is a draft-first CLI task management tool with auto-increment IDs, template support, and publish workflow from draft to todo with naming normalization.

## Decision Contract

### Draft-first workflow
- Task creation starts in tasks/draft/ with auto-increment IDs
- publish command moves draft to tasks/todo/ with task naming pattern
- templates command copies report/task stubs

### Task directory structure
```
tasks/
├── draft/      created by `aitask create`
├── todo/       published tasks
├── done/       completed tasks
├── archive/    historical
├── backlog/    deferred
├── rework/     rejected/retry
└── superseded/ replaced tasks
```

### ID system
- Auto-increment task IDs (numerical)
- publish renames from numeric ID to task_xxx_slug pattern

### Binary convention
- Single canonical binary: `aitask` (no dual naming)

### Cross-repo operation
- --dir flag for working from another repo
- `aitask --dir ~/git/other queue`

### AGENTS reply routing
- Routes to sender session, not hardcoded target

## Scope

### In Scope
- Draft-first task creation with auto-increment IDs
- publish from draft to todo with naming normalization
- Template stub provisioning
- Cross-repo operation via --dir
- Queue/status command output

### Out of Scope
- Full task lifecycle implementation (create to edit to publish to report to done to archive)
- CI/CD integration
- Formatting/lint checks for task markdown (future)
- Visual/GUI components

## Engine Core Rules
1. Every task starts as a draft in tasks/draft/
2. IDs auto-increment globally
3. publish is the only path from draft to todo
4. Single canonical binary name
5. AGENTS replies route to sender

## Forbidden
- Direct task creation in tasks/todo/ (must go through draft to publish)
- Dual binary naming
- Hardcoded reply target in AGENTS messaging
- Drafts missing required headers published

## Data / Type Contract
```
tasks/draft/<id>_<slug>.md
tasks/todo/task_<id>_<slug>.md
tasks/done/<slug>.md
```

## Validation Contract
- `npm test` — Jest unit tests
- `./smoke.sh` — smoke tests
- `npm run build` — TypeScript compile

## Implementation Process
1. Bootstrap CLI scaffold and command wiring
2. Add template support and embed stubs
3. Implement draft-first workflow with auto-increment IDs
4. Add publish behavior with naming normalization
5. Add cross-repo --dir support
6. Add guards (draft validation, header checks)

## Task Coverage
- task_001: Bootstrap CLI scaffold
- task_002: Embed report templates and enhance create/templates
- task_003: Draft-first workflow with auto-increment IDs and publish

## Detailed Design
AITASK is a lightweight CLI for managing task lifecycle. Key design choices:
- Draft-first prevents publishing incomplete tasks
- Auto-increment IDs ensure ordering
- publish renames for naming consistency
- --dir flag enables cross-repo workflows
- templates reduce boilerplate

## Rationale
- Draft-first ensures review before publish
- Auto-increment prevents ID collisions
- Task naming pattern standardizes task filenames
- Single binary reduces confusion
- Sender routing fixes AGENTS reply behavior

## Examples
```
aitask create my-feature          -> tasks/draft/4_my-feature.md
aitask publish tasks/draft/4_my-feature.md -> tasks/todo/task_004_my-feature.md
aitask --dir ~/git/other queue
aitask templates
```

## Migration Notes
- Existing tasks must be manually organized into directory structure
- No auto-migration from flat task directories

## Open Questions
- Full task lifecycle automation (create to edit to publish to report to done to archive)?
- UI/web dashboard for task management?
- Multi-repo task aggregation?

## Final Lock
AITASK is a draft-first CLI with auto-increment IDs, template stubs, publish workflow, cross-repo --dir support, and sender-routed AGENTS replies. Single canonical binary name. Tasks flow draft to todo to done with task naming normalization.
