"use client";

import { Check, X } from "lucide-react";
import { TechIcon } from "@/components/ui/tech-icon";
import { normalizeWrongAnswers, type StackQuizEntry } from "@/lib/domain/stack-quiz";
import type { TechStackNode } from "@/lib/domain/stack";
import { cn } from "@/lib/utils";

export interface QuizHistoryItem {
  node: TechStackNode;
  entry: StackQuizEntry;
}

function ResultMark({ correct }: { correct: boolean }) {
  return correct ? (
    <span className="flex size-4 flex-none items-center justify-center rounded-full bg-emerald-500 text-white">
      <Check className="size-3" strokeWidth={3} />
    </span>
  ) : (
    <span className="flex size-4 flex-none items-center justify-center rounded-full bg-rose-500 text-white">
      <X className="size-3" strokeWidth={3} />
    </span>
  );
}

function MiniCard({
  tech,
  correct,
  text,
  className,
}: {
  tech: string;
  correct: boolean;
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-pink-200 bg-pink-100 p-2.5 shadow-sm", className)}>
      <p className="flex items-center gap-1.5 text-xs font-bold">
        <TechIcon name={tech} size={14} />
        {tech}
        <ResultMark correct={correct} />
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

/**
 * クイズの回答履歴(左カラム)。正解は技術+✓+選定理由、不正解は選んだ技術+✗+その理由。
 * ホバーで拡大表示され、不正解カードは正解カードが並んで出現する。
 * ホバー中は親へnodeIdを通知し、構成図の該当ノードが強調される。
 */
export function QuizHistory({
  items,
  hoveredNodeId,
  onHoverNode,
}: {
  items: QuizHistoryItem[];
  hoveredNodeId: string | null;
  onHoverNode: (nodeId: string | null) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        答えたカードがここに積まれていきます。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map(({ node, entry }) => {
        const isWrong = entry.status === "wrong" && !!entry.chosen;
        const chosenReason = isWrong
          ? normalizeWrongAnswers(node).find((w) => w.label === entry.chosen)?.reason
          : undefined;
        const hovered = hoveredNodeId === node.id;
        return (
          <div
            key={node.id}
            className="relative"
            onMouseEnter={() => onHoverNode(node.id)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {isWrong ? (
              <MiniCard
                tech={entry.chosen!}
                correct={false}
                text={chosenReason ?? "今回の企画では別の技術の方が合っています。"}
                className={cn("transition-transform", hovered && "scale-[1.03]")}
              />
            ) : (
              <MiniCard
                tech={node.label}
                correct={true}
                text={node.description}
                className={cn("transition-transform", hovered && "scale-[1.03]")}
              />
            )}

            {/* 不正解カードのホバー時: 正解とのペアを拡大表示 */}
            {isWrong && hovered && (
              <div className="absolute left-0 top-0 z-30 flex w-[420px] gap-2 rounded-2xl border border-pink-300 bg-pink-50 p-3 shadow-xl">
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <TechIcon name={node.label} size={16} />
                    {node.label}
                    <ResultMark correct={true} />
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    {node.description} そのため今回はこちらが正解。
                  </p>
                </div>
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <TechIcon name={entry.chosen!} size={16} />
                    {entry.chosen}
                    <ResultMark correct={false} />
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    {chosenReason ?? "今回の企画では上の理由からこちらは選びませんでした。"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
