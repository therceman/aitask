export const name = 'post_review_report_stub';
export const description = 'Post-task deep code review report template';
export const filename = 'post_review_report_stub.md';
export const content = `# DeepSeek Post-Task Review

## ID
\`{{id}}\`

## Title
Post-task deep code review for \`{{id}}\`

## Context
Review scope and what was verified.

## Scope
- Verify report vs code.
- Validate acceptance criteria evidence.
- Review correctness/regressions/dup/perf/test gaps.

## Non-goals
- No code changes unless explicitly assigned.

## Validation Commands
- \`npm run -s build\` -> \`0\`
- \`npm run -s lint\` -> \`0\`
- \`npm test\` -> \`0\`

## Findings

### P0
none

### P1
none

### P2
none

### P3
none

### P4
none

## Executive Summary
Short final assessment.

## Completion Rule
- P0/P1 block completion.
- P2 requires follow-up task or explicit acceptance.`;
