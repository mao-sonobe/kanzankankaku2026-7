"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import {
  STACK_CATEGORY_LABEL,
  type StackCategory,
  type TechStackNode,
  type TechStackProposal,
} from "@/lib/domain/stack";
import { buildStackSummaryPng } from "@/lib/domain/stack-image";
import { TechIcon } from "@/components/ui/tech-icon";
import { TechFlowDiagram } from "./tech-flow-diagram";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: StackCategory[] = ["frontend", "backend", "data", "infra", "other"];

/**
 * ③全体の技術フロー。技術スタック全体の構成図(step2と共有のTechFlowDiagram)を表示し、
 * ノードにホバーすると右パネルにそのノードが関わる全フローが出る。
 * 下部にカテゴリ別解説とまとめ画像保存。
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
        {/* フロー図(step2と共有) */}
        <div className="rounded-2xl border-2 p-4" style={{ borderColor: "var(--brand-pink)" }}>
          <TechFlowDiagram
            proposal={proposal}
            highlightNodeId={hoveredNodeId}
            onHoverNode={setHoveredNodeId}
          />
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
