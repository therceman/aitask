import * as fs from 'fs';
import * as path from 'path';
import { TASK_DIRS, TaskDir } from '../types';
import { tasksDir, parseFrontmatter } from '../tasks';

export interface AuditIssue {
  type: 'FAIL' | 'WARN';
  file: string;
  message: string;
}

export function auditCommand(): void {
  const issues = runAudit();

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
  let count = 0;
  for (const dir of TASK_DIRS) {
    const d = path.join(tasksDir(cwd), dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (f.endsWith('.md') && !f.endsWith('_report.md') && !f.endsWith('_report_draft.md')) {
        count++;
      }
    }
  }
  return count;
}

export function runAudit(cwd?: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const base = tasksDir(cwd);

  if (!fs.existsSync(base)) return issues;

  for (const dir of TASK_DIRS) {
    const d = path.join(base, dir);
    if (!fs.existsSync(d)) continue;
    if (dir === 'archive' || dir === 'superseded') continue;

    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.md') || f.endsWith('_report.md') || f.endsWith('_report_draft.md')) continue;
      const fp = path.join(d, f);
      const content = fs.readFileSync(fp, 'utf-8');
      const { meta } = parseFrontmatter(content);
      const baseName = f.replace(/\.md$/, '');

      if (dir === 'done' && meta.status && meta.status !== 'done') {
        issues.push({ type: 'FAIL', file: fp, message: `folder/state mismatch (folder=done, status=${meta.status})` });
      } else if (dir !== 'done' && dir !== 'draft' && meta.status === 'done') {
        issues.push({ type: 'FAIL', file: fp, message: `folder/state mismatch (folder=${dir}, status=done)` });
      }

      if (dir === 'done') {
        const reportPath = findReportFile(baseName, base);
        if (!reportPath) {
          issues.push({ type: 'FAIL', file: fp, message: 'missing report' });
        }
      }

      if (dir !== 'done' && dir !== 'draft') {
        const reportPath = findReportFile(baseName, base);
        if (reportPath) {
          issues.push({ type: 'WARN', file: fp, message: 'report exists but task not done' });
        }
      }

      const created_at = getFmField(content, 'created_at') || getFmField(content, 'createdAt');
      const started_at = getFmField(content, 'started_at');
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

function findReportFile(baseName: string, base: string): string | undefined {
  for (const dirent of fs.readdirSync(base, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const dp = path.join(base, dirent.name);
    const reportPath = path.join(dp, `${baseName}_report.md`);
    if (fs.existsSync(reportPath)) return reportPath;
    const draftPath = path.join(dp, `${baseName}_report_draft.md`);
    if (fs.existsSync(draftPath)) return draftPath;
  }
  const rootReport = path.join(base, `${baseName}_report.md`);
  if (fs.existsSync(rootReport)) return rootReport;
  const rootDraft = path.join(base, `${baseName}_report_draft.md`);
  if (fs.existsSync(rootDraft)) return rootDraft;
  return undefined;
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
