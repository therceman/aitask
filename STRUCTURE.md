# AITASK Project Structure

## Source
- `src/` — TypeScript source files
- `dist/` — Compiled JavaScript output

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
- `tasks/` — Task workflow directories (draft, todo, done, archive, backlog, rework, superseded)
- `task_template.md` — Task template stub
- `report_stub.md` — Report template stub
- `post_review_report_stub.md` — Post-review report stub
