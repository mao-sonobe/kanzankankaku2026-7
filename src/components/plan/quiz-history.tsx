"use client";

import { type MouseEvent as ReactMouseEvent } from "react";
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

  // カーソルが乗った要素の data-hist-idx から対象カードを大きくする。
  // これにより「大きいカードの下辺(=次カードのidxを持つハンドオフ帯)」に来ると次が開く。
  function activateFromEvent(e: ReactMouseEvent) {
    const el = (e.target as HTMLElement).closest("[data-hist-idx]");
    if (!el) return;
    const idx = Number(el.getAttribute("data-hist-idx"));
    const it = items[idx];
    if (it) onHoverNode(it.node.id);
  }

  return (
    <div
      className="flex flex-col gap-2"
      onMouseOver={activateFromEvent}
      onMouseLeave={() => onHoverNode(null)}
    >
      {items.map(({ node, entry }, i) => {
        const isWrong = entry.status === "wrong" && !!entry.chosen;
        const chosenReason = isWrong
          ? normalizeWrongAnswers(node).find((w) => w.label === entry.chosen)?.reason
          : undefined;
        const hovered = hoveredNodeId === node.id;
        const displayTech = isWrong ? entry.chosen! : node.label;
        const flows = flowsFor(node.id);
        const hasNext = i < items.length - 1;
        return (
          <div key={node.id} className={cn("relative", hovered && "z-40")}>
            {hovered ? (
              /* ホバー時: その場で大きく展開。縦に伸びるので下のカードは押し下げられてズレる
                 (覆い隠さない)。幅は右方向へ図の上にせり出す。 */
              <div
                data-hist-idx={i}
                className={cn("relative flex gap-2", isWrong ? "w-[440px]" : "w-[240px]")}
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
                {/* 下辺のハンドオフ帯: ここにカーソルが来たら次のカードが大きくなる
                   (大きいカードの下に真っ直ぐ降りても次を開けるように、カード幅いっぱい) */}
                {hasNext && (
                  <div data-hist-idx={i + 1} className="absolute inset-x-0 bottom-0 h-9" />
                )}
              </div>
            ) : (
              /* 通常時: 小さいコンパクトなカード(ゲームの札風)。左端が少し見切れる。 */
              <div data-hist-idx={i} className="overflow-hidden">
                <div className="-ml-4 flex w-[calc(100%+1rem)] items-center gap-1 rounded-lg border border-pink-200 bg-pink-100 py-1.5 pl-5 pr-2 shadow-sm">
                  <TechIcon name={displayTech} size={13} />
                  <span className="truncate text-xs font-bold">{displayTech}</span>
                  <span className="ml-auto flex-none">
                    <ResultMark correct={!isWrong} />
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
