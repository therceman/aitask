# <TASK_ID>: <Title>

## Status
TODO

## Primary ADR
- docs/adr/<path>/ADR-XXX-<slug>.md

## Related ADRs / Rules / Specs
- docs/MAP.md
- docs/rules/workflow/task_workflow_rules.md

## Objective
- One precise implementation objective.

## In scope
- 

## Out of scope
- 

## MUST implement
- [ ] 

## MUST NOT implement
- [ ] 

## Files likely involved
- 

## Validation commands
~~~bash
npm run -s check
~~~

## Search audit
~~~bash
rg -n "<pattern>" docs tasks apps packages
~~~

## Acceptance criteria
- [ ] 

## Checklist (Mandatory)
- [ ] docs read completed #docs/MAP.md:1-30
- [ ] primary changes completed #<path>:<line-range>
- [ ] checks pass recorded #task_result.md:1-80
- [ ] report finalized #reports/tasks/<ADR>/<task_id>_report.md:1-120

## Reporting Contract (Mandatory)
- Draft: `reports/tasks/<ADR>/<task_id>_report_draft.md`
- Final: `reports/tasks/<ADR>/<task_id>_report.md`
- Use `tasks/report_stub.md` section order.
- Include exact line: `Check: npm run -s check -> exit <code>`.
- Manager closure gate includes: `aitask checklist check <task_id>`.
