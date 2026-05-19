import * as fs from 'fs';
import * as path from 'path';
import { TASK_DIRS, TaskDir } from '../types';
import { tasksDir, findAllTasks, findReportPair } from '../tasks';

export interface AuditIssue {
  type: 'FAIL' | 'WARN';
  file: string;
  message: string;
}

export interface AuditOptions {
  activeOnly?: boolean;
}

export function auditCommand(opts?: AuditOptions): void {
  const issues = runAudit(undefined, opts);

  if (issues.length === 0) {
    const total = countAllTasks();
    console.log(`OK: ${total} tasks, 0 issues`);
    process.exit(0);
  }

  for (const issue of issues) {
    console.log(`${issue.type}: ${reducePath(issue.file)} -> ${issue.message}`);
  }

  const failCount = new Set(issues.filter(i => i.type === 'FAIL').map(i => i.file)).size;
  const warnCount = new Set(issues.filter(i => i.type === 'WARN').map(i => i.file)).size;
  const passCount = countAllTasks() - failCount;

  console.log('---');
  console.log(`PASS: ${passCount} | FAIL: ${failCount} | WARN: ${warnCount}`);

  process.exit(failCount > 0 ? 1 : 0);
}

function reducePath(p: string): string {
  const tasksIdx = p.indexOf('tasks/');
  return tasksIdx !== -1 ? p.slice(tasksIdx) : p;
}

export function countAllTasks(cwd?: string): number {
  return findAllTasks(cwd).length;
}

export function runAudit(cwd?: string, opts?: AuditOptions): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const base = tasksDir(cwd);
  const activeOnly = opts?.activeOnly === true;

  if (!fs.existsSync(base)) return issues;

  const requiredLifecycleDirs: TaskDir[] = ['backlog', 'ready', 'progress', 'review', 'rework', 'blocked', 'done', 'superseded'];
  for (const dir of requiredLifecycleDirs) {
    const dirPath = path.join(base, dir);
    if (!fs.existsSync(dirPath)) {
      issues.push({ type: 'FAIL', file: dirPath, message: 'missing canonical lifecycle folder' });
    }
  }

  const todoPath = path.join(base, 'todo');
  if (fs.existsSync(todoPath)) {
    const todoTaskFiles = collectTaskFiles(todoPath);
    if (todoTaskFiles.length > 0) {
      issues.push({
        type: 'FAIL',
        file: todoPath,
        message: 'legacy state folder in use (tasks/todo). Migrate tasks to backlog/ready.',
      });
    }
  }

  for (const task of findAllTasks(cwd)) {
    const dir = task.dir;
    const fp = task.path;
    if (dir === 'archive' || dir === 'superseded') continue;
    if (activeOnly && dir === 'done') continue;
    const content = fs.readFileSync(fp, 'utf-8');

    const pair = findReportPair(task, cwd);
    const reportPath = pair.report || pair.draft;
    if (dir === 'done') {
      if (!reportPath) {
        issues.push({ type: 'FAIL', file: fp, message: 'missing report' });
      } else {
        const reportContent = fs.readFileSync(reportPath, 'utf-8').trim();
        if (!reportContent) {
          issues.push({ type: 'FAIL', file: fp, message: 'report is empty' });
        } else if (!reportContent.includes('## Summary') && !reportContent.includes('## Task ID')) {
          issues.push({ type: 'WARN', file: fp, message: 'report may lack required sections' });
        }
      }
    }

    if (dir !== 'done' && dir !== 'draft') {
      if (reportPath) {
        issues.push({ type: 'WARN', file: fp, message: 'report exists but task not done' });
      }
    }

    const created_at = getFmField(content, 'created_at') || getFmField(content, 'createdAt');
    const started_at = getFmField(content, 'started_at');
    const review_at = getFmField(content, 'review_at');
    const done_at = getFmField(content, 'done_at');

    if (created_at && done_at && compareTimestamps(created_at, done_at) > 0) {
      issues.push({ type: 'FAIL', file: fp, message: 'timestamp ordering violation (done_at < created_at)' });
    }
    if (started_at && done_at && compareTimestamps(started_at, done_at) > 0) {
      issues.push({ type: 'FAIL', file: fp, message: 'timestamp ordering violation (done_at < started_at)' });
    }
    if (created_at && started_at && compareTimestamps(created_at, started_at) > 0) {
      issues.push({ type: 'FAIL', file: fp, message: 'timestamp ordering violation (started_at < created_at)' });
    }
    if (started_at && review_at && compareTimestamps(started_at, review_at) > 0) {
      issues.push({ type: 'FAIL', file: fp, message: 'timestamp ordering violation (review_at < started_at)' });
    }
    if (review_at && done_at && compareTimestamps(review_at, done_at) > 0) {
      issues.push({ type: 'FAIL', file: fp, message: 'timestamp ordering violation (done_at < review_at)' });
    }
  }

  const progressDir = path.join(base, 'progress');
  if (fs.existsSync(progressDir)) {
    const now = new Date();
    for (const f of fs.readdirSync(progressDir)) {
      if (!f.endsWith('.md') || f.endsWith('_report.md') || f.endsWith('_report_draft.md')) continue;
      const fp = path.join(progressDir, f);
      const content = fs.readFileSync(fp, 'utf-8');
      const created_at = getFmField(content, 'created_at') || getFmField(content, 'createdAt');
      const started_at = getFmField(content, 'started_at') || created_at;
      if (started_at) {
        const d = parseTimestamp(started_at);
        if (d) {
          const days = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          if (days > 7) {
            issues.push({ type: 'WARN', file: fp, message: `stale task in progress/ (${Math.floor(days)} days)` });
          }
        }
      }
    }
  }

  return issues;
}

function collectTaskFiles(root: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(root)) return out;
  const walk = (dirPath: string): void => {
    for (const entry of fs.readdirSync(dirPath)) {
      const filePath = path.join(dirPath, entry);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walk(filePath);
        continue;
      }
      if (!entry.endsWith('.md')) continue;
      if (entry.endsWith('_report.md') || entry.endsWith('_report_draft.md')) continue;
      if (entry.toLowerCase() === 'readme.md') continue;
      out.push(filePath);
    }
  };
  walk(root);
  return out;
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

function parseTimestamp(ts: string): Date | undefined {
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d;
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
  return undefined;
}

function compareTimestamps(a: string, b: string): number {
  const da = parseTimestamp(a);
  const db = parseTimestamp(b);
  if (!da || !db) return 0;
  return da.getTime() - db.getTime();
}
