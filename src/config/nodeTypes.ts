export const NODE_CATEGORIES = [
  { value: "CORE", label: "CORE (기초 개념)" },
  { value: "ACTION", label: "ACTION (실습/프로젝트)" },
  { value: "GOAL", label: "GOAL (최종 목표)" },
  { value: "CUSTOM", label: "CUSTOM (사용자 정의)" },
  { value: "TRENDING", label: "TRENDING (채용 트렌드)" },
] as const;

export type NodeCategory = typeof NODE_CATEGORIES[number]["value"];
