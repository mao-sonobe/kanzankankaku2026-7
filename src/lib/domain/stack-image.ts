// 技術スタックのまとめ画像(PNG)をCanvasで生成する。STEP4のダウンロードボタンから使う。
// 画面表示のStackDiagram(アーキテクチャ図)と同じレイアウトで、
// アイコン入りボックス+データの流れを書いた矢印を描く。
// アイコンはdevicon(CORS許可あり)から取得し、失敗した技術は頭文字の丸で描く。

import type { StackCategory, TechStackProposal } from "./stack";
import { STACK_CATEGORY_LABEL } from "./stack";
import { DIAGRAM_NODE_H, DIAGRAM_NODE_W, layoutStackDiagram } from "./stack-layout";
import { techIconUrl } from "./tech-icon";

const CATEGORY_HEX: Record<StackCategory, { fill: string; stroke: string; text: string }> = {
  frontend: { fill: "#eff6ff", stroke: "#60a5fa", text: "#1e3a8a" },
  backend: { fill: "#ecfdf5", stroke: "#34d399", text: "#064e3b" },
  infra: { fill: "#fffbeb", stroke: "#fbbf24", text: "#78350f" },
  data: { fill: "#f5f3ff", stroke: "#a78bfa", text: "#4c1d95" },
  other: { fill: "#f8fafc", stroke: "#94a3b8", text: "#0f172a" },
};

const FONT = "'Hiragino Sans', 'Noto Sans JP', sans-serif";
const SCALE = 2; // 高解像度で書き出す
const HEADER_H = 92;
const PAD_X = 24;

function loadIcon(label: string): Promise<HTMLImageElement | null> {
  const url = techIconUrl(label);
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  icon: HTMLImageElement | null,
  label: string,
  x: number,
  y: number,
  size: number
) {
  if (icon) {
    ctx.drawImage(icon, x, y, size, size);
    return;
  }
  ctx.save();
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#475569";
  ctx.font = `bold ${Math.round(size * 0.55)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.trim().charAt(0).toUpperCase(), x + size / 2, y + size / 2 + 1);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number
) {
  const len = 9;
  ctx.beginPath();
  ctx.moveTo(x - len * Math.cos(angle - Math.PI / 6), y - len * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x, y);
  ctx.lineTo(x - len * Math.cos(angle + Math.PI / 6), y - len * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

/** 技術スタックのまとめ画像(PNG Blob)を、画面と同じアーキテクチャ図スタイルで生成する。 */
export async function buildStackSummaryPng(proposal: TechStackProposal): Promise<Blob> {
  const icons = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    proposal.nodes.map(async (n) => {
      icons.set(n.label, await loadIcon(n.label));
    })
  );

  const layout = layoutStackDiagram(proposal);
  const width = Math.max(layout.width + PAD_X * 2, 640);
  const height = HEADER_H + layout.height + 24;

  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  // 背景
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // ヘッダー
  const grad = ctx.createLinearGradient(PAD_X, 0, width - PAD_X, 0);
  grad.addColorStop(0, "#3b82f6");
  grad.addColorStop(1, "#ec4899");
  ctx.fillStyle = grad;
  ctx.fillRect(PAD_X, 28, 56, 6);
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 26px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("技術スタック構成図", PAD_X, 66);
  ctx.fillStyle = "#64748b";
  ctx.font = `13px ${FONT}`;
  ctx.fillText("Out↓In — アウトプットがインプットになる開発学習アプリ", PAD_X + 240, 66);

  ctx.save();
  ctx.translate(PAD_X, HEADER_H);

  // 矢印(エッジ)
  for (const e of layout.edges) {
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    if (e.path) {
      ctx.stroke(new Path2D(e.path));
    } else {
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
    }
    drawArrowHead(ctx, e.x2, e.y2, e.endAngle);

    if (e.edge.label) {
      ctx.font = `11px ${FONT}`;
      const w = ctx.measureText(e.edge.label).width;
      const startAnchored = Boolean(e.path);
      const boxX = startAnchored ? e.labelX - 4 : e.labelX - w / 2 - 4;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(boxX, e.labelY - 11, w + 8, 15);
      ctx.fillStyle = "#475569";
      ctx.textAlign = startAnchored ? "left" : "center";
      ctx.fillText(e.edge.label, e.labelX, e.labelY);
      ctx.textAlign = "left";
    }
  }

  // ノード
  for (const { node, x, y } of layout.nodes) {
    const colors = CATEGORY_HEX[node.category];
    ctx.fillStyle = colors.fill;
    roundRect(ctx, x, y, DIAGRAM_NODE_W, DIAGRAM_NODE_H, 10);
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const icon = icons.get(node.label) ?? null;
    drawIcon(ctx, icon, node.label, x + 12, y + DIAGRAM_NODE_H / 2 - 13, 26);
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(node.label, x + 46, y + DIAGRAM_NODE_H / 2 - 3);
    ctx.fillStyle = colors.text;
    ctx.font = `10.5px ${FONT}`;
    ctx.fillText(STACK_CATEGORY_LABEL[node.category], x + 46, y + DIAGRAM_NODE_H / 2 + 15);
  }

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像の生成に失敗しました"))),
      "image/png"
    );
  });
}
