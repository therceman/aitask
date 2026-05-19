import * as fs from 'fs';
import * as path from 'path';
import { resolveTask } from '../tasks';

function normalizeChecklistLine(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^-\s*\[[ xX]\]\s+/.test(t)) return t.replace(/\[X\]/, '[x]');
  if (/^\[[ xX]\]\s+/.test(t)) return `- ${t.replace(/\[X\]/, '[x]')}`;
  return `- [ ] ${t}`;
}

function parseChecklist(content: string): { start: number; end: number; lines: string[] } | undefined {
  const lines = content.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^##\s+Checklist\s*$/i.test(lines[i].trim())) {
      start = i;
      break;
    }
  }
  if (start === -1) return undefined;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const sectionLines = lines.slice(start + 1, end);
  const items = sectionLines.filter((l) => /^\s*-\s+\[[ xX]\]\s+/.test(l.trim()));
  return { start, end, lines: items };
}

function parseEvidenceAnchor(line: string): { file: string; start: number; end: number } | undefined {
  const m = line.match(/#([^\s:]+):(\d+)(?:-(\d+))?\b/);
  if (!m) return undefined;
  const start = Number(m[2]);
  const end = Number(m[3] || m[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start) return undefined;
  return { file: m[1], start, end };
}

function normalizePath(p: string): string {
  return p.replaceAll('\\', '/').replace(/^\.\//, '');
}

function requireTask(id?: string) {
  if (!id) {
    console.error('Usage: aitask checklist <show|update|check> <id>');
    process.exit(1);
  }
  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }
  return task;
}

function showChecklist(id?: string): void {
  const task = requireTask(id);
  const content = fs.readFileSync(task.path, 'utf-8');
  const parsed = parseChecklist(content);
  if (!parsed) {
    console.error(`Error: Checklist section not found in ${task.path}`);
    process.exit(1);
  }

  console.log(`Task: ${task.meta.id}`);
  if (parsed.lines.length === 0) {
    console.log('(checklist empty)');
    process.exit(0);
  }

  let done = 0;
  let total = 0;
  for (const line of parsed.lines) {
    total += 1;
    if (/\[[xX]\]/.test(line)) done += 1;
    console.log(line.trim());
  }
  console.log(`-- ${done}/${total} checked`);
}

function updateChecklist(id?: string): void {
  const task = requireTask(id);
  const content = fs.readFileSync(task.path, 'utf-8');
  const parsed = parseChecklist(content);
  if (!parsed) {
    console.error(`Error: Checklist section not found in ${task.path}`);
    process.exit(1);
  }

  const stdin = fs.readFileSync(0, 'utf-8');
  const newItems = stdin
    .split(/\r?\n/)
    .map(normalizeChecklistLine)
    .filter(Boolean);

  const lines = content.split('\n');
  const before = lines.slice(0, parsed.start + 1);
  const after = lines.slice(parsed.end);
  const updated = [...before, ...newItems, ...after].join('\n');
  fs.writeFileSync(task.path, updated, 'utf-8');
  console.log(`Checklist updated: ${task.meta.id} (${newItems.length} items)`);
}

function checkChecklist(id?: string): void {
  const task = requireTask(id);
  const content = fs.readFileSync(task.path, 'utf-8');
  const parsed = parseChecklist(content);
  if (!parsed) {
    console.error(`Error: Checklist section not found in ${task.path}`);
    process.exit(1);
  }

  const unchecked = parsed.lines
    .map((l) => l.trim())
    .filter((l) => /\[ \]/.test(l));

  if (unchecked.length) {
    console.error(`Checklist NOT complete for ${task.meta.id}: ${unchecked.length} unchecked`);
    for (const item of unchecked) console.error(`- ${item}`);
    process.exit(1);
  }
  const checked = parsed.lines
    .map((l) => l.trim())
    .filter((l) => /\[[xX]\]/.test(l));
  const missingEvidence = checked.filter((l) => !parseEvidenceAnchor(l));
  if (missingEvidence.length) {
    console.error(`Checklist evidence missing for ${task.meta.id}: ${missingEvidence.length} checked item(s)`);
    for (const item of missingEvidence) console.error(`- ${item}`);
    process.exit(1);
  }

  console.log(`Checklist complete: ${task.meta.id}`);
}

function checkChecklistEntry(id?: string, entryNumRaw?: string, fileArg?: string, linesArg?: string): void {
  const task = requireTask(id);
  const content = fs.readFileSync(task.path, 'utf-8');
  const parsed = parseChecklist(content);
  if (!parsed) {
    console.error(`Error: Checklist section not found in ${task.path}`);
    process.exit(1);
  }

  const items = parsed.lines.map((l) => l.trim());
  if (!items.length) {
    console.error(`Error: Checklist is empty for ${task.meta.id}`);
    process.exit(1);
  }

  const entryNum = Number(entryNumRaw);
  if (!Number.isInteger(entryNum) || entryNum < 1 || entryNum > items.length) {
    console.error(`Error: entry_num must be 1..${items.length}`);
    process.exit(1);
  }

  const item = items[entryNum - 1];
  if (!/\[[xX]\]/.test(item)) {
    console.error(`Error: checklist entry ${entryNum} is not checked`);
    process.exit(1);
  }

  const anchor = parseEvidenceAnchor(item);
  if (!anchor) {
    console.error(`Error: checklist entry ${entryNum} has no evidence anchor (#file:line or #file:start-end)`);
    process.exit(1);
  }

  const expectedFile = normalizePath(fileArg || '');
  const expectedLines = String(linesArg || '').trim();
  if (!expectedFile || !expectedLines) {
    console.error('Error: Usage: aitask checklist check <task> <entry_num> <file> <lines>');
    process.exit(1);
  }

  const expectedAbs = normalizePath(expectedFile);
  const anchorFile = normalizePath(anchor.file);
  if (anchorFile !== expectedAbs) {
    console.error(`Error: entry ${entryNum} file mismatch. expected=${expectedAbs} actual=${anchorFile}`);
    process.exit(1);
  }

  const expectedRange = expectedLines.match(/^(\d+)(?:-(\d+))?$/);
  if (!expectedRange) {
    console.error('Error: <lines> must be N or N-M');
    process.exit(1);
  }
  const expectedStart = Number(expectedRange[1]);
  const expectedEnd = Number(expectedRange[2] || expectedRange[1]);
  if (anchor.start !== expectedStart || anchor.end !== expectedEnd) {
    console.error(`Error: entry ${entryNum} line range mismatch. expected=${expectedStart}-${expectedEnd} actual=${anchor.start}-${anchor.end}`);
    process.exit(1);
  }

  const full = path.isAbsolute(anchorFile) ? anchorFile : path.join(process.cwd(), anchorFile);
  if (!fs.existsSync(full)) {
    console.error(`Error: evidence file not found: ${anchorFile}`);
    process.exit(1);
  }
  const totalLines = fs.readFileSync(full, 'utf-8').split(/\r?\n/).length;
  if (anchor.end > totalLines) {
    console.error(`Error: evidence line out of range for ${anchorFile}. file has ${totalLines} lines, anchor ends at ${anchor.end}`);
    process.exit(1);
  }

  console.log(`Checklist entry OK: ${task.meta.id} #${entryNum} -> ${anchorFile}:${anchor.start}-${anchor.end}`);
}

export function checklistCommand(args: string[]): void {
  const sub = args[0];
  const id = args[1];
  if (!sub || !['show', 'update', 'check'].includes(sub)) {
    console.error('Usage: aitask checklist <show|update|check> <id> [entry_num file lines]');
    process.exit(1);
  }

  if (sub === 'show') return showChecklist(id);
  if (sub === 'update') return updateChecklist(id);
  if (args.length === 2) return checkChecklist(id);
  return checkChecklistEntry(id, args[2], args[3], args[4]);
}
