import type { StackCategory } from "./stack";

export const CATEGORY_COLORS: Record<
  StackCategory,
  { bg: string; border: string; text: string; dot: string }
> = {
  frontend: {
    bg: "bg-blue-100 dark:bg-blue-950",
    border: "border-blue-400",
    text: "text-blue-900 dark:text-blue-200",
    dot: "bg-blue-500",
  },
  backend: {
    bg: "bg-emerald-100 dark:bg-emerald-950",
    border: "border-emerald-400",
    text: "text-emerald-900 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  infra: {
    bg: "bg-amber-100 dark:bg-amber-950",
    border: "border-amber-400",
    text: "text-amber-900 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  data: {
    bg: "bg-violet-100 dark:bg-violet-950",
    border: "border-violet-400",
    text: "text-violet-900 dark:text-violet-200",
    dot: "bg-violet-500",
  },
  other: {
    bg: "bg-slate-100 dark:bg-slate-800",
    border: "border-slate-400",
    text: "text-slate-900 dark:text-slate-200",
    dot: "bg-slate-500",
  },
};
