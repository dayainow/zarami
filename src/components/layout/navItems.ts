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
    label: "나의 자람 트리",
    subLabel: "현재 키우고 있는 로드맵",
    icon: LayoutDashboard,
  },
  {
    href: "/manage-tree",
    label: "새로운 가지 뻗기",
    subLabel: "나만의 퀘스트 추가/편집",
    icon: TreePine,
  },
  {
    href: "/profile",
    label: "성장의 나이테",
    subLabel: "완료한 퀘스트 기록",
    icon: UserRound,
  },
  {
    href: "/world-map",
    label: "지식의 숲 탐험",
    subLabel: "전체 기술 모험 지도",
    icon: Map,
  },
  {
    href: "/trends",
    label: "트렌드 나침반",
    subLabel: "채용 시장 분석",
    icon: TrendingUp,
  },
];
