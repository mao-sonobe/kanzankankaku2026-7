"use client";

import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { STACK_CATEGORY_LABEL, type TechStackNode } from "@/lib/domain/stack";
import { buildQuizChoices, type StackQuizEntry } from "@/lib/domain/stack-quiz";
import { TechIcon } from "@/components/ui/tech-icon";
import { cn } from "@/lib/utils";

/**
 * STEP3の技術スタック1ノード分のカード。
 * 未回答の間は技術名と選定理由を半透明(ぼかし)で隠し、4択クイズとして表示する。
 * 誤答時は「選んだ技術がなぜ今回は最適でないか」の理由も表示する。
 * 回答済み・開示済み(再生成やスキップ)・誤答を作れない提案(Ollama等)はそのまま開示する。
 */
export function StackQuizCard({
  node,
  entry,
  onAnswer,
}: {
  node: TechStackNode;
  entry: StackQuizEntry | undefined;
  onAnswer: (entry: StackQuizEntry) => void;
}) {
  const colors = CATEGORY_COLORS[node.category];
  const choices = buildQuizChoices(node);
  const revealed = entry !== undefined || choices === null;

  const chosenWrong =
    entry?.status === "wrong" && entry.chosen
      ? choices?.find((c) => !c.isCorrect && c.label === entry.chosen)
      : undefined;

  return (
    <div className={cn("rounded-xl border p-3", colors.bg)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className={cn("size-1.5 rounded-full", colors.dot)} />
          {STACK_CATEGORY_LABEL[node.category]}
        </div>
        {entry?.status === "correct" && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            正解!
          </span>
        )}
        {entry?.status === "wrong" && (
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
        <p className="mt-1 flex items-center gap-1.5 font-semibold">
          <TechIcon name={node.label} size={18} />
          {node.label}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          選定理由: {node.description}
        </p>
      </div>

      {chosenWrong && (
        <div className="mt-2 rounded-lg border border-dashed bg-background/60 p-2 text-xs leading-relaxed">
          <span className="mr-1 inline-flex items-center gap-1 font-semibold">
            <TechIcon name={chosenWrong.label} size={14} />
            {chosenWrong.label}
          </span>
          {chosenWrong.reason ?? "も実在の選択肢ですが、今回の企画では上の理由からこちらを選びました。"}
        </div>
      )}

      {!revealed && choices && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium">この役割に最適な技術はどれ?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {choices.map((choice) => (
              <button
                key={choice.label}
                type="button"
                onClick={() =>
                  onAnswer(
                    choice.isCorrect
                      ? { status: "correct" }
                      : { status: "wrong", chosen: choice.label }
                  )
                }
                className="flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 text-left text-xs font-medium transition-colors hover:border-current"
              >
                <TechIcon name={choice.label} size={14} />
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
