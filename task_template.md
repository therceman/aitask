# Task Template

## ID
`{{id}}`

## Title
{{title}}

## Objective
-

## Scope
-

## Non-goals
-

## Acceptance Criteria
-

## Validation
- `npm run -s build`
- `npm run -s lint`
- add task-specific checks

## Reporting Contract (Mandatory)
- Start by copying the base stub to a draft file:
  - `cp tasks/report_stub.md tasks/{{id}}_report_draft.md`
- Fill that draft file only; do not author reports from scratch.
- When the report is complete and validated, rename it to the final path:
  - `mv tasks/{{id}}_report_draft.md tasks/{{id}}_report.md`
- Every validation command MUST be listed in the report with exit code.
- Every acceptance criterion MUST be mapped with explicit status (`pass`/`fail`) and evidence.

## Deliverables
- code changes
- report at `tasks/{{id}}_report.md`
