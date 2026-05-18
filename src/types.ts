export interface TaskMeta {
  id: string;
  title: string;
  assignee: string;
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

export const LIFECYCLE_TRANSITIONS: Record<string, { from: TaskDir[]; to: TaskDir; timestampKey: string; stateName: string }> = {
  ready: { from: ['backlog', 'todo'], to: 'ready', timestampKey: 'ready_at', stateName: 'ready' },
  start: { from: ['backlog', 'ready'], to: 'progress', timestampKey: 'started_at', stateName: 'progress' },
  review: { from: ['progress'], to: 'review', timestampKey: 'review_at', stateName: 'review' },
  rework: { from: ['review'], to: 'rework', timestampKey: 'rework_at', stateName: 'rework' },
  done: { from: ['progress', 'review', 'rework'], to: 'done', timestampKey: 'done_at', stateName: 'done' },
  block: { from: ['progress'], to: 'blocked', timestampKey: 'blocked_at', stateName: 'blocked' },
  unblock: { from: ['blocked'], to: 'progress', timestampKey: 'unblocked_at', stateName: 'progress' },
  supersede: { from: ['rework', 'ready', 'progress', 'blocked', 'review', 'backlog'], to: 'superseded', timestampKey: 'superseded_at', stateName: 'superseded' },
};
