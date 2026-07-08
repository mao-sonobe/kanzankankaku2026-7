"use client";

import { TechIcon } from "@/components/ui/tech-icon";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import type { TechStackNode } from "@/lib/domain/stack";
import { cn } from "@/lib/utils";

/**
 * カードクイズ中央の縦チェーン構成図(モック忠実版)。枠なしで、回答済みノードを
 * パイプライン順に縦に積み、黒い縦線で連結する。ホバー中ノードはピンクリング+拡大。
 */
export function QuizPipeline({
  nodes,
  highlightNodeId,
}: {
  /** パイプライン順にすでに回答済みのノード(表示順) */
  nodes: TechStackNode[];
  highlightNodeId: string | null;
}) {
  if (nodes.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        カードに答えると、ここに構成図が育っていきます。
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center py-4">
      {nodes.map((node, i) => {
        const colors = CATEGORY_COLORS[node.category];
        const highlighted = highlightNodeId === node.id;
        return (
          <div key={node.id} className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-24 w-52 items-center gap-2.5 rounded-2xl border-2 px-5 shadow-sm transition-transform",
                colors.bg,
                colors.border,
                highlighted && "z-10 scale-105 shadow-lg ring-2"
              )}
              style={highlighted ? { ["--tw-ring-color" as string]: "var(--brand-pink)" } : undefined}
            >
              <TechIcon name={node.label} size={26} />
              <span className="text-base font-semibold">{node.label}</span>
            </div>
            {i < nodes.length - 1 && <div className="h-10 w-0.5 bg-foreground" />}
          </div>
        );
      })}
    </div>
  );
}
