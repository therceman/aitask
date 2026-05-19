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

## Checklist (Mandatory)
### Required reading
- [ ] Read docs/MAP.md.
- [ ] Read primary ADR.
- [ ] Read workflow rules.
- [ ] Read tasks/report_stub.md.

### Must implement
- [ ] <implementation item 1>
- [ ] <implementation item 2>

### Must not implement
- [ ] Do not add out-of-scope features.
- [ ] Do not modify unrelated modules.

### Must implement evidence
- [ ] Item 1 evidence listed:
  - Files:
  - Lines/ranges:
  - Summary:
- [ ] Item 2 evidence listed:
  - Files:
  - Lines/ranges:
  - Summary:

### Validation
- [ ] `npm run -s check` passes.
- [ ] task-specific validation commands pass.

### Search audit
- [ ] Search audit completed.
- [ ] Remaining hits classified.

### Reporting
- [ ] Draft report created.
- [ ] Final report created.
- [ ] Final report uses `tasks/report_stub.md` section order.
- [ ] Final report includes exact line: `Check: npm run -s check -> exit <code>`.
- [ ] Final report lists commands with exit codes.
- [ ] Final report lists added unrequested features, or `none`.
- [ ] Manager closure gate passes: `aitask checklist check <task_id>`.

## Reporting Contract (Mandatory)
- Draft: `reports/tasks/<ADR>/<task_id>_report_draft.md`
- Final: `reports/tasks/<ADR>/<task_id>_report.md`
- Use `tasks/report_stub.md` section order.
- Include exact line: `Check: npm run -s check -> exit <code>`.
- Manager closure gate includes: `aitask checklist check <task_id>`.
