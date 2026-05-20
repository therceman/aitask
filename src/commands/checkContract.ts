import * as fs from 'fs';
import * as path from 'path';
import { findAllTasks, tasksDir } from '../tasks';

export interface CheckResult {
  file: string;
  results: { name: string; pass: boolean }[];
}

function walkTasks(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (name.endsWith('.md') && name.toLowerCase() !== 'readme.md') {
        out.push(full);
      }
    }
  };
  walk(root);
  return out;
}

function hasCheckboxItems(md: string): boolean {
  return /(^|\n)\s*[-*]\s*\[(?: |x|X)\]\s+/.test(md);
}

export function runContractCheck(id?: string, state?: string, cwd?: string): CheckResult[] {
  const root = cwd || process.cwd();
  const taskRoot = tasksDir(root);
  let files: string[] = [];

  if (id) {
    const all = findAllTasks(root);
    const task = all.find(t => t.meta.id === id || path.basename(t.path, '.md').includes(id));
    if (!task) return [{ file: `task=${id}`, results: [{ name: 'Task found', pass: false }] }];
    files = [task.path];
  } else if (state) {
    const stateDir = path.join(taskRoot, state);
    files = walkTasks(stateDir);
    if (files.length === 0) return [{ file: `state=${state}`, results: [{ name: 'Task files found', pass: false }] }];
  } else {
    const active = ['backlog', 'ready', 'progress', 'review', 'rework', 'blocked', 'done', 'superseded'];
    for (const dir of active) {
      files.push(...walkTasks(path.join(taskRoot, dir)));
    }
  }

  const output: CheckResult[] = [];

  for (const f of files) {
    const md = fs.readFileSync(f, 'utf-8');
    const stateDir = path.basename(path.dirname(f));
    const results: { name: string; pass: boolean }[] = [];

    results.push({ name: 'Status section', pass: md.includes('## Status') });
    results.push({ name: 'Objective section', pass: md.includes('## Objective') });
    results.push({ name: 'Checklist section', pass: md.includes('## Checklist') });

    if (md.includes('## Checklist')) {
      results.push({ name: 'Checklist items', pass: hasCheckboxItems(md) });
    }

    if (stateDir === 'done' && /\bTODO\b/.test(md)) {
      results.push({ name: 'No TODO in done', pass: false });
    }

    output.push({ file: f, results });
  }

  return output;
}

export function checkContractCommand(id: string | undefined, flags: Record<string, string | boolean>, cwd?: string): void {
  const root = cwd || process.cwd();
  const state = typeof flags.state === 'string' ? flags.state : undefined;
  const results = runContractCheck(id, state, cwd);

  if (results.length === 1 && results[0].results.length === 1 && !results[0].results[0].pass) {
    if (results[0].file.startsWith('task=')) {
      console.error(`FAIL ${results[0].file} error="task not found"`);
      process.exit(1);
    }
    if (results[0].file.startsWith('state=')) {
      console.error(`FAIL ${results[0].file} error="no task files found"`);
      process.exit(1);
    }
  }

  let totalFail = 0;
  let totalCheck = 0;

  for (const { file, results: checks } of results) {
    totalCheck += checks.length;
    const fails = checks.filter(r => !r.pass);
    if (fails.length > 0) {
      totalFail += fails.length;
      console.log(`FAIL ${path.relative(root, file)}`);
      for (const r of fails) {
        console.log(`  - ${r.name}`);
      }
    } else {
      console.log(`PASS ${path.relative(root, file)}`);
    }
  }

  if (totalFail > 0) {
    console.log(`\ncheck contract: FAIL checks=${totalCheck} errors=${totalFail}`);
    process.exit(1);
  }
  console.log(`\ncheck contract: PASS checks=${totalCheck}`);
}
