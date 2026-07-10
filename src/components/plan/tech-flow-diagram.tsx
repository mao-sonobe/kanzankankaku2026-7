"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DIAGRAM_NODE_H,
  DIAGRAM_NODE_W,
  layoutStackDiagram,
  type LaidOutEdge,
} from "@/lib/domain/stack-layout";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { STACK_CATEGORY_LABEL, type TechStackProposal } from "@/lib/domain/stack";
import { TechIcon } from "@/components/ui/tech-icon";
import { cn } from "@/lib/utils";

function edgePath(e: LaidOutEdge): string {
  return e.path ?? `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;
}

/**
 * step2(クイズ中に育つ構成図)と step3(全体の技術フロー)で共有する技術スタック図。
 * エッジには「渡るデータ(edge.label)」がホバーで吹き出し表示され、データの粒が流れる。
 * ノード/エッジのホバーで強調され、外部(履歴カード等)ともhighlightNodeId/onHoverNodeで連動する。
 * hideUnrevealed=trueのときはisRevealedがtrueのノードと、その間のエッジだけ表示して図が育つ。
 */
export function TechFlowDiagram({
  proposal,
  isRevealed,
  hideUnrevealed = false,
  highlightNodeId = null,
  onHoverNode,
}: {
  proposal: TechStackProposal;
  isRevealed?: (nodeId: string) => boolean;
  hideUnrevealed?: boolean;
  highlightNodeId?: string | null;
  onHoverNode?: (nodeId: string | null) => void;
}) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapWidth, setWrapWidth] = useState(0);

  // 図が置かれる領域の幅を見て、入りきらないぶんだけ縮小する(スマホで横に切れないようにするため)。
  // 幅に余裕があるPC等では1倍のまま(拡大はしない)。
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // 高さは監視しない(この要素自身の高さを縮小率に応じて後で変えるため、
    // 高さまで見ると「変える→検知→また変える」の無限ループになる)。
    const update = () => setWrapWidth((prev) => (prev === el.clientWidth ? prev : el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  function setHoveredNode(id: string | null) {
    onHoverNode?.(id);
  }

  function edgeEmphasized(e: LaidOutEdge) {
    if (hoveredEdgeId === e.edge.id) return true;
    if (highlightNodeId) return e.edge.source === highlightNodeId || e.edge.target === highlightNodeId;
    return false;
  }

  if (layout.nodes.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        カードに答えると、ここに構成図が育っていきます。
      </p>
    );
  }

  // 幅が収まらない場合だけ縮小率を計算する(余裕があるときは1倍のまま・拡大はしない)。
  const scale = wrapWidth > 0 ? Math.min(1, wrapWidth / layout.width) : 1;

  return (
    // 幅の計測はこのdivで行う(高さは変えないので、監視対象自身の高さを変えて
    // 検知がループする心配がない)。実際の高さ調整は内側のdivだけで行う。
    <div ref={wrapRef} className="w-full">
      <div className="mx-auto" style={{ width: layout.width * scale, height: layout.height * scale }}>
        <div
          className="relative"
          style={{
            width: layout.width,
            height: layout.height,
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: "top left",
          }}
        >
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        >
          <defs>
            <marker
              id="tf-arrow"
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
          {layout.edges.map((e) => {
            const emphasized = edgeEmphasized(e);
            return (
              <g key={e.edge.id}>
                <path
                  d={edgePath(e)}
                  fill="none"
                  stroke={emphasized ? "var(--brand-pink)" : "#94a3b8"}
                  strokeWidth={emphasized ? 2.5 : 1.5}
                  markerEnd="url(#tf-arrow)"
                />
                {/* データの粒が流れるアニメーション */}
                <circle r={emphasized ? 4.5 : 3} fill="var(--brand-pink)" opacity={emphasized ? 0.9 : 0.5}>
                  <animateMotion dur="2.4s" repeatCount="indefinite" path={edgePath(e)} />
                </circle>
                {/* ホバー判定用の太い透明ストローク */}
                <path
                  d={edgePath(e)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="18"
                  style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onMouseEnter={() => setHoveredEdgeId(e.edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* ノード */}
        {layout.nodes.map(({ node, x, y }) => {
          const colors = CATEGORY_COLORS[node.category];
          const highlighted =
            highlightNodeId === node.id ||
            (hoveredEdgeId !== null &&
              layout.edges.some(
                (e) =>
                  e.edge.id === hoveredEdgeId &&
                  (e.edge.source === node.id || e.edge.target === node.id)
              ));
          return (
            <div
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className={cn(
                "absolute flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 transition-transform",
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
              <TechIcon name={node.label} size={24} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{node.label}</p>
                <p className={cn("text-[10px]", colors.text)}>
                  {STACK_CATEGORY_LABEL[node.category]}
                </p>
              </div>
            </div>
          );
        })}

        {/* エッジホバー時の吹き出し(渡るデータ) */}
        {layout.edges.map((e) =>
          hoveredEdgeId === e.edge.id && e.edge.label ? (
            <div
              key={`bubble-${e.edge.id}`}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-full border border-pink-300 bg-white px-3 py-1 text-xs font-semibold shadow-md"
              style={{ left: e.labelX, top: e.labelY }}
            >
              {e.edge.label}
            </div>
          ) : null
        )}
      </div>
      </div>
    </div>
  );
}
