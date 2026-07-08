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

/** 拡大表示の1枚分(正解 or 不正解)。 */
function DetailCard({
  tech,
  correct,
  text,
}: {
  tech: string;
  correct: boolean;
  text: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-pink-200 bg-pink-100 p-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <TechIcon name={tech} size={16} />
        {tech}
        <ResultMark correct={correct} />
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

/**
 * クイズの回答履歴(左カラム)。小さいピンクカードを縦に積む。
 * ホバーで拡大表示(絶対配置で右方向へ展開)、不正解カードは正解とのペアを横並びで見せる。
 * ホバー中は親へnodeIdを通知し、中央の構成図の該当ノードが強調される。
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
    return <p className="text-xs text-muted-foreground">答えたカードが積まれます。</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map(({ node, entry }) => {
        const isWrong = entry.status === "wrong" && !!entry.chosen;
        const chosenReason = isWrong
          ? normalizeWrongAnswers(node).find((w) => w.label === entry.chosen)?.reason
          : undefined;
        const hovered = hoveredNodeId === node.id;
        const displayTech = isWrong ? entry.chosen! : node.label;
        const displayText = isWrong
          ? chosenReason ?? "今回の企画では不向きです。"
          : node.description;
        return (
          <div
            key={node.id}
            className="relative"
            onMouseEnter={() => onHoverNode(node.id)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* 通常時の小カード */}
            <div
              className={cn(
                "rounded-lg border border-pink-200 bg-pink-100 p-2 shadow-sm transition-opacity",
                hovered && "opacity-0"
              )}
            >
              <p className="flex items-center gap-1 text-xs font-bold">
                <TechIcon name={displayTech} size={12} />
                <span className="truncate">{displayTech}</span>
                <ResultMark correct={!isWrong} />
              </p>
              <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-slate-600">
                {displayText}
              </p>
            </div>

            {/* ホバー時の拡大表示(右方向へ展開) */}
            {hovered && (
              <div
                className={cn(
                  "absolute left-0 top-0 z-30 flex gap-2",
                  isWrong ? "w-[420px]" : "w-[220px]"
                )}
              >
                {isWrong ? (
                  <>
                    <DetailCard
                      tech={node.label}
                      correct
                      text={`${node.description} そのため今回はこちらが正解。`}
                    />
                    <DetailCard
                      tech={entry.chosen!}
                      correct={false}
                      text={chosenReason ?? "今回の企画では上の理由から不向きです。"}
                    />
                  </>
                ) : (
                  <DetailCard tech={node.label} correct text={node.description} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
