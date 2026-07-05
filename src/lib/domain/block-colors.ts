import type { BlockRole } from "@/lib/ai/types";

export const BLOCK_ROLE_LABEL: Record<BlockRole, string> = {
  state: "状態管理",
  "event-handler": "イベントハンドラ",
  "api-fetch": "APIフェッチ",
  jsx: "見た目(JSX)",
  logic: "ロジック",
  import: "インポート",
  style: "スタイル",
  other: "その他",
};

export const BLOCK_ROLE_COLORS: Record<
  BlockRole,
  { bg: string; border: string; text: string; dot: string }
> = {
  state: {
    bg: "bg-blue-100 dark:bg-blue-950",
    border: "border-blue-400",
    text: "text-blue-900 dark:text-blue-200",
    dot: "bg-blue-500",
  },
  "event-handler": {
    bg: "bg-amber-100 dark:bg-amber-950",
    border: "border-amber-400",
    text: "text-amber-900 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  "api-fetch": {
    bg: "bg-emerald-100 dark:bg-emerald-950",
    border: "border-emerald-400",
    text: "text-emerald-900 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  jsx: {
    bg: "bg-violet-100 dark:bg-violet-950",
    border: "border-violet-400",
    text: "text-violet-900 dark:text-violet-200",
    dot: "bg-violet-500",
  },
  logic: {
    bg: "bg-rose-100 dark:bg-rose-950",
    border: "border-rose-400",
    text: "text-rose-900 dark:text-rose-200",
    dot: "bg-rose-500",
  },
  import: {
    bg: "bg-slate-100 dark:bg-slate-800",
    border: "border-slate-400",
    text: "text-slate-900 dark:text-slate-200",
    dot: "bg-slate-500",
  },
  style: {
    bg: "bg-pink-100 dark:bg-pink-950",
    border: "border-pink-400",
    text: "text-pink-900 dark:text-pink-200",
    dot: "bg-pink-500",
  },
  other: {
    bg: "bg-gray-100 dark:bg-gray-800",
    border: "border-gray-400",
    text: "text-gray-900 dark:text-gray-200",
    dot: "bg-gray-500",
  },
};
