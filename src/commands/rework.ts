import { resolveTask, lifecycleTransition } from '../tasks';

export function reworkCommand(id: string | undefined): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask rework <id>');
    process.exit(1);
  }

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  if (task.dir !== 'review') {
    console.error(`Error: Task "${id}" must be in review/ to rework (current: ${task.dir}/)`);
    process.exit(1);
  }

  const result = lifecycleTransition(task, 'rework', 'rework_at', 'rework');
  if (!result) {
    console.error(`Error: Could not rework task "${id}"`);
    process.exit(1);
  }

  console.log(`Task ${id} sent to rework — moved to tasks/rework/`);
}
