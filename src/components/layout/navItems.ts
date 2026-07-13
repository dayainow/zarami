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
    label: "나의 로드맵",
    subLabel: "현재 진행 중인 로드맵",
    icon: LayoutDashboard,
  },
  {
    href: "/manage-tree",
    label: "로드맵 편집",
    subLabel: "나만의 퀘스트 추가/편집",
    icon: TreePine,
  },
  {
    href: "/profile",
    label: "대시보드",
    subLabel: "완료한 퀘스트 기록",
    icon: UserRound,
  },
  {
    href: "/world-map",
    label: "스킬 모험 지도",
    subLabel: "숨겨진 퀘스트를 찾아서",
    icon: Map,
  },
  {
    href: "/trends",
    label: "실시간 채용 트렌드",
    subLabel: "채용 시장 분석",
    icon: TrendingUp,
  },
];
