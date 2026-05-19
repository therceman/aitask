import { listCommand } from './list';

export function queueCommand(): void {
  listCommand({});
}
