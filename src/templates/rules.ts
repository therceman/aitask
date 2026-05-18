export const name = 'rules';
export const description = 'Manager contact and token-safe display guidance';
export const filename = 'rules.md';
export const content = `# Rules — Manager Contact & Token-Safe Display Guidance

## Manager Contact

Manager is configured via \`aitask manager set <id> --env <ENV_NAME>\`.

View config: \`aitask manager show\`
Verify active: \`aitask manager verify\`
Set contact: \`aitask manager contact set-command -- <command>\`

### Call Format

\`\`\`
aitask manager call <id> --message "<msg>"
aitask manager call <id> --transition <name> --report <path>
\`\`\`

## Token-Safe Display Rules

- Use \`aitask show <id>\` for default safe view (frontmatter, goal, scope, acceptance)
- Use \`aitask show <id> --sections <names>\` for specific sections
- Use \`aitask show <id> --full\` for full file (trusted context only)
- Unknown section keys cause clear error

## State Model

State is folder-derived:

- \`draft/\` → initial creation
- \`backlog/\` → deferred for later
- \`ready/\` → ready for work
- \`progress/\` → actively being worked
- \`blocked/\` → waiting on external dependency
- \`review/\` → awaiting review
- \`rework/\` → returned for fixes
- \`done/\` → completed
- \`superseded/\` → replaced by another task
`;
