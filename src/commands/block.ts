import { resolveTask, lifecycleTransition } from '../tasks';

const ACTIVE_DIRS = ['ready', 'todo', 'progress', 'review', 'rework'];

export function blockCommand(id: string | undefined, reason?: string): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask block <id> [reason]');
    process.exit(1);
  }

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  if (!ACTIVE_DIRS.includes(task.dir)) {
    console.error(`Error: Task "${id}" is not in an active state (current: ${task.dir}/)`);
    process.exit(1);
  }

  const result = lifecycleTransition(task, 'blocked', 'blocked_at', 'blocked', reason);
  if (!result) {
    console.error(`Error: Could not block task "${id}"`);
    process.exit(1);
  }

  const reasonMsg = reason ? ` (${reason})` : '';
  console.log(`Task ${id} blocked — moved to tasks/blocked/${reasonMsg}`);
}
