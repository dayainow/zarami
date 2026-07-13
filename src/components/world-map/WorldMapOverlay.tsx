"use client";

import { useMemo } from "react";

type CategoryStats = Record<string, { total: number; completed: number }>;

import type { SkillTreeNode } from "@/types/skill-tree";

interface WorldMapOverlayProps {
  categoryStats: CategoryStats;
  activeTree?: { title: string; nodes: SkillTreeNode[] };
  theme?: { pathColor: string; icon: string; [key: string]: unknown };
}

// We use a viewBox of 1000 1000 but make the paths jagged for a retro RPG feel
const REGIONS = [
  {
    category: "Frontend",
    name: "Grass Castle (초원)",
    color: "#38bdf8", // Sky blue
    icon: "/images/characters/hero_back.png", // Single Hero Character (Back View)
    path: "M 250,850 L 250,500 L 350,500 L 350,300 L 250,300 L 250,150",
    waypoints: [
      { x: 250, y: 850, label: "입문" },
      { x: 350, y: 500, label: "기초" },
      { x: 350, y: 300, label: "심화" },
      { x: 250, y: 150, label: "최종 목표" }
    ]
  },
  {
    category: "Backend",
    name: "Mountain Keep (바위 산맥)",
    color: "#f97316", // Orange
    icon: "/images/characters/hero_back.png",
    path: "M 500,850 L 500,550 L 550,550 L 550,400 L 500,400 L 500,150",
    waypoints: [
      { x: 500, y: 850, label: "입문" },
      { x: 550, y: 550, label: "기초" },
      { x: 550, y: 400, label: "심화" },
      { x: 500, y: 150, label: "최종 목표" }
    ]
  },
  {
    category: "AI",
    name: "Forest Castle (유령 숲)",
    color: "#a855f7", // Purple
    icon: "/images/characters/hero_back.png",
    path: "M 750,850 L 750,650 L 650,650 L 650,450 L 800,450 L 800,200",
    waypoints: [
      { x: 750, y: 850, label: "입문" },
      { x: 650, y: 650, label: "기초" },
      { x: 650, y: 450, label: "심화" },
      { x: 800, y: 200, label: "최종 목표" }
    ]
  }
];

export function WorldMapOverlay({ categoryStats, activeTree, theme }: WorldMapOverlayProps) {
  const activeRegions = useMemo(() => {
    // If activeTree is provided, we show only one path for this tree
    if (activeTree) {
      const displayTotal = activeTree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-')).length;
      const displayCompleted = activeTree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-') && n.data.is_completed).length;
      let progress = displayTotal > 0 ? displayCompleted / displayTotal : 0.05;
      progress = Math.max(0.05, Math.min(progress, 1.0));
      
      // Truncate long labels
      const shortLabel = activeTree.title.length > 15 ? activeTree.title.slice(0, 15) + "..." : activeTree.title;

      return [{
        ...REGIONS[0], // just use the first path template for individual trees
        category: "Custom",
        progress,
        label: shortLabel,
        color: theme ? theme.pathColor : "#10b981",
        icon: theme ? theme.icon : "/images/characters/hero_back.png",
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
  }, [categoryStats, activeTree, theme]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full drop-shadow-2xl"
      >
        <defs>
          <style>
            {`
              @keyframes bob {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
              }
              .rpg-character {
                animation: bob 2.5s ease-in-out infinite;
              }
            `}
          </style>
          {activeRegions.map((region) => (
            <mask id={`progressMask-${region.category}`} key={`mask-${region.category}`}>
              <path
                d={region.path}
                fill="none"
                stroke="white"
                strokeWidth="40"
                pathLength="100"
                strokeDasharray="100 100"
                strokeDashoffset={100 - (region.progress * 100)}
                style={{ transition: "stroke-dashoffset 1.5s linear" }}
              />
            </mask>
          ))}
        </defs>

        {activeRegions.map((region) => (
          <g key={region.category}>
            {/* The retro background path (Uncompleted) */}
            <path
              d={region.path}
              fill="none"
              stroke="#000000"
              strokeWidth="12"
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeDasharray="16 16"
              opacity="0.3"
            />
            <path
              d={region.path}
              fill="none"
              stroke="#451a03"
              strokeWidth="6"
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeDasharray="16 16"
              opacity="0.5"
            />

            {/* The retro progress path (Completed) */}
            <g mask={`url(#progressMask-${region.category})`}>
              <path
                d={region.path}
                fill="none"
                stroke="#000000"
                strokeWidth="12"
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeDasharray="16 16"
              />
              <path
                d={region.path}
                fill="none"
                stroke={region.color}
                strokeWidth="6"
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeDasharray="16 16"
              />
            </g>

            {/* Waypoints Render */}
            {region.waypoints?.map((wp, i) => (
              <g key={`wp-${i}`} className="transition-transform duration-300 hover:scale-110">
                {/* Pixel Art Style Waypoint Marker */}
                <rect x={wp.x - 10} y={wp.y - 10} width="20" height="20" fill="#000000" />
                <rect x={wp.x - 6} y={wp.y - 6} width="12" height="12" fill={region.color} />
                <rect x={wp.x - 2} y={wp.y - 2} width="4" height="4" fill="#ffffff" />

                {/* Pixel Banner Background */}
                <rect x={wp.x + 16} y={wp.y - 16} width="95" height="32" fill="#000000" />
                <rect x={wp.x + 19} y={wp.y - 13} width="89" height="26" fill="#ffffff" />
                {/* Banner inner border */}
                <rect x={wp.x + 21} y={wp.y - 11} width="85" height="22" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                <text
                  x={wp.x + 63.5}
                  y={wp.y + 5}
                  fill="#000000"
                  fontSize="14"
                  fontFamily="monospace"
                  fontWeight="900"
                  textAnchor="middle"
                  className="pointer-events-none select-none tracking-widest"
                >
                  {wp.label}
                </text>
              </g>
            ))}
            
            {/* Animated Character Avatar along the path */}
            <g>
              <g className="rpg-character">
                {/* Retro shadow */}
                <ellipse cx="0" cy="0" rx="16" ry="6" fill="#000000" opacity="0.4" />
                
                {/* Character Image */}
                <image href={region.icon || "/images/characters/hero_back.png"} x="-45" y="-85" width="90" height="90" preserveAspectRatio="xMidYMid meet" style={{ imageRendering: 'pixelated' }} />
              </g>
              
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
