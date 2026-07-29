// 習得マップ(全体像)。開発を通して出題・回答した技術やコードの理解を、Web開発全体の
// 「地図」のどこに位置づけられるかで見せ、「どこを得たか」を残す。
// roadmap.sh 的な“全体像に印を付ける”＋Duolingo 的な“習得段階”を参考にした構造。

import type { StackCategory, TechStackProposal } from "./stack";
import { STACK_CATEGORY_LABEL } from "./stack";
import { getQuizEntry, type StackQuizState } from "./stack-quiz";

/** 習得段階。roadmap.shの done/learning/skip に、Duolingoのmastery段階を足した4段階。 */
export type SkillLevel = "mastered" | "attempted" | "seen" | "locked";

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  mastered: "習得",
  attempted: "もう一歩",
  seen: "出会った",
  locked: "未踏",
};

/**
 * 全体像の骨(正典スキル)。各カテゴリで「Web開発として学ぶべき代表スキル」を固定で持つ。
 * ユーザーの実データ(下のacquired)とは別に、常に地図の背景として見せることで
 * 「まだ埋まっていない場所＝これから学ぶ所」が分かる。
 */
export const CANONICAL_SKILLS: Record<StackCategory, string[]> = {
  frontend: [
    "UI描画 (React/Next.js)",
    "状態管理",
    "ルーティング",
    "フォーム・入力",
    "非同期通信 (fetch/API呼び出し)",
    "スタイリング (CSS/Tailwind)",
  ],
  backend: [
    "APIエンドポイント",
    "認証・認可",
    "ビジネスロジック",
    "入力バリデーション",
  ],
  data: [
    "データベース",
    "スキーマ設計",
    "クエリ (CRUD)",
    "アクセス制御 (RLS)",
  ],
  infra: ["デプロイ", "環境変数", "ホスティング", "CI/CD"],
  other: ["データフロー全体", "セキュリティ", "エラーハンドリング", "型 (TypeScript)"],
};

/** 地図に載る「あなたが得た1項目」。実データ(技術ノード＋回答状況)由来。 */
export interface AcquiredSkill {
  id: string;
  label: string;
  level: SkillLevel;
  /** 習得の証拠(どの技術か・状態) */
  evidence: string;
}

export interface SkillCategoryMap {
  category: StackCategory;
  label: string;
  acquired: AcquiredSkill[];
  /** 全体像の目安(まだ得ていない代表スキル) */
  canonical: string[];
  masteredCount: number;
  total: number;
}

export interface SkillMap {
  categories: SkillCategoryMap[];
  masteredCount: number;
  encounteredCount: number;
  /** 全体像に対する到達度(0-100)。masterd / 出会った総数。 */
  progress: number;
}

const CATEGORY_ORDER: StackCategory[] = ["frontend", "backend", "data", "infra", "other"];

function levelFromStatus(status: string | undefined): SkillLevel {
  if (status === "correct") return "mastered";
  if (status === "wrong") return "attempted";
  if (status === "revealed") return "seen";
  return "seen"; // 出題対象だが未回答＝出会った扱い
}

/**
 * 現在の企画の技術スタック＋クイズ回答状況から習得マップを導出する。
 * 技術ノードを「あなたが得た項目」として、そのカテゴリの地図に配置する。
 * (将来: Supabaseに蓄積して複数プロジェクト横断で埋めていく)
 */
export function deriveSkillMap(
  proposal: TechStackProposal | null,
  stackQuiz: StackQuizState
): SkillMap {
  const byCategory = new Map<StackCategory, AcquiredSkill[]>();
  for (const c of CATEGORY_ORDER) byCategory.set(c, []);

  if (proposal) {
    for (const node of proposal.nodes) {
      const cat: StackCategory = CATEGORY_ORDER.includes(node.category)
        ? node.category
        : "other";
      const entry = getQuizEntry(stackQuiz, node.id);
      const level = levelFromStatus(entry?.status);
      byCategory.get(cat)!.push({
        id: node.id,
        label: node.label,
        level,
        evidence: entry ? SKILL_LEVEL_LABEL[level] : "出会った",
      });
    }
  }

  let masteredCount = 0;
  let encounteredCount = 0;
  const categories: SkillCategoryMap[] = CATEGORY_ORDER.map((category) => {
    const acquired = byCategory.get(category)!;
    const acquiredLabels = new Set(acquired.map((a) => a.label));
    const mastered = acquired.filter((a) => a.level === "mastered").length;
    masteredCount += mastered;
    encounteredCount += acquired.length;
    return {
      category,
      label: STACK_CATEGORY_LABEL[category],
      acquired,
      canonical: CANONICAL_SKILLS[category].filter((s) => !acquiredLabels.has(s)),
      masteredCount: mastered,
      total: acquired.length,
    };
  }).filter((c) => c.acquired.length > 0 || CANONICAL_SKILLS[c.category].length > 0);

  return {
    categories,
    masteredCount,
    encounteredCount,
    progress: encounteredCount === 0 ? 0 : Math.round((masteredCount / encounteredCount) * 100),
  };
}
