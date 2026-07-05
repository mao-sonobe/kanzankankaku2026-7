import type { PlanPhrase } from "./stack";
import { locateNonOverlapping } from "./fuzzy-match";

export type PlanSegment =
  | { type: "text"; content: string }
  | { type: "phrase"; content: string; phrase: PlanPhrase };

/**
 * 企画書本文をフレーズ一覧に基づきセグメント分割する。
 * フレーズが本文中に見つからない場合(AIの抽出ミス等)は無視する。
 * 重複区間は先に見つかったフレーズを優先する。
 */
export function segmentPlanText(planText: string, phrases: PlanPhrase[]): PlanSegment[] {
  const accepted = locateNonOverlapping(planText, phrases, (p) => p.text);

  const segments: PlanSegment[] = [];
  let cursor = 0;
  for (const m of accepted) {
    if (m.start > cursor) {
      segments.push({ type: "text", content: planText.slice(cursor, m.start) });
    }
    segments.push({ type: "phrase", content: planText.slice(m.start, m.end), phrase: m.item });
    cursor = m.end;
  }
  if (cursor < planText.length) {
    segments.push({ type: "text", content: planText.slice(cursor) });
  }

  return segments;
}
