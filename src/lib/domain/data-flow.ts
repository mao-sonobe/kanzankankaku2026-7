// 「データフロー解説」のドメイン型とロジック。
// AIが特定した「技術スタックのエッジが生成コード上で実装されている箇所」を、
// chunk-codeと同じ厳密部分文字列+ファジーマッチ方式で位置特定する。

import type { GeneratedFile } from "@/lib/ai/types";
import type { TechStackProposal } from "./stack";
import {
  findBestSubstringMatch,
  locateNonOverlapping,
  type PositionedMatch,
} from "./fuzzy-match";

/** 生成コード内の「データが受け渡される瞬間」を表す1箇所。textは該当ファイルの厳密な部分文字列。 */
export interface DataFlowSpan {
  id: string;
  filePath: string;
  text: string;
  /** stackProposal.edgesのid。この箇所が実装しているデータの流れ */
  edgeId: string;
  /** どのデータがどこからどこへ渡るかの短い解説 */
  explanation: string;
}

export interface DataFlowResult {
  spans: DataFlowSpan[];
}

interface RawSpan {
  filePath: string;
  text: string;
  edgeId: string;
  explanation: string;
}

/**
 * AI出力のスパンを検証する。実在するエッジ・ファイルを指し、かつ本文中に位置特定できた
 * ものだけを残し、textを実際にマッチした本文スライスへ置き換える(クライアント側での
 * 再位置特定が必ず成功するようにするため)。
 */
export function validateDataFlowSpans(
  files: GeneratedFile[],
  proposal: TechStackProposal,
  raw: RawSpan[]
): DataFlowSpan[] {
  const edgeIds = new Set(proposal.edges.map((e) => e.id));
  const fileByPath = new Map(files.map((f) => [f.path, f.content]));
  const spans: DataFlowSpan[] = [];
  for (const s of raw) {
    if (!edgeIds.has(s.edgeId)) continue;
    const content = fileByPath.get(s.filePath);
    if (!content) continue;
    const match = findBestSubstringMatch(content, s.text);
    if (!match) continue;
    spans.push({
      id: `flow-${spans.length}`,
      filePath: s.filePath,
      text: content.slice(match.start, match.end),
      edgeId: s.edgeId,
      explanation: s.explanation,
    });
  }
  return spans;
}

/** 1ファイル分のスパンを本文中に位置特定する(重複区間は除去、開始位置順)。 */
export function locateSpansInFile(
  content: string,
  spans: DataFlowSpan[]
): PositionedMatch<DataFlowSpan>[] {
  return locateNonOverlapping(content, spans, (s) => s.text);
}
