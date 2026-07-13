import type { Edge, Node } from "@xyflow/react";

export type SkillStatus = "locked" | "available" | "completed";

export type SamplePosting = {
  site: "wanted" | "jumpit";
  title: string;
  companyName: string;
  url: string;
};

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
  completedAt?: string;
  certified_by_github?: boolean;
  isNextAction?: boolean;
  isCelebrating?: boolean;
  isTrending?: boolean;
  status?: SkillStatus;
  /** Job-market evidence behind isTrending, from scripts/update-trend.ts. */
  trendScore?: "High" | "Medium" | "Low";
  wantedMentions?: number;
  jumpitMentions?: number;
  totalPostingsAnalyzed?: number;
  trendUpdatedAt?: string;
  samplePostings?: SamplePosting[];
  /** Branch collapse/expand (computed by TechTreeCanvas, not caller-supplied). */
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (nodeId: string) => void;
};

export type SkillTreeNode = Node<SkillNodeData>;
export type SkillTreeEdge = Edge;
