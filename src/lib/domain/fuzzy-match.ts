const MIN_FUZZY_MATCH_LENGTH = 4;

/**
 * needleが本文の完全な部分文字列でない場合(AIが要約・言い換えした場合)に備え、
 * needle内の最長の連続部分文字列で本文に実在するものを探すフォールバック。
 */
export function findBestSubstringMatch(
  haystack: string,
  needle: string
): { start: number; end: number } | null {
  const exact = haystack.indexOf(needle);
  if (exact !== -1) return { start: exact, end: exact + needle.length };

  for (let len = needle.length - 1; len >= MIN_FUZZY_MATCH_LENGTH; len--) {
    for (let i = 0; i + len <= needle.length; i++) {
      const candidate = needle.slice(i, i + len);
      const start = haystack.indexOf(candidate);
      if (start !== -1) return { start, end: start + candidate.length };
    }
  }
  return null;
}

export interface PositionedMatch<T> {
  start: number;
  end: number;
  item: T;
}

/**
 * 複数のneedleをhaystack内で位置特定し、開始位置順に並べ、重複区間を除去する。
 */
export function locateNonOverlapping<T>(
  haystack: string,
  items: T[],
  getText: (item: T) => string
): PositionedMatch<T>[] {
  const matches: PositionedMatch<T>[] = [];
  for (const item of items) {
    const text = getText(item);
    if (!text) continue;
    const found = findBestSubstringMatch(haystack, text);
    if (!found) continue;
    matches.push({ start: found.start, end: found.end, item });
  }

  matches.sort((a, b) => a.start - b.start);

  const accepted: PositionedMatch<T>[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      accepted.push(m);
      lastEnd = m.end;
    }
  }
  return accepted;
}
