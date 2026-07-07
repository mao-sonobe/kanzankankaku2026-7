"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView, Decoration, WidgetType, type DecorationSet } from "@codemirror/view";
import type { BlockRole, ChunkedFile } from "@/lib/ai/types";
import type { StackCategory, TechStackNode } from "@/lib/domain/stack";
import { buildFileContentWithRanges, type SlotRange } from "@/lib/domain/chunk-code";
import { BLOCK_ROLE_LABEL } from "@/lib/domain/block-colors";

// CodeMirrorのDecorationはTailwindの動的クラス名を解決できないため、
// エディタ内の役割カラーはここで実際の色値として定義する(パレット側はTailwindクラスのままでよい)。
const ROLE_HEX: Record<BlockRole, { bg: string; border: string }> = {
  state: { bg: "#dbeafe", border: "#60a5fa" },
  "event-handler": { bg: "#fef3c7", border: "#f59e0b" },
  "api-fetch": { bg: "#d1fae5", border: "#34d399" },
  jsx: { bg: "#ede9fe", border: "#a78bfa" },
  logic: { bg: "#ffe4e6", border: "#fb7185" },
  import: { bg: "#f1f5f9", border: "#94a3b8" },
  style: { bg: "#fce7f3", border: "#f472b6" },
  other: { bg: "#f3f4f6", border: "#9ca3af" },
};

// stack-colors.tsのTailwindカラー(100/400/900)に対応する実色値。データフロー解説でも使う。
export const CATEGORY_HEX: Record<StackCategory, { bg: string; border: string; text: string }> = {
  frontend: { bg: "#dbeafe", border: "#60a5fa", text: "#1e3a8a" },
  backend: { bg: "#d1fae5", border: "#34d399", text: "#064e3b" },
  infra: { bg: "#fef3c7", border: "#fbbf24", text: "#78350f" },
  data: { bg: "#ede9fe", border: "#a78bfa", text: "#4c1d95" },
  other: { bg: "#f1f5f9", border: "#94a3b8", text: "#0f172a" },
};

class SlotWidget extends WidgetType {
  constructor(
    private readonly range: SlotRange,
    private readonly isActive: boolean,
    private readonly onClick: (slotId: string) => void,
    private readonly relatedNode: TechStackNode | null
  ) {
    super();
  }

  eq(other: SlotWidget) {
    return (
      other.range.slot.id === this.range.slot.id &&
      other.isActive === this.isActive &&
      other.relatedNode?.id === this.relatedNode?.id
    );
  }

  toDOM() {
    const el = document.createElement("span");
    el.className = `cm-slot-empty cm-role-${this.range.slot.role}${this.isActive ? " cm-slot-active" : ""}`;
    el.dataset.slotId = this.range.slot.id;

    const label = document.createElement("span");
    label.className = "cm-slot-label";
    label.textContent = BLOCK_ROLE_LABEL[this.range.slot.role];
    el.appendChild(label);

    if (this.relatedNode) {
      const tech = document.createElement("span");
      tech.className = "cm-slot-tech";
      tech.textContent = this.relatedNode.label;
      const hex = CATEGORY_HEX[this.relatedNode.category];
      tech.style.backgroundColor = hex.bg;
      tech.style.border = `1px solid ${hex.border}`;
      tech.style.color = hex.text;
      el.appendChild(tech);
    }

    const correctChoice = this.range.slot.choices.find((c) => c.isCorrect);
    if (correctChoice) {
      const ghost = document.createElement("span");
      ghost.className = "cm-slot-ghost";
      ghost.textContent = correctChoice.code;
      el.appendChild(ghost);
    }

    el.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onClick(this.range.slot.id);
    });

    return el;
  }

  ignoreEvent() {
    return true;
  }
}

function buildDecorations(
  ranges: SlotRange[],
  activeSlotId: string | null,
  onSlotClick: (slotId: string) => void,
  nodeById: Map<string, TechStackNode> | undefined
): DecorationSet {
  const decos = ranges.map((r) => {
    if (r.choice) {
      return Decoration.mark({
        class: `cm-slot-filled cm-role-${r.slot.role}${activeSlotId === r.slot.id ? " cm-slot-active" : ""}`,
        attributes: { "data-slot-id": r.slot.id },
      }).range(r.start, r.end);
    }
    const relatedNode =
      (r.slot.relatedStackNodeId && nodeById?.get(r.slot.relatedStackNodeId)) || null;
    return Decoration.replace({
      widget: new SlotWidget(r, activeSlotId === r.slot.id, onSlotClick, relatedNode),
    }).range(r.start, r.end);
  });
  return Decoration.set(decos, true);
}

export function CodeEditor({
  chunked,
  answers,
  activeSlotId,
  onSlotClick,
  nodeById,
}: {
  chunked: ChunkedFile;
  answers: Record<string, string>;
  activeSlotId: string | null;
  onSlotClick: (slotId: string) => void;
  /** 技術スタックノードの参照(空欄→技術チップ表示用)。任意 */
  nodeById?: Map<string, TechStackNode>;
}) {
  const { text, ranges } = useMemo(
    () => buildFileContentWithRanges(chunked, answers),
    [chunked, answers]
  );

  const extensions = useMemo(() => {
    const decorations = buildDecorations(ranges, activeSlotId, onSlotClick, nodeById);
    return [
      javascript({ jsx: true }),
      EditorView.editable.of(false),
      EditorView.decorations.of(decorations),
      EditorView.domEventHandlers({
        mousedown(event) {
          // 埋まったスロット(Decoration.mark)はウィジェットを持たないため、
          // クリックされた要素からdata-slot-idを辿って判定する。
          const target = (event.target as HTMLElement)?.closest("[data-slot-id]");
          const slotId = target?.getAttribute("data-slot-id");
          if (slotId) {
            onSlotClick(slotId);
            return true;
          }
          return false;
        },
      }),
      EditorView.theme({
        ".cm-slot-empty": {
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          border: "1px dashed currentColor",
          borderRadius: "4px",
          padding: "0 6px",
          cursor: "pointer",
          verticalAlign: "middle",
        },
        ".cm-slot-active": {
          outline: "2px solid #6366f1",
        },
        ".cm-slot-label": {
          fontSize: "10px",
          opacity: "0.8",
          fontStyle: "normal",
        },
        ".cm-slot-ghost": {
          opacity: "0.35",
          fontStyle: "italic",
        },
        ".cm-slot-tech": {
          fontSize: "10px",
          fontStyle: "normal",
          borderRadius: "9999px",
          padding: "0 5px",
          whiteSpace: "nowrap",
        },
        ".cm-slot-filled": {
          borderRadius: "4px",
          padding: "0 2px",
          cursor: "pointer",
        },
        ...Object.fromEntries(
          Object.entries(ROLE_HEX).flatMap(([role, { bg, border }]) => [
            [
              `.cm-role-${role}.cm-slot-empty`,
              { backgroundColor: bg, borderColor: border, color: border },
            ],
            [`.cm-role-${role}.cm-slot-filled`, { backgroundColor: bg }],
          ])
        ),
      }),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranges, activeSlotId, nodeById]);

  return (
    <CodeMirror
      value={text}
      height="480px"
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
      extensions={extensions}
    />
  );
}
