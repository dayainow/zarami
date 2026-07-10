"use client";

import { useMemo } from "react";

type CategoryStats = Record<string, { total: number; completed: number }>;

interface WorldMapOverlayProps {
  categoryStats: CategoryStats;
  activeTree?: any;
}

// We use a viewBox of 1000 1000 but make the paths jagged for a retro RPG feel
const REGIONS = [
  {
    category: "Frontend",
    name: "Grass Castle (초원)",
    color: "#38bdf8", // Sky blue
    icon: "/images/characters/hero_back.png", // Single Hero Character (Back View)
    path: "M 250,850 L 250,500 L 350,500 L 350,300 L 250,300 L 250,150",
  },
  {
    category: "Backend",
    name: "Mountain Keep (바위 산맥)",
    color: "#f97316", // Orange
    icon: "/images/characters/hero_back.png",
    path: "M 500,850 L 500,550 L 550,550 L 550,400 L 500,400 L 500,150",
  },
  {
    category: "AI",
    name: "Forest Castle (유령 숲)",
    color: "#a855f7", // Purple
    icon: "/images/characters/hero_back.png",
    path: "M 750,850 L 750,650 L 650,650 L 650,450 L 800,450 L 800,200",
  }
];

export function WorldMapOverlay({ categoryStats, activeTree }: WorldMapOverlayProps) {
  const activeRegions = useMemo(() => {
    // If activeTree is provided, we show only one path for this tree
    if (activeTree) {
      const displayTotal = activeTree.nodes.filter((n: any) => !n.id.includes('-')).length;
      const displayCompleted = activeTree.nodes.filter((n: any) => !n.id.includes('-') && n.data.is_completed).length;
      let progress = displayTotal > 0 ? displayCompleted / displayTotal : 0.05;
      progress = Math.max(0.05, Math.min(progress, 1.0));
      
      return [{
        ...REGIONS[0], // just use the first path template for individual trees
        category: "Custom",
        progress,
        label: activeTree.title,
        color: "#10b981", // Emerald green for active tree
      }];
    }

    // "All" overview mode: Fallback to existing logic using categoryStats
    let keys = Object.keys(categoryStats);
    if (keys.length === 0) {
      keys = ["Frontend", "Backend", "AI"];
    }

    return REGIONS.map((region, idx) => {
      const matchedKey = keys.find(k => k.toLowerCase().includes(region.category.toLowerCase())) || keys[idx % keys.length];
      const stat = categoryStats[matchedKey] || { total: 0, completed: 0 };
      
      let progress = stat.total > 0 ? stat.completed / stat.total : 0.05;
      progress = Math.max(0.05, Math.min(progress, 1.0));
      
      return { ...region, progress, stat, label: matchedKey };
    });
  }, [categoryStats, activeTree]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full drop-shadow-2xl"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <style>
            {`
              @keyframes bob {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-12px); }
              }
              .rpg-character {
                animation: bob 1s infinite step-start;
              }
              .rpg-dialogue {
                font-family: "Courier New", Courier, monospace;
                paint-order: stroke;
              }
            `}
          </style>
        </defs>

        {activeRegions.map((region) => (
          <g key={region.category}>
            {/* The dotted path (Background/Uncompleted) */}
            <path
              d={region.path}
              fill="none"
              stroke="rgba(0,0,0,0.6)"
              strokeWidth="12"
              strokeDasharray="15 15"
              strokeLinecap="square"
            />
            {/* The glowing path (Completed progress) */}
            <path
              d={region.path}
              fill="none"
              stroke={region.color}
              strokeWidth="12"
              strokeLinecap="square"
              filter="url(#glow)"
              opacity="0.9"
              pathLength="100"
              strokeDashoffset={100 - (region.progress * 100)}
              style={{ strokeDasharray: "100 100", transition: "stroke-dashoffset 1s ease-in-out" }}
            />
            
            {/* Animated Character Avatar along the path using animateMotion */}
            <g>
              <g className="rpg-character">
                {/* Shadow */}
                <ellipse cx="0" cy="25" rx="20" ry="7" fill="rgba(0,0,0,0.6)" />
                {/* Character Image without wrapper */}
                <image href={region.icon} x="-40" y="-50" width="80" height="80" preserveAspectRatio="xMidYMid slice" style={{ imageRendering: 'pixelated' }} />
                {/* Tooltip-like label above the avatar */}
                <rect x="-60" y="-85" width="120" height="30" rx="4" fill="rgba(0,0,0,0.8)" stroke={region.color} strokeWidth="3" />
                <text x="0" y="-63" fontSize="16" textAnchor="middle" fill="white" fontWeight="bold" className="rpg-dialogue">
                  {region.label} ({Math.round(region.progress * 100)}%)
                </text>
              </g>
              
              {/* Note: SVG animateMotion works great for this */}
              <animateMotion
                dur="1.5s"
                repeatCount="1"
                fill="freeze"
                path={region.path}
                keyPoints={`0;${region.progress}`}
                keyTimes="0;1"
                calcMode="linear"
              />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
