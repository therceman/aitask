import { resolveTask, lifecycleTransition } from '../tasks';

export function startCommand(id: string | undefined): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask start <id>');
    process.exit(1);
  }

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  if (task.dir !== 'ready' && task.dir !== 'todo') {
    console.error(`Error: Task "${id}" must be in ready/ or todo/ to start (current: ${task.dir}/)`);
    process.exit(1);
  }

  const result = lifecycleTransition(task, 'progress', 'started_at', 'progress');
  if (!result) {
    console.error(`Error: Could not start task "${id}"`);
    process.exit(1);
  }

  console.log(`Task ${id} started — moved to tasks/progress/`);
}
