// 「機能マップ」のドメイン型とロジック。
// AIが特定した「アプリの機能を実装しているコード片(ファイルをまたいでもよい)」を、
// chunk-code・旧data-flowと同じ厳密部分文字列+ファジーマッチ方式で位置特定する。

import type { GeneratedFile } from "@/lib/ai/types";
import { findBestSubstringMatch, locateNonOverlapping, type PositionedMatch } from "./fuzzy-match";

/** アプリの機能単位(例: 「予定の追加」)。複数ファイルにまたがるコードを束ねる。 */
export interface Feature {
  id: string;
  label: string;
  description: string;
  /** この機能が扱う入出力データの形式(1文。例: タイトル・詳細・日付を持つオブジェクト) */
  dataShape: string;
}

/** 生成コード内の「ある機能を実装している箇所」を表す1箇所。textは該当ファイルの厳密な部分文字列。 */
export interface FeatureSpan {
  id: string;
  filePath: string;
  text: string;
  /** Feature.id */
  featureId: string;
  /** このコードがこの機能の中で何をしているかの短い解説 */
  explanation: string;
}

export interface FeatureMapResult {
  features: Feature[];
  spans: FeatureSpan[];
}

interface RawSpan {
  filePath: string;
  text: string;
  featureId: string;
  explanation: string;
}

/**
 * AI出力のスパンを検証する。実在する機能・ファイルを指し、かつ本文中に位置特定できた
 * ものだけを残し、textを実際にマッチした本文スライスへ置き換える(クライアント側での
 * 再位置特定が必ず成功するようにするため)。
 */
export function validateFeatureSpans(
  files: GeneratedFile[],
  features: Feature[],
  raw: RawSpan[]
): FeatureSpan[] {
  const featureIds = new Set(features.map((f) => f.id));
  const fileByPath = new Map(files.map((f) => [f.path, f.content]));
  const spans: FeatureSpan[] = [];
  for (const s of raw) {
    if (!featureIds.has(s.featureId)) continue;
    const content = fileByPath.get(s.filePath);
    if (!content) continue;
    const match = findBestSubstringMatch(content, s.text);
    if (!match) continue;
    spans.push({
      id: `feature-span-${spans.length}`,
      filePath: s.filePath,
      text: content.slice(match.start, match.end),
      featureId: s.featureId,
      explanation: s.explanation,
    });
  }
  return spans;
}

/** 1ファイル分のスパンを本文中に位置特定する(重複区間は除去、開始位置順)。 */
export function locateFeatureSpansInFile(
  content: string,
  spans: FeatureSpan[]
): PositionedMatch<FeatureSpan>[] {
  return locateNonOverlapping(content, spans, (s) => s.text);
}
