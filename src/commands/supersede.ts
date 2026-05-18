import { resolveTask, lifecycleTransition } from '../tasks';
import { requireManager } from '../config';

const SUPERSEDE_FROM = ['rework', 'ready', 'progress', 'blocked', 'review', 'backlog', 'todo'];

export function supersedeCommand(
  id: string | undefined,
  flags?: Record<string, string | boolean>,
): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask supersede <id> [--by <id>] [--reason "<reason>"]');
    process.exit(1);
  }

  requireManager();

  const byId = flags?.by as string | undefined;
  const reason = flags?.reason as string | undefined;

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  if (!SUPERSEDE_FROM.includes(task.dir)) {
    console.error(`Error: Task "${id}" must be in a mutable state to supersede (current: ${task.dir}/)`);
    process.exit(1);
  }

  const result = lifecycleTransition(task, 'superseded', 'superseded_at', 'superseded', reason);
  if (!result) {
    console.error(`Error: Could not supersede task "${id}"`);
    process.exit(1);
  }

  let msg = `Task ${id} superseded — moved to tasks/superseded/`;
  if (byId) msg += `  by: ${byId}`;
  if (reason) msg += `  reason: ${reason}`;
  console.log(msg);
}
