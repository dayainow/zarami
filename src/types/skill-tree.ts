import type { Edge, Node } from "@xyflow/react";

export type SkillStatus = "locked" | "available" | "completed";

export type SkillNodeData = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  level?: number;
  prerequisiteIds?: string[];
  questMarkdown?: string;
  checklist?: string[];
  estimatedMinutes?: number;
  is_completed?: boolean;
  isNextAction?: boolean;
  isCelebrating?: boolean;
  status?: SkillStatus;
};

export type SkillTreeNode = Node<SkillNodeData>;
export type SkillTreeEdge = Edge;
