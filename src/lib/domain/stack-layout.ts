// 技術スタックのアーキテクチャ図レイアウト。
// カテゴリごとの「段」にノードを縦に積み、エッジの矢印とラベル位置を計算する。
// HTML+SVG表示(stack-diagram.tsx)とまとめ画像PNG(stack-image.ts)の両方で使う。

import type { StackCategory, TechStackEdge, TechStackNode, TechStackProposal } from "./stack";

export const DIAGRAM_NODE_W = 200;
export const DIAGRAM_NODE_H = 60;
const X_GAP = 48;
/** 段の間隔。矢印ラベルを置くスペースを含む */
const Y_GAP = 72;
const PAD = 16;

const BAND_ORDER: StackCategory[] = ["frontend", "backend", "data", "infra", "other"];

export interface LaidOutNode {
  node: TechStackNode;
  x: number;
  y: number;
}

export interface LaidOutEdge {
  edge: TechStackEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 2段以上またぐエッジは直線ではなく、右外側を迂回するこのSVGパスで描く */
  path?: string;
  /** pathの終端の向き(ラジアン)。Canvas側の矢じり描画に使う */
  endAngle: number;
  labelX: number;
  labelY: number;
}

export interface StackDiagramLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
}

/** カテゴリ段×横並びのフローチャート配置を計算する(縦方向・スマホ幅でも読める)。 */
export function layoutStackDiagram(proposal: TechStackProposal): StackDiagramLayout {
  // 実際に存在するカテゴリだけで段を詰める(空の段を作らない)。
  const presentBands = BAND_ORDER.filter((c) => proposal.nodes.some((n) => n.category === c));
  const bandOf = new Map(presentBands.map((c, i) => [c, i]));

  const countInBand: number[] = presentBands.map(() => 0);
  const positioned = new Map<string, LaidOutNode>();
  const nodes: LaidOutNode[] = [];
  for (const node of proposal.nodes) {
    const band = bandOf.get(node.category) ?? 0;
    const col = countInBand[band]++;
    const laid = {
      node,
      x: PAD + col * (DIAGRAM_NODE_W + X_GAP),
      y: PAD + band * (DIAGRAM_NODE_H + Y_GAP),
    };
    positioned.set(node.id, laid);
    nodes.push(laid);
  }

  let width = PAD * 2 + Math.max(1, ...countInBand) * (DIAGRAM_NODE_W + X_GAP) - X_GAP;
  const height = PAD * 2 + presentBands.length * (DIAGRAM_NODE_H + Y_GAP) - Y_GAP;

  const bandHeight = DIAGRAM_NODE_H + Y_GAP;
  const edges: LaidOutEdge[] = [];
  let edgeIndex = 0;
  let detourCount = 0;
  for (const edge of proposal.edges) {
    const source = positioned.get(edge.source);
    const target = positioned.get(edge.target);
    if (!source || !target) continue;

    const bandDiff = Math.round(Math.abs(source.y - target.y) / bandHeight);
    let laid: LaidOutEdge;

    if (source.y === target.y) {
      // 同じ段: 横の矢印
      const leftToRight = source.x < target.x;
      const x1 = leftToRight ? source.x + DIAGRAM_NODE_W : source.x;
      const x2 = leftToRight ? target.x : target.x + DIAGRAM_NODE_W;
      const y1 = source.y + DIAGRAM_NODE_H / 2;
      laid = {
        edge,
        x1,
        y1,
        x2,
        y2: y1,
        endAngle: leftToRight ? 0 : Math.PI,
        labelX: (x1 + x2) / 2,
        labelY: y1 - 8,
      };
    } else if (bandDiff <= 1) {
      // 隣の段: 縦(斜め)の矢印。上の段の下辺 → 下の段の上辺
      const downward = source.y < target.y;
      let x1 = source.x + DIAGRAM_NODE_W / 2;
      let x2 = target.x + DIAGRAM_NODE_W / 2;
      const y1 = downward ? source.y + DIAGRAM_NODE_H : source.y;
      const y2 = downward ? target.y : target.y + DIAGRAM_NODE_H;
      // 同じ2ノード間の往復矢印が重ならないよう少しずらす
      if (Math.abs(x1 - x2) < 1) {
        const offset = downward ? -14 : 14;
        x1 += offset;
        x2 += offset;
      }
      laid = {
        edge,
        x1,
        y1,
        x2,
        y2,
        endAngle: Math.atan2(y2 - y1, x2 - x1),
        labelX: (x1 + x2) / 2,
        labelY: (y1 + y2) / 2 - 6 + (edgeIndex % 2 === 0 ? 0 : 16),
      };
    } else {
      // 2段以上またぐ: ボックスを貫通しないよう右外側を迂回する
      const sideX =
        Math.max(source.x, target.x) + DIAGRAM_NODE_W + 28 + detourCount * 22;
      detourCount++;
      const y1 = source.y + DIAGRAM_NODE_H / 2;
      const y2 = target.y + DIAGRAM_NODE_H / 2;
      const x1 = source.x + DIAGRAM_NODE_W;
      const x2 = target.x + DIAGRAM_NODE_W;
      laid = {
        edge,
        x1,
        y1,
        x2,
        y2,
        path: `M ${x1} ${y1} L ${sideX} ${y1} L ${sideX} ${y2} L ${x2} ${y2}`,
        endAngle: Math.PI,
        labelX: sideX + 6,
        labelY: (y1 + y2) / 2,
      };
      width = Math.max(width, sideX + 90);
    }

    edges.push(laid);
    edgeIndex++;
  }

  return { nodes, edges, width, height };
}
