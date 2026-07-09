// 機能マップの「機能」ごとに割り当てる配色。CodeMirrorのDecorationはTailwindの動的クラス名を
// 解決できないため、UI用のTailwindクラスとエディタ用の実色値(hex)を両方持たせる。

export interface FeatureColor {
  bg: string;
  text: string;
  dot: string;
  hex: { bg: string; border: string };
}

const PALETTE: FeatureColor[] = [
  {
    bg: "bg-blue-100 dark:bg-blue-950",
    text: "text-blue-900 dark:text-blue-200",
    dot: "bg-blue-500",
    hex: { bg: "#dbeafe", border: "#60a5fa" },
  },
  {
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-900 dark:text-emerald-200",
    dot: "bg-emerald-500",
    hex: { bg: "#d1fae5", border: "#34d399" },
  },
  {
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-900 dark:text-amber-200",
    dot: "bg-amber-500",
    hex: { bg: "#fef3c7", border: "#fbbf24" },
  },
  {
    bg: "bg-violet-100 dark:bg-violet-950",
    text: "text-violet-900 dark:text-violet-200",
    dot: "bg-violet-500",
    hex: { bg: "#ede9fe", border: "#a78bfa" },
  },
  {
    bg: "bg-rose-100 dark:bg-rose-950",
    text: "text-rose-900 dark:text-rose-200",
    dot: "bg-rose-500",
    hex: { bg: "#ffe4e6", border: "#fb7185" },
  },
  {
    bg: "bg-cyan-100 dark:bg-cyan-950",
    text: "text-cyan-900 dark:text-cyan-200",
    dot: "bg-cyan-500",
    hex: { bg: "#cffafe", border: "#22d3ee" },
  },
  {
    bg: "bg-orange-100 dark:bg-orange-950",
    text: "text-orange-900 dark:text-orange-200",
    dot: "bg-orange-500",
    hex: { bg: "#ffedd5", border: "#fb923c" },
  },
  {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-900 dark:text-slate-200",
    dot: "bg-slate-500",
    hex: { bg: "#f1f5f9", border: "#94a3b8" },
  },
];

export function featureColor(index: number): FeatureColor {
  return PALETTE[index % PALETTE.length];
}
