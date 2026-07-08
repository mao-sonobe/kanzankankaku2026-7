import type { TechStackNode, TechStackProposal } from "./stack";

/** エッジのsource→targetの向きに沿って、パイプライン表示用にノードを並び替える。 */
export function orderPipeline(proposal: TechStackProposal): TechStackNode[] {
  const { nodes, edges } = proposal;
  const incoming = new Map(nodes.map((n) => [n.id, 0]));
  const outgoing = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (!incoming.has(e.target) || !outgoing.has(e.source)) continue;
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
    outgoing.get(e.source)?.push(e.target);
  }
  const visited = new Set<string>();
  const ordered: TechStackNode[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = byId.get(id);
    if (node) ordered.push(node);
    for (const next of outgoing.get(id) ?? []) visit(next);
  }

  for (const n of nodes) {
    if ((incoming.get(n.id) ?? 0) === 0) visit(n.id);
  }
  for (const n of nodes) visit(n.id);
  return ordered;
}
