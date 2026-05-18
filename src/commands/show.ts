import * as fs from 'fs';
import { resolveTask } from '../tasks';

const DEFAULT_SECTIONS = ['frontmatter', 'goal', 'scope', 'acceptance'];
const MAX_LINE_LENGTH = 200;

function extractSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split('\n');
  let currentSection = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection) {
        sections.set(currentSection, currentLines.join('\n'));
      }
      currentSection = line.slice(3).trim().toLowerCase();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  if (currentSection) {
    sections.set(currentSection, currentLines.join('\n'));
  }

  return sections;
}

function extractFrontmatter(content: string): string {
  if (!content.startsWith('---\n')) return '';
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return '';
  return content.slice(4, end);
}

function truncateLines(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines truncated)`;
}

const SECTION_ALIASES: Record<string, string[]> = {
  goal: ['objective', 'goal'],
  scope: ['scope', 'scope'],
  acceptance: ['acceptance criteria', 'acceptance'],
  validation: ['validation', 'validation'],
};

function resolveSectionAlias(key: string): string | undefined {
  const lower = key.toLowerCase();
  for (const [canonical, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(lower)) return canonical;
  }
  for (const [canonical] of Object.entries(SECTION_ALIASES)) {
    if (canonical.startsWith(lower) || lower.startsWith(canonical)) return canonical;
  }
  return undefined;
}

export function showCommand(
  id: string | undefined,
  flags: Record<string, string | boolean>,
): void {
  if (!id) {
    console.error('Error: Task ID required');
    console.error('Usage: aitask show <id> [--sections <names>] [--full]');
    process.exit(1);
  }

  const task = resolveTask(id);
  if (!task) {
    console.error(`Error: Task "${id}" not found`);
    process.exit(1);
  }

  const content = fs.readFileSync(task.path, 'utf-8');
  const sections = extractSections(content);

  const full = flags.full === true;
  const sectionsFlag = flags.sections as string | undefined;

  if (full) {
    console.log(content.trimEnd());
    return;
  }

  let sectionNames: string[];
  if (sectionsFlag) {
    sectionNames = sectionsFlag.split(',').map(s => s.trim().toLowerCase());
    for (const name of sectionNames) {
      if (name === 'frontmatter') continue;
      const resolved = resolveSectionAlias(name);
      if (!resolved || !sections.has(name)) {
        if (!sections.has(name) && !SECTION_ALIASES[name]) {
          console.error(`Error: Unknown section "${name}". Valid sections: frontmatter, goal, scope, acceptance, validation, or any ## heading in task body.`);
          process.exit(1);
        }
      }
    }
  } else {
    sectionNames = DEFAULT_SECTIONS;
  }

  for (const name of sectionNames) {
    if (name === 'frontmatter') {
      const fm = extractFrontmatter(content);
      if (fm) {
        console.log('---');
        console.log(fm);
        console.log('---');
      }
      continue;
    }

    const resolved = resolveSectionAlias(name);
    const sectionKeys = resolved ? (SECTION_ALIASES[resolved] || [resolved]) : [name];

    let found = false;
    for (const key of sectionKeys) {
      if (sections.has(key)) {
        const sectionContent = sections.get(key)!;
        console.log(truncateLines(sectionContent, MAX_LINE_LENGTH));
        found = true;
        break;
      }
    }
    if (!found && sections.has(name)) {
      console.log(truncateLines(sections.get(name)!, MAX_LINE_LENGTH));
    }
  }
}
