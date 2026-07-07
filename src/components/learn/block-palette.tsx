"use client";

import { cn } from "@/lib/utils";
import { BLOCK_ROLE_COLORS, BLOCK_ROLE_LABEL } from "@/lib/domain/block-colors";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { TechIcon } from "@/components/ui/tech-icon";
import type { CodeBlockSlot } from "@/lib/ai/types";
import type { TechStackNode } from "@/lib/domain/stack";

export interface RelatedNodeInfo {
  node: TechStackNode;
  /** 「Next.js → Supabase」のような、この技術が関わるデータの流れの表示用テキスト */
  edgeText?: string;
}

export function BlockPalette({
  slot,
  selectedChoiceId,
  onChoose,
  relatedNodeInfo,
}: {
  slot: CodeBlockSlot | null;
  selectedChoiceId: string | undefined;
  onChoose: (choiceId: string) => void;
  relatedNodeInfo?: RelatedNodeInfo | null;
}) {
  if (!slot) {
    return (
      <p className="text-sm text-muted-foreground">
        エディタ内の点線の空欄をクリックすると、ここに選択肢が表示されます。
      </p>
    );
  }

  const colors = BLOCK_ROLE_COLORS[slot.role];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className={cn("inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs", colors.bg, colors.text)}>
          <span className={cn("size-1.5 rounded-full", colors.dot)} />
          {BLOCK_ROLE_LABEL[slot.role]}
          <span className="opacity-70">・{slot.label}</span>
        </div>
        {relatedNodeInfo && (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
              CATEGORY_COLORS[relatedNodeInfo.node.category].bg,
              CATEGORY_COLORS[relatedNodeInfo.node.category].text
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", CATEGORY_COLORS[relatedNodeInfo.node.category].dot)}
            />
            <TechIcon name={relatedNodeInfo.node.label} size={14} />
            {relatedNodeInfo.edgeText
              ? `${relatedNodeInfo.edgeText} の受け渡し`
              : `${relatedNodeInfo.node.label} に関わる部分`}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {slot.choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => onChoose(choice.id)}
            className={cn(
              "rounded-md border px-3 py-2 text-left font-mono text-xs transition-colors hover:brightness-95",
              colors.bg,
              colors.text,
              selectedChoiceId === choice.id ? cn(colors.border, "ring-2 ring-offset-1") : "border-transparent"
            )}
          >
            {choice.code}
          </button>
        ))}
      </div>
    </div>
  );
}
