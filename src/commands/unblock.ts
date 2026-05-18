import { resolveTask, lifecycleTransition } from '../tasks';

export function unblockCommand(id: string | undefined): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask unblock <id>');
    process.exit(1);
  }

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  if (task.dir !== 'blocked') {
    console.error(`Error: Task "${id}" must be in blocked/ to unblock (current: ${task.dir}/)`);
    process.exit(1);
  }

  const result = lifecycleTransition(task, 'ready', 'unblocked_at', 'ready');
  if (!result) {
    console.error(`Error: Could not unblock task "${id}"`);
    process.exit(1);
  }

  console.log(`Task ${id} unblocked — moved to tasks/ready/`);
}
