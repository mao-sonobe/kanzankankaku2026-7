"use client";

import { useMemo } from "react";
import {
  DIAGRAM_NODE_H,
  DIAGRAM_NODE_W,
  layoutStackDiagram,
} from "@/lib/domain/stack-layout";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { STACK_CATEGORY_LABEL, type TechStackProposal } from "@/lib/domain/stack";
import { TechIcon } from "@/components/ui/tech-icon";
import { cn } from "@/lib/utils";

/**
 * 技術スタックのアーキテクチャ図。
 * ノードはHTML(TechIconの頭文字フォールバックが効く)、矢印とラベルはSVGの重ね描き。
 * isRevealedを渡すと、未開示ノードの技術名とアイコンを隠せる(STEP3クイズ中の表示用)。
 */
export function StackDiagram({
  proposal,
  isRevealed,
  hideUnrevealed = false,
  highlightNodeId = null,
}: {
  proposal: TechStackProposal;
  /** 省略時は全ノード開示扱い */
  isRevealed?: (nodeId: string) => boolean;
  /** trueなら未開示ノードをぼかしではなく非表示にする(回答するたび図が育つ表示用) */
  hideUnrevealed?: boolean;
  /** 強調表示するノードid(履歴カードのホバー連動用) */
  highlightNodeId?: string | null;
}) {
  const layout = useMemo(() => {
    if (hideUnrevealed && isRevealed) {
      const visible = new Set(proposal.nodes.filter((n) => isRevealed(n.id)).map((n) => n.id));
      return layoutStackDiagram({
        ...proposal,
        nodes: proposal.nodes.filter((n) => visible.has(n.id)),
        edges: proposal.edges.filter((e) => visible.has(e.source) && visible.has(e.target)),
      });
    }
    return layoutStackDiagram(proposal);
  }, [proposal, hideUnrevealed, isRevealed]);

  if (layout.nodes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        カードに答えると、ここに構成図が育っていきます。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="relative"
        style={{ width: layout.width, height: layout.height }}
        role="img"
        aria-label="技術スタックの構成図"
      >
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          className="pointer-events-none absolute inset-0"
        >
          <defs>
            <marker
              id="stack-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path
                d="M2 1L8 5L2 9"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          </defs>
          {layout.edges.map((e) => (
            <g key={e.edge.id}>
              {e.path ? (
                <path
                  d={e.path}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  markerEnd="url(#stack-arrow)"
                />
              ) : (
                <line
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  markerEnd="url(#stack-arrow)"
                />
              )}
              {e.edge.label && (
                <text
                  x={e.labelX}
                  y={e.labelY}
                  textAnchor={e.path ? "start" : "middle"}
                  fontSize="11"
                  fill="#475569"
                  stroke="var(--background)"
                  strokeWidth="4"
                  paintOrder="stroke"
                >
                  {e.edge.label}
                </text>
              )}
            </g>
          ))}
        </svg>

        {layout.nodes.map(({ node, x, y }) => {
          const colors = CATEGORY_COLORS[node.category];
          const revealed = isRevealed ? isRevealed(node.id) : true;
          const highlighted = highlightNodeId === node.id;
          return (
            <div
              key={node.id}
              className={cn(
                "absolute flex items-center gap-2 rounded-xl border px-3 transition-transform",
                colors.bg,
                colors.border,
                highlighted && "z-10 scale-110 shadow-lg ring-2"
              )}
              style={{
                left: x,
                top: y,
                width: DIAGRAM_NODE_W,
                height: DIAGRAM_NODE_H,
                ...(highlighted ? { ["--tw-ring-color" as string]: "var(--brand-pink)" } : {}),
              }}
            >
              <div
                className={cn(
                  "flex min-w-0 items-center gap-2 transition-[filter] duration-500",
                  !revealed && "pointer-events-none select-none blur-[5px]"
                )}
                aria-hidden={!revealed}
              >
                {revealed && <TechIcon name={node.label} size={24} />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{revealed ? node.label : "？？？"}</p>
                  <p className={cn("text-[10px]", colors.text)}>
                    {STACK_CATEGORY_LABEL[node.category]}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
