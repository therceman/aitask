import { updateTaskMeta, findTask } from '../tasks';

export function assignCommand(id: string | undefined, assignee: string | undefined): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask assign <id> <assignee>');
    process.exit(1);
  }
  if (!assignee) {
    console.error('Error: Assignee required');
    console.error('Usage: aitask assign <id> <assignee>');
    process.exit(1);
  }

  const task = findTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  updateTaskMeta(id, { assignee });
  console.log(`Assigned ${id} to ${assignee}`);
}
