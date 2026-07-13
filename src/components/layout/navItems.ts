import { LayoutDashboard, Map, TreePine, UserRound, TrendingUp, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  subLabel?: string;
  icon: LucideIcon;
};

// Shared between the desktop Sidebar and the mobile MobileTabBar so the two
// navigation surfaces can never drift out of sync with each other.
export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "나의 테크트리",
    subLabel: "현재 진행 중인 로드맵",
    icon: LayoutDashboard,
  },
  {
    href: "/manage-tree",
    label: "퀘스트 편집",
    subLabel: "노드 추가/수정",
    icon: TreePine,
  },
  {
    href: "/profile",
    label: "퀘스트 완료 기록",
    subLabel: "GitHub 포트폴리오 (연동)",
    icon: UserRound,
  },
  {
    href: "/world-map",
    label: "전체 기술 로드맵",
    subLabel: "스킬 모험 지도",
    icon: Map,
  },
  {
    href: "/trends",
    label: "실시간 채용 트렌드",
    subLabel: "시장 분석",
    icon: TrendingUp,
  },
];
