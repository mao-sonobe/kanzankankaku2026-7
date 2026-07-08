"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { STACK_CATEGORY_LABEL, type StackCategory, type TechStackProposal } from "@/lib/domain/stack";
import { buildStackSummaryPng } from "@/lib/domain/stack-image";
import { TechIcon } from "@/components/ui/tech-icon";
import { StackDiagram } from "./stack-diagram";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: StackCategory[] = ["frontend", "backend", "data", "infra", "other"];

export function StepExplain({
  proposal,
  onBack,
}: {
  proposal: TechStackProposal;
  onBack: () => void;
}) {
  const presentCategories = CATEGORY_ORDER.filter((c) => proposal.nodes.some((n) => n.category === c));
  const [selected, setSelected] = useState<StackCategory | null>(presentCategories[0] ?? null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const nodesInCategory = selected ? proposal.nodes.filter((n) => n.category === selected) : [];

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium">技術スタックの解説</h2>
          <p className="text-sm text-muted-foreground">
            役割ごとに整理しました。クリックすると、その役割の技術と理由を確認できます。
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="outline" size="sm" onClick={handleDownloadImage} disabled={isExporting}>
            {isExporting ? "画像を生成中…" : "まとめ画像を保存"}
          </Button>
          {exportError && <p className="text-xs text-destructive">{exportError}</p>}
        </div>
      </div>

      <div className="rounded-2xl border-2 p-4" style={{ borderColor: "var(--brand-pink)" }}>
        <p className="mb-3 text-xs font-medium text-muted-foreground">構成図(データの流れ)</p>
        <StackDiagram proposal={proposal} />
      </div>

      <div className="flex flex-wrap gap-2">
        {presentCategories.map((category) => {
          const colors = CATEGORY_COLORS[category];
          const active = category === selected;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelected(category)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors",
                active ? colors.bg : "bg-background"
              )}
              style={{ borderColor: active ? "var(--brand-pink)" : "var(--border)" }}
            >
              <span className={cn("size-1.5 rounded-full", colors.dot)} />
              {STACK_CATEGORY_LABEL[category]}
            </button>
          );
        })}
      </div>

      <div className="min-h-64 rounded-2xl border-2 p-5" style={{ borderColor: "var(--brand-pink)" }}>
        {nodesInCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground">上の役割を選ぶと、対応する技術がここに表示されます。</p>
        ) : (
          <div className="space-y-4">
            {nodesInCategory.map((node) => (
              <div key={node.id}>
                <p className="flex items-center gap-2 font-semibold">
                  <TechIcon name={node.label} size={20} />
                  {node.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{node.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          ←技術スタックの提案に戻る
        </Button>
        <Button size="lg" nativeButton={false} render={<Link href="/build" />}>
          次へ: コードを生成する→
        </Button>
      </div>
    </div>
  );
}
