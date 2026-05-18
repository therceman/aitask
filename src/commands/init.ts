import * as fs from 'fs';
import * as path from 'path';
import { tasksDir, ensureDirs } from '../tasks';
import { materializeTemplates, getBuiltins } from '../templates';

export function initCommand(force: boolean): void {
  const base = tasksDir();
  if (fs.existsSync(base)) {
    if (!force) {
      console.log(`Tasks directory already exists at ${base}/`);
      console.log('Use --force to reinitialize (overwrite stubs)');
      return;
    }
    console.log('Reinitializing task directory...');
  }

  ensureDirs();

  const created = materializeTemplates(path.resolve(base, '..'), undefined, force);

  if (force) {
    console.log(`Reinitialized ${base}/`);
  } else {
    console.log(`Initialized empty task directories at ${base}/`);
  }

  for (const fp of created) {
    console.log(`  Created ${path.basename(fp)}`);
  }
}
