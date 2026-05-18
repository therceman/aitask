import { findTask, moveTask } from '../tasks';

export function rejectCommand(id: string | undefined): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask reject <id>');
    process.exit(1);
  }

  const task = findTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  const result = moveTask(id, 'rework');
  if (!result || !result.task) {
    console.error(`Error: Could not reject task "${id}"`);
    process.exit(1);
  }

  const reportMsg = result.report ? ` + report` : result.reportDraft ? ` + draft` : '';
  console.log(`Task ${id} rejected — moved to tasks/rework/${reportMsg}`);
}
