import { TaskFile, TaskDir, TASK_DIRS } from '../types';
import { scanDir, findTask, findAllTasks, findReportPair } from '../tasks';

const ACTIVE_DIRS: TaskDir[] = ['backlog', 'ready', 'todo', 'progress', 'blocked', 'review', 'rework'];

export function listCommand(flags: Record<string, string | boolean>): void {
  const assigneeFilter = flags.assignee as string | undefined;
  const dir = flags.dir as TaskDir | undefined;

  let tasks: TaskFile[];
  if (dir) {
    if (!TASK_DIRS.includes(dir)) {
      console.error(`Error: Invalid directory "${dir}". Valid: ${TASK_DIRS.join(', ')}`);
      process.exit(1);
    }
    tasks = scanDir(dir);
  } else {
    // Show all active state folders by default
    tasks = [];
    for (const d of ACTIVE_DIRS) {
      tasks.push(...scanDir(d));
    }
  }

  if (assigneeFilter) {
    tasks = tasks.filter((t) => t.meta.assignee === assigneeFilter);
  }

  if (flags.json) {
    console.log(JSON.stringify(tasks.map((t) => ({
      id: t.meta.id,
      title: t.meta.title,
      assignee: t.meta.assignee,
      dir: t.dir,
      template: t.meta.template,
      tags: t.meta.tags,
      path: t.path,
    })), null, 2));
    return;
  }

  if (tasks.length === 0) {
    console.log('No active tasks.');
    return;
  }
  for (const t of tasks) {
    console.log(`${t.meta.id} [${t.dir}]`);
  }
}
