export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Cost = "free" | "freemium" | "paid";
export type LearningPeriod = "short" | "medium" | "long";
export type JapaneseDocs = "scarce" | "moderate" | "abundant";
export type Popularity = "niche" | "moderate" | "popular";
export type RelationType = "related" | "alternative" | "complementary";

export const DIFFICULTY_VALUES: Difficulty[] = ["beginner", "intermediate", "advanced"];
export const COST_VALUES: Cost[] = ["free", "freemium", "paid"];
export const LEARNING_PERIOD_VALUES: LearningPeriod[] = ["short", "medium", "long"];
export const JAPANESE_DOCS_VALUES: JapaneseDocs[] = ["scarce", "moderate", "abundant"];
export const POPULARITY_VALUES: Popularity[] = ["niche", "moderate", "popular"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

export const COST_LABEL: Record<Cost, string> = {
  free: "無料",
  freemium: "一部有料",
  paid: "有料",
};

export const LEARNING_PERIOD_LABEL: Record<LearningPeriod, string> = {
  short: "短期(〜1週間)",
  medium: "中期(〜1ヶ月)",
  long: "長期(3ヶ月以上)",
};

export const JAPANESE_DOCS_LABEL: Record<JapaneseDocs, string> = {
  scarce: "少ない",
  moderate: "普通",
  abundant: "豊富",
};

export const POPULARITY_LABEL: Record<Popularity, string> = {
  niche: "ニッチ",
  moderate: "普通",
  popular: "人気",
};

export const RELATION_TYPE_LABEL: Record<RelationType, string> = {
  related: "関連技術",
  alternative: "代替候補",
  complementary: "組み合わせ推奨",
};

type ColorSet = { bg: string; border: string; text: string; dot: string };

const EMERALD: ColorSet = {
  bg: "bg-emerald-100 dark:bg-emerald-950",
  border: "border-emerald-400",
  text: "text-emerald-900 dark:text-emerald-200",
  dot: "bg-emerald-500",
};
const AMBER: ColorSet = {
  bg: "bg-amber-100 dark:bg-amber-950",
  border: "border-amber-400",
  text: "text-amber-900 dark:text-amber-200",
  dot: "bg-amber-500",
};
const ROSE: ColorSet = {
  bg: "bg-rose-100 dark:bg-rose-950",
  border: "border-rose-400",
  text: "text-rose-900 dark:text-rose-200",
  dot: "bg-rose-500",
};
const BLUE: ColorSet = {
  bg: "bg-blue-100 dark:bg-blue-950",
  border: "border-blue-400",
  text: "text-blue-900 dark:text-blue-200",
  dot: "bg-blue-500",
};
const VIOLET: ColorSet = {
  bg: "bg-violet-100 dark:bg-violet-950",
  border: "border-violet-400",
  text: "text-violet-900 dark:text-violet-200",
  dot: "bg-violet-500",
};
const SLATE: ColorSet = {
  bg: "bg-slate-100 dark:bg-slate-800",
  border: "border-slate-400",
  text: "text-slate-900 dark:text-slate-200",
  dot: "bg-slate-500",
};

// 難易度・費用・学習期間は「易しい/安い/短い」ほどemerald、「厳しい/高い/長い」ほどroseになるよう揃える。
export const DIFFICULTY_COLORS: Record<Difficulty, ColorSet> = {
  beginner: EMERALD,
  intermediate: AMBER,
  advanced: ROSE,
};

export const COST_COLORS: Record<Cost, ColorSet> = {
  free: EMERALD,
  freemium: AMBER,
  paid: ROSE,
};

export const LEARNING_PERIOD_COLORS: Record<LearningPeriod, ColorSet> = {
  short: EMERALD,
  medium: AMBER,
  long: ROSE,
};

// 日本語情報量は「豊富」なほど良い(emerald)、「少ない」ほどrose(他の指標と向きが逆)。
export const JAPANESE_DOCS_COLORS: Record<JapaneseDocs, ColorSet> = {
  abundant: EMERALD,
  moderate: AMBER,
  scarce: ROSE,
};

export const POPULARITY_COLORS: Record<Popularity, ColorSet> = {
  popular: BLUE,
  moderate: AMBER,
  niche: SLATE,
};

export const RELATION_TYPE_COLORS: Record<RelationType, ColorSet> = {
  complementary: VIOLET,
  related: SLATE,
  alternative: AMBER,
};
