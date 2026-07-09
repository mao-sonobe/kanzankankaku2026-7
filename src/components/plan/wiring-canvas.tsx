"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { TechIcon } from "@/components/ui/tech-icon";
import {
  layoutFlowNodes,
  type FeatureFlow,
  type FlowStep,
} from "@/lib/domain/feature-flow";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  screen: "画面",
  component: "UI部品",
  hook: "フック",
  state: "状態",
  db: "データベース",
  api: "外部API",
  util: "ロジック",
};

/** どの技術のアイコンを出すか(DBはsupabase風の緑、それ以外はreact/next寄り)。ラベルから推測。 */
function iconNameFor(label: string, role: string): string {
  const l = label.toLowerCase();
  if (l.includes("supabase")) return "Supabase";
  if (l.includes("firebase")) return "Firebase";
  if (l.includes("prisma")) return "Prisma";
  if (l.includes("postgres")) return "PostgreSQL";
  if (role === "db" || role === "api") return "Supabase";
  return "React";
}

interface Point {
  x: number;
  y: number;
}

/**
 * 機能ごとの配線パズル本体。ノードはドラッグで線をつなぐ。現在のステップの
 * from→toに一致したときだけ線が確定し、番号バッジが付いて次のステップへ進む。
 */
export function WiringCanvas({
  feature,
  completedSteps,
  onConnect,
  activeStepIndex,
}: {
  feature: FeatureFlow;
  /** 確定済みステップ(feature.steps基準のindex集合、順序どおり) */
  completedSteps: number[];
  /** 正しい接続がされたとき、そのステップindexを通知 */
  onConnect: (stepIndex: number) => void;
  /** 次に配線すべきステップindex(未完了の先頭)。完了時は-1 */
  activeStepIndex: number;
}) {
  const positioned = layoutFlowNodes(feature);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  // ドラッグ中の線の始点ノードidと現在のポインタ座標(px, コンテナ相対)
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function nodeCenter(id: string): Point | null {
    const container = containerRef.current;
    const node = nodeRefs.current[id];
    if (!container || !node) return null;
    const c = container.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 };
  }

  function handlePointerDown(e: React.PointerEvent, nodeId: string) {
    if (activeStepIndex < 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragFrom(nodeId);
    const c = containerRef.current!.getBoundingClientRect();
    setPointer({ x: e.clientX - c.left, y: e.clientY - c.top });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragFrom) return;
    const c = containerRef.current!.getBoundingClientRect();
    setPointer({ x: e.clientX - c.left, y: e.clientY - c.top });
  }

  function nodeAtPoint(clientX: number, clientY: number): string | null {
    for (const p of positioned) {
      const el = nodeRefs.current[p.node.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return p.node.id;
      }
    }
    return null;
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragFrom) return;
    const target = nodeAtPoint(e.clientX, e.clientY);
    const step = feature.steps[activeStepIndex];
    if (target && step && step.fromId === dragFrom && step.toId === target) {
      onConnect(activeStepIndex);
    } else if (target && target !== dragFrom) {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 400);
    }
    setDragFrom(null);
    setPointer(null);
  }

  // 確定済みの線を描く
  const doneLines = completedSteps.map((si) => feature.steps[si]).filter(Boolean) as FlowStep[];
  const dragCenter = dragFrom ? nodeCenter(dragFrom) : null;

  return (
    <div
      ref={containerRef}
      className="relative h-[420px] w-full touch-none select-none rounded-2xl border-2 bg-pink-50/40"
      style={{ borderColor: "var(--brand-pink)" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 線(SVG) */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {doneLines.map((step) => {
          const a = nodeCenter(step.fromId);
          const b = nodeCenter(step.toId);
          if (!a || !b) return null;
          const color = step.kind === "call" ? "var(--brand-blue)" : "var(--brand-pink)";
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={step.id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={2.5} />
              <circle r={4} fill={color}>
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                />
              </circle>
              <circle cx={mx} cy={my} r={10} fill={color} />
              <text x={mx} y={my + 4} textAnchor="middle" fontSize={11} fill="#fff" fontWeight={700}>
                {completedSteps.indexOf(feature.steps.indexOf(step)) + 1}
              </text>
            </g>
          );
        })}
        {/* ドラッグ中の仮線 */}
        {dragCenter && pointer && (
          <line
            x1={dragCenter.x}
            y1={dragCenter.y}
            x2={pointer.x}
            y2={pointer.y}
            stroke="var(--brand-blue)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}
      </svg>

      {/* ノード */}
      {size.w > 0 &&
        positioned.map(({ node, xPct, yPct }) => {
          const step = activeStepIndex >= 0 ? feature.steps[activeStepIndex] : null;
          const isNextSource = step?.fromId === node.id && !dragFrom;
          const isHintTarget = !!dragFrom && step?.fromId === dragFrom && step?.toId === node.id;
          return (
            <div
              key={node.id}
              ref={(el) => {
                nodeRefs.current[node.id] = el;
              }}
              onPointerDown={(e) => handlePointerDown(e, node.id)}
              className={cn(
                "absolute w-44 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-xl border-2 border-pink-300 bg-pink-100 p-2.5 shadow-sm transition-all active:cursor-grabbing",
                isNextSource && "ring-2 ring-offset-1",
                isHintTarget && "scale-105 ring-2",
                wrongFlash && dragFrom === node.id && "animate-pulse"
              )}
              style={{
                left: `${xPct * 100}%`,
                top: `${yPct * 100}%`,
                ...(isNextSource || isHintTarget
                  ? { ["--tw-ring-color" as string]: "var(--brand-blue)" }
                  : {}),
              }}
            >
              <p className="flex items-center gap-1.5 text-xs font-bold">
                <TechIcon name={iconNameFor(node.label, node.role)} size={14} />
                <span className="truncate">{node.label}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {ROLE_LABEL[node.role] ?? node.role}
                {node.file ? ` ・ ${node.file.split("/").pop()}` : ""}
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-600">{node.data}</p>
            </div>
          );
        })}

      {activeStepIndex >= 0 && (
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] text-slate-500">
          光っているノードから、次にデータを受け取るノードへドラッグしてつなごう
        </p>
      )}
    </div>
  );
}
