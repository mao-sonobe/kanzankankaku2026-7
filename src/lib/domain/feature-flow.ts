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
  uiResult?: string;
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
export function validateFeatureFlows(
  files: GeneratedFile[],
  raw: RawFeature[]
): FeatureFlow[] {
  const fileByPath = new Map(files.map((f) => [f.path, f.content]));
  const firstFile = files[0]?.content ?? "";

  const features: FeatureFlow[] = [];
  raw.forEach((f, fi) => {
    const nodes: FlowNode[] = (f.nodes ?? []).map((n, ni) => {
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
    const nodeIds = new Set(nodes.map((n) => n.id));
    const steps: FlowStep[] = (f.steps ?? [])
      .filter((s) => nodeIds.has(s.fromId) && nodeIds.has(s.toId) && s.fromId !== s.toId)
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

const ROLE_COLUMN: Record<FlowRole, number> = {
  screen: 0,
  component: 0,
  hook: 1,
  state: 1,
  util: 1,
  db: 2,
  api: 2,
};

/**
 * roleで3列(画面=左 / ロジック=中 / データ=右)に分け、各列内は縦に等間隔配置する
 * 決定的レイアウト。ドラッグ配線のヒットテスト用に割合座標を返す。
 */
export function layoutFlowNodes(feature: FeatureFlow): PositionedFlowNode[] {
  const columns: FlowNode[][] = [[], [], []];
  for (const n of feature.nodes) columns[ROLE_COLUMN[n.role] ?? 1].push(n);

  const xForCol = [0.16, 0.5, 0.84];
  const result: PositionedFlowNode[] = [];
  columns.forEach((col, ci) => {
    col.forEach((node, i) => {
      const yPct = col.length === 1 ? 0.5 : 0.18 + (0.64 * i) / (col.length - 1);
      result.push({ node, xPct: xForCol[ci], yPct });
    });
  });
  return result;
}
