import { locateNonOverlapping } from "./fuzzy-match.mjs";

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Claudeが指定した「空欄にする箇所(元コードの部分文字列)」を実際のコードから位置特定し、
 * text/slotのセグメント列を構築する。「text」部分は元コードの厳密なスライスなので、
 * 全スロットに正解を入れれば元のコードと完全に一致することが保証される。
 * (src/lib/domain/chunk-code.ts の buildChunkedFile と同じ考え方のプレーンJS移植)
 */
export function buildChunkedSegments(content, blanks) {
  const accepted = locateNonOverlapping(content, blanks, (b) => b.text).filter(
    (m) => !content.slice(m.start, m.end).includes("\n")
  );

  const segments = [];
  let cursor = 0;
  let slotIndex = 0;

  for (const m of accepted) {
    if (m.start > cursor) {
      segments.push({ type: "text", content: content.slice(cursor, m.start) });
    }
    const correctCode = content.slice(m.start, m.end);
    const choices = shuffle([
      { id: `slot-${slotIndex}-correct`, code: correctCode, isCorrect: true },
      ...m.item.wrongAnswers
        .filter((w) => w.trim() && w.trim() !== correctCode.trim())
        .slice(0, 3)
        .map((w, i) => ({ id: `slot-${slotIndex}-wrong-${i}`, code: w, isCorrect: false })),
    ]);
    segments.push({
      type: "slot",
      slot: { id: `slot-${slotIndex}`, role: m.item.role, label: m.item.label, choices },
    });
    cursor = m.end;
    slotIndex++;
  }
  if (cursor < content.length) {
    segments.push({ type: "text", content: content.slice(cursor) });
  }

  return segments;
}
