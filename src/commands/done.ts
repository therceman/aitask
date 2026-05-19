import { resolveTask, lifecycleTransition, findReportPair } from '../tasks';
import * as fs from 'fs';

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

  console.log(`Task ${id} done — moved to tasks/done/`);
}
