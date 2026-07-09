import { LayoutDashboard, TreePine, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Shared between the desktop Sidebar and the mobile MobileTabBar so the two
// navigation surfaces can never drift out of sync with each other.
export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "나의 테크트리",
    icon: LayoutDashboard,
  },
  {
    href: "/manage-tree",
    label: "로드맵 설계",
    icon: TreePine,
  },
  {
    href: "/profile",
    label: "성장 기록",
    icon: UserRound,
  },
];
