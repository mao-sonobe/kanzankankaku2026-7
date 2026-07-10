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

/** 役割ごとにカードの色を変え、ひと目で種類を見分けられるようにする。 */
const ROLE_COLOR: Record<string, { border: string; bg: string; text: string }> = {
  screen: { border: "border-sky-400", bg: "bg-sky-100", text: "text-sky-700" },
  component: { border: "border-violet-400", bg: "bg-violet-100", text: "text-violet-700" },
  hook: { border: "border-amber-400", bg: "bg-amber-100", text: "text-amber-700" },
  state: { border: "border-blue-400", bg: "bg-blue-100", text: "text-blue-700" },
  db: { border: "border-emerald-400", bg: "bg-emerald-100", text: "text-emerald-700" },
  api: { border: "border-rose-400", bg: "bg-rose-100", text: "text-rose-700" },
  util: { border: "border-slate-400", bg: "bg-slate-100", text: "text-slate-700" },
};
const DEFAULT_ROLE_COLOR = ROLE_COLOR.util;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // 幅だけを見る(高さはこのコンポーネントでは未使用)。
  // 高さはcompact時にノード数に応じて自分で広げるため、高さの変化まで監視すると
  // 「監視対象の高さを自分で変える→再度検知→また変える」の無限ループになる。
  const [width, setWidth] = useState(0);
  // スマホ幅(コンテナが狭い)では横に並べると見切れるため、1列の縦積みに切り替える。
  const compact = width > 0 && width < 480;
  const positioned = layoutFlowNodes(feature, { singleColumn: compact });
  // ドラッグ中の線の始点ノードidと現在のポインタ座標(px, コンテナ相対)
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth((prev) => (prev === el.clientWidth ? prev : el.clientWidth));
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
    // 配線エリア。高さは画面に合わせて伸ばし、1画面に大きく収める(スマホは縦積みで行数が増えるぶん低めに)。
    <div
      className={cn(
        "flex h-[calc(100vh-14rem)] min-h-[420px] w-full flex-col rounded-2xl border-2 bg-pink-50/40 sm:h-[calc(100vh-21rem)] sm:min-h-[680px]",
        // スマホ(1列縦積み)は中身がこの枠の高さを超えやすいため、隠さずスクロールで見せる。
        compact ? "overflow-y-auto" : "overflow-hidden"
      )}
      style={{ borderColor: "var(--brand-pink)" }}
    >
      <div
        ref={containerRef}
        className={cn(
          "relative min-h-0 flex-1 select-none",
          // スマホ(compact)はピンチズームで縮小して全体を見られるようにする
          // (1本指のドラッグ配線は引き続き使えるようpinch-zoomのみ許可し、パンは許可しない)。
          // PC版は元通りtouch-noneのまま(ズーム操作自体が存在しないので影響なし)。
          compact ? "touch-pinch-zoom" : "touch-none"
        )}
        // 1列縦積み(スマホ)は行数が増えるほど必要な高さも増えるため、
        // カードが重ならないよう最低限の高さを確保し、外側のスクロールで見られるようにする。
        style={compact ? { minHeight: positioned.length * 190 } : undefined}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
      {/* 線(SVG)。背景に馴染んで見えにくかったため、白いハロー(縁取り)+太い線+矢印+
          大きめの番号バッジにして、どのカード同士がつながったか一目でわかるようにする。
          隣接カード同士をつなぐ線がカードの下に隠れないよう、z-indexでカードより手前に出す。 */}
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
        <defs>
          {/* Safariのcontext-stroke対応が不安なため、色ごとに矢印マーカーを固定で用意する。 */}
          <marker
            id="wiring-arrow-call"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M1 1L9 5L1 9Z" fill="var(--brand-blue)" />
          </marker>
          <marker
            id="wiring-arrow-return"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M1 1L9 5L1 9Z" fill="var(--brand-pink)" />
          </marker>
        </defs>
        {doneLines.map((step) => {
          const a = nodeCenter(step.fromId);
          const b = nodeCenter(step.toId);
          if (!a || !b) return null;
          const color = step.kind === "call" ? "var(--brand-blue)" : "var(--brand-pink)";
          const markerId = step.kind === "call" ? "wiring-arrow-call" : "wiring-arrow-return";
          // ノードが増えると直線同士が重なって見分けにくくなるため、線ごとに
          // わずかにカーブさせる(stepIdから決定的に向きを決め、毎回同じ形になるようにする)。
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const seed = step.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const bend = Math.min(36, len * 0.18) * (seed % 2 === 0 ? 1 : -1);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const cx = mx + (-dy / len) * bend;
          const cy = my + (dx / len) * bend;
          const pathD = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
          // 二次ベジェ曲線の中点(バッジを線上に正しく置くため、単純な中点ではなくこちらを使う)。
          const curveMidX = 0.25 * a.x + 0.5 * cx + 0.25 * b.x;
          const curveMidY = 0.25 * a.y + 0.5 * cy + 0.25 * b.y;
          return (
            <g key={step.id}>
              {/* 白いハロー: 線がカードやテキストの上を通っても埋もれないようにする */}
              <path d={pathD} stroke="white" strokeWidth={8} strokeLinecap="round" fill="none" />
              <path
                d={pathD}
                stroke={color}
                strokeWidth={4}
                strokeLinecap="round"
                fill="none"
                markerEnd={`url(#${markerId})`}
              />
              <circle r={5} fill={color} stroke="white" strokeWidth={2}>
                <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
              </circle>
              <circle cx={curveMidX} cy={curveMidY} r={14} fill={color} stroke="white" strokeWidth={2.5} />
              <text x={curveMidX} y={curveMidY + 5} textAnchor="middle" fontSize={13} fill="#fff" fontWeight={700}>
                {completedSteps.indexOf(feature.steps.indexOf(step)) + 1}
              </text>
            </g>
          );
        })}
        {/* ドラッグ中の仮線 */}
        {dragCenter && pointer && (
          <>
            <line
              x1={dragCenter.x}
              y1={dragCenter.y}
              x2={pointer.x}
              y2={pointer.y}
              stroke="white"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <line
              x1={dragCenter.x}
              y1={dragCenter.y}
              x2={pointer.x}
              y2={pointer.y}
              stroke="var(--brand-blue)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="7 5"
            />
          </>
        )}
      </svg>

      {/* ノード */}
      {width > 0 &&
        positioned.map(({ node, xPct, yPct }) => {
          const step = activeStepIndex >= 0 ? feature.steps[activeStepIndex] : null;
          const isNextSource = step?.fromId === node.id && !dragFrom;
          const isHintTarget = !!dragFrom && step?.fromId === dragFrom && step?.toId === node.id;
          const roleColor = ROLE_COLOR[node.role] ?? DEFAULT_ROLE_COLOR;
          return (
            <div
              key={node.id}
              ref={(el) => {
                nodeRefs.current[node.id] = el;
              }}
              onPointerDown={(e) => handlePointerDown(e, node.id)}
              className={cn(
                "absolute w-[min(78vw,18rem)] -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-xl border-2 bg-white shadow-md transition-all active:cursor-grabbing",
                roleColor.border,
                compact ? "p-2" : "p-3",
                isNextSource && "ring-4 ring-offset-2",
                isHintTarget && "scale-105 ring-4",
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
              <p
                className={cn(
                  "-mx-3 -mt-3 mb-2 flex items-center gap-2 rounded-t-[10px] px-3 py-1.5 font-bold",
                  roleColor.bg,
                  roleColor.text,
                  compact ? "text-sm" : "text-base"
                )}
              >
                <TechIcon name={iconNameFor(node.label, node.role)} size={compact ? 14 : 18} />
                <span className="truncate">{node.label}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {ROLE_LABEL[node.role] ?? node.role}
                {node.file ? ` ・ ${node.file.split("/").pop()}` : ""}
              </p>
              <p
                className={cn(
                  "mt-1 line-clamp-2 leading-snug text-slate-600",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {node.data}
              </p>
              {/* このノードの実コード抜粋。コード部分はドラッグを始めずにスクロールできるようにする */}
              {node.snippet && (
                <pre
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    "cursor-auto overflow-auto rounded-md bg-slate-900 p-2 text-xs leading-snug text-slate-100",
                    compact ? "mt-1.5 max-h-14" : "mt-2 max-h-24"
                  )}
                >
                  {node.snippet}
                </pre>
              )}
            </div>
          );
        })}

        {activeStepIndex >= 0 && (
          <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-slate-500">
            光っているノードから、次にデータを受け取るノードへドラッグしてつなごう
          </p>
        )}
      </div>
    </div>
  );
}
