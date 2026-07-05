import type { PlanPhrase } from "./stack";

export type PlanSegment =
  | { type: "text"; content: string }
  | { type: "phrase"; content: string; phrase: PlanPhrase };

const MIN_FUZZY_MATCH_LENGTH = 4;

/**
 * phrase.textが本文の完全な部分文字列でない場合(AIが要約・言い換えした場合)に備え、
 * phrase.text内の最長の連続部分文字列で本文に実在するものを探すフォールバック。
 */
function findBestSubstringMatch(planText: string, needle: string): { start: number; end: number } | null {
  const exact = planText.indexOf(needle);
  if (exact !== -1) return { start: exact, end: exact + needle.length };

  for (let len = needle.length - 1; len >= MIN_FUZZY_MATCH_LENGTH; len--) {
    for (let i = 0; i + len <= needle.length; i++) {
      const candidate = needle.slice(i, i + len);
      const start = planText.indexOf(candidate);
      if (start !== -1) return { start, end: start + candidate.length };
    }
  }
  return null;
}

/**
 * 企画書本文をフレーズ一覧に基づきセグメント分割する。
 * フレーズが本文中に見つからない場合(AIの抽出ミス等)は無視する。
 * 重複区間は先に見つかったフレーズを優先する。
 */
export function segmentPlanText(planText: string, phrases: PlanPhrase[]): PlanSegment[] {
  type Match = { start: number; end: number; phrase: PlanPhrase };
  const matches: Match[] = [];

  for (const phrase of phrases) {
    if (!phrase.text) continue;
    const found = findBestSubstringMatch(planText, phrase.text);
    if (!found) continue;
    matches.push({ start: found.start, end: found.end, phrase });
  }

  matches.sort((a, b) => a.start - b.start);

  const accepted: Match[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      accepted.push(m);
      lastEnd = m.end;
    }
  }

  const segments: PlanSegment[] = [];
  let cursor = 0;
  for (const m of accepted) {
    if (m.start > cursor) {
      segments.push({ type: "text", content: planText.slice(cursor, m.start) });
    }
    segments.push({ type: "phrase", content: planText.slice(m.start, m.end), phrase: m.phrase });
    cursor = m.end;
  }
  if (cursor < planText.length) {
    segments.push({ type: "text", content: planText.slice(cursor) });
  }

  return segments;
}
