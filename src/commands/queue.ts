import * as fs from 'fs';
import * as path from 'path';
import { scanDir, tasksDir } from '../tasks';
import { TaskDir } from '../types';

export function queueCommand(): void {
  const dirs = ['backlog', 'ready', 'progress', 'blocked', 'review', 'rework', 'done', 'draft'];
  const counts: Record<string, number> = {};
  for (const dir of dirs) {
    counts[dir] = scanDir(dir as TaskDir).length;
  }

  const show = (label: string, n: number) => `${label}: ${String(n).padStart(2)}`;
  console.log([
    show('backlog', counts.backlog),
    show('ready', counts.ready),
    show('progress', counts.progress),
    show('blocked', counts.blocked),
  ].join(' | '));
  console.log([
    show('review', counts.review),
    show('rework', counts.rework),
    show('done', counts.done),
  ].join(' | '));
  console.log(show('draft', counts.draft));

  const progressDir = path.join(tasksDir(), 'progress');
  if (fs.existsSync(progressDir)) {
    const now = new Date();
    let overdueCount = 0;
    for (const f of fs.readdirSync(progressDir)) {
      if (!f.endsWith('.md') || f.endsWith('_report.md') || f.endsWith('_report_draft.md')) continue;
      const content = fs.readFileSync(path.join(progressDir, f), 'utf-8');
      const ts = getFmTimestamp(content, 'started_at') || getFmTimestamp(content, 'created_at') || getFmTimestamp(content, 'createdAt');
      if (ts) {
        const d = parseDate(ts);
        if (d) {
          const days = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          if (days > 7) {
            console.log(`[!] ${f.replace(/\.md$/, '')} — ${Math.floor(days)} days in progress`);
            overdueCount++;
          }
        }
      }
    }
    if (overdueCount > 0) {
      console.log(`${overdueCount} overdue task${overdueCount === 1 ? '' : 's'} in progress/`);
    }
  }
}

function getFmTimestamp(content: string, key: string): string | undefined {
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
