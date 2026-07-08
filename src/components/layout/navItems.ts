import { LayoutDashboard, Shield, TreePine, UserRound, type LucideIcon } from "lucide-react";

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
    label: "대시보드",
    icon: LayoutDashboard,
  },
  {
    href: "/profile",
    label: "내 프로필",
    icon: UserRound,
  },
  {
    href: "/manage-tree",
    label: "트리 관리",
    icon: TreePine,
  },
  {
    href: "/admin",
    label: "어드민",
    icon: Shield,
  },
];
