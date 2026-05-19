import { getBuiltins, getTemplate, render, getCreateTemplate, getReportStub, materializeTemplates } from '../src/templates';
import * as fs from 'fs';
import * as path from 'path';

const TMP = '/tmp/aitask-tpl-test';

beforeEach(() => {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
});

afterAll(() => {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
});

describe('templates', () => {
  describe('getBuiltins', () => {
    it('returns 4 built-in templates', () => {
      const tpls = getBuiltins();
      expect(tpls).toHaveLength(4);
      const names = tpls.map((t) => t.name);
      expect(names).toContain('task_template');
      expect(names).toContain('report_stub');
      expect(names).toContain('post_review_report_stub');
      expect(names).toContain('rules');
    });
  });

  describe('getTemplate', () => {
    it('finds by name', () => {
      const t = getTemplate('report_stub');
      expect(t).toBeDefined();
      expect(t!.filename).toBe('report_stub.md');
    });

    it('returns undefined for unknown', () => {
      expect(getTemplate('nonexistent')).toBeUndefined();
    });
  });

  describe('render', () => {
    it('replaces placeholders', () => {
      const result = render('Hello {{name}}! ID: {{id}}', { name: 'Alice', id: 'abc123' });
      expect(result).toBe('Hello Alice! ID: abc123');
    });

    it('replaces all occurrences', () => {
      const result = render('{{x}}-{{x}}-{{x}}', { x: 'foo' });
      expect(result).toBe('foo-foo-foo');
    });
  });

  describe('getCreateTemplate', () => {
    it('returns rendered task template with id and title', () => {
      const result = getCreateTemplate('task_001_test', 'Test Task');
      expect(result).toContain('task_001_test');
      expect(result).toContain('Test Task');
      expect(result).toContain('## Objective');
      expect(result).toContain('## Acceptance criteria');
      expect(result).toContain('## Checklist (Mandatory)');
    });
  });

  describe('getReportStub', () => {
    it('returns rendered report stub with id', () => {
      const result = getReportStub('task_001_test');
      expect(result).toContain('task_001_test');
      expect(result).toContain('## Summary');
      expect(result).toContain('## Validation Commands');
    });
  });

  describe('materializeTemplates', () => {
    it('writes template files to disk', () => {
      const created = materializeTemplates(TMP, undefined, false);
      expect(created).toHaveLength(4);
      expect(fs.existsSync(path.join(TMP, 'task_template.md'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, 'report_stub.md'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, 'rules.md'))).toBe(true);
    });

    it('skips existing files without force', () => {
      materializeTemplates(TMP, undefined, false);
      const second = materializeTemplates(TMP, undefined, false);
      expect(second).toHaveLength(0);
    });

    it('overwrites with force', () => {
      materializeTemplates(TMP, undefined, false);
      const second = materializeTemplates(TMP, undefined, true);
      expect(second).toHaveLength(4);
    });

    it('materializes specific templates by name', () => {
      const created = materializeTemplates(TMP, ['report_stub'], false);
      expect(created).toHaveLength(1);
      expect(path.basename(created[0])).toBe('report_stub.md');
    });
  });
});
