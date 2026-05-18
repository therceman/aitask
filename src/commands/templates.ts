import * as fs from 'fs';
import * as path from 'path';
import { getBuiltins, materializeTemplates } from '../templates';

export function templatesCommand(
  args: string[],
  flags: Record<string, string | boolean>,
): void {
  const sub = args[0];

  if (sub === 'list') {
    const templates = getBuiltins();
    console.log('Built-in templates:');
    console.log('');
    console.log('NAME'.padEnd(28) + 'FILENAME');
    console.log('-'.repeat(60));
    for (const t of templates) {
      console.log(`${t.name.padEnd(28)} ${t.filename}`);
    }
    return;
  }

  if (sub === 'materialize') {
    const names = args.slice(1);
    const targetDir = path.resolve(flags.dir as string || process.cwd());
    const force = flags.force === true;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const created = materializeTemplates(targetDir, names.length > 0 ? names : undefined, force);

    if (created.length === 0) {
      console.log('All templates already exist. Use --force to overwrite.');
    } else {
      for (const fp of created) {
        console.log(`  Created ${fp}`);
      }
    }
    return;
  }

  console.error('Usage: aitask templates <list|materialize> [names...] [--dir <path>] [--force]');
  process.exit(1);
}
