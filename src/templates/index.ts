import * as fs from 'fs';
import * as path from 'path';
import * as taskTemplate from './task_template';
import * as reportStub from './report_stub';
import * as postReviewReportStub from './post_review_report_stub';

export interface TemplateEntry {
  name: string;
  description: string;
  filename: string;
  content: string;
}

const BUILTINS: TemplateEntry[] = [
  taskTemplate,
  reportStub,
  postReviewReportStub,
];

export function getBuiltins(): TemplateEntry[] {
  return BUILTINS;
}

export function getTemplate(name: string): TemplateEntry | undefined {
  for (const t of BUILTINS) {
    if (t.name === name) return t;
  }
  return undefined;
}

export function render(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return result;
}

export function materializeTemplates(
  targetDir: string,
  names?: string[],
  force?: boolean,
): string[] {
  const created: string[] = [];
  const entries = names
    ? names.map((n) => getTemplate(n)).filter(Boolean) as TemplateEntry[]
    : BUILTINS;

  for (const entry of entries) {
    const fp = path.join(targetDir, entry.filename);
    if (fs.existsSync(fp) && !force) continue;
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, entry.content, 'utf-8');
    created.push(fp);
  }

  return created;
}

export function getCreateTemplate(taskId: string, title: string, description?: string): string {
  const tpl = getTemplate('task_template');
  if (!tpl) return `## ID\n\`${taskId}\`\n\n## Title\n${title}\n\n## Objective\n${description || ''}\n`;
  return render(tpl.content, { id: taskId, title });
}

export function getReportStub(taskId: string): string {
  const tpl = getTemplate('report_stub');
  if (!tpl) return `# Task Report\n\n## Task ID\n\`${taskId}\`\n\n## Summary\n-\n`;
  return render(tpl.content, { id: taskId });
}
