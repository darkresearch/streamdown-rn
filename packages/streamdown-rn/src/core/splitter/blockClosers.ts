/**
 * Helpers to detect when special blocks are closed.
 */

export function findCodeBlockCloseIndex(content: string): number {
  const firstNewlineIndex = content.indexOf('\n');
  if (firstNewlineIndex === -1) return -1;

  const firstLine = content.slice(0, firstNewlineIndex).replace(/\r$/, '');
  const openMatch = firstLine.match(/^(`{3,}|~{3,})/);
  if (!openMatch) return -1;

  const fence = openMatch[1];
  const fenceChar = fence[0];
  const fenceLen = fence.length;
  const closePattern = new RegExp(`^${fenceChar}{${fenceLen},}\\s*$`);

  let cursor = firstNewlineIndex + 1;
  while (cursor <= content.length) {
    const nextNewlineIndex = content.indexOf('\n', cursor);
    const lineEnd = nextNewlineIndex === -1 ? content.length : nextNewlineIndex;
    const line = content.slice(cursor, lineEnd).replace(/\r$/, '');

    if (closePattern.test(line)) {
      return lineEnd;
    }

    if (nextNewlineIndex === -1) break;
    cursor = nextNewlineIndex + 1;
  }

  return -1;
}

export function isCodeBlockClosed(content: string): boolean {
  return findCodeBlockCloseIndex(content) === content.length;
}

export function findComponentCloseIndex(content: string): number {
  if (!content.startsWith('[{')) return -1;

  let braceDepth = 1;
  let bracketDepth = 1;
  let inString = false;
  let escape = false;

  for (let i = 2; i < content.length; i++) {
    const char = content[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') braceDepth++;
    if (char === '}') braceDepth--;
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;

    if (
      braceDepth === 0 &&
      bracketDepth === 0 &&
      i >= 1 &&
      content[i - 1] === '}' &&
      char === ']'
    ) {
      return i + 1;
    }
  }

  return -1;
}

export function isComponentClosed(content: string): boolean {
  return findComponentCloseIndex(content) === content.length;
}

