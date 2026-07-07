// STEP3の技術スタック4択クイズのドメインロジック。
// 正解=AIが提案したnode.label、誤答=node.wrongAnswers(tech-stack APIが生成、不正解理由つき)。

import type { StackWrongAnswer, TechStackNode, TechStackProposal } from "./stack";

export type StackQuizStatus = "correct" | "wrong" | "revealed";

/** 1ノード分の回答。chosenは誤答時に選んだ技術名(不正解理由の表示に使う)。 */
export interface StackQuizEntry {
  status: StackQuizStatus;
  chosen?: string;
}

/**
 * nodeId -> クイズの回答状況。
 * 旧形式(値がstatus文字列のみ)の永続化データも読めるよう両対応。
 */
export type StackQuizState = Record<string, StackQuizEntry | StackQuizStatus>;

/** 新旧形式を吸収して回答エントリを取り出す。 */
export function getQuizEntry(state: StackQuizState, nodeId: string): StackQuizEntry | undefined {
  const v = state[nodeId];
  if (!v) return undefined;
  return typeof v === "string" ? { status: v } : v;
}

export interface QuizChoice {
  label: string;
  isCorrect: boolean;
  /** 誤答の場合の「なぜ最適でないか」(正解にはない) */
  reason?: string;
}

/** 新旧形式(string / {label, reason})を吸収して誤答リストを正規化する。 */
export function normalizeWrongAnswers(node: TechStackNode): StackWrongAnswer[] {
  const seen = new Set<string>();
  const result: StackWrongAnswer[] = [];
  for (const w of node.wrongAnswers ?? []) {
    const entry = typeof w === "string" ? { label: w } : w;
    const label = entry.label?.trim();
    if (!label || label === node.label.trim() || seen.has(label)) continue;
    seen.add(label);
    result.push({ label, reason: entry.reason?.trim() || undefined });
    if (result.length >= 3) break;
  }
  return result;
}

/** node.idから決定的に選択肢を並べるためのシード付き乱数(再描画・リロードで順序が変わらないように)。 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * ノードの4択の選択肢を返す。使える誤答がない場合(Ollama等、wrongAnswers未対応の提案)は
 * nullを返し、呼び出し側はクイズなしで最初から開示する。
 */
export function buildQuizChoices(node: TechStackNode): QuizChoice[] | null {
  const wrong = normalizeWrongAnswers(node);
  if (wrong.length === 0) return null;
  return seededShuffle(
    [
      { label: node.label, isCorrect: true },
      ...wrong.map((w) => ({ label: w.label, isCorrect: false, reason: w.reason })),
    ],
    node.id
  );
}

/**
 * 再生成後のクイズ状態の引き継ぎ。ユーザー自身が変更を要望したノードを再度クイズするのは
 * 無意味なので、変更・追加されたノードは「開示済み」として扱う。
 * - id・labelとも同じノード: 以前の回答状況を維持
 * - 新しいid / 同じidでlabelが変わったノード: "revealed"
 * - 消えたノードの状態は破棄
 */
export function reconcileQuizState(
  prev: StackQuizState,
  prevProposal: TechStackProposal | null,
  next: TechStackProposal
): StackQuizState {
  const prevLabelById = new Map(prevProposal?.nodes.map((n) => [n.id, n.label]) ?? []);
  const result: StackQuizState = {};
  for (const node of next.nodes) {
    const prevLabel = prevLabelById.get(node.id);
    const prevEntry = getQuizEntry(prev, node.id);
    if (prevLabel === node.label && prevEntry) {
      result[node.id] = prevEntry;
    } else {
      result[node.id] = { status: "revealed" };
    }
  }
  return result;
}

/** 全ノードが回答済み(または選択肢を作れず自動開示)ならtrue。 */
export function isQuizComplete(
  proposal: TechStackProposal,
  quizState: StackQuizState,
  skipped: boolean
): boolean {
  if (skipped) return true;
  return proposal.nodes.every((n) => getQuizEntry(quizState, n.id) || buildQuizChoices(n) === null);
}
