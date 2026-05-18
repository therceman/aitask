import { publishDraft } from '../tasks';

export function publishCommand(id: string | undefined, flags: Record<string, string | boolean>): void {
  if (!id) {
    console.error('Error: Draft ID required');
    console.error('Usage: aitask publish <id> [--dir <path>]');
    process.exit(1);
  }

  const num = parseInt(id, 10);
  if (isNaN(num) || num < 1) {
    console.error(`Error: Invalid draft ID "${id}". Must be a positive number.`);
    process.exit(1);
  }

  const targetDir = (flags.dir as string) || process.cwd();
  const result = publishDraft(num, process.cwd(), targetDir);
  if (!result) {
    process.exit(1);
  }

  console.log(`Published: tasks/todo/${result.finalId}.md`);
  console.log(`Report: tasks/todo/${result.finalId}_report_draft.md`);
}
