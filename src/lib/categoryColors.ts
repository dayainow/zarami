export type CategoryColor = {
  /** Sets border-left-color only, so it layers over the status border (which
   * colors all four sides) without fighting it on the same CSS property. */
  border: string;
  badge: string;
};

// Deterministic category -> color mapping so the same category always
// renders with the same accent, without needing a hardcoded category list
// (user/AI-generated categories are free-form text).
const CATEGORY_PALETTE: CategoryColor[] = [
  { border: "border-l-sky-500", badge: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  {
    border: "border-l-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  {
    border: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  {
    border: "border-l-violet-500",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  },
  { border: "border-l-rose-500", badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" },
  { border: "border-l-teal-500", badge: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300" },
  {
    border: "border-l-fuchsia-500",
    badge: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  },
  {
    border: "border-l-orange-500",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  },
];

const FALLBACK_COLOR: CategoryColor = {
  border: "border-l-slate-300 dark:border-l-slate-600",
  badge: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
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
  return CATEGORY_PALETTE[hashString(category) % CATEGORY_PALETTE.length];
}
