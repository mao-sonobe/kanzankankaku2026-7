"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { STACK_CATEGORY_LABEL, type StackCategory } from "@/lib/domain/stack";
import { useProjectStore } from "@/lib/store/project-store";
import type { TechStackNode, TechStackEdge } from "@/lib/domain/stack";

const CATEGORY_ORDER: StackCategory[] = ["frontend", "backend", "data", "infra", "other"];

export function StackGraph({
  nodes: stackNodes,
  edges: stackEdges,
}: {
  nodes: TechStackNode[];
  edges: TechStackEdge[];
}) {
  const highlighted = useProjectStore((s) => s.highlighted);
  const hoverHighlight = useProjectStore((s) => s.hoverHighlight);
  const clearHoverHighlight = useProjectStore((s) => s.clearHoverHighlight);
  const toggleClickHighlight = useProjectStore((s) => s.toggleClickHighlight);

  function isActive(node: TechStackNode): boolean {
    if (!highlighted) return false;
    if (highlighted.type === "node") return highlighted.id === node.id;
    return node.relatedPhraseIds.includes(highlighted.id);
  }

  const { nodes, edges } = useMemo(() => {
    const columnCounts: Record<string, number> = {};
    const flowNodes: Node[] = stackNodes.map((node) => {
      const category = CATEGORY_ORDER.includes(node.category) ? node.category : "other";
      const colIndex = CATEGORY_ORDER.indexOf(category);
      const row = columnCounts[category] ?? 0;
      columnCounts[category] = row + 1;
      const colors = CATEGORY_COLORS[node.category];
      const active = isActive(node);

      return {
        id: node.id,
        position: { x: colIndex * 220, y: row * 110 },
        data: {
          label: (
            <div className="text-left">
              <div className="flex items-center gap-1.5 font-medium">
                <span className={`inline-block size-2 rounded-full ${colors.dot}`} />
                {node.label}
              </div>
              <div className="mt-0.5 text-[10px] opacity-70">
                {STACK_CATEGORY_LABEL[node.category]}
              </div>
            </div>
          ),
        },
        style: {
          borderRadius: 8,
          padding: 8,
          fontSize: 12,
          width: 180,
          border: active ? "2px solid" : "1px solid",
          borderColor: active ? "var(--foreground)" : undefined,
          boxShadow: active ? "0 0 0 2px var(--ring)" : undefined,
        },
        className: `${colors.bg} ${colors.text}`,
      };
    });

    const flowEdges: Edge[] = stackEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: false,
      style: { strokeWidth: 1.5 },
    }));

    return { nodes: flowNodes, edges: flowEdges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackNodes, stackEdges, highlighted]);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        onNodeMouseEnter={(_, node) => hoverHighlight({ type: "node", id: node.id })}
        onNodeMouseLeave={(_, node) => clearHoverHighlight({ type: "node", id: node.id })}
        onNodeClick={(_, node) => toggleClickHighlight({ type: "node", id: node.id })}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
