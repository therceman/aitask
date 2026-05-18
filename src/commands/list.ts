import { TaskFile, TaskDir } from '../types';
import { scanDir, findTask, findAllTasks, findReportPair } from '../tasks';

export function listCommand(flags: Record<string, string | boolean>): void {
  const statusFilter = flags.status as string | undefined;
  const assigneeFilter = flags.assignee as string | undefined;

  const dir = (flags.dir as TaskDir) || 'todo';
  const tasks = scanDir(dir);

  let filtered = tasks;
  if (statusFilter) {
    filtered = filtered.filter((t) => t.meta.status === statusFilter);
  }
  if (assigneeFilter) {
    filtered = filtered.filter((t) => t.meta.assignee === assigneeFilter);
  }

  if (flags.json) {
    console.log(JSON.stringify(filtered.map((t) => ({
      id: t.meta.id,
      title: t.meta.title,
      assignee: t.meta.assignee,
      status: t.meta.status,
      template: t.meta.template,
      tags: t.meta.tags,
      path: t.path,
    })), null, 2));
    return;
  }

  if (filtered.length === 0) {
    if (dir === 'todo') {
      console.log('No active tasks in tasks/todo/.');
    } else {
      console.log(`No tasks in tasks/${dir}/.`);
    }
    return;
  }

  const maxIdLen = Math.max(...filtered.map((t) => t.meta.id.length), 8);

  if (dir === 'todo') {
    console.log(`Active queue (tasks/todo/):`);
  } else {
    console.log(`Tasks in tasks/${dir}/:`);
  }
  console.log('');
  console.log(`${'ID'.padEnd(maxIdLen)}  STATUS        ASSIGNEE       TITLE`);
  console.log('-'.repeat(maxIdLen + 60));

  for (const t of filtered) {
    const id = t.meta.id.padEnd(maxIdLen);
    const status = t.meta.status.padEnd(12);
    const assignee = (t.meta.assignee || '-').padEnd(13);
    const tags = t.meta.tags.length > 0 ? ` [${t.meta.tags.join(',')}]` : '';
    console.log(`${id}  ${status}  ${assignee}  ${t.meta.title}${tags}`);
  }
}
