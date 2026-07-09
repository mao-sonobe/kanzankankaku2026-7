"use client";

import { Check, X } from "lucide-react";
import { TechIcon } from "@/components/ui/tech-icon";
import { normalizeWrongAnswers, type StackQuizEntry } from "@/lib/domain/stack-quiz";
import type { TechStackNode, TechStackProposal } from "@/lib/domain/stack";
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

/** ノードが関わるデータのやり取り(相手技術+edge.label) */
interface FlowInfo {
  otherLabel: string;
  outgoing: boolean;
  data: string;
}

/** 拡大表示の1枚分(正解 or 不正解)。やり取りデータも載せる。 */
function DetailCard({
  tech,
  correct,
  text,
  flows,
}: {
  tech: string;
  correct: boolean;
  text: string;
  flows?: FlowInfo[];
}) {
  return (
    <div className="flex-1 rounded-xl border border-pink-200 bg-pink-100 p-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <TechIcon name={tech} size={16} />
        {tech}
        <ResultMark correct={correct} />
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{text}</p>
      {flows && flows.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-pink-200 pt-2">
          <p className="text-[10px] font-semibold text-slate-500">やり取りするデータ</p>
          {flows.map((f, i) => (
            <p key={i} className="flex items-center gap-1 text-[11px] leading-snug text-slate-600">
              <TechIcon name={f.otherLabel} size={11} />
              <span className="font-medium">{f.outgoing ? `→ ${f.otherLabel}` : `${f.otherLabel} →`}</span>
              <span className="text-slate-500">{f.data}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * クイズの回答履歴(左カラム)。ゲームのカードのように、普段は小さいコンパクトなカード
 * (アイコン+技術名+○/×)で、左端が少し見切れる。カーソルが合った時だけ大きく展開し、
 * 選定理由と「技術同士でやり取りされるデータ」を表示する。不正解は正解とのペアで見せる。
 */
export function QuizHistory({
  items,
  proposal,
  hoveredNodeId,
  onHoverNode,
}: {
  items: QuizHistoryItem[];
  proposal: TechStackProposal;
  hoveredNodeId: string | null;
  onHoverNode: (nodeId: string | null) => void;
}) {
  const nodeById = new Map(proposal.nodes.map((n) => [n.id, n]));

  function flowsFor(nodeId: string): FlowInfo[] {
    return proposal.edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .map((e) => {
        const outgoing = e.source === nodeId;
        const other = nodeById.get(outgoing ? e.target : e.source);
        return other && e.label
          ? { otherLabel: other.label, outgoing, data: e.label }
          : null;
      })
      .filter((f): f is FlowInfo => f !== null);
  }

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
        const flows = flowsFor(node.id);
        return (
          <div
            key={node.id}
            className="relative"
            onMouseEnter={() => onHoverNode(node.id)}
            onMouseLeave={() => onHoverNode(null)}
          >
            {/* 通常時: 小さいコンパクトなカード(ゲームの札風)。左端が少し見切れる。 */}
            <div className="overflow-hidden">
              <div
                className={cn(
                  "-ml-4 flex w-[calc(100%+1rem)] items-center gap-1 rounded-lg border border-pink-200 bg-pink-100 py-1.5 pl-5 pr-2 shadow-sm transition-opacity",
                  hovered && "opacity-0"
                )}
              >
                <TechIcon name={displayTech} size={13} />
                <span className="truncate text-xs font-bold">{displayTech}</span>
                <span className="ml-auto flex-none">
                  <ResultMark correct={!isWrong} />
                </span>
              </div>
            </div>

            {/* ホバー時: 大きく展開(クリップ外なので全文+やり取りデータが見える) */}
            {hovered && (
              <div
                className={cn(
                  "absolute left-0 top-0 z-30 flex gap-2",
                  isWrong ? "w-[440px]" : "w-[240px]"
                )}
              >
                {isWrong ? (
                  <>
                    <DetailCard
                      tech={node.label}
                      correct
                      text={`${node.description} そのため今回はこちらが正解。`}
                      flows={flows}
                    />
                    <DetailCard
                      tech={entry.chosen!}
                      correct={false}
                      text={chosenReason ?? "今回の企画では上の理由から不向きです。"}
                    />
                  </>
                ) : (
                  <DetailCard tech={node.label} correct text={node.description} flows={flows} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
