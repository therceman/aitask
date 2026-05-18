import { resolveTask, lifecycleTransition } from '../tasks';

const BLOCK_FROM = ['progress'];

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

  if (!BLOCK_FROM.includes(task.dir)) {
    console.error(`Error: Task "${id}" must be in progress/ to block (current: ${task.dir}/)`);
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
