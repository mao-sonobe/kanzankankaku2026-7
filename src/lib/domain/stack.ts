// 企画書のフレーズと技術スタックノードの関係を表すドメイン型。
// Phase 1: 企画書の色分けハイライト表示とReact Flowによる関係グラフで使用する。

export type StackCategory = "frontend" | "backend" | "infra" | "data" | "other";

export const STACK_CATEGORY_LABEL: Record<StackCategory, string> = {
  frontend: "フロントエンド",
  backend: "バックエンド",
  infra: "インフラ",
  data: "データ",
  other: "その他",
};

/** 企画書内の「実現したいこと」を表すフレーズ。textは企画書本文からの厳密な部分文字列。 */
export interface PlanPhrase {
  id: string;
  text: string;
  category: StackCategory;
}

export interface TechStackNode {
  id: string;
  label: string;
  category: StackCategory;
  description: string;
  relatedPhraseIds: string[];
  /** STEP3の4択クイズ用。labelの代替になりそうな、もっともらしいが今回は最適でない技術名。 */
  wrongAnswers?: string[];
}

export interface TechStackEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface TechStackProposal {
  phrases: PlanPhrase[];
  nodes: TechStackNode[];
  edges: TechStackEdge[];
}
