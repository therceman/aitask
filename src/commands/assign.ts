export function assignCommand(_id: string | undefined, _assignee: string | undefined): void {
  console.error('Error: assign is removed. Assignee tracking is not part of ADR-001.');
  process.exit(1);
}
