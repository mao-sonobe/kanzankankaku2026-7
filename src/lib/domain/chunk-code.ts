import type { BlockRole, ChunkedFile, CodeBlockChoice, CodeBlockSlot } from "@/lib/ai/types";
import { locateNonOverlapping } from "./fuzzy-match";

export interface RawBlank {
  text: string;
  role: BlockRole;
  label: string;
  wrongAnswers: string[];
  /** この空欄が関わる技術スタックノードのid(任意) */
  relatedStackNodeId?: string;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * AIが提示した「空欄にする箇所(元コードの部分文字列)」を実際のファイル内容から位置特定し、
 * text/slotのセグメント列を構築する。「text」部分は元コードの厳密なスライスなので、
 * 全スロットに正解を入れれば元のコードと完全に一致することが保証される。
 */
export function buildChunkedFile(
  path: string,
  content: string,
  blanks: RawBlank[],
  validNodeIds?: Set<string>
): ChunkedFile {
  // CodeMirrorのウィジェット描画を単純にするため、複数行にまたがる空欄は除外する。
  const accepted = locateNonOverlapping(content, blanks, (b) => b.text).filter(
    (m) => !content.slice(m.start, m.end).includes("\n")
  );

  const segments: ChunkedFile["segments"] = [];
  let cursor = 0;
  let slotIndex = 0;

  for (const m of accepted) {
    if (m.start > cursor) {
      segments.push({ type: "text", content: content.slice(cursor, m.start) });
    }
    const correctCode = content.slice(m.start, m.end);
    const choices: CodeBlockChoice[] = shuffle([
      { id: `slot-${slotIndex}-correct`, code: correctCode, isCorrect: true },
      ...m.item.wrongAnswers
        .filter((w) => w.trim() && w.trim() !== correctCode.trim())
        .slice(0, 3)
        .map((w, i) => ({
          id: `slot-${slotIndex}-wrong-${i}`,
          code: w,
          isCorrect: false,
        })),
    ]);
    const relatedStackNodeId =
      m.item.relatedStackNodeId && validNodeIds?.has(m.item.relatedStackNodeId)
        ? m.item.relatedStackNodeId
        : undefined;
    const slot: CodeBlockSlot = {
      id: `slot-${slotIndex}`,
      role: m.item.role,
      label: m.item.label,
      choices,
      ...(relatedStackNodeId ? { relatedStackNodeId } : {}),
    };
    segments.push({ type: "slot", slot });
    cursor = m.end;
    slotIndex++;
  }
  if (cursor < content.length) {
    segments.push({ type: "text", content: content.slice(cursor) });
  }

  return { path, segments };
}

/** 未回答のスロットに入れる、構文的に無害なプレースホルダー。 */
export const BLANK_PLACEHOLDER = "null";

export interface SlotRange {
  start: number;
  end: number;
  slot: CodeBlockSlot;
  choice: CodeBlockChoice | null;
}

/**
 * 現在の回答状況(スロットid -> 選択したchoiceId)からファイルの現在の内容と、
 * 各スロットが文書内で占める範囲を同時に構築する。
 * 全スロットが正解であれば元のAI生成コードと完全に一致する。
 */
export function buildFileContentWithRanges(
  chunked: ChunkedFile,
  answers: Record<string, string>
): { text: string; ranges: SlotRange[] } {
  let text = "";
  const ranges: SlotRange[] = [];

  for (const seg of chunked.segments) {
    if (seg.type === "text") {
      text += seg.content;
      continue;
    }
    const chosenId = answers[seg.slot.id];
    const choice = seg.slot.choices.find((c) => c.id === chosenId) ?? null;
    const code = choice ? choice.code : BLANK_PLACEHOLDER;
    ranges.push({ start: text.length, end: text.length + code.length, slot: seg.slot, choice });
    text += code;
  }

  return { text, ranges };
}

/**
 * 現在の回答状況(スロットid -> 選択したchoiceId)からファイルの現在の内容を再構築する。
 * 全スロットが正解であれば元のAI生成コードと完全に一致する。
 */
export function buildFileContent(
  chunked: ChunkedFile,
  answers: Record<string, string>
): string {
  return buildFileContentWithRanges(chunked, answers).text;
}

export function isFileComplete(chunked: ChunkedFile, answers: Record<string, string>): boolean {
  return chunked.segments
    .filter((s) => s.type === "slot")
    .every((s) => {
      if (s.type !== "slot") return true;
      const chosenId = answers[s.slot.id];
      const choice = s.slot.choices.find((c) => c.id === chosenId);
      return !!choice?.isCorrect;
    });
}
