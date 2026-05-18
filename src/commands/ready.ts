import { resolveTask, lifecycleTransition } from '../tasks';
import { requireManager } from '../config';

export function readyCommand(id: string | undefined): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask ready <id>');
    process.exit(1);
  }

  requireManager();

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  if (task.dir !== 'backlog' && task.dir !== 'todo') {
    console.error(`Error: Task "${id}" must be in backlog/ or todo/ to make ready (current: ${task.dir}/)`);
    process.exit(1);
  }

  const result = lifecycleTransition(task, 'ready', 'ready_at', 'ready');
  if (!result) {
    console.error(`Error: Could not move task "${id}" to ready`);
    process.exit(1);
  }

  console.log(`Task ${id} ready — moved to tasks/ready/`);
}
