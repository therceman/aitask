import { resolveTask, lifecycleTransition, findReportPair } from '../tasks';
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
  const pair = findReportPair(task);

  if (!force) {
    if (!pair.report && !pair.draft) {
      console.error(`Error: report.md not found for "${id}". Use --force to override.`);
      process.exit(1);
    }
  } else {
    console.warn(`Warning: Completing task "${id}" without report.`);
  }

  if (pair.draft && !pair.report) {
    const reportPath = pair.draft.replace('_report_draft.md', '_report.md');
    fs.renameSync(pair.draft, reportPath);
    console.log(`Renamed draft report -> final report`);
  }

  const result = lifecycleTransition(task, 'done', 'done_at', 'done');
  if (!result) {
    console.error(`Error: Could not finalize task "${id}"`);
    process.exit(1);
  }
  const doneTask = result.task;
  const adrMatch = doneTask.meta.id.match(/^(ADR-\d{3})-T\d{3}[A-Z]?/i);
  if (adrMatch) {
    const adrId = adrMatch[1].toUpperCase();
    const repoRoot = process.cwd();

    // Canonical task path: tasks/done/<ADR>/<task-file>.md
    const taskDir = path.join(repoRoot, 'tasks', 'done', adrId);
    fs.mkdirSync(taskDir, { recursive: true });
    const canonicalTaskPath = path.join(taskDir, path.basename(doneTask.path));
    if (path.resolve(doneTask.path) !== path.resolve(canonicalTaskPath)) {
      fs.renameSync(doneTask.path, canonicalTaskPath);
      doneTask.path = canonicalTaskPath;
    }

    // Canonical report path: reports/tasks/<ADR>/<TASK_ID>_report.md
    const donePair = findReportPair(doneTask);
    const sourceReport = donePair.report || donePair.draft;
    if (sourceReport && fs.existsSync(sourceReport)) {
      const reportDir = path.join(repoRoot, 'reports', 'tasks', adrId);
      fs.mkdirSync(reportDir, { recursive: true });
      const canonicalReport = path.join(reportDir, `${doneTask.meta.id}_report.md`);
      if (donePair.draft && !donePair.report) {
        fs.renameSync(donePair.draft, canonicalReport);
      } else if (path.resolve(sourceReport) !== path.resolve(canonicalReport)) {
        fs.renameSync(sourceReport, canonicalReport);
      }
    }
  }

  console.log(`Task ${id} done — moved to canonical done/report paths`);
}
