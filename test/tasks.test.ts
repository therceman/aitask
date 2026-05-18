import * as fs from 'fs';
import * as path from 'path';
import {
  tasksDir,
  ensureDirs,
  scanDir,
  createTaskFile,
  findTask,
  findAllTasks,
  findReportPair,
  moveTask,
  formatFrontmatter,
  parseFrontmatter,
  getNextNumber,
  nowISO,
  validateTask,
  getMaxNumericId,
  createDraftFile,
  publishDraft,
} from '../src/tasks';
import { TaskMeta } from '../src/types';

const TEST_CWD = '/tmp/aitask-test-repo';

function cleanTestDir() {
  if (fs.existsSync(TEST_CWD)) {
    fs.rmSync(TEST_CWD, { recursive: true });
  }
  fs.mkdirSync(TEST_CWD, { recursive: true });
}

describe('tasks', () => {
  beforeEach(() => {
    cleanTestDir();
  });

  afterAll(() => {
    cleanTestDir();
  });

  describe('formatFrontmatter / parseFrontmatter', () => {
    it('round-trips metadata', () => {
      const meta: TaskMeta = {
        id: 'task_001_test',
        title: 'Test task',
        assignee: 'alice',
        status: 'todo',
        template: 'todo',
        tags: ['report', 'urgent'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      const fm = formatFrontmatter(meta);
      const parsed = parseFrontmatter(fm + '\n\nbody content');
      expect(parsed.meta.id).toBe('task_001_test');
      expect(parsed.meta.title).toBe('Test task');
      expect(parsed.meta.assignee).toBe('alice');
      expect(parsed.meta.tags).toEqual(['report', 'urgent']);
      expect(parsed.body.trim()).toBe('body content');
    });

    it('handles files without frontmatter', () => {
      const parsed = parseFrontmatter('# Just a title\n\nbody');
      expect(parsed.meta.id).toBeUndefined();
      expect(parsed.body).toBe('# Just a title\n\nbody');
    });

    it('handles empty frontmatter fields', () => {
      const content = '---\nid: task_001\n---\nbody';
      const parsed = parseFrontmatter(content);
      expect(parsed.meta.id).toBe('task_001');
      expect(parsed.body).toBe('body');
    });
  });

  describe('getNextNumber', () => {
    it('starts at 1 with empty list', () => {
      expect(getNextNumber([])).toBe(1);
    });

    it('increments from existing ids', () => {
      expect(getNextNumber(['task_001_foo', 'task_003_bar', 'task_002_baz'])).toBe(4);
    });

    it('ignores non-matching ids', () => {
      expect(getNextNumber(['deepseek_001_foo', 'other'])).toBe(1);
    });
  });

  describe('ensureDirs / scanDir', () => {
    it('creates all task directories including draft', () => {
      ensureDirs(TEST_CWD);
      expect(fs.existsSync(path.join(tasksDir(TEST_CWD), 'todo'))).toBe(true);
      expect(fs.existsSync(path.join(tasksDir(TEST_CWD), 'draft'))).toBe(true);
      expect(fs.existsSync(path.join(tasksDir(TEST_CWD), 'done'))).toBe(true);
    });

    it('scanDir returns empty for fresh directory', () => {
      ensureDirs(TEST_CWD);
      expect(scanDir('todo', TEST_CWD)).toEqual([]);
    });
  });

  describe('createTaskFile', () => {
    it('creates task file and report draft in todo', () => {
      ensureDirs(TEST_CWD);
      const { taskPath, draftPath } = createTaskFile(
        'task_001_test',
        'Test task',
        '## Objective\ntest',
        '# Report',
        { assignee: 'bob' },
        TEST_CWD,
      );
      expect(fs.existsSync(taskPath)).toBe(true);
      expect(fs.existsSync(draftPath)).toBe(true);
      expect(taskPath).toContain('/todo/');
    });
  });

  describe('findTask / findAllTasks', () => {
    it('finds task across directories', () => {
      ensureDirs(TEST_CWD);
      createTaskFile('task_001_test', 'Test', '# Task', '# Report', {}, TEST_CWD);
      const found = findTask('task_001_test', TEST_CWD);
      expect(found).toBeDefined();
    });

    it('returns undefined for missing task', () => {
      ensureDirs(TEST_CWD);
      expect(findTask('nonexistent', TEST_CWD)).toBeUndefined();
    });
  });

  describe('moveTask', () => {
    it('moves task and report from todo to done', () => {
      ensureDirs(TEST_CWD);
      const { taskPath, draftPath } = createTaskFile('task_001', 'Test', '# T', '# R', {}, TEST_CWD);
      const reportPath = draftPath.replace('_report_draft.md', '_report.md');
      fs.renameSync(draftPath, reportPath);
      const result = moveTask('task_001', 'done', TEST_CWD);
      expect(result).toBeDefined();
      expect(result!.task!.path).toContain('/done/');
      expect(result!.report).toBeDefined();
    });
  });

  describe('validateTask', () => {
    it('reports missing task', () => {
      expect(validateTask('nonexistent', TEST_CWD).length).toBeGreaterThan(0);
    });
  });

  describe('getMaxNumericId', () => {
    it('returns 0 for empty project', () => {
      ensureDirs(TEST_CWD);
      expect(getMaxNumericId(TEST_CWD)).toBe(0);
    });

    it('finds max id across draft, todo, and done', () => {
      ensureDirs(TEST_CWD);
      const todo = path.join(tasksDir(TEST_CWD), 'todo');
      fs.writeFileSync(path.join(todo, 'deepseek_005_test.md'), '');
      fs.writeFileSync(path.join(todo, 'deepseek_003_other.md'), '');
      const done = path.join(tasksDir(TEST_CWD), 'done');
      fs.writeFileSync(path.join(done, 'deepseek_007_old.md'), '');
      const draft = path.join(tasksDir(TEST_CWD), 'draft');
      fs.writeFileSync(path.join(draft, 'task_002.md'), '');
      expect(getMaxNumericId(TEST_CWD)).toBe(7);
    });
  });

  describe('createDraftFile', () => {
    it('creates draft task and report in draft dir', () => {
      ensureDirs(TEST_CWD);
      const { num, taskPath, reportPath } = createDraftFile(
        'Test draft',
        '## Body',
        '# Report',
        {},
        TEST_CWD,
      );
      expect(num).toBe(1);
      expect(fs.existsSync(taskPath)).toBe(true);
      expect(fs.existsSync(reportPath)).toBe(true);
      expect(taskPath).toContain('/draft/');
      expect(reportPath).toContain('/draft/');
      expect(taskPath).toContain('task_001.md');
      expect(reportPath).toContain('task_001_report_draft.md');
    });

    it('auto-increments IDs', () => {
      ensureDirs(TEST_CWD);
      const r1 = createDraftFile('First', '## Body', '# Report', {}, TEST_CWD);
      expect(r1.num).toBe(1);
      const r2 = createDraftFile('Second', '## Body', '# Report', {}, TEST_CWD);
      expect(r2.num).toBe(2);
    });

    it('accounts for existing non-draft tasks', () => {
      ensureDirs(TEST_CWD);
      const todo = path.join(tasksDir(TEST_CWD), 'todo');
      fs.writeFileSync(path.join(todo, 'deepseek_003_existing.md'), '');
      const r = createDraftFile('After existing', '## Body', '# Report', {}, TEST_CWD);
      expect(r.num).toBe(4);
    });
  });

  describe('publishDraft', () => {
    it('publishes draft to todo with deepseek naming', () => {
      ensureDirs(TEST_CWD);
      createDraftFile('My Feature', '## Body\nContent', '# Report\nFor task {{id}}', {}, TEST_CWD);

      const result = publishDraft(1, TEST_CWD, TEST_CWD);
      expect(result).toBeDefined();
      expect(result!.finalId).toBe('deepseek_001_my_feature');
      expect(fs.existsSync(result!.taskPath)).toBe(true);
      expect(fs.existsSync(result!.reportPath)).toBe(true);
      expect(result!.taskPath).toContain('/todo/');
      expect(result!.reportPath).toContain('/todo/');

      // Draft files should be removed
      expect(fs.existsSync(path.join(tasksDir(TEST_CWD), 'draft', 'task_001.md'))).toBe(false);
      expect(fs.existsSync(path.join(tasksDir(TEST_CWD), 'draft', 'task_001_report_draft.md'))).toBe(false);
    });

    it('publishes to different target dir', () => {
      ensureDirs(TEST_CWD);
      const otherDir = `${TEST_CWD}_other`;
      if (fs.existsSync(otherDir)) fs.rmSync(otherDir, { recursive: true });
      fs.mkdirSync(otherDir, { recursive: true });

      createDraftFile('Cross repo', '## Body', '# Report', {}, TEST_CWD);
      const result = publishDraft(1, TEST_CWD, otherDir);
      expect(result).toBeDefined();
      expect(result!.taskPath).toContain(otherDir);
      expect(result!.reportPath).toContain(otherDir);
      expect(fs.existsSync(result!.taskPath)).toBe(true);
    });

    it('returns undefined for missing draft', () => {
      ensureDirs(TEST_CWD);
      expect(publishDraft(999, TEST_CWD, TEST_CWD)).toBeUndefined();
    });

    it('returns undefined on name collision', () => {
      ensureDirs(TEST_CWD);
      createDraftFile('Collision', '## Body', '# Report', {}, TEST_CWD);

      // First publish succeeds
      expect(publishDraft(1, TEST_CWD, TEST_CWD)).toBeDefined();

      // Create another draft with same number — collision
      const draft = path.join(tasksDir(TEST_CWD), 'draft');
      fs.writeFileSync(path.join(draft, 'task_001.md'), '---\ntitle: Collision\n---\n# Task');
      fs.writeFileSync(path.join(draft, 'task_001_report_draft.md'), '# Report');

      expect(publishDraft(1, TEST_CWD, TEST_CWD)).toBeUndefined();
    });
  });
});
