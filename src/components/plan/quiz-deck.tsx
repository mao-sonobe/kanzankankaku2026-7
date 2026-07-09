"use client";

import { useEffect, useRef, useState } from "react";
import { TechIcon } from "@/components/ui/tech-icon";
import type { TechStackNode } from "@/lib/domain/stack";
import type { QuizChoice } from "@/lib/domain/stack-quiz";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 80;

/** ドラッグ方向(四分円)から四隅の選択肢indexへ。0=左上 1=右上 2=左下 3=右下 */
function quadrantOf(dx: number, dy: number): number {
  if (dy < 0) return dx < 0 ? 0 : 1;
  return dx < 0 ? 2 : 3;
}

const CORNER_CLASS = [
  "left-3 top-3",
  "right-3 top-3",
  "left-3 bottom-3",
  "right-3 bottom-3",
];

/**
 * マッチングアプリ風のカードデッキ。四隅に4択が置かれ、タップまたは
 * その方向へのスワイプで回答する。カードは回答すると飛んでいき、次のカードが現れる。
 */
export function QuizDeck({
  node,
  choices,
  remaining,
  onAnswer,
}: {
  node: TechStackNode;
  /** 四隅に対応する4択(0=左上 1=右上 2=左下 3=右下) */
  choices: QuizChoice[];
  /** このカードを含む残り枚数(重なり表現用) */
  remaining: number;
  onAnswer: (choice: QuizChoice) => void;
}) {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ dx: number; dy: number } | null>(null);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const answeredRef = useRef(false);

  // カードが変わったらアニメーション状態をリセット
  useEffect(() => {
    setDrag(null);
    setFlyTo(null);
    answeredRef.current = false;
  }, [node.id]);

  function fireAnswer(index: number) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    const dir = [
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 },
    ][index];
    setFlyTo({ dx: dir.dx * 480, dy: dir.dy * 380 });
    setTimeout(() => onAnswer(choices[index]), 250);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (answeredRef.current) return;
    // 四隅のボタン自体のタップはボタンのclickに任せる
    if ((e.target as HTMLElement).closest("button")) return;
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointerStart.current || pointerStart.current.id !== e.pointerId) return;
    setDrag({ dx: e.clientX - pointerStart.current.x, dy: e.clientY - pointerStart.current.y });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!pointerStart.current || pointerStart.current.id !== e.pointerId) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.hypot(dx, dy) >= SWIPE_THRESHOLD) {
      fireAnswer(quadrantOf(dx, dy));
    } else {
      setDrag(null);
    }
  }

  const offset = flyTo ?? drag;
  const dragging = drag !== null && flyTo === null;
  const activeCorner =
    dragging && Math.hypot(drag.dx, drag.dy) >= SWIPE_THRESHOLD * 0.6
      ? quadrantOf(drag.dx, drag.dy)
      : null;

  return (
    <div className="relative mx-auto h-[420px] w-full max-w-md select-none">
      {/* 背後の重なりカード */}
      {remaining > 2 && (
        <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-3xl border border-pink-200 bg-pink-100 shadow-sm" />
      )}
      {remaining > 1 && (
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-1 rounded-3xl border border-pink-200 bg-pink-100 shadow-sm" />
      )}

      <div
        className="absolute inset-0 cursor-grab touch-none rounded-3xl border border-pink-300 bg-pink-100 p-3 shadow-md active:cursor-grabbing"
        style={{
          transform: offset
            ? `translate(${offset.dx}px, ${offset.dy}px) rotate(${offset.dx / 25}deg)`
            : undefined,
          transition: dragging ? "none" : "transform 0.25s ease-in",
          opacity: flyTo ? 0.4 : 1,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null;
          setDrag(null);
        }}
      >
        {choices.map((choice, i) => (
          <button
            key={choice.label}
            type="button"
            onClick={() => fireAnswer(i)}
            className={cn(
              "absolute flex items-center gap-1.5 rounded-full border bg-white/90 px-3 py-1.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105",
              CORNER_CLASS[i],
              activeCorner === i && "scale-110 ring-2 ring-pink-500"
            )}
          >
            <TechIcon name={choice.label} size={16} />
            {choice.label}
          </button>
        ))}

        <div className="flex h-full items-center justify-center px-12 text-center">
          <p className="text-[15px] font-medium leading-relaxed text-slate-700">
            {node.quizQuestion ?? "この役割に最適な技術はどれ?"}
          </p>
        </div>

        <p className="absolute inset-x-0 bottom-14 text-center text-[11px] text-slate-500">
          四隅をタップ、またはその方向へスワイプ
        </p>
      </div>
    </div>
  );
}
