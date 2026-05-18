import * as fs from 'fs';
import * as path from 'path';

export interface ManagerContactConfig {
  command?: string;
}

export interface ManagerConfig {
  env?: string;
  id?: string;
  name?: string;
  contact?: ManagerContactConfig;
}

export interface AitaskConfig {
  manager?: ManagerConfig;
}

export function configPath(cwd?: string): string {
  return path.resolve(cwd || process.cwd(), 'aitask.yml');
}

export function loadConfig(cwd?: string): AitaskConfig {
  const fp = configPath(cwd);
  if (!fs.existsSync(fp)) return {};
  const content = fs.readFileSync(fp, 'utf-8');
  return parseYaml(content);
}

export function parseYaml(content: string): AitaskConfig {
  const config: AitaskConfig = {};
  const lines = content.split('\n');
  let section: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed.trim() === '' || trimmed.trim().startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;

    if (trimmed.endsWith(':') && !trimmed.startsWith('-')) {
      const key = trimmed.slice(0, -1).trim();
      if (indent === 0) {
        section = [key];
      } else if (indent === 2) {
        section = [section[0], key];
      } else if (indent === 4) {
        section = [section[0], section[1], key];
      }
      continue;
    }

    if (trimmed.includes(': ')) {
      const colonIdx = trimmed.indexOf(': ');
      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 2).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      if (section.length === 1 && section[0] === 'manager') {
        if (key === 'env') {
          if (!config.manager) config.manager = {};
          config.manager.env = value;
        } else if (key === 'id') {
          if (!config.manager) config.manager = {};
          config.manager.id = value;
        } else if (key === 'name') {
          if (!config.manager) config.manager = {};
          config.manager.name = value;
        }
      } else if (section.length === 2 && section[0] === 'manager' && section[1] === 'contact') {
        if (key === 'command') {
          if (!config.manager) config.manager = {};
          if (!config.manager.contact) config.manager.contact = {};
          config.manager.contact.command = value;
        }
      }
    }
  }

  return config;
}

export function serializeConfig(config: AitaskConfig): string {
  const lines: string[] = [];
  if (config.manager) {
    lines.push('manager:');
    if (config.manager.env) lines.push(`  env: ${config.manager.env}`);
    if (config.manager.id) lines.push(`  id: ${config.manager.id}`);
    if (config.manager.name) lines.push(`  name: "${config.manager.name}"`);
    if (config.manager.contact?.command) {
      lines.push('  contact:');
      lines.push(`    command: ${config.manager.contact.command}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

export function writeConfig(config: AitaskConfig, cwd?: string): void {
  const fp = configPath(cwd);
  fs.writeFileSync(fp, serializeConfig(config), 'utf-8');
}

export function isManagerActive(config?: AitaskConfig): boolean {
  const cfg = config || loadConfig();
  if (!cfg.manager?.env || !cfg.manager?.id) return false;
  return process.env[cfg.manager.env] === cfg.manager.id;
}

export function requireManager(config?: AitaskConfig): void {
  const cfg = config || loadConfig();
  if (!cfg.manager?.env || !cfg.manager?.id) {
    console.error('Error: No manager configured. Run "aitask manager set <id> --env <ENV_NAME>" first.');
    process.exit(1);
  }
  if (process.env[cfg.manager.env] !== cfg.manager.id) {
    console.error(`Error: This command requires manager access. Set ${cfg.manager.env}=${cfg.manager.id} or run as the configured manager.`);
    process.exit(1);
  }
}
