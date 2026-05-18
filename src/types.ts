export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'rejected' | 'rework';

export interface TaskMeta {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  template: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFile {
  meta: TaskMeta;
  path: string;
  dir: TaskDir;
  body: string;
}

export type TaskDir = 'todo' | 'done' | 'rework' | 'archive' | 'backlog' | 'superseded' | 'draft' | 'ready' | 'progress' | 'blocked' | 'review';

export const TASK_DIRS: TaskDir[] = ['todo', 'done', 'rework', 'archive', 'backlog', 'superseded', 'draft', 'ready', 'progress', 'blocked', 'review'];

export const VALID_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'rejected', 'rework'];

export const LIFECYCLE_TRANSITIONS: Record<string, { from: TaskDir[]; to: TaskDir; timestampKey: string; stateName: string }> = {
  start: { from: ['ready', 'todo'], to: 'progress', timestampKey: 'started_at', stateName: 'progress' },
  review: { from: ['progress'], to: 'review', timestampKey: 'review_at', stateName: 'review' },
  rework: { from: ['review'], to: 'rework', timestampKey: 'rework_at', stateName: 'rework' },
  done: { from: ['review', 'rework', 'progress'], to: 'done', timestampKey: 'done_at', stateName: 'done' },
  block: { from: ['ready', 'todo', 'progress', 'review', 'rework'], to: 'blocked', timestampKey: 'blocked_at', stateName: 'blocked' },
  unblock: { from: ['blocked'], to: 'ready', timestampKey: 'unblocked_at', stateName: 'ready' },
};
