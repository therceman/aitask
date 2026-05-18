# Task Report

## Task ID
`deepseek_003_implement_draft_first_workflow_with_auto_increment_ids_and_p_draft_first_workflow`

## Summary
- Implemented draft-first task workflow: `aitask create` now creates draft task + report_draft under `tasks/draft/` with auto-incremented zero-padded numeric IDs (e.g., `deepseek_003_implement_draft_first_workflow_with_auto_increment_ids_and_p.md`, `deepseek_003_implement_draft_first_workflow_with_auto_increment_ids_and_p_report_draft.md`).
- Added `aitask publish <id>` command that moves draft files into `tasks/todo/` with `deepseek_<id>_<slug>.md` naming convention, converting from simple numeric IDs to the repo-standard naming.
- Added safety checks: missing draft file detection, target file collision detection, and invalid ID format validation.
- Added `--dir <path>` override on `publish` for cross-repo operation — reads draft from cwd, writes published files to target repo.
- Enhanced `list --dir draft` to show queued draft tasks. `ensureDirs` now creates `tasks/draft/` alongside other dirs. `scanDir` includes draft dir in TASK_DIRS.

## Files Changed

New:
- `src/commands/publish.ts` — `publish` command implementation

Modified:
- `src/types.ts` — added `'draft'` to `TaskDir` union and `TASK_DIRS` array
- `src/tasks.ts` — added `getMaxNumericId()`, `createDraftFile()`, `publishDraft()` with separate source/target dir support; `ensureDirs` now creates `draft/` dir
- `src/commands/create.ts` — rewritten to create drafts in `tasks/draft/` with auto-increment IDs; shows `aitask publish <id>` as next step
- `src/cli.ts` — added `publish` to `KNOWN_COMMANDS`, dispatch, and help text
- `test/tasks.test.ts` — added tests for `getMaxNumericId`, `createDraftFile`, `publishDraft` (including cross-repo publish and collision safety)
- `test/cli.test.ts` — added tests for `publish` argument parsing
- `smoke.sh` — replaced old `create→todo` tests with draft→publish workflow tests (20 tests total)
- `README.md` — updated lifecycle diagram, file layout, examples for draft→publish workflow

## Validation Commands
- `npm run -s build` -> `0`
- `npm run -s lint` -> `0`
- `npm test` -> `0` (45/45 passed)
- `bash smoke.sh` -> `0` (20/20 passed)

## Acceptance Criteria Mapping
- `(1) create generates draft task + report draft under tasks/draft/ with next numeric ID` -> `pass`; evidence: `createDraftFile()` scans all dirs for max numeric ID, creates `task_NNN.md` + `task_NNN_report_draft.md`
- `(2) manager edits drafts manually` -> `pass`; evidence: no CLI modification of drafts — they are plain markdown files
- `(3) publish moves draft files to tasks/todo/ with deepseek_ID_slug naming` -> `pass`; evidence: `publishDraft()` reads draft title, generates slug, writes `deepseek_NNN_slug.md`, removes draft files
- `(4) safety checks for missing files and name collisions` -> `pass`; evidence: missing draft → error, target collision → error with message, invalid ID → error
- `(5) support --dir override for cross-repo publish` -> `pass`; evidence: `publishDraft(num, sourceDir, targetDir)` separates read/write paths, `publish` passes `flags.dir` as target
- `(6) no worker tagging added` -> `pass`; evidence: no `--assign` requirement, no worker metadata injected

## Risks and Follow-ups
- None.
