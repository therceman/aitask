export const name = 'report_stub';
export const description = 'Standard task report template';
export const filename = 'report_stub.md';
export const content = `# Task Report

## Task ID
\`{{id}}\`

## Summary
- What was implemented and why (2-5 bullets).

## Files Changed
- \`src/example.ts\` — what changed
- \`test/example.test.ts\` — what changed

## Validation Commands
- \`npm run -s build\` -> \`0\`
- \`npm run -s lint\` -> \`0\`
- \`npm test\` -> \`0\`

## Acceptance Criteria Mapping
- \`<criterion 1>\` -> \`pass\`; evidence: \`<files/tests/commands>\`
- \`<criterion 2>\` -> \`pass\`; evidence: \`<files/tests/commands>\`

## Risks and Follow-ups
- none`;
