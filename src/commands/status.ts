import { TaskStatus, VALID_STATUSES } from '../types';
import { findTask, updateTaskMeta, moveTask, findReportPair } from '../tasks';
import * as path from 'path';
import * as fs from 'fs';

export function statusCommand(id: string | undefined, newStatus: string | undefined): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask status <id> <todo|in_progress|done|rejected|rework>');
    process.exit(1);
  }
  if (!newStatus) {
    console.error('Error: New status required');
    console.error('Usage: aitask status <id> <todo|in_progress|done|rejected|rework>');
    process.exit(1);
  }

  if (!VALID_STATUSES.includes(newStatus as TaskStatus)) {
    console.error(`Error: Invalid status "${newStatus}". Valid: ${VALID_STATUSES.join(', ')}`);
    process.exit(1);
  }

  const task = findTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  // File transitions based on status
  if (newStatus === 'done' && task.dir !== 'done') {
    // Move task + report pair to done/
    const result = moveTask(id, 'done');
    if (!result || !result.task) {
      console.error(`Error: Could not move task "${id}" to done/`);
      process.exit(1);
    }
    const reportMsg = result.report ? ` + report` : result.reportDraft ? ` + draft` : '';
    console.log(`Moved ${id} to tasks/done/${reportMsg}`);
  } else if ((newStatus === 'rejected' || newStatus === 'rework') && task.dir !== 'rework') {
    const result = moveTask(id, 'rework');
    if (!result || !result.task) {
      console.error(`Error: Could not move task "${id}" to rework/`);
      process.exit(1);
    }
    const reportMsg = result.report ? ` + report` : result.reportDraft ? ` + draft` : '';
    console.log(`Moved ${id} to tasks/rework/${reportMsg}`);
  } else {
    updateTaskMeta(id, { status: newStatus as TaskStatus });
    console.log(`Task ${id} status updated to ${newStatus}`);
  }
}
