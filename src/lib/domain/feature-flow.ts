// 「機能ごとの配線パズル」のドメイン型とロジック。
// AIが生成コードを解析し、機能(=やりたいことを実現する手順)ごとに
// コードノードとデータの流れ(呼び出し/戻り値)を返す。snippetは実コードの厳密部分文字列。

import type { GeneratedFile } from "@/lib/ai/types";
import { findBestSubstringMatch } from "./fuzzy-match";

/** コード上の要素(画面・フック・状態・DB呼び出し・コンポーネント等) */
export type FlowRole = "screen" | "hook" | "state" | "db" | "api" | "component" | "util";

export interface FlowNode {
  id: string;
  /** コード上の名前(例: HomeScreen, useState, handleSubmit, supabase.from('books')) */
  label: string;
  /** 由来ファイルパス(表示用) */
  file: string;
  role: FlowRole;
  /** このノードが持つ/扱うデータの説明 */
  data: string;
  /** 実コードからの抜粋(位置特定できたもののみ。無い場合は空文字) */
  snippet: string;
}

export interface FlowStep {
  id: string;
  fromId: string;
  toId: string;
  /** 呼び出し(データを渡す) / 戻り値(結果が返ってくる) */
  kind: "call" | "return";
  /** 渡る具体的なデータ(例: 入力された検索キーワード) */
  dataLabel: string;
  /** 1〜2文の解説 */
  explanation: string;
  /** この手順の結果、画面に出るもの(任意) */
  uiResult?: string;
}

export interface FeatureFlow {
  id: string;
  name: string;
  nodes: FlowNode[];
  steps: FlowStep[];
}

export interface FeatureFlowResult {
  features: FeatureFlow[];
}

const KNOWN_ROLES = new Set<FlowRole>(["screen", "hook", "state", "db", "api", "component", "util"]);
function coerceRole(role: string): FlowRole {
  const r = (role ?? "").toLowerCase() as FlowRole;
  return KNOWN_ROLES.has(r) ? r : "util";
}

interface RawNode {
  id: string;
  label: string;
  file: string;
  role: string;
  data: string;
  snippet?: string;
}
interface RawStep {
  fromId: string;
  toId: string;
  kind: string;
  dataLabel: string;
  explanation: string;
  uiResult?: string | null;
}
interface RawFeature {
  name: string;
  nodes: RawNode[];
  steps: RawStep[];
}

/**
 * AI出力を検証する。
 * - nodes: snippetを実ファイルから位置特定できた場合は厳密なスライスへ置換(できなければ空文字で残す)。
 * - steps: from/toがそのfeatureのnode idに含まれるものだけ残す。
 * - node/stepが2件未満のfeatureは捨てる。
 */
// 配線パズルとして手で操作できる規模に抑える上限。多すぎると図が重なり操作不能になる。
const MAX_STEPS_PER_FEATURE = 6;
const MAX_NODES_PER_FEATURE = 6;

export function validateFeatureFlows(
  files: GeneratedFile[],
  raw: RawFeature[]
): FeatureFlow[] {
  const fileByPath = new Map(files.map((f) => [f.path, f.content]));
  const firstFile = files[0]?.content ?? "";

  const features: FeatureFlow[] = [];
  raw.forEach((f, fi) => {
    const allNodes: FlowNode[] = (f.nodes ?? []).map((n, ni) => {
      let snippet = "";
      if (n.snippet) {
        const content = fileByPath.get(n.file) ?? firstFile;
        const match = findBestSubstringMatch(content, n.snippet);
        if (match) snippet = content.slice(match.start, match.end);
      }
      return {
        id: n.id || `f${fi}-n${ni}`,
        label: n.label,
        file: n.file,
        role: coerceRole(n.role),
        data: n.data,
        snippet,
      };
    });
    const nodeById = new Map(allNodes.map((n) => [n.id, n]));

    // 有効なステップを実行順で最大数まで採用する。
    const validSteps = (f.steps ?? []).filter(
      (s) => nodeById.has(s.fromId) && nodeById.has(s.toId) && s.fromId !== s.toId
    );
    const keptRaw = validSteps.slice(0, MAX_STEPS_PER_FEATURE);

    // 採用したステップが参照するノードだけに絞る(図の混雑を防ぐ)。
    const usedIds = new Set<string>();
    for (const s of keptRaw) {
      usedIds.add(s.fromId);
      usedIds.add(s.toId);
    }
    let nodes = allNodes.filter((n) => usedIds.has(n.id));
    if (nodes.length > MAX_NODES_PER_FEATURE) nodes = nodes.slice(0, MAX_NODES_PER_FEATURE);
    const keptIds = new Set(nodes.map((n) => n.id));

    const steps: FlowStep[] = keptRaw
      .filter((s) => keptIds.has(s.fromId) && keptIds.has(s.toId))
      .map((s, si) => ({
        id: `f${fi}-s${si}`,
        fromId: s.fromId,
        toId: s.toId,
        kind: s.kind === "return" ? "return" : "call",
        dataLabel: s.dataLabel,
        explanation: s.explanation,
        uiResult: s.uiResult?.trim() || undefined,
      }));

    if (nodes.length >= 2 && steps.length >= 1) {
      features.push({ id: `feature-${features.length}`, name: f.name, nodes, steps });
    }
  });
  return features;
}

export interface PositionedFlowNode {
  node: FlowNode;
  /** キャンバス幅・高さに対する割合(0〜1) */
  xPct: number;
  yPct: number;
}

/**
 * ノードをステップの登場順に並べ、最大3列のグリッドに均等配置する決定的レイアウト。
 * 役割ごとに列を固定すると1列に偏って重なるため、順序ベースのグリッドで散らす。
 * ドラッグ配線のヒットテスト用に割合座標を返す。
 */
export function layoutFlowNodes(feature: FeatureFlow): PositionedFlowNode[] {
  // ステップの出発→到達の順にノードidを並べ、残りを後ろに付ける(データが流れる順)。
  const order: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (!seen.has(id) && feature.nodes.some((n) => n.id === id)) {
      seen.add(id);
      order.push(id);
    }
  };
  for (const s of feature.steps) {
    push(s.fromId);
    push(s.toId);
  }
  for (const n of feature.nodes) push(n.id);

  const nodeById = new Map(feature.nodes.map((n) => [n.id, n]));
  const ordered = order.map((id) => nodeById.get(id)!).filter(Boolean);

  const n = ordered.length;
  const cols = n <= 3 ? n : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);

  const result: PositionedFlowNode[] = [];
  ordered.forEach((node, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // 各行の実際の列数(最終行が欠ける場合は中央寄せ)
    const colsInRow = row === rows - 1 && n % cols !== 0 ? n % cols : cols;
    const xPct = colsInRow === 1 ? 0.5 : 0.18 + (0.64 * col) / (colsInRow - 1);
    // カード(コード抜粋つきで背が高い)が枠の上下で見切れないよう、縦は内側に寄せる。
    const yPct = rows === 1 ? 0.5 : 0.24 + (0.52 * row) / (rows - 1);
    result.push({ node, xPct, yPct });
  });
  return result;
}
