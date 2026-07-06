const CATEGORY_ORDER = ["frontend", "backend", "data", "infra", "other"];
const CATEGORY_LABEL = {
  frontend: "フロントエンド",
  backend: "バックエンド",
  infra: "インフラ",
  data: "データ",
  other: "その他",
};
const CATEGORY_CLASS = {
  frontend: "c-blue",
  backend: "c-teal",
  infra: "c-amber",
  data: "c-purple",
  other: "c-gray",
};

const NODE_W = 200;
const NODE_H = 56;
const COL_GAP = 70;
const ROW_GAP = 24;
const PAD = 40;

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 技術スタックのノード(id/label/category)とエッジ(source/target/dataFlow)から
 * flowchart形式のSVGを組み立てる。dataFlowは「どんなデータが2つの技術間で
 * 受け渡されるか」を5語程度で示す短いラベルで、矢印の近くに表示する。
 */
export function buildStackGraphSvg({ nodes, edges }) {
  const columnRowCount = {};
  const positioned = new Map();

  for (const node of nodes) {
    const col = CATEGORY_ORDER.includes(node.category)
      ? CATEGORY_ORDER.indexOf(node.category)
      : CATEGORY_ORDER.length - 1;
    const row = columnRowCount[col] ?? 0;
    columnRowCount[col] = row + 1;
    const x = PAD + col * (NODE_W + COL_GAP);
    const y = PAD + row * (NODE_H + ROW_GAP);
    positioned.set(node.id, { ...node, col, row, x, y });
  }

  const cols = [...positioned.values()].map((n) => n.col);
  const maxCol = cols.length ? Math.max(...cols) : 0;
  const rowCounts = Object.values(columnRowCount);
  const maxRowCount = rowCounts.length ? Math.max(...rowCounts) : 1;
  const width = PAD * 2 + (maxCol + 1) * (NODE_W + COL_GAP) - COL_GAP;
  const height = PAD * 2 + maxRowCount * (NODE_H + ROW_GAP) - ROW_GAP;

  const nodeSvg = [...positioned.values()]
    .map((n) => {
      const cls = CATEGORY_CLASS[n.category] ?? "c-gray";
      const catLabel = CATEGORY_LABEL[n.category] ?? n.category;
      return `<g class="node ${cls}">
  <rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="8" stroke-width="0.5"/>
  <text class="th" x="${n.x + NODE_W / 2}" y="${n.y + NODE_H / 2 - 9}" text-anchor="middle" dominant-baseline="central">${escapeXml(n.label)}</text>
  <text class="ts" x="${n.x + NODE_W / 2}" y="${n.y + NODE_H / 2 + 11}" text-anchor="middle" dominant-baseline="central">${escapeXml(catLabel)}</text>
</g>`;
    })
    .join("\n");

  const edgeSvg = (edges ?? [])
    .map((e) => {
      const source = positioned.get(e.source);
      const target = positioned.get(e.target);
      if (!source || !target) return "";
      let x1, y1, x2, y2;
      if (source.col === target.col) {
        const [top, bottom] = source.y < target.y ? [source, target] : [target, source];
        x1 = top.x + NODE_W / 2;
        y1 = top.y + NODE_H;
        x2 = bottom.x + NODE_W / 2;
        y2 = bottom.y;
      } else {
        const [left, right] = source.col < target.col ? [source, target] : [target, source];
        x1 = left.x + NODE_W;
        y1 = left.y + NODE_H / 2;
        x2 = right.x;
        y2 = right.y + NODE_H / 2;
      }
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const label = e.dataFlow
        ? `<text class="ts" x="${midX}" y="${midY - 8}" text-anchor="middle">${escapeXml(e.dataFlow)}</text>`
        : "";
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="arr" marker-end="url(#arrow)"/>\n${label}`;
    })
    .join("\n");

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">
<title>技術スタックの関係図</title>
<desc>選定した技術スタックのノードと、それぞれの間で受け渡されるデータを示す図</desc>
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
${edgeSvg}
${nodeSvg}
</svg>`;
}
