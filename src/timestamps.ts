export function formatTimestamp(date?: Date, timezone?: string): string {
  const d = date || new Date();
  const tz = timezone || 'Europe/Riga';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)!.value.padStart(2, '0');
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

export function now(timezone?: string): string {
  return formatTimestamp(new Date(), timezone);
}

export function updateFrontmatterTimestamp(content: string, key: string, value: string): string {
  const lines = content.split('\n');
  let inFm = false;
  let fmEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (!inFm) {
        inFm = true;
      } else {
        fmEnd = i;
        break;
      }
    }
  }
  if (fmEnd === -1) return content;

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRe = new RegExp(`^${escapedKey}\\s*:`);

  let found = false;
  for (let i = 1; i < fmEnd; i++) {
    if (keyRe.test(lines[i])) {
      lines[i] = `${key}: "${value}"`;
      found = true;
      break;
    }
  }

  if (!found) {
    lines.splice(fmEnd, 0, `${key}: "${value}"`);
  }

  return lines.join('\n');
}
