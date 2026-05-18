import * as path from 'path';
import { findTask, findReportPair, validateTask } from '../tasks';

export function validateCommand(id: string | undefined): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask validate <id>');
    process.exit(1);
  }

  const task = findTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  const issues = validateTask(id);

  console.log(`Validation for ${id}:`);
  console.log(`  Location: tasks/${task.dir}/${path.basename(task.path)}`);
  console.log(`  Status: ${task.meta.status}`);
  console.log(`  Assignee: ${task.meta.assignee || '(unassigned)'}`);
  console.log(`  Template: ${task.meta.template}`);

  const pair = findReportPair(task);
  console.log(`  Report draft: ${pair.draft ? 'yes' : 'no'}`);
  console.log(`  Report final: ${pair.report ? 'yes' : 'no'}`);

  if (issues.length === 0) {
    console.log('  Result: PASS — no issues found');
    process.exit(0);
  } else {
    console.log('  Issues:');
    for (const issue of issues) {
      console.log(`    - ${issue}`);
    }
    console.log('  Result: FAIL');
    process.exit(1);
  }
}
