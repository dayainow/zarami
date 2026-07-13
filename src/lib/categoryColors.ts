export type CategoryColor = {
  /** Sets border-left-color only, so it layers over the status border (which
   * colors all four sides) without fighting it on the same CSS property. */
  border: string;
  badge: string;
  icon: string;
  label: string;
};

// 특정 타입(카테고리)에 대한 하드코딩 매핑
const SPECIFIC_CATEGORIES: Record<string, CategoryColor> = {
  CORE: {
    border: "border-l-[#6366f1]",
    badge: "bg-[#e0e7ff] text-[#4f46e5] dark:bg-[#4338ca]/30 dark:text-[#c7d2fe]",
    icon: "📚",
    label: "CORE",
  },
  ACTION: {
    border: "border-l-[#3b82f6]",
    badge: "bg-[#dbeafe] text-[#2563eb] dark:bg-[#1d4ed8]/30 dark:text-[#bfdbfe]",
    icon: "🛠️",
    label: "ACTION",
  },
  GOAL: {
    border: "border-l-[#f59e0b]",
    badge: "bg-[#fef3c7] text-[#d97706] dark:bg-[#b45309]/30 dark:text-[#fde68a]",
    icon: "🏆",
    label: "GOAL",
  },
  CUSTOM: {
    border: "border-l-[#8b5cf6]",
    badge: "bg-[#ede9fe] text-[#7c3aed] dark:bg-[#6d28d9]/30 dark:text-[#ddd6fe]",
    icon: "✏️",
    label: "CUSTOM",
  },
  TRENDING: {
    border: "border-l-[#ef4444]",
    badge: "bg-[#fee2e2] text-[#dc2626] dark:bg-[#b91c1c]/30 dark:text-[#fecaca]",
    icon: "🔥",
    label: "TRENDING",
  },
};

// 그 외 카테고리에 대한 랜덤 컬러 매핑 (Fallback)
const CATEGORY_PALETTE: CategoryColor[] = [
  { border: "border-l-sky-500", badge: "bg-sky-100 text-sky-700", icon: "✨", label: "" },
  { border: "border-l-emerald-500", badge: "bg-emerald-100 text-emerald-700", icon: "✨", label: "" },
  { border: "border-l-teal-500", badge: "bg-teal-100 text-teal-700", icon: "✨", label: "" },
  { border: "border-l-fuchsia-500", badge: "bg-fuchsia-100 text-fuchsia-700", icon: "✨", label: "" },
];

const FALLBACK_COLOR: CategoryColor = {
  border: "border-l-slate-300 dark:border-l-slate-600",
  badge: "bg-slate-100 text-slate-600 dark:bg-slate-500/35 dark:text-slate-100",
  icon: "✨",
  label: "기타",
};

function hashString(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCategoryColor(category: string | undefined): CategoryColor {
  if (!category) {
    return FALLBACK_COLOR;
  }
  
  const upperCategory = category.toUpperCase();
  if (SPECIFIC_CATEGORIES[upperCategory]) {
    return SPECIFIC_CATEGORIES[upperCategory];
  }
  
  // trending 관련 처리 (isTrending이 아니더라도 카테고리 텍스트에 포함된 경우)
  if (upperCategory.includes("TRENDING") || upperCategory.includes("트렌딩")) {
    return SPECIFIC_CATEGORIES["TRENDING"];
  }

  const paletteIndex = hashString(category) % CATEGORY_PALETTE.length;
  const picked = CATEGORY_PALETTE[paletteIndex];
  return {
    ...picked,
    label: upperCategory,
  };
}
