import { createDraftFile } from '../tasks';
import { getCreateTemplate, getReportStub } from '../templates';

export function createCommand(
  title: string | undefined,
  flags: Record<string, string | boolean>,
): void {
  if (!title) {
    console.error('Error: Task title required');
    console.error('Usage: aitask create <title> [--assign <user>] [--desc <description>] [--tags <a,b,c>]');
    process.exit(1);
  }

  const taskContent = getCreateTemplate('', title, flags.desc as string);
  const reportContent = getReportStub('');

  const { num, taskPath, reportPath } = createDraftFile(
    title,
    taskContent,
    reportContent,
    {
      assignee: flags.assign as string | undefined,
      tags: flags.tags
        ? (flags.tags as string).split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
      desc: flags.desc as string | undefined,
    },
  );

  const numStr = String(num).padStart(3, '0');
  console.log(`Created draft: tasks/draft/task_${numStr}.md`);
  console.log(`Created draft: tasks/draft/task_${numStr}_report_draft.md`);
  console.log(`ID: ${numStr}`);
  console.log(`Title: ${title}`);
  console.log('');
  console.log(`Next step: aitask publish ${numStr}`);
}
