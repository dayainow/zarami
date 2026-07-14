import { SkillNodeData, SkillStatus } from "@/types/skill-tree";
import { checklistKey } from "@/stores/useChecklistStore";

type BaseNode = { id: string; data: SkillNodeData };

export function computeNodeStatus(
  node: BaseNode,
  allNodes: BaseNode[],
  checkedKeys: Record<string, boolean>
): SkillStatus {
  if (node.data.is_completed) {
    return "completed";
  }

  const prereqIds = node.data.prerequisiteIds || [];
  const completedIds = new Set(allNodes.filter((n) => n.data.is_completed).map((n) => n.id));
  const prereqsMet = prereqIds.length === 0 || prereqIds.every((id) => completedIds.has(id));

  if (!prereqsMet) {
    return "locked";
  }

  if (node.data.checklist && node.data.checklist.length > 0) {
    const anyChecked = node.data.checklist.some((item) => checkedKeys[checklistKey(node.id, item)]);
    if (anyChecked) {
      return "in-progress";
    }
  }

  return "available";
}

export function isNodeNextAction(
  node: BaseNode,
  allNodes: BaseNode[]
): boolean {
  if (node.data.is_completed) return false;
  
  const prereqIds = node.data.prerequisiteIds || [];
  const completedIds = new Set(allNodes.filter((n) => n.data.is_completed).map((n) => n.id));
  const prereqsMet = prereqIds.length === 0 || prereqIds.every((id) => completedIds.has(id));
  
  return prereqIds.length > 0 && prereqsMet;
}
