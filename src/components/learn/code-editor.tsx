"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView, Decoration, WidgetType, type DecorationSet } from "@codemirror/view";
import type { BlockRole, ChunkedFile } from "@/lib/ai/types";
import type { StackCategory, TechStackNode } from "@/lib/domain/stack";
import { buildFileContentWithRanges, type SlotRange } from "@/lib/domain/chunk-code";
import type { FeatureRangesInChunked, RenderedFeatureRange } from "@/lib/domain/feature-map";
import { BLOCK_ROLE_LABEL } from "@/lib/domain/block-colors";
import { techIconUrl } from "@/lib/domain/tech-icon";

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

// stack-colors.tsのTailwindカラー(100/400/900)に対応する実色値。
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
    private readonly relatedNode: TechStackNode | null,
    private readonly isFeatureActive: boolean
  ) {
    super();
  }

  eq(other: SlotWidget) {
    return (
      other.range.slot.id === this.range.slot.id &&
      other.isActive === this.isActive &&
      other.relatedNode?.id === this.relatedNode?.id &&
      other.isFeatureActive === this.isFeatureActive
    );
  }

  toDOM() {
    const el = document.createElement("span");
    el.className =
      `cm-slot-empty cm-role-${this.range.slot.role}` +
      (this.isActive ? " cm-slot-active" : "") +
      (this.isFeatureActive ? " cm-feature-active" : "");
    el.dataset.slotId = this.range.slot.id;

    const label = document.createElement("span");
    label.className = "cm-slot-label";
    label.textContent = BLOCK_ROLE_LABEL[this.range.slot.role];
    el.appendChild(label);

    if (this.relatedNode) {
      const tech = document.createElement("span");
      tech.className = "cm-slot-tech";
      const iconUrl = techIconUrl(this.relatedNode.label);
      if (iconUrl) {
        const icon = document.createElement("img");
        icon.src = iconUrl;
        icon.alt = "";
        icon.width = 11;
        icon.height = 11;
        icon.style.verticalAlign = "-1px";
        icon.style.marginRight = "3px";
        icon.addEventListener("error", () => icon.remove());
        tech.appendChild(icon);
      }
      tech.appendChild(document.createTextNode(this.relatedNode.label));
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
  nodeById: Map<string, TechStackNode> | undefined,
  featureRanges: FeatureRangesInChunked | null
): DecorationSet {
  const decos = ranges.map((r) => {
    const isFeatureActive = featureRanges?.slotIds.has(r.slot.id) ?? false;
    if (r.choice) {
      return Decoration.mark({
        class:
          `cm-slot-filled cm-role-${r.slot.role}` +
          (activeSlotId === r.slot.id ? " cm-slot-active" : "") +
          (isFeatureActive ? " cm-feature-active" : ""),
        attributes: { "data-slot-id": r.slot.id },
      }).range(r.start, r.end);
    }
    const relatedNode =
      (r.slot.relatedStackNodeId && nodeById?.get(r.slot.relatedStackNodeId)) || null;
    return Decoration.replace({
      widget: new SlotWidget(r, activeSlotId === r.slot.id, onSlotClick, relatedNode, isFeatureActive),
    }).range(r.start, r.end);
  });

  const featureBlockDecos = (featureRanges?.textRanges ?? []).map((r) =>
    Decoration.mark({ class: "cm-feature-block" }).range(r.start, r.end)
  );

  return Decoration.set([...decos, ...featureBlockDecos], true);
}

/** 現在アクティブな機能のコード片(通常コード+空欄)を、エディタ上の座標に変換して結んだ線を描く。 */
function useFeatureConnectorLines(
  view: EditorView | null,
  points: RenderedFeatureRange[],
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [segments, setSegments] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  useEffect(() => {
    if (!view || points.length < 2) {
      setSegments([]);
      return;
    }
    function recompute() {
      const container = containerRef.current;
      if (!container || !view) return;
      const containerRect = container.getBoundingClientRect();
      const resolved = points
        .map((p) => {
          const mid = Math.floor((p.start + p.end) / 2);
          try {
            const coords = view.coordsAtPos(mid);
            if (!coords) return null;
            return {
              x: (coords.left + coords.right) / 2 - containerRect.left,
              y: (coords.top + coords.bottom) / 2 - containerRect.top,
            };
          } catch {
            return null;
          }
        })
        .filter((p): p is { x: number; y: number } => p !== null);
      const segs = [];
      for (let i = 0; i < resolved.length - 1; i++) {
        segs.push({ x1: resolved[i].x, y1: resolved[i].y, x2: resolved[i + 1].x, y2: resolved[i + 1].y });
      }
      setSegments(segs);
    }
    recompute();
    const scroller = view.scrollDOM;
    scroller.addEventListener("scroll", recompute);
    window.addEventListener("resize", recompute);
    return () => {
      scroller.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [view, points, containerRef]);

  return segments;
}

export function CodeEditor({
  chunked,
  answers,
  activeSlotId,
  onSlotClick,
  nodeById,
  featureRanges,
  featureColorHex,
}: {
  chunked: ChunkedFile;
  answers: Record<string, string>;
  activeSlotId: string | null;
  onSlotClick: (slotId: string) => void;
  /** 技術スタックノードの参照(空欄→技術チップ表示用)。任意 */
  nodeById?: Map<string, TechStackNode>;
  /** 現在アクティブな機能がこのファイル内で占める範囲。任意(機能マップ未選択時はundefined) */
  featureRanges?: FeatureRangesInChunked | null;
  /** アクティブな機能の配色(実色値)。featureRangesとセットで指定する */
  featureColorHex?: { bg: string; border: string };
  }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView | null>(null);

  const { text, ranges } = useMemo(
    () => buildFileContentWithRanges(chunked, answers),
    [chunked, answers]
  );

  const connectorPoints = useMemo(() => {
    if (!featureRanges) return [];
    const slotPoints = ranges
      .filter((r) => featureRanges.slotIds.has(r.slot.id))
      .map((r) => ({ start: r.start, end: r.end }));
    return [...featureRanges.textRanges, ...slotPoints].sort((a, b) => a.start - b.start);
  }, [featureRanges, ranges]);

  const connectorSegments = useFeatureConnectorLines(view, connectorPoints, containerRef);

  const extensions = useMemo(() => {
    const decorations = buildDecorations(ranges, activeSlotId, onSlotClick, nodeById, featureRanges ?? null);
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
        ".cm-feature-block": {
          borderRadius: "4px",
          padding: "0 2px",
          backgroundColor: featureColorHex?.bg ?? "transparent",
          boxShadow: featureColorHex ? `inset 0 0 0 1px ${featureColorHex.border}` : "none",
        },
        // 機能に関わる空欄は、既存の役割色の背景の上から縁取りだけを重ねる(背景の衝突を避ける)。
        ".cm-feature-active": {
          boxShadow: featureColorHex ? `inset 0 0 0 2px ${featureColorHex.border}` : "none",
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
  }, [ranges, activeSlotId, nodeById, featureRanges, featureColorHex]);

  return (
    <div ref={containerRef} className="relative">
      <CodeMirror
        value={text}
        height="480px"
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
        extensions={extensions}
        onCreateEditor={(v) => setView(v)}
      />
      {connectorSegments.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 size-full overflow-hidden">
          {connectorSegments.map((s, i) => (
            <path
              key={i}
              d={`M ${s.x1} ${s.y1} C ${(s.x1 + s.x2) / 2} ${s.y1}, ${(s.x1 + s.x2) / 2} ${s.y2}, ${s.x2} ${s.y2}`}
              stroke={featureColorHex?.border ?? "#6366f1"}
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="none"
            />
          ))}
        </svg>
      )}
    </div>
  );
}
