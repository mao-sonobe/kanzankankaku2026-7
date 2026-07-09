"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DIAGRAM_NODE_H,
  DIAGRAM_NODE_W,
  layoutStackDiagram,
  type LaidOutEdge,
} from "@/lib/domain/stack-layout";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import {
  STACK_CATEGORY_LABEL,
  type StackCategory,
  type TechStackNode,
  type TechStackProposal,
} from "@/lib/domain/stack";
import { buildStackSummaryPng } from "@/lib/domain/stack-image";
import { TechIcon } from "@/components/ui/tech-icon";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: StackCategory[] = ["frontend", "backend", "data", "infra", "other"];

function edgePath(e: LaidOutEdge): string {
  return e.path ?? `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;
}

/**
 * ③パイプライン学習。エッジにホバーすると「何のデータが渡るか」の吹き出しが出て、
 * エネルギーフロー図のようにデータの粒がエッジ上を流れる。ノードにホバーすると
 * 強調表示され、右パネルにそのノードが関わる全フローが表示される。
 * 下部にカテゴリ別解説とまとめ画像保存(旧STEP4を統合)。
 */
export function StepPipeline({
  proposal,
  onBack,
  onNext,
}: {
  proposal: TechStackProposal;
  onBack: () => void;
  onNext: () => void;
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const layout = useMemo(() => layoutStackDiagram(proposal), [proposal]);
  const nodeById = useMemo(
    () => new Map(proposal.nodes.map((n) => [n.id, n])),
    [proposal]
  );

  const hoveredNode = hoveredNodeId ? nodeById.get(hoveredNodeId) : undefined;
  const hoveredFlows = hoveredNode
    ? proposal.edges
        .filter((e) => e.source === hoveredNode.id || e.target === hoveredNode.id)
        .map((e) => {
          const outgoing = e.source === hoveredNode.id;
          const other = nodeById.get(outgoing ? e.target : e.source);
          return { edge: e, outgoing, other };
        })
        .filter((f) => f.other)
    : [];

  const presentCategories = CATEGORY_ORDER.filter((c) =>
    proposal.nodes.some((n) => n.category === c)
  );

  async function handleDownloadImage() {
    setExportError(null);
    setIsExporting(true);
    try {
      const blob = await buildStackSummaryPng(proposal);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tech-stack-summary.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "画像の生成に失敗しました");
    } finally {
      setIsExporting(false);
    }
  }

  function edgeEmphasized(e: LaidOutEdge) {
    if (hoveredEdgeId === e.edge.id) return true;
    if (hoveredNodeId) return e.edge.source === hoveredNodeId || e.edge.target === hoveredNodeId;
    return false;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium">全体の技術フロー</h2>
          <p className="text-sm text-muted-foreground">
            選んだ技術スタック全体の構成図です。線にカーソルを合わせると「何のデータが流れているか」、技術にカーソルを合わせるとその技術が関わる全フローを確認できます。
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="outline" size="sm" onClick={handleDownloadImage} disabled={isExporting}>
            {isExporting ? "画像を生成中…" : "まとめ画像を保存"}
          </Button>
          {exportError && <p className="text-xs text-destructive">{exportError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* フロー図 */}
        <div
          className="overflow-x-auto rounded-2xl border-2 p-4"
          style={{ borderColor: "var(--brand-pink)" }}
        >
          <div className="relative" style={{ width: layout.width, height: layout.height }}>
            <svg
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              width={layout.width}
              height={layout.height}
              className="absolute inset-0"
              style={{ pointerEvents: "none" }}
            >
              <defs>
                <marker
                  id="flow-arrow"
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
                      markerEnd="url(#flow-arrow)"
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
                hoveredNodeId === node.id ||
                (hoveredEdgeId !== null &&
                  layout.edges.some(
                    (e) =>
                      e.edge.id === hoveredEdgeId &&
                      (e.edge.source === node.id || e.edge.target === node.id)
                  ));
              return (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className={cn(
                    "absolute flex cursor-pointer items-center gap-2 rounded-xl border px-3 transition-transform",
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

            {/* エッジホバー時の吹き出し */}
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

        {/* ホバー詳細パネル */}
        <div className="rounded-2xl border-2 p-4" style={{ borderColor: "var(--brand-pink)" }}>
          {hoveredNode ? (
            <NodeFlowsPanel node={hoveredNode} flows={hoveredFlows} />
          ) : (
            <p className="text-sm text-muted-foreground">
              左の図の技術にカーソルを合わせると、その技術が「何のデータを、どの技術とやり取りしているか」がここに表示されます。
            </p>
          )}
        </div>
      </div>

      {/* カテゴリ別解説(旧STEP4を統合) */}
      <div className="rounded-2xl border-2 p-5" style={{ borderColor: "var(--brand-pink)" }}>
        <p className="mb-4 text-sm font-medium">技術の解説</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {presentCategories.map((category) => {
            const colors = CATEGORY_COLORS[category];
            return (
              <div key={category}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span className={cn("size-1.5 rounded-full", colors.dot)} />
                  {STACK_CATEGORY_LABEL[category]}
                </p>
                <div className="space-y-3">
                  {proposal.nodes
                    .filter((n) => n.category === category)
                    .map((node) => (
                      <div key={node.id}>
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <TechIcon name={node.label} size={18} />
                          {node.label}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {node.description}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          ←クイズに戻る
        </Button>
        <Button
          size="lg"
          onClick={onNext}
          className="rounded-full text-white"
          style={{ background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))" }}
        >
          配線パズルへ→
        </Button>
      </div>
    </div>
  );
}

function NodeFlowsPanel({
  node,
  flows,
}: {
  node: TechStackNode;
  flows: { edge: { id: string; label?: string }; outgoing: boolean; other?: TechStackNode }[];
}) {
  const colors = CATEGORY_COLORS[node.category];
  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2 rounded-xl border p-3", colors.bg, colors.border)}>
        <TechIcon name={node.label} size={28} />
        <div>
          <p className="font-semibold">{node.label}</p>
          <p className={cn("text-[11px]", colors.text)}>{STACK_CATEGORY_LABEL[node.category]}</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{node.description}</p>
      {flows.length > 0 ? (
        <div className="space-y-2">
          {flows.map(({ edge, outgoing, other }) => (
            <div key={edge.id} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-2">
              {outgoing ? (
                <ArrowDown className="size-4 flex-none text-pink-500" />
              ) : (
                <ArrowUp className="size-4 flex-none text-sky-500" />
              )}
              <div className="min-w-0 text-xs">
                <p className="flex items-center gap-1 font-medium">
                  <TechIcon name={other!.label} size={13} />
                  {other!.label} {outgoing ? "へ送る" : "から受け取る"}
                </p>
                {edge.label && <p className="text-muted-foreground">{edge.label}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">この技術に接続されたフローはありません。</p>
      )}
    </div>
  );
}
