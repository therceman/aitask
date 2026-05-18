import * as fs from 'fs';
import * as path from 'path';
import { scanDir, tasksDir } from '../tasks';
import { TaskDir, LIFECYCLE_TRANSITIONS } from '../types';

function getLastTransitionTimestamp(content: string): string {
  const keys = ['created_at', 'started_at', 'review_at', 'done_at', 'blocked_at', 'unblocked_at', 'superseded_at', 'createdAt'];
  let latest = '';
  let latestDate = 0;
  for (const key of keys) {
    const val = getFmField(content, key);
    if (val) {
      const d = parseDate(val);
      if (d && d.getTime() > latestDate) {
        latestDate = d.getTime();
        latest = val;
      }
    }
  }
  return latest;
}

function getFmField(content: string, key: string): string | undefined {
  if (!content.startsWith('---\n')) return undefined;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return undefined;
  const fm = content.slice(4, end);
  for (const line of fm.split('\n')) {
    const idx = line.indexOf(': ');
    if (idx !== -1 && line.slice(0, idx).trim() === key) {
      let val = line.slice(idx + 2).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      return val;
    }
  }
  return undefined;
}

function parseDate(ts: string): Date | undefined {
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d;
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
  return undefined;
}

function getTitle(content: string, fallback: string): string {
  const title = getFmField(content, 'title');
  if (title) return title;
  const m = content.match(/^# Task\s+(?:\d+:\s*)?(.+)$/m);
  return m ? m[1].trim() : fallback;
}

function padEnd(s: string, len: number): string {
  const visible = s.replace(/\u001b\[\d+m/g, '');
  const diff = s.length - visible.length;
  return s + ' '.repeat(Math.max(0, len - visible.length + diff));
}

export function queueCommand(): void {
  const activeDirs: TaskDir[] = ['backlog', 'ready', 'todo', 'progress', 'blocked', 'review', 'rework'];
  const rows: { id: string; state: string; ts: string; title: string }[] = [];

  for (const dir of activeDirs) {
    const tasks = scanDir(dir);
    for (const task of tasks) {
      const content = fs.readFileSync(task.path, 'utf-8');
      const ts = getLastTransitionTimestamp(content);
      const title = task.meta.title || getTitle(content, task.meta.id);
      rows.push({
        id: task.meta.id,
        state: dir,
        ts,
        title,
      });
    }
  }

  if (rows.length === 0) {
    console.log('No active tasks.');
    return;
  }

  const idWidth = Math.max(8, ...rows.map(r => r.id.length));
  const stateWidth = Math.max(5, ...rows.map(r => r.state.length));
  const tsWidth = 19;

  const header = `${padEnd('Task ID', idWidth)} │ ${padEnd('State', stateWidth)} │ ${padEnd('Timestamp', tsWidth)} │ Title`;
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const row of rows) {
    const ts = row.ts ? row.ts.slice(0, 16) : '';
    console.log(`${padEnd(row.id, idWidth)} │ ${padEnd(row.state, stateWidth)} │ ${padEnd(ts, tsWidth)} │ ${row.title}`);
  }
}
