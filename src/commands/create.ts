import { createDraftFile, taskDir, ensureDirs, nowISO, getMaxNumericId } from '../tasks';
import { getCreateTemplate, getReportStub } from '../templates';
import * as fs from 'fs';
import * as path from 'path';

export function createCommand(
  title: string | undefined,
  flags: Record<string, string | boolean>,
): void {
  if (!title) {
    console.error('Error: Task title required');
    console.error('Usage: aitask create <title> [--assign <user>] [--desc <description>] [--tags <a,b,c>] [--adr=<N>] [--no-adr] [--ready]');
    process.exit(1);
  }

  const adrFlag = flags.adr as string | undefined;
  const ready = flags.ready === true;
  const tags = flags.tags
    ? (flags.tags as string).split(',').map((t) => t.trim()).filter(Boolean)
    : undefined;

  if (ready) {
    ensureDirs();
    const readyDir = taskDir('ready');
    const nextNum = getMaxNumericId() + 1;
    const numStr = String(nextNum).padStart(3, '0');
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40);

    const adrPrefix = adrFlag ? `ADR-${adrFlag}-` : '';
    const finalId = `${adrPrefix}task_${numStr}_${slug}`;
    const taskFilename = `${finalId}.md`;
    const reportFilename = `${finalId}_report_draft.md`;
    const taskPath = path.join(readyDir, taskFilename);
    const reportPath = path.join(readyDir, reportFilename);

    const now = nowISO();
    const assignee = (flags.assign as string) || '';
    const tagStr = (tags || []).join(',');
    const fmContent = [
      '---',
      `id: ${finalId}`,
      `title: ${title}`,
      `assignee: ${assignee}`,
      `template: task`,
      `tags: ${tagStr}`,
      `createdAt: ${now}`,
      `updatedAt: ${now}`,
      '---',
    ].join('\n');

    const taskContent = getCreateTemplate(finalId, title, flags.desc as string);
    const reportContent = getReportStub(finalId);
    const body = flags.desc
      ? `\n${flags.desc}\n\n${taskContent}`
      : `\n${taskContent}`;

    fs.writeFileSync(taskPath, `${fmContent}\n${body}`, 'utf-8');
    fs.writeFileSync(reportPath, reportContent, 'utf-8');

    console.log(`Created task in ready/: tasks/ready/${taskFilename}`);
    console.log(`  ID: ${finalId}`);
    console.log(`  Title: ${title}`);
    return;
  }

  const taskContent = getCreateTemplate('', title, flags.desc as string);
  const reportContent = getReportStub('');

  const { num, taskPath, reportPath } = createDraftFile(
    title,
    taskContent,
    reportContent,
    {
      assignee: flags.assign as string | undefined,
      tags,
      desc: flags.desc as string | undefined,
    },
  );

  const numStr = String(num).padStart(3, '0');
  console.log(`Created draft: tasks/draft/task_${numStr}.md`);
  console.log(`Created draft: tasks/draft/task_${numStr}_report_draft.md`);
  console.log(`ID: ${numStr}`);
  console.log(`Title: ${title}`);
}
