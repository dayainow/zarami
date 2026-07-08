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
  isTrending?: boolean;
  status?: SkillStatus;
  /** Branch collapse/expand (computed by TechTreeCanvas, not caller-supplied). */
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (nodeId: string) => void;
};

export type SkillTreeNode = Node<SkillNodeData>;
export type SkillTreeEdge = Edge;
