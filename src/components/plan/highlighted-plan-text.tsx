"use client";

import { cn } from "@/lib/utils";
import { segmentPlanText } from "@/lib/domain/highlight-plan";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { useProjectStore } from "@/lib/store/project-store";
import type { PlanPhrase, TechStackNode } from "@/lib/domain/stack";

export function HighlightedPlanText({
  planText,
  phrases,
  nodes,
}: {
  planText: string;
  phrases: PlanPhrase[];
  nodes: TechStackNode[];
}) {
  const highlighted = useProjectStore((s) => s.highlighted);
  const hoverHighlight = useProjectStore((s) => s.hoverHighlight);
  const clearHoverHighlight = useProjectStore((s) => s.clearHoverHighlight);
  const toggleClickHighlight = useProjectStore((s) => s.toggleClickHighlight);

  const segments = segmentPlanText(planText, phrases);

  function isActive(phrase: PlanPhrase): boolean {
    if (!highlighted) return false;
    if (highlighted.type === "phrase") return highlighted.id === phrase.id;
    const node = nodes.find((n) => n.id === highlighted.id);
    return !!node && node.relatedPhraseIds.includes(phrase.id);
  }

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.content}</span>;
        const colors = CATEGORY_COLORS[seg.phrase.category];
        const active = isActive(seg.phrase);
        const highlight = { type: "phrase" as const, id: seg.phrase.id };
        return (
          <span
            key={i}
            onMouseEnter={() => hoverHighlight(highlight)}
            onMouseLeave={() => clearHoverHighlight(highlight)}
            onClick={() => toggleClickHighlight(highlight)}
            className={cn(
              "cursor-pointer rounded px-0.5 py-px border-b-2 transition-all",
              colors.bg,
              colors.text,
              active ? cn(colors.border, "ring-2 ring-offset-1") : "border-transparent"
            )}
          >
            {seg.content}
          </span>
        );
      })}
    </p>
  );
}
