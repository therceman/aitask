import * as fs from 'fs';
import * as path from 'path';
import { findTask, findReportPair, tasksDir } from '../tasks';
import { TASK_DIRS, TaskDir } from '../types';

const TIMESTAMP_KEYS = ['created_at', 'started_at', 'ready_at', 'review_at', 'done_at', 'blocked_at', 'unblocked_at', 'superseded_at'];
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function getFmFields(content: string): Map<string, string> {
  const fields = new Map<string, string>();
  if (!content.startsWith('---\n')) return fields;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return fields;
  const fm = content.slice(4, end);
  for (const line of fm.split('\n')) {
    const idx = line.indexOf(': ');
    if (idx !== -1) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 2).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      fields.set(key, val);
    }
  }
  return fields;
}

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

  const content = fs.readFileSync(task.path, 'utf-8');
  const fields = getFmFields(content);
  const issues: string[] = [];

  // 1. Path matches canonical state folder
  const taskDirName = path.basename(path.dirname(task.path));
  if (!TASK_DIRS.includes(taskDirName as TaskDir)) {
    issues.push(`Task file not in a canonical state folder: ${taskDirName}/`);
  }

  // 2. No status: frontmatter
  if (fields.has('status')) {
    issues.push('Frontmatter contains "status:" field — state should be folder-derived only');
  }

  // 3. No completed_at
  if (fields.has('completed_at')) {
    issues.push('Frontmatter contains "completed_at:" — use "done_at" instead');
  }

  // 4. Required timestamps present based on state
  if (taskDirName === 'progress' && !fields.has('started_at')) {
    issues.push('Task in progress/ but missing started_at');
  }
  if (taskDirName === 'review') {
    if (!fields.has('started_at')) issues.push('Task in review/ but missing started_at');
    if (!fields.has('review_at')) issues.push('Task in review/ but missing review_at');
  }
  if (taskDirName === 'rework') {
    if (!fields.has('started_at')) issues.push('Task in rework/ but missing started_at');
    if (!fields.has('review_at')) issues.push('Task in rework/ but missing review_at');
    if (!fields.has('rework_at')) issues.push('Task in rework/ but missing rework_at');
  }
  if (taskDirName === 'blocked' && !fields.has('blocked_at')) {
    issues.push('Task in blocked/ but missing blocked_at');
  }
  if (taskDirName === 'ready' && !fields.has('ready_at')) {
    issues.push('Task in ready/ but missing ready_at');
  }

  // 5. Timestamp format is YYYY-MM-DD HH:mm:ss
  for (const key of TIMESTAMP_KEYS) {
    const val = fields.get(key);
    if (val && !TIMESTAMP_RE.test(val)) {
      issues.push(`Timestamp "${key}" has invalid format: "${val}" (expected YYYY-MM-DD HH:mm:ss)`);
    }
  }

  // 6. Done tasks have done_at and evidence
  if (taskDirName === 'done') {
    if (!fields.has('done_at')) {
      issues.push('Task in done/ but missing done_at');
    }

    const pair = findReportPair(task);
    if (!pair.report && !pair.draft) {
      issues.push('Task in done/ but no report file found');
    } else if (pair.report) {
      const reportContent = fs.readFileSync(pair.report, 'utf-8').trim();
      if (!reportContent) {
        issues.push('Report file is empty');
      }
    }
  }

  // 7. Report task ID matches target
  const pair = findReportPair(task);
  if (pair.report) {
    const reportContent = fs.readFileSync(pair.report, 'utf-8');
    const reportIdMatch = reportContent.match(/`(.+?)`/);
    if (reportIdMatch && reportIdMatch[1] !== id) {
      issues.push(`Report Task ID mismatch: report references "${reportIdMatch[1]}" but target is "${id}"`);
    }
  }

  console.log(`Validation for ${id}:`);
  console.log(`  Location: tasks/${task.dir}/${path.basename(task.path)}`);
  console.log(`  Title: ${task.meta.title}`);

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
