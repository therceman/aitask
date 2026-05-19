import * as fs from 'fs';
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
    if (/^##\s+Checklist\b/i.test(lines[i].trim())) {
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
  console.log(`Checklist complete: ${task.meta.id}`);
}

export function checklistCommand(args: string[]): void {
  const sub = args[0];
  const id = args[1];
  if (!sub || !['show', 'update', 'check'].includes(sub)) {
    console.error('Usage: aitask checklist <show|update|check> <id>');
    process.exit(1);
  }

  if (sub === 'show') return showChecklist(id);
  if (sub === 'update') return updateChecklist(id);
  return checkChecklist(id);
}
