export const THEMES = {
  forest: {
    id: 'forest',
    name: '기본 숲',
    filter: 'none',
    mapImage: '/images/world_map.png',
    icon: '/images/characters/hero_back.png',
    pathColor: '#10b981', // Emerald
    bgColor: '#73C856', // Map wrapper bg
    cardColor: '#6be05c', // Gallery card primary
  },
  desert: {
    id: 'desert',
    name: '사막',
    filter: 'none',
    mapImage: '/images/world_map_desert.png',
    icon: '/images/characters/hero_desert.png',
    pathColor: '#f59e0b',
    bgColor: '#e6c875',
    cardColor: '#fcd34d',
  },
  winter: {
    id: 'winter',
    name: '설원',
    filter: 'none',
    mapImage: '/images/world_map_winter.png',
    icon: '/images/characters/hero_snow.png',
    pathColor: '#38bdf8',
    bgColor: '#a6d6d6',
    cardColor: '#bae6fd',
  },
  volcano: {
    id: 'volcano',
    name: '화산',
    filter: 'none',
    mapImage: '/images/world_map_volcano.png',
    icon: '/images/characters/hero_volcano.png',
    pathColor: '#ef4444',
    bgColor: '#a84545',
    cardColor: '#fca5a5',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: '사이버펑크',
    filter: 'invert(1) hue-rotate(180deg) saturate(1.5)',
    mapImage: '/images/world_map_volcano.png', // Cyberpunk uses inverted volcano map
    icon: '/images/characters/hero_cyber.png',
    pathColor: '#a855f7',
    bgColor: '#231c3b',
    cardColor: '#d8b4fe',
  },
  sky: {
    id: 'sky',
    name: '천공의 섬',
    filter: 'none',
    mapImage: '/images/world-map/sky.png',
    icon: '/images/characters/hero_back.png',
    pathColor: '#eab308', // Yellow path
    bgColor: '#60a5fa', // Sky blue
    cardColor: '#fde047',
  },
  ocean: {
    id: 'ocean',
    name: '심해 도시',
    filter: 'none',
    mapImage: '/images/world-map/ocean.png',
    icon: '/images/characters/hero_back.png',
    pathColor: '#c084fc', // Purple coral path
    bgColor: '#0891b2', // Deep cyan
    cardColor: '#67e8f9',
  },
  ruins: {
    id: 'ruins',
    name: '고대 유적',
    filter: 'none',
    mapImage: '/images/world-map/ruins.png',
    icon: '/images/characters/hero_back.png',
    pathColor: '#84cc16', // Moss green path
    bgColor: '#166534', // Dark green jungle
    cardColor: '#bbf7d0',
  }
};

export type ThemeId = keyof typeof THEMES;

export function getThemeForTree(treeId?: string | null) {
  if (!treeId) return THEMES.forest;
  let hash = 0;
  for (let i = 0; i < treeId.length; i++) {
    hash = treeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const themeKeys = Object.keys(THEMES) as Array<keyof typeof THEMES>;
  const index = Math.abs(hash) % themeKeys.length;
  return THEMES[themeKeys[index]];
}
