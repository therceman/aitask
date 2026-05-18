# AITASK Handoff

Date: 2026-05-10

## Current Status
- CLI exists and works with draft-first workflow.
- Core commands implemented:
  - `aitask create <slug>` -> creates draft task in `tasks/draft/` with auto-increment ID
  - `aitask publish <draft_path>` -> moves draft to `tasks/todo/` with deepseek naming pattern
  - `aitask templates` -> copies report/task stubs into place
- Global install path is working (`npm install -g .` was used in prior verification).

## Completed Work (from task reports)
1. `task_001_bootstrap_aitask_cli`
- Bootstrap CLI scaffold and command wiring.
- AGENTS reply routing fix was applied after initial pass.

2. `task_002_embed_report_templates_and_enhance_create_templates_commands`
- Added built-in templates and template command support.
- Added tests and smoke coverage for template flows.

3. `deepseek_003_implement_draft_first_workflow_with_auto_increment_ids_and_p`
- Implemented draft-first flow end-to-end.
- Added auto-increment task IDs.
- Added `publish` behavior from draft -> todo with naming normalization.

## Important Behavior Rules Already Landed
- Draft-first is canonical: task creation starts in `tasks/draft/`.
- IDs auto-increment.
- Dual binary naming was removed; keep single canonical `aitask` command.
- AGENTS reply behavior in this repo was adjusted to route to sender, not hardcoded target.

## Current Repo State (needs cleanup)
`git status` in `~/git/aitask` is not clean right now.
- Modified tracked file: `README.md`
- Many untracked files are present (source, scripts, templates, tests, package files).
- This likely indicates local work that has not been staged/committed as a coherent unit.

## Recommended Next Steps
1. Stabilize and commit current working tree in `~/git/aitask`:
- review untracked files
- stage intentional files only
- commit with one clear message for current state

2. Add manager-friendly UX polish:
- `aitask queue` output formatting (compact + readable order)
- `aitask status` summary for draft/todo/done counts
- `aitask next` helper for next actionable task

3. Add cross-repo operator flow docs:
- manager working from another repo via `--dir`
- examples:
  - `aitask --dir ~/git/aitask queue`
  - `aitask --dir ~/git/aitask create <slug>`
  - edit draft manually
  - `aitask --dir ~/git/aitask publish <draft>`

4. Add guards:
- prevent publish when draft missing required headers
- validate report/task filename conventions
- optional lint command for task markdown schema checks

5. Add CI basics (if desired):
- run unit tests
- run smoke tests
- run formatting/lint checks

## Quick Commands
- Build: `npm run build`
- Test: `npm test`
- Smoke: `./smoke.sh`
- Global install: `npm install -g .`

## Handoff Note
The feature direction is correct. Primary risk now is repository hygiene (dirty/untracked state) rather than architecture.
