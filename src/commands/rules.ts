import { getTemplate } from '../templates';

export function rulesCommand(): void {
  const tpl = getTemplate('rules');
  if (tpl) {
    console.log(tpl.content);
  } else {
    console.log(`
RULES — Manager Contact & Token-Safe Display Guidance

This task repository follows ADR-001 for lifecycle management.

Manager Contact:
  Configured via: aitask manager set <id> --env <ENV_NAME>
  Use: aitask manager show  — to view current manager config
  Use: aitask manager contact set-command — <command>
  Use: aitask manager call <id> --message "<message>"

Token-Safe Display Rules:
  - Contents shown by 'aitask show' are token-safe (no full-file leakage by default)
  - Use 'aitask show --full' only in trusted contexts
  - Section names: frontmatter, goal, scope, acceptance, validation
  - Use --sections to show specific sections only

State Model (folder-derived):
  draft → backlog → ready → progress → review → rework → done/superseded
`);
  }
}
