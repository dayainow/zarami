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
    subLabel: "메인 대시보드",
    icon: LayoutDashboard,
  },
  {
    href: "/manage-tree",
    label: "내 트리 관리",
    subLabel: "퀘스트/목표 편집",
    icon: TreePine,
  },
  {
    href: "/profile",
    label: "성장 기록",
    subLabel: "내 포트폴리오",
    icon: UserRound,
  },
  {
    href: "/world-map",
    label: "스킬 모험 지도",
    subLabel: "전체 로드맵 뷰",
    icon: Map,
  },
  {
    href: "/trends",
    label: "채용 트렌드",
    subLabel: "실시간 시장 분석",
    icon: TrendingUp,
  },
];
