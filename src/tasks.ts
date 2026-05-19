import * as fs from 'fs';
import * as path from 'path';
import { TaskMeta, TaskFile, TaskDir, TASK_DIRS } from './types';
import { now, updateFrontmatterTimestamp } from './timestamps';
import { appendTimelineEntry } from './timeline';

export const TASKS_DIR = 'tasks';

export function tasksDir(cwd?: string): string {
  return path.join(cwd || process.cwd(), TASKS_DIR);
}

export function taskDir(dir: TaskDir, cwd?: string): string {
  return path.join(tasksDir(cwd), dir);
}

export function ensureDirs(cwd?: string): void {
  const base = tasksDir(cwd);
  for (const d of TASK_DIRS) {
    fs.mkdirSync(path.join(base, d), { recursive: true });
  }
}

export function formatFrontmatter(meta: TaskMeta): string {
  const lines = ['---'];
  lines.push(`id: ${meta.id}`);
  lines.push(`title: ${meta.title}`);
  lines.push(`assignee: ${meta.assignee || ''}`);
  lines.push(`template: ${meta.template}`);
  lines.push(`tags: ${meta.tags.join(',')}`);
  lines.push(`createdAt: ${meta.createdAt}`);
  lines.push(`updatedAt: ${meta.updatedAt}`);
  lines.push('---');
  return lines.join('\n');
}

export function parseFrontmatter(content: string): { meta: Partial<TaskMeta>; body: string } {
  const meta: Partial<TaskMeta> = {};
  let body = content;

  if (content.startsWith('---\n')) {
    const end = content.indexOf('\n---\n', 4);
    if (end !== -1) {
      const fm = content.slice(4, end);
      body = content.slice(end + 5);
      for (const line of fm.split('\n')) {
        const idx = line.indexOf(': ');
        if (idx !== -1) {
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 2).trim();
          switch (key) {
            case 'id': meta.id = val; break;
            case 'title': meta.title = val; break;
            case 'assignee': meta.assignee = val; break;
            case 'template': meta.template = val; break;
            case 'tags': meta.tags = val ? val.split(',').map((t) => t.trim()).filter(Boolean) : []; break;
            case 'createdAt': meta.createdAt = val; break;
            case 'updatedAt': meta.updatedAt = val; break;
          }
        }
      }
    }
  }

  return { meta, body };
}

function extractIdFromBody(body: string): string {
  const m = body.match(/^## ID\n`(.+?)`/m);
  return m ? m[1] : '';
}

function extractTitleFromBody(body: string): string {
  const m = body.match(/^# Task\s+(?:\d+:\s*)?(.+)$/m);
  return m ? m[1].trim() : '';
}

export function scanDir(dir: TaskDir, cwd?: string): TaskFile[] {
  const d = taskDir(dir, cwd);
  if (!fs.existsSync(d)) return [];

  const files: TaskFile[] = [];
  const walk = (dirPath: string): void => {
    for (const f of fs.readdirSync(dirPath)) {
      const fp = path.join(dirPath, f);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        walk(fp);
        continue;
      }
      if (!f.endsWith('.md')) continue;
      if (f.endsWith('_report.md') || f.endsWith('_report_draft.md')) continue;
      if (f.toLowerCase() === 'readme.md') continue;

      const content = fs.readFileSync(fp, 'utf-8');
      const { meta: fmMeta, body } = parseFrontmatter(content);

      files.push({
        meta: {
          id: fmMeta.id || extractIdFromBody(content) || f.replace(/\.md$/, ''),
          title: fmMeta.title || extractTitleFromBody(content) || f.replace(/\.md$/, ''),
          assignee: fmMeta.assignee || '',
          template: fmMeta.template || 'task',
          tags: fmMeta.tags || [],
          createdAt: fmMeta.createdAt || '',
          updatedAt: fmMeta.updatedAt || '',
        },
        path: fp,
        dir,
        body,
      });
    }
  };

  walk(d);

  files.sort((a, b) => a.meta.id.localeCompare(b.meta.id));
  return files;
}

function collectMarkdownFilesRecursive(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dirPath: string): void => {
    for (const name of fs.readdirSync(dirPath)) {
      const filePath = path.join(dirPath, name);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walk(filePath);
      } else if (name.endsWith('.md')) {
        out.push(filePath);
      }
    }
  };
  walk(root);
  return out;
}

function likelyReportName(base: string, filePath: string): boolean {
  const name = path.basename(filePath).toLowerCase();
  const idMatch = base.match(/(ADR-\d{3}-T\d{3}[A-Z]?|NO-ADR-T\d{3}[A-Z]?)/i);
  const taskId = idMatch ? idMatch[1].toLowerCase() : '';
  if (name === `${base.toLowerCase()}_report.md` || name === `${base.toLowerCase()}_report_draft.md`) return true;
  if (taskId && name.includes(taskId) && name.endsWith('.md') && name.includes('report')) return true;
  if (!name.includes(base.toLowerCase())) return false;
  if (!name.endsWith('.md')) return false;
  return name.includes('report');
}

export function findReportFiles(task: TaskFile, cwd?: string): { draft?: string; report?: string } {
  const base = path.basename(task.path, '.md');
  const repoRoot = cwd || process.cwd();
  const taskRoot = tasksDir(repoRoot);
  const searchRoots = [
    path.dirname(task.path),
    taskRoot,
    path.join(repoRoot, 'reports'),
    path.join(repoRoot, 'reports', 'tasks'),
    path.join(repoRoot, 'reports', 'rendering'),
  ];

  const result: { draft?: string; report?: string } = {};
  const seen = new Set<string>();
  for (const root of searchRoots) {
    for (const filePath of collectMarkdownFilesRecursive(root)) {
      if (seen.has(filePath)) continue;
      seen.add(filePath);
      if (path.resolve(filePath) === path.resolve(task.path)) continue;
      if (!likelyReportName(base, filePath)) continue;
      const lower = path.basename(filePath).toLowerCase();
      if (lower.includes('draft') && !result.draft) {
        result.draft = filePath;
      } else if (!lower.includes('draft') && !result.report) {
        result.report = filePath;
      }
    }
  }
  return result;
}

export function findReportPair(task: TaskFile, cwd?: string): { draft?: string; report?: string } {
  const resolved = findReportFiles(task, cwd);
  if (resolved.report || resolved.draft) return resolved;

  const dir = path.dirname(task.path);
  const base = path.basename(task.path, '.md');
  const fallback: { draft?: string; report?: string } = {};
  const root = tasksDir(cwd || process.cwd());
  const searchDirs = [...new Set([dir, root])];
  for (const sd of searchDirs) {
    if (!fs.existsSync(sd)) continue;
    for (const f of fs.readdirSync(sd)) {
      if (f === `${base}_report_draft.md`) fallback.draft = path.join(sd, f);
      if (f === `${base}_report.md`) fallback.report = path.join(sd, f);
    }
  }
  return fallback;
}

export function findTask(id: string, cwd?: string): TaskFile | undefined {
  for (const dir of TASK_DIRS) {
    const found = scanDir(dir, cwd).find((t) => t.meta.id === id);
    if (found) return found;
  }
  return undefined;
}

export function resolveTask(id: string, cwd?: string): TaskFile | undefined {
  let task = findTask(id, cwd);
  if (task) return task;

  const all = findAllTasks(cwd);
  const idUpper = String(id).toUpperCase();
  task = all.find(t => t.meta.id.endsWith(id));
  if (task) return task;

  task = all.find(t => {
    const baseName = path.basename(t.path, '.md');
    const baseUpper = baseName.toUpperCase();
    return (
      baseName === id
      || baseName.endsWith(`_${id}`)
      || baseName.includes(`_${id}_`)
      || baseUpper === idUpper
      || baseUpper.startsWith(`${idUpper}-`)
      || baseUpper.startsWith(`${idUpper}_`)
    );
  });
  if (task) return task;

  return undefined;
}

export function findAllTasks(cwd?: string): TaskFile[] {
  const all: TaskFile[] = [];
  for (const dir of TASK_DIRS) {
    all.push(...scanDir(dir, cwd));
  }
  return all;
}

export function createTaskFile(
  id: string,
  title: string,
  templateContent: string,
  reportStub: string,
  opts: { assignee?: string; tags?: string[]; template?: string; desc?: string },
  cwd?: string,
): { taskPath: string; draftPath: string } {
  const base = taskDir('todo', cwd);
  ensureDirs(cwd);
  const filename = `${id}.md`;
  const taskPath = path.join(base, filename);
  const draftPath = path.join(tasksDir(cwd), `${id}_report_draft.md`);

  const now = new Date().toISOString();
  const meta: TaskMeta = {
    id,
    title,
    assignee: opts.assignee || '',
    template: opts.template || 'task',
    tags: opts.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  const fm = formatFrontmatter(meta);
  const body = opts.desc
    ? `\n${opts.desc}\n\n${templateContent}`
    : `\n${templateContent}`;
  const content = `${fm}\n${body}`;

  fs.writeFileSync(taskPath, content, 'utf-8');
  fs.writeFileSync(draftPath, reportStub, 'utf-8');

  return { taskPath, draftPath };
}

export function updateTaskMeta(id: string, updates: Partial<TaskMeta>, cwd?: string): TaskFile | undefined {
  const task = findTask(id, cwd);
  if (!task) return undefined;

  const content = fs.readFileSync(task.path, 'utf-8');
  const { meta: _, body } = parseFrontmatter(content);

  const updated: TaskMeta = {
    ...task.meta,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const newContent = `${formatFrontmatter(updated)}\n${body}`;
  fs.writeFileSync(task.path, newContent, 'utf-8');
  return { ...task, meta: updated };
}

export function moveTask(
  id: string,
  toDir: TaskDir,
  cwd?: string,
): { task?: TaskFile; reportDraft?: string; report?: string } | undefined {
  const task = findTask(id, cwd);
  if (!task) return undefined;

  const pair = findReportPair(task, cwd);
  const toBase = taskDir(toDir, cwd);
  ensureDirs(cwd);

  const result: { task?: TaskFile; reportDraft?: string; report?: string } = {};

  const newTaskPath = path.join(toBase, path.basename(task.path));
  fs.renameSync(task.path, newTaskPath);
  result.task = { ...task, path: newTaskPath, dir: toDir };

  if (pair.draft && fs.existsSync(pair.draft)) {
    const newDraft = path.join(toBase, path.basename(pair.draft));
    fs.renameSync(pair.draft, newDraft);
    result.reportDraft = newDraft;
  }
  if (pair.report && fs.existsSync(pair.report)) {
    const newReport = path.join(toBase, path.basename(pair.report));
    fs.renameSync(pair.report, newReport);
    result.report = newReport;
  }

  return result;
}

export function lifecycleTransition(
  task: TaskFile,
  toDir: TaskDir,
  timestampKey: string,
  newState: string,
  reason?: string,
  cwd?: string,
): { task: TaskFile; content: string } | undefined {
  const content = fs.readFileSync(task.path, 'utf-8');
  const ts = now();

  let updated = updateFrontmatterTimestamp(content, timestampKey, ts);
  updated = updateFrontmatterTimestamp(updated, 'updated_at', ts);
  updated = appendTimelineEntry(updated, ts, newState, reason);

  const pair = findReportPair(task, cwd);
  const toBase = taskDir(toDir, cwd);
  ensureDirs(cwd);
  const newPath = path.join(toBase, path.basename(task.path));

  fs.writeFileSync(newPath, updated, 'utf-8');
  fs.unlinkSync(task.path);

  if (pair.draft && fs.existsSync(pair.draft)) {
    fs.renameSync(pair.draft, path.join(toBase, path.basename(pair.draft)));
  }
  if (pair.report && fs.existsSync(pair.report)) {
    fs.renameSync(pair.report, path.join(toBase, path.basename(pair.report)));
  }

  return {
    task: { ...task, path: newPath, dir: toDir },
    content: updated,
  };
}

export function validateTask(id: string, cwd?: string): string[] {
  const issues: string[] = [];
  const task = findTask(id, cwd);
  if (!task) {
    issues.push(`Task "${id}" not found`);
    return issues;
  }

  const pair = findReportPair(task, cwd);
  if (!pair.draft && !pair.report) {
    issues.push('No report file found (need _report.md or _report_draft.md)');
  }

  if (!task.meta.assignee) {
    issues.push('No assignee set');
  }

  return issues;
}

export function nowISO(): string {
  return new Date().toISOString();
}

// ---- Draft helpers ----

export function getMaxNumericId(cwd?: string): number {
  const base = tasksDir(cwd);
  let maxN = 0;
  for (const dir of fs.readdirSync(base, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const dp = path.join(base, dir.name);
    for (const f of fs.readdirSync(dp)) {
      const m = f.match(/^task_(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxN) maxN = n;
      }
    }
  }
  return maxN;
}

export function createDraftFile(
  title: string,
  taskContent: string,
  reportContent: string,
  opts: { assignee?: string; tags?: string[]; template?: string; desc?: string },
  cwd?: string,
): { num: number; taskPath: string; reportPath: string } {
  ensureDirs(cwd);

  const n = getMaxNumericId(cwd) + 1;
  const numStr = String(n).padStart(3, '0');
  const draftDir = taskDir('draft', cwd);

  const taskFilename = `task_${numStr}.md`;
  const reportFilename = `task_${numStr}_report_draft.md`;
  const taskPath = path.join(draftDir, taskFilename);
  const reportPath = path.join(draftDir, reportFilename);

  const now = nowISO();
  const meta: TaskMeta = {
    id: `task_${numStr}`,
    title,
    assignee: opts.assignee || '',
    template: opts.template || 'task',
    tags: opts.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  const fm = formatFrontmatter(meta);
  const body = opts.desc
    ? `\n${opts.desc}\n\n${taskContent}`
    : `\n${taskContent}`;
  const content = `${fm}\n${body}`;

  fs.writeFileSync(taskPath, content, 'utf-8');
  fs.writeFileSync(reportPath, reportContent, 'utf-8');

  return { num: n, taskPath, reportPath };
}

export function publishDraft(
  num: number,
  sourceDir?: string,
  targetDir?: string,
): { finalId: string; taskPath: string; reportPath: string } | undefined {
  const numStr = String(num).padStart(3, '0');
  const draftDir = taskDir('draft', sourceDir);
  const todoDir = taskDir('todo', targetDir || sourceDir);
  ensureDirs(targetDir || sourceDir);

  const taskFilename = `task_${numStr}.md`;
  const reportFilename = `task_${numStr}_report_draft.md`;
  const draftTaskPath = path.join(draftDir, taskFilename);
  const draftReportPath = path.join(draftDir, reportFilename);

  if (!fs.existsSync(draftTaskPath)) {
    console.error(`Error: Draft task file not found: tasks/draft/${taskFilename}`);
    return undefined;
  }

  const content = fs.readFileSync(draftTaskPath, 'utf-8');
  const { meta: fmMeta, body } = parseFrontmatter(content);
  const title = fmMeta.title || extractTitleFromBody(content) || `task_${numStr}`;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);

  const finalId = `task_${numStr}_${slug}`;

  const finalTaskPath = path.join(todoDir, `${finalId}.md`);
  const finalReportPath = path.join(todoDir, `${finalId}_report_draft.md`);

  if (fs.existsSync(finalTaskPath)) {
    console.error(`Error: Target file already exists: tasks/todo/${finalId}.md`);
    console.error('Use --force to overwrite.');
    return undefined;
  }

  const now = nowISO();
  const pubMeta: TaskMeta = {
    id: finalId,
    title,
    assignee: fmMeta.assignee || '',
    template: fmMeta.template || 'task',
    tags: fmMeta.tags || [],
    createdAt: fmMeta.createdAt || now,
    updatedAt: now,
  };
  const pubFm = formatFrontmatter(pubMeta);
  const pubBody = body || `## ID\n\`${finalId}\`\n\n## Title\n${title}\n`;
  fs.writeFileSync(finalTaskPath, `${pubFm}\n${pubBody}`, 'utf-8');

  if (fs.existsSync(draftReportPath)) {
    const reportContent = fs.readFileSync(draftReportPath, 'utf-8');
    const updatedReport = reportContent.replace(/task_\d+/g, finalId);
    fs.writeFileSync(finalReportPath, updatedReport, 'utf-8');
  } else {
    console.warn(`Warning: No report draft found at tasks/draft/${reportFilename}. Creating empty report.`);
    fs.writeFileSync(finalReportPath, `# Task Report\n\n## Task ID\n\`${finalId}\`\n\n## Summary\n-\n`, 'utf-8');
  }

  fs.unlinkSync(draftTaskPath);
  if (fs.existsSync(draftReportPath)) {
    fs.unlinkSync(draftReportPath);
  }

  return { finalId, taskPath: finalTaskPath, reportPath: finalReportPath };
}

export function getNextNumber(existingIds: string[]): number {
  const nums = existingIds
    .map((id) => {
      const m = id.match(/^task_(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}
