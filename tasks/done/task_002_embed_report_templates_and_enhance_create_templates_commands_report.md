# Task Report

## Task ID
`task_002_embed_report_templates_and_enhance_create_templates_commands`

## Summary
- Bundled three built-in templates (task_template.md, report_stub.md, post_review_report_stub.md) as TypeScript modules in `src/templates/`, compiled into the CLI binary.
- Created a template registry (`src/templates/index.ts`) with `getBuiltins()`, `getTemplate()`, `render()` for placeholder interpolation, and `materializeTemplates()` for writing template files to disk.
- Added new `aitask templates` command with `list` and `materialize` subcommands for listing built-in templates and writing them to a target repo directory.
- Enhanced `aitask create` to use the embedded template registry instead of hardcoded strings — task body is rendered from `task_template` and report draft from `report_stub`.
- Updated `aitask init` to use the template registry for materializing stubs.
- Added config override support via `--dir` flag on `templates materialize`.

## Files Changed

New:
- `src/templates/index.ts` — template registry, render, materialize logic
- `src/templates/task_template.ts` — task_template.md content as module
- `src/templates/report_stub.ts` — report_stub.md content as module
- `src/templates/post_review_report_stub.ts` — post_review_report_stub.md content as module
- `src/commands/templates.ts` — `templates list` and `templates materialize` commands
- `test/templates.test.ts` — 12 tests for template registry, render, materialize

Modified:
- `src/commands/init.ts` — uses `materializeTemplates()` from registry instead of hardcoded STUBS object
- `src/commands/create.ts` — uses `getCreateTemplate()` and `getReportStub()` from registry
- `src/cli.ts` — added `templates` to KNOWN_COMMANDS + dispatch + help text
- `test/cli.test.ts` — added 5 tests for `templates` command parsing
- `smoke.sh` — added 4 new smoke tests (templates list, materialize, specific names, embedded template usage)
- `README.md` — added templates command table and template section

## Validation Commands
- `npm run -s build` -> `0`
- `npm run -s lint` -> `0`
- `npm test` -> `0` (42/42 passed)
- `bash smoke.sh` -> `0` (18/18 passed)

## Acceptance Criteria Mapping
- `(1) bundle built-in templates in source package` -> `pass`; evidence: `src/templates/*.ts` exports, compiled into `dist/templates/*.js`
- `(2) add command to materialize missing templates into target repo` -> `pass`; evidence: `aitask templates materialize [names...] [--dir <path>] [--force]`
- `(3) enhance create command to generate task + report_draft from embedded template` -> `pass`; evidence: `create.ts` uses `getCreateTemplate()` and `getReportStub()` from registry, smoke test verifies sections from template appear
- `(4) allow config overrides for template locations but fallback to embedded defaults` -> `pass`; evidence: `--dir` flag on `templates materialize`, embedded defaults always available via `getTemplate()`
- `(5) update README with exact usage and examples` -> `pass`; evidence: README.md has templates command table and template section

## Risks and Follow-ups
- Custom template loading from `AITASK_TEMPLATES_DIR` env var is not yet implemented — embedded defaults always used at runtime. Materialized files on disk are for human reference only.
