"use client";

import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { STACK_CATEGORY_LABEL, type TechStackNode } from "@/lib/domain/stack";
import { buildQuizChoices, type StackQuizStatus } from "@/lib/domain/stack-quiz";
import { cn } from "@/lib/utils";

/**
 * STEP3の技術スタック1ノード分のカード。
 * 未回答の間は技術名と選定理由を半透明(ぼかし)で隠し、4択クイズとして表示する。
 * 回答済み・開示済み(再生成やスキップ)・誤答を作れない提案(Ollama等)はそのまま開示する。
 */
export function StackQuizCard({
  node,
  status,
  onAnswer,
}: {
  node: TechStackNode;
  status: StackQuizStatus | undefined;
  onAnswer: (status: "correct" | "wrong") => void;
}) {
  const colors = CATEGORY_COLORS[node.category];
  const choices = buildQuizChoices(node);
  const revealed = status !== undefined || choices === null;

  return (
    <div className={cn("rounded-xl border p-3", colors.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className={cn("size-1.5 rounded-full", colors.dot)} />
          {STACK_CATEGORY_LABEL[node.category]}
        </div>
        {status === "correct" && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            正解!
          </span>
        )}
        {status === "wrong" && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ background: "var(--brand-pink)" }}
          >
            正解は {node.label}
          </span>
        )}
      </div>

      <div
        className={cn(
          "transition-[filter] duration-500",
          !revealed && "pointer-events-none select-none blur-[6px]"
        )}
        aria-hidden={!revealed}
      >
        <p className="mt-1 font-semibold">{node.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          選定理由: {node.description}
        </p>
      </div>

      {!revealed && choices && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium">この役割に最適な技術はどれ?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {choices.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => onAnswer(choice === node.label ? "correct" : "wrong")}
                className="rounded-lg border bg-background px-2 py-1.5 text-xs font-medium transition-colors hover:border-current"
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
