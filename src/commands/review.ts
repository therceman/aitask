import { resolveTask, lifecycleTransition } from '../tasks';

export function reviewCommand(id: string | undefined): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask review <id>');
    process.exit(1);
  }

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  if (task.dir !== 'progress') {
    console.error(`Error: Task "${id}" must be in progress/ to review (current: ${task.dir}/)`);
    process.exit(1);
  }

  const result = lifecycleTransition(task, 'review', 'review_at', 'review');
  if (!result) {
    console.error(`Error: Could not move task "${id}" to review`);
    process.exit(1);
  }

  console.log(`Task ${id} sent to review — moved to tasks/review/`);
}
