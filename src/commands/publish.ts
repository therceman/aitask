export function publishCommand(_id: string | undefined, _flags: Record<string, string | boolean>): void {
  console.error('Error: publish is removed. Use: aitask ready <id> to move backlog->ready');
  process.exit(1);
}
