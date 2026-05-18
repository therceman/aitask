import * as fs from 'fs';
import * as path from 'path';
import { formatTimestamp, now, updateFrontmatterTimestamp } from '../src/timestamps';
import { appendTimelineEntry } from '../src/timeline';
import {
  tasksDir,
  ensureDirs,
  scanDir,
  lifecycleTransition,
  resolveTask,
} from '../src/tasks';
import { TaskDir } from '../src/types';

const TEST_CWD = '/tmp/aitask-lifecycle-test';

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

function readContent(id: string): string {
  for (const dir of ['todo', 'done', 'rework', 'backlog', 'ready', 'progress', 'blocked', 'review', 'superseded', 'draft'] as TaskDir[]) {
    const fp = path.join(tasksDir(TEST_CWD), dir, `${id}.md`);
    if (fs.existsSync(fp)) return fs.readFileSync(fp, 'utf-8');
  }
  return '';
}

describe('timestamps', () => {
  describe('formatTimestamp', () => {
    it('formats in YYYY-MM-DD HH:mm:ss format', () => {
      const result = formatTimestamp(new Date('2026-05-18T12:00:00Z'), 'UTC');
      expect(result).toBe('2026-05-18 12:00:00');
    });

    it('applies timezone offset', () => {
      const result = formatTimestamp(new Date('2026-05-18T12:00:00Z'), 'Europe/Riga');
      expect(result).toBe('2026-05-18 15:00:00');
    });

    it('has no UTC suffix', () => {
      const result = formatTimestamp(new Date(), 'Europe/Riga');
      expect(result).not.toContain('Z');
      expect(result).not.toContain('+');
      expect(result).not.toContain('UTC');
    });

    it('matches expected pattern', () => {
      const result = now('UTC');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('updateFrontmatterTimestamp', () => {
    it('adds a new key to frontmatter', () => {
      const content = '---\nid: test\n---\n\nBody';
      const result = updateFrontmatterTimestamp(content, 'started_at', '2026-05-18 15:00:00');
      expect(result).toContain('started_at: "2026-05-18 15:00:00"');
      expect(result).toContain('id: test');
      expect(result).toContain('Body');
    });

    it('updates existing key', () => {
      const content = '---\nid: test\nstarted_at: "2026-05-18 10:00:00"\n---\n\nBody';
      const result = updateFrontmatterTimestamp(content, 'started_at', '2026-05-18 15:00:00');
      expect(result).toContain('started_at: "2026-05-18 15:00:00"');
      expect(result).not.toContain('2026-05-18 10:00:00');
    });

    it('handles content without frontmatter', () => {
      const content = '# No frontmatter\nBody';
      const result = updateFrontmatterTimestamp(content, 'started_at', '2026-05-18 15:00:00');
      expect(result).toBe(content);
    });

    it('preserves other frontmatter fields', () => {
      const content = '---\nid: test\ntitle: My Task\n---\n\nBody';
      const result = updateFrontmatterTimestamp(content, 'done_at', '2026-05-18 15:00:00');
      expect(result).toContain('id: test');
      expect(result).toContain('title: My Task');
      expect(result).toContain('done_at: "2026-05-18 15:00:00"');
    });
  });
});

describe('timeline', () => {
  describe('appendTimelineEntry', () => {
    it('appends to existing Timeline section', () => {
      const content = '---\nid: test\n---\n\n## Timeline\n- 2026-05-18 10:00:00 | created\n';
      const result = appendTimelineEntry(content, '2026-05-18 15:00:00', 'progress');
      expect(result).toContain('2026-05-18 10:00:00 | created');
      expect(result).toContain('2026-05-18 15:00:00 | state: progress');
    });

    it('creates Timeline section if missing', () => {
      const content = '---\nid: test\n---\n\n## Body\nContent';
      const result = appendTimelineEntry(content, '2026-05-18 15:00:00', 'ready');
      expect(result).toContain('## Timeline');
      expect(result).toContain('- 2026-05-18 15:00:00 | state: ready');
    });

    it('includes optional reason', () => {
      const content = '---\nid: test\n---\n\n## Timeline\n';
      const result = appendTimelineEntry(content, '2026-05-18 15:00:00', 'blocked', 'waiting for review');
      expect(result).toContain('waiting for review');
      expect(result).toContain('state: blocked');
    });

    it('inserts before next section after Timeline', () => {
      const content = '---\nid: test\n---\n\n## Timeline\n- 2026-05-18 10:00:00 | created\n\n## Notes\nSome notes';
      const result = appendTimelineEntry(content, '2026-05-18 15:00:00', 'progress');
      expect(result).toMatch(/Timeline\n- .*created\n- .*progress\n\n## Notes/s);
    });
  });
});

describe('lifecycle', () => {
  beforeEach(() => {
    cleanTestDir();
    ensureDirs(TEST_CWD);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_CWD)) {
      fs.rmSync(TEST_CWD, { recursive: true });
    }
  });

  describe('lifecycleTransition', () => {
    it('moves task from ready to progress', () => {
      writeTask('ready', 'T001');
      const task = resolveTask('T001', TEST_CWD);
      expect(task).toBeDefined();
      expect(task!.dir).toBe('ready');

      const result = lifecycleTransition(task!, 'progress', 'started_at', 'progress', undefined, TEST_CWD);
      expect(result).toBeDefined();
      expect(result!.task.dir).toBe('progress');

      const tasksInProgress = scanDir('progress', TEST_CWD);
      expect(tasksInProgress).toHaveLength(1);
      expect(tasksInProgress[0].meta.id).toBe('T001');

      const tasksInReady = scanDir('ready', TEST_CWD);
      expect(tasksInReady).toHaveLength(0);
    });

    it('sets started_at timestamp in frontmatter', () => {
      writeTask('ready', 'T002');
      const task = resolveTask('T002', TEST_CWD);
      const result = lifecycleTransition(task!, 'progress', 'started_at', 'progress', undefined, TEST_CWD);
      expect(result!.content).toMatch(/started_at: "\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/);
    });

    it('sets updated_at timestamp in frontmatter', () => {
      writeTask('ready', 'T003');
      const task = resolveTask('T003', TEST_CWD);
      const result = lifecycleTransition(task!, 'progress', 'started_at', 'progress', undefined, TEST_CWD);
      expect(result!.content).toMatch(/updated_at: "\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/);
    });

    it('appends timeline entry', () => {
      writeTask('ready', 'T004');
      const task = resolveTask('T004', TEST_CWD);
      const result = lifecycleTransition(task!, 'progress', 'started_at', 'progress', undefined, TEST_CWD);
      expect(result!.content).toContain('## Timeline');
      expect(result!.content).toMatch(/state: progress/);
    });

    it('appends timeline entry with reason', () => {
      writeTask('progress', 'T005');
      const task = resolveTask('T005', TEST_CWD);
      const result = lifecycleTransition(task!, 'blocked', 'blocked_at', 'blocked', 'waiting for design', TEST_CWD);
      expect(result!.content).toContain('waiting for design');
    });

    it('includes reason in block timeline entry', () => {
      writeTask('progress', 'T006');
      const task = resolveTask('T006', TEST_CWD);
      const result = lifecycleTransition(task!, 'blocked', 'blocked_at', 'blocked', 'blocker reason', TEST_CWD);
      expect(result!.content).toMatch(/\| blocker reason/);
    });
  });

  describe('state folder moves', () => {
    it('start moves from todo to progress', () => {
      writeTask('todo', 'T010');
      const task = resolveTask('T010', TEST_CWD);
      lifecycleTransition(task!, 'progress', 'started_at', 'progress', undefined, TEST_CWD);

      expect(scanDir('todo', TEST_CWD)).toHaveLength(0);
      expect(scanDir('progress', TEST_CWD)).toHaveLength(1);
    });

    it('review moves from progress to review', () => {
      writeTask('progress', 'T020');
      const task = resolveTask('T020', TEST_CWD);
      lifecycleTransition(task!, 'review', 'review_at', 'review', undefined, TEST_CWD);

      expect(scanDir('progress', TEST_CWD)).toHaveLength(0);
      expect(scanDir('review', TEST_CWD)).toHaveLength(1);
    });

    it('rework moves from review to rework', () => {
      writeTask('review', 'T030');
      const task = resolveTask('T030', TEST_CWD);
      lifecycleTransition(task!, 'rework', 'rework_at', 'rework', undefined, TEST_CWD);

      expect(scanDir('review', TEST_CWD)).toHaveLength(0);
      expect(scanDir('rework', TEST_CWD)).toHaveLength(1);
    });

    it('done moves from progress to done', () => {
      writeTask('progress', 'T040');
      const task = resolveTask('T040', TEST_CWD);
      lifecycleTransition(task!, 'done', 'done_at', 'done', undefined, TEST_CWD);

      expect(scanDir('progress', TEST_CWD)).toHaveLength(0);
      expect(scanDir('done', TEST_CWD)).toHaveLength(1);
    });

    it('done moves from review to done', () => {
      writeTask('review', 'T041');
      const task = resolveTask('T041', TEST_CWD);
      lifecycleTransition(task!, 'done', 'done_at', 'done', undefined, TEST_CWD);

      expect(scanDir('done', TEST_CWD)).toHaveLength(1);
    });

    it('done moves from rework to done', () => {
      writeTask('rework', 'T042');
      const task = resolveTask('T042', TEST_CWD);
      lifecycleTransition(task!, 'done', 'done_at', 'done', undefined, TEST_CWD);

      expect(scanDir('done', TEST_CWD)).toHaveLength(1);
    });

    it('block moves from ready to blocked', () => {
      writeTask('ready', 'T050');
      const task = resolveTask('T050', TEST_CWD);
      lifecycleTransition(task!, 'blocked', 'blocked_at', 'blocked', 'reason', TEST_CWD);

      expect(scanDir('ready', TEST_CWD)).toHaveLength(0);
      expect(scanDir('blocked', TEST_CWD)).toHaveLength(1);
    });

    it('block moves from progress to blocked', () => {
      writeTask('progress', 'T051');
      const task = resolveTask('T051', TEST_CWD);
      lifecycleTransition(task!, 'blocked', 'blocked_at', 'blocked', undefined, TEST_CWD);

      expect(scanDir('blocked', TEST_CWD)).toHaveLength(1);
    });

    it('unblock moves from blocked to ready', () => {
      writeTask('blocked', 'T060');
      const task = resolveTask('T060', TEST_CWD);
      lifecycleTransition(task!, 'ready', 'unblocked_at', 'ready', undefined, TEST_CWD);

      expect(scanDir('blocked', TEST_CWD)).toHaveLength(0);
      expect(scanDir('ready', TEST_CWD)).toHaveLength(1);
    });

    it('moves report files along with task', () => {
      const taskDirPath = path.join(tasksDir(TEST_CWD), 'ready');
      fs.mkdirSync(taskDirPath, { recursive: true });
      const taskPath = path.join(taskDirPath, 'T070.md');
      const reportPath = path.join(taskDirPath, 'T070_report_draft.md');
      fs.writeFileSync(taskPath, '---\nid: T070\n---\n\nBody', 'utf-8');
      fs.writeFileSync(reportPath, '# Report', 'utf-8');

      const task = resolveTask('T070', TEST_CWD);
      lifecycleTransition(task!, 'progress', 'started_at', 'progress', undefined, TEST_CWD);

      expect(fs.existsSync(path.join(tasksDir(TEST_CWD), 'progress', 'T070.md'))).toBe(true);
      expect(fs.existsSync(path.join(tasksDir(TEST_CWD), 'progress', 'T070_report_draft.md'))).toBe(true);
    });
  });

  describe('resolveTask', () => {
    it('finds task by exact ID', () => {
      writeTask('ready', 'ADR-001');
      const task = resolveTask('ADR-001', TEST_CWD);
      expect(task).toBeDefined();
      expect(task!.meta.id).toBe('ADR-001');
    });

    it('finds task by numeric suffix', () => {
      writeTask('ready', 'NO-ADR-T022');
      const task = resolveTask('T022', TEST_CWD);
      expect(task).toBeDefined();
      expect(task!.meta.id).toBe('NO-ADR-T022');
    });

    it('returns undefined for nonexistent task', () => {
      const task = resolveTask('NONEXISTENT', TEST_CWD);
      expect(task).toBeUndefined();
    });
  });

  describe('end-to-end: start -> review -> done', () => {
    it('completes full lifecycle', () => {
      writeTask('ready', 'E2E-001');

      let task = resolveTask('E2E-001', TEST_CWD);
      expect(task!.dir).toBe('ready');

      task = lifecycleTransition(task!, 'progress', 'started_at', 'progress', undefined, TEST_CWD)!.task;
      expect(task.dir).toBe('progress');

      task = lifecycleTransition(task!, 'review', 'review_at', 'review', undefined, TEST_CWD)!.task;
      expect(task.dir).toBe('review');

      task = lifecycleTransition(task!, 'done', 'done_at', 'done', undefined, TEST_CWD)!.task;
      expect(task.dir).toBe('done');

      const content = fs.readFileSync(task.path, 'utf-8');
      expect(content).toMatch(/started_at: "\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/);
      expect(content).toMatch(/review_at: "\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/);
      expect(content).toMatch(/done_at: "\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/);
      expect(content).toMatch(/state: progress/);
      expect(content).toMatch(/state: review/);
      expect(content).toMatch(/state: done/);
    });
  });

  describe('end-to-end: start -> block -> unblock -> progress -> done', () => {
    it('completes full lifecycle with block/unblock', () => {
      writeTask('ready', 'E2E-002');

      let task = resolveTask('E2E-002', TEST_CWD);
      task = lifecycleTransition(task!, 'progress', 'started_at', 'progress', undefined, TEST_CWD)!.task;
      expect(task.dir).toBe('progress');

      task = lifecycleTransition(task!, 'blocked', 'blocked_at', 'blocked', 'waiting for API', TEST_CWD)!.task;
      expect(task.dir).toBe('blocked');

      task = lifecycleTransition(task!, 'ready', 'unblocked_at', 'ready', undefined, TEST_CWD)!.task;
      expect(task.dir).toBe('ready');

      task = lifecycleTransition(task!, 'progress', 'started_at', 'progress', undefined, TEST_CWD)!.task;
      expect(task.dir).toBe('progress');

      task = lifecycleTransition(task!, 'done', 'done_at', 'done', undefined, TEST_CWD)!.task;
      expect(task.dir).toBe('done');

      const content = fs.readFileSync(task.path, 'utf-8');
      expect(content).toMatch(/blocked_at:/);
      expect(content).toMatch(/unblocked_at:/);
      expect(content).toMatch(/\| waiting for API/);
    });
  });
});
