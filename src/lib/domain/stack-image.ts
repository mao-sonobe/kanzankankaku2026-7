// 技術スタックのまとめ画像(PNG)をCanvasで生成する。STEP4のダウンロードボタンから使う。
// アイコンはdevicon(CORS許可あり)から取得し、失敗した技術は頭文字の丸で描く。

import type { StackCategory, TechStackProposal } from "./stack";
import { STACK_CATEGORY_LABEL } from "./stack";
import { orderPipeline } from "./stack-pipeline";
import { techIconUrl } from "./tech-icon";

const CATEGORY_HEX: Record<StackCategory, { bg: string; dot: string; text: string }> = {
  frontend: { bg: "#eff6ff", dot: "#3b82f6", text: "#1e3a8a" },
  backend: { bg: "#ecfdf5", dot: "#10b981", text: "#064e3b" },
  infra: { bg: "#fffbeb", dot: "#f59e0b", text: "#78350f" },
  data: { bg: "#f5f3ff", dot: "#8b5cf6", text: "#4c1d95" },
  other: { bg: "#f8fafc", dot: "#64748b", text: "#0f172a" },
};

const W = 1200;
const PAD = 48;
const COL_GAP = 24;
const CARD_W = (W - PAD * 2 - COL_GAP) / 2;
const FONT = "'Hiragino Sans', 'Noto Sans JP', sans-serif";

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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    if (ch === "\n" || ctx.measureText(current + ch).width > maxWidth) {
      lines.push(current);
      current = ch === "\n" ? "" : ch;
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
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

/** 技術スタックのまとめ画像(PNG Blob)を生成する。 */
export async function buildStackSummaryPng(proposal: TechStackProposal): Promise<Blob> {
  const icons = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    proposal.nodes.map(async (n) => {
      icons.set(n.label, await loadIcon(n.label));
    })
  );

  // 高さを事前計算するため測定用コンテキストを使う。
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `13px ${FONT}`;
  const descWidth = CARD_W - 32;
  const cards = proposal.nodes.map((n) => {
    const lines = wrapText(measure, n.description, descWidth);
    return { node: n, lines, height: 16 + 22 + 8 + 28 + 6 + lines.length * 20 + 16 };
  });

  // 2カラムに詰める(左右交互ではなく高さの低い方へ)。
  const colY = [0, 0];
  const placed = cards.map((c) => {
    const col = colY[0] <= colY[1] ? 0 : 1;
    const pos = { ...c, col, y: colY[col] };
    colY[col] += c.height + 16;
    return pos;
  });
  const cardsHeight = Math.max(colY[0], colY[1]);

  const pipeline = orderPipeline(proposal);
  const headerH = 96;
  const pipelineH = 40 + 72;
  const H = PAD + headerH + cardsHeight + pipelineH + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 背景
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ヘッダー
  const grad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  grad.addColorStop(0, "#3b82f6");
  grad.addColorStop(1, "#ec4899");
  ctx.fillStyle = grad;
  ctx.fillRect(PAD, PAD, 56, 6);
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 30px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("技術スタックまとめ", PAD, PAD + 48);
  ctx.fillStyle = "#64748b";
  ctx.font = `14px ${FONT}`;
  ctx.fillText("Out↓In — アウトプットがインプットになる開発学習アプリ", PAD, PAD + 74);

  // ノードカード
  const cardsTop = PAD + headerH;
  for (const c of placed) {
    const x = PAD + c.col * (CARD_W + COL_GAP);
    const y = cardsTop + c.y;
    const colors = CATEGORY_HEX[c.node.category];
    ctx.fillStyle = colors.bg;
    roundRect(ctx, x, y, CARD_W, c.height, 12);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.stroke();

    // カテゴリ行
    ctx.fillStyle = colors.dot;
    ctx.beginPath();
    ctx.arc(x + 16 + 4, y + 16 + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(STACK_CATEGORY_LABEL[c.node.category], x + 16 + 14, y + 16 + 12);

    // 技術名 + アイコン
    const nameY = y + 16 + 22 + 8;
    drawIcon(ctx, icons.get(c.node.label) ?? null, c.node.label, x + 16, nameY, 24);
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(c.node.label, x + 16 + 32, nameY + 18);

    // 説明
    ctx.fillStyle = "#475569";
    ctx.font = `13px ${FONT}`;
    c.lines.forEach((line, i) => {
      ctx.fillText(line, x + 16, nameY + 28 + 6 + 14 + i * 20);
    });
  }

  // パイプライン
  const pipeTop = cardsTop + cardsHeight + 40;
  ctx.fillStyle = "#64748b";
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText("パイプライン(データの流れ)", PAD, pipeTop);
  let px = PAD;
  const pillY = pipeTop + 16;
  ctx.font = `bold 14px ${FONT}`;
  for (let i = 0; i < pipeline.length; i++) {
    const n = pipeline[i];
    const textW = ctx.measureText(n.label).width;
    const pillW = 12 + 20 + 6 + textW + 12;
    const colors = CATEGORY_HEX[n.category];
    ctx.fillStyle = "#f8fafc";
    roundRect(ctx, px, pillY, pillW, 40, 20);
    ctx.fill();
    ctx.strokeStyle = colors.dot;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawIcon(ctx, icons.get(n.label) ?? null, n.label, px + 12, pillY + 10, 20);
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(n.label, px + 12 + 26, pillY + 26);
    px += pillW;
    if (i < pipeline.length - 1) {
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("→", px + 8, pillY + 26);
      px += 30;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("画像の生成に失敗しました"))), "image/png");
  });
}
