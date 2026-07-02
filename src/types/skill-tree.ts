import type { Edge, Node } from "reactflow";

export type SkillStatus = "locked" | "available" | "completed";

export type SkillNodeData = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  level?: number;
  status?: SkillStatus;
};

export type SkillTreeNode = Node<SkillNodeData>;
export type SkillTreeEdge = Edge;
