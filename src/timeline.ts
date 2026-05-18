export function appendTimelineEntry(content: string, timestamp: string, newState: string, reason?: string): string {
  const entry = `- ${timestamp} | state: ${newState}${reason ? ` | ${reason}` : ''}`;

  if (content.includes('## Timeline')) {
    const lines = content.split('\n');
    let timelineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '## Timeline') {
        timelineIdx = i;
        break;
      }
    }
    if (timelineIdx !== -1) {
      let endIdx = lines.length;
      for (let i = timelineIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## ')) {
          endIdx = i;
          break;
        }
      }
      let insertIdx = endIdx;
      while (insertIdx > timelineIdx + 1 && lines[insertIdx - 1].trim() === '') {
        insertIdx--;
      }
      lines.splice(insertIdx, 0, entry);
      return lines.join('\n');
    }
  }

  return content.trimEnd() + '\n\n## Timeline\n' + entry + '\n';
}
