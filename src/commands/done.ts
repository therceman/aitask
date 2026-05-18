import { resolveTask, lifecycleTransition, tasksDir } from '../tasks';
import * as fs from 'fs';
import * as path from 'path';

const DONE_FROM = ['review', 'rework', 'progress'];

export function doneCommand(id: string | undefined, flags?: Record<string, string | boolean>): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask done <id>');
    process.exit(1);
  }

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  if (!DONE_FROM.includes(task.dir)) {
    console.error(`Error: Task "${id}" must be in review/, rework/, or progress/ to mark done (current: ${task.dir}/)`);
    process.exit(1);
  }

  const force = flags?.force === true;

  if (!force) {
    const base = path.basename(task.path, '.md');
    const root = tasksDir();
    let found = false;
    if (fs.existsSync(root)) {
      for (const dirent of fs.readdirSync(root, { withFileTypes: true })) {
        if (!dirent.isDirectory()) continue;
        const dp = path.join(root, dirent.name);
        if (fs.existsSync(path.join(dp, `${base}_report.md`)) ||
            fs.existsSync(path.join(dp, `${base}_report_draft.md`))) {
          found = true;
          break;
        }
      }
    }
    if (!found) {
      console.error(`Error: No report found for "${id}". Use --force to override.`);
      process.exit(1);
    }
  } else {
    console.warn(`Warning: Completing task "${id}" without report.`);
  }

  const content = fs.readFileSync(task.path, 'utf-8');

  const pair = findPair(task);
  if (pair.draft && !pair.report) {
    const reportPath = pair.draft.replace('_report_draft.md', '_report.md');
    fs.renameSync(pair.draft, reportPath);
    console.log(`Renamed ${path.basename(pair.draft)} -> ${path.basename(reportPath)}`);
  }

  const result = lifecycleTransition(task, 'done', 'done_at', 'done');
  if (!result) {
    console.error(`Error: Could not finalize task "${id}"`);
    process.exit(1);
  }

  console.log(`Task ${id} done — moved to tasks/done/`);
}

function findPair(task: { path: string }): { draft?: string; report?: string } {
  const dir = path.dirname(task.path);
  const base = path.basename(task.path, '.md');
  const result: { draft?: string; report?: string } = {};
  const root = tasksDir();
  const searchDirs = [...new Set([dir, root])];
  for (const sd of searchDirs) {
    if (!fs.existsSync(sd)) continue;
    for (const f of fs.readdirSync(sd)) {
      if (f === `${base}_report_draft.md`) result.draft = path.join(sd, f);
      if (f === `${base}_report.md`) result.report = path.join(sd, f);
    }
  }
  return result;
}
