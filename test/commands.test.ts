import * as fs from 'fs';
import * as path from 'path';
import {
  tasksDir,
  ensureDirs,
  scanDir,
  resolveTask,
  lifecycleTransition,
  findReportPair,
} from '../src/tasks';
import { runAudit, countAllTasks } from '../src/commands/audit';
import { TaskDir } from '../src/types';

const TEST_CWD = '/tmp/aitask-commands-test';

function cleanTestDir() {
  if (fs.existsSync(TEST_CWD)) {
    fs.rmSync(TEST_CWD, { recursive: true });
  }
  fs.mkdirSync(TEST_CWD, { recursive: true });
}

function writeTask(dir: TaskDir, id: string, extraFm?: string, extraBody?: string): string {
  const d = path.join(tasksDir(TEST_CWD), dir);
  fs.mkdirSync(d, { recursive: true });
  const fp = path.join(d, `${id}.md`);
  const fm = extraFm || '';
  const body = extraBody || '## Body\nContent';
  fs.writeFileSync(fp, `---\nid: ${id}\ntitle: Test ${id}\n${fm}---\n\n${body}`, 'utf-8');
  return fp;
}

function writeReport(dir: TaskDir, id: string, suffix: '_report.md' | '_report_draft.md' = '_report.md'): string {
  const d = path.join(tasksDir(TEST_CWD), dir);
  fs.mkdirSync(d, { recursive: true });
  const fp = path.join(d, `${id}${suffix}`);
  fs.writeFileSync(fp, `# Report for ${id}\n\n## Summary\nDone.`, 'utf-8');
  return fp;
}

describe('audit', () => {
  beforeEach(() => {
    cleanTestDir();
    ensureDirs(TEST_CWD);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_CWD)) {
      fs.rmSync(TEST_CWD, { recursive: true });
    }
  });

  it('reports OK for clean state', () => {
    writeTask('done', 'T001');
    writeReport('done', 'T001');
    const issues = runAudit(TEST_CWD);
    expect(issues).toHaveLength(0);
  });

  it('finds folder/state mismatch (done folder, status != done)', () => {
    // folder/state mismatch is no longer checked (state is folder-derived)
    // Instead, check that a done task without report is flagged
    writeTask('done', 'T002');
    const issues = runAudit(TEST_CWD);
    expect(issues.some(i => i.type === 'FAIL' && i.message.includes('missing report'))).toBe(true);
  });

  it('finds DONE missing report', () => {
    writeTask('done', 'T003');
    const issues = runAudit(TEST_CWD);
    expect(issues.some(i => i.type === 'FAIL' && i.message.includes('missing report'))).toBe(true);
  });

  it('finds report mismatch (report exists but task not done)', () => {
    writeTask('progress', 'T004');
    writeReport('progress', 'T004');
    const issues = runAudit(TEST_CWD);
    expect(issues.some(i => i.type === 'WARN' && i.message.includes('report exists but task not done'))).toBe(true);
  });

  it('finds timestamp ordering violation (done_at < started_at)', () => {
    writeTask('done', 'T005', 'started_at: "2026-05-18 12:00:00"\ndone_at: "2026-05-17 12:00:00"\n');
    writeReport('done', 'T005');
    const issues = runAudit(TEST_CWD);
    expect(issues.some(i => i.type === 'FAIL' && i.message.includes('timestamp ordering'))).toBe(true);
  });

  it('finds stale task in progress/ for > 7 days', () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const ts = oldDate.toISOString();
    writeTask('progress', 'T006', `started_at: "${ts}"\n`);
    const issues = runAudit(TEST_CWD);
    expect(issues.some(i => i.type === 'WARN' && i.message.includes('stale task'))).toBe(true);
  });

  it('countAllTasks counts only task files, not reports', () => {
    writeTask('done', 'T010');
    writeReport('done', 'T010');
    writeTask('progress', 'T011');
    expect(countAllTasks(TEST_CWD)).toBe(2);
  });
});

describe('done guard', () => {
  beforeEach(() => {
    cleanTestDir();
    ensureDirs(TEST_CWD);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_CWD)) {
      fs.rmSync(TEST_CWD, { recursive: true });
    }
  });

  it('findReportPair returns undefined for task without report', () => {
    writeTask('progress', 'TG01');
    const task = resolveTask('TG01', TEST_CWD);
    expect(task).toBeDefined();
    const pair = findReportPair(task!, TEST_CWD);
    expect(pair.report).toBeUndefined();
    expect(pair.draft).toBeUndefined();
  });

  it('findReportPair finds report in same directory', () => {
    writeTask('progress', 'TG02');
    writeReport('progress', 'TG02');
    const task = resolveTask('TG02', TEST_CWD);
    const pair = findReportPair(task!, TEST_CWD);
    expect(pair.report).toBeDefined();
    expect(pair.report).toContain('TG02_report.md');
  });

  it('findReportPair finds draft report in same directory', () => {
    writeTask('progress', 'TG03');
    writeReport('progress', 'TG03', '_report_draft.md');
    const task = resolveTask('TG03', TEST_CWD);
    const pair = findReportPair(task!, TEST_CWD);
    expect(pair.draft).toBeDefined();
  });
});

describe('queue', () => {
  beforeEach(() => {
    cleanTestDir();
    ensureDirs(TEST_CWD);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_CWD)) {
      fs.rmSync(TEST_CWD, { recursive: true });
    }
  });

  it('scanDir returns correct counts per directory', () => {
    writeTask('backlog', 'Q01');
    writeTask('ready', 'Q02');
    writeTask('ready', 'Q03');
    writeTask('progress', 'Q04');
    writeTask('blocked', 'Q05');
    writeTask('review', 'Q06');
    writeTask('done', 'Q07');
    writeTask('done', 'Q08');
    writeTask('draft', 'Q09');

    expect(scanDir('backlog', TEST_CWD)).toHaveLength(1);
    expect(scanDir('ready', TEST_CWD)).toHaveLength(2);
    expect(scanDir('progress', TEST_CWD)).toHaveLength(1);
    expect(scanDir('blocked', TEST_CWD)).toHaveLength(1);
    expect(scanDir('review', TEST_CWD)).toHaveLength(1);
    expect(scanDir('done', TEST_CWD)).toHaveLength(2);
    expect(scanDir('draft', TEST_CWD)).toHaveLength(1);
  });
});
