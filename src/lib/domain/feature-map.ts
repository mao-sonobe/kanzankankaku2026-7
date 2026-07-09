// 「機能マップ」のドメイン型とロジック。
// AIが特定した「アプリの機能を実装しているコード片(ファイルをまたいでもよい)」を、
// chunk-code・旧data-flowと同じ厳密部分文字列+ファジーマッチ方式で位置特定する。

import type { ChunkedFile, GeneratedFile } from "@/lib/ai/types";
import { findBestSubstringMatch } from "./fuzzy-match";
import { BLANK_PLACEHOLDER } from "./chunk-code";

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

export interface RenderedFeatureRange {
  start: number;
  end: number;
}

export interface FeatureRangesInChunked {
  /** 通常のコード部分(空欄ではない箇所)のうち、機能に関わる範囲。背景色で塗る対象。 */
  textRanges: RenderedFeatureRange[];
  /** 機能に関わる空欄のid。既に役割色で塗られているため、背景ではなく縁取りで示す対象。 */
  slotIds: Set<string>;
}

/**
 * 機能のスパン(元コードの厳密な部分文字列)を、ブロック穴埋めエディタが実際に表示している
 * 「現在の回答状況を反映したコード」の座標系に変換する。
 * - textセグメントはchunk-code時点の元コードのスライスそのものなので、そのままインデックスできる。
 * - slotセグメントは、その空欄の正解コードがいずれかのスパンと一致する場合、
 *   (背景ではなく)縁取りでハイライトする対象として返す(未回答でも「ここがこの機能に
 *   関わる空欄だ」と分かるようにするため。役割色の背景と機能色の背景がぶつからないようにする)。
 */
export function locateFeatureRangesInChunked(
  chunked: ChunkedFile,
  answers: Record<string, string>,
  spans: FeatureSpan[]
): FeatureRangesInChunked {
  const textRanges: RenderedFeatureRange[] = [];
  const slotIds = new Set<string>();
  let cursor = 0;
  for (const seg of chunked.segments) {
    if (seg.type === "text") {
      for (const span of spans) {
        let searchFrom = 0;
        while (true) {
          const idx = seg.content.indexOf(span.text, searchFrom);
          if (idx === -1) break;
          textRanges.push({ start: cursor + idx, end: cursor + idx + span.text.length });
          searchFrom = idx + span.text.length;
        }
      }
      cursor += seg.content.length;
    } else {
      const chosenId = answers[seg.slot.id];
      const choice = seg.slot.choices.find((c) => c.id === chosenId);
      const code = choice ? choice.code : BLANK_PLACEHOLDER;
      const correctChoice = seg.slot.choices.find((c) => c.isCorrect);
      const matchesFeature =
        !!correctChoice && spans.some((s) => s.text.trim() === correctChoice.code.trim());
      if (matchesFeature) {
        slotIds.add(seg.slot.id);
      }
      cursor += code.length;
    }
  }
  return { textRanges, slotIds };
}

/**
 * 生成コード内で「ある機能」を実装しているファイルの集合を返す。
 * ファイルツリーの色分けに使う。
 */
export function filePathsForFeature(spans: FeatureSpan[], featureId: string): Set<string> {
  return new Set(spans.filter((s) => s.featureId === featureId).map((s) => s.filePath));
}
