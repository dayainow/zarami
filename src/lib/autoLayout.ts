import dagre from "@dagrejs/dagre";

import type { SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

// Matches the rendered SkillNode footprint in TechTreeCanvas (w-72 = 18rem)
// closely enough for dagre's spacing math - it only needs approximate boxes,
// not pixel-perfect measurements.
const NODE_WIDTH = 288;
const NODE_HEIGHT = 130;

export type LayoutDirection = "LR" | "TB" | "BT";

export function getLayoutedElements(
  nodes: SkillTreeNode[],
  edges: SkillTreeEdge[],
  // Bottom-to-top: prerequisites take root at the bottom and the tree grows
  // upward, matching the "성장 캔버스" (growth canvas) metaphor and reading
  // as a natural vertical scroll on mobile.
  direction: LayoutDirection = "BT",
): { nodes: SkillTreeNode[]; edges: SkillTreeEdge[] } {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    // dagre only lays out nodes it knows about - an edge referencing a
    // missing node would throw, so skip anything dangling.
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const position = graph.node(node.id);
    if (!position) {
      return node;
    }

    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
