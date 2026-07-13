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
                50% { transform: translateY(-8px); }
              }
              .rpg-character {
                animation: bob 2.5s ease-in-out infinite;
              }
            `}
          </style>
        </defs>

        {activeRegions.map((region) => (
          <g key={region.category}>
            {/* The modern background path (Uncompleted) */}
            <path
              d={region.path}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
            {/* The modern fiber-optic path (Completed progress) */}
            <path
              d={region.path}
              fill="none"
              stroke={region.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              opacity="1"
              pathLength="100"
              strokeDashoffset={100 - (region.progress * 100)}
              style={{ strokeDasharray: "100 100", transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
            {/* Inner core line for intense neon look */}
            <path
              d={region.path}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
              pathLength="100"
              strokeDashoffset={100 - (region.progress * 100)}
              style={{ strokeDasharray: "100 100", transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />

            {/* Waypoints Render */}
            {region.waypoints?.map((wp, i) => (
              <g key={`wp-${i}`} className="transition-all duration-300 hover:scale-110">
                <circle
                  cx={wp.x}
                  cy={wp.y}
                  r="12"
                  fill="#0f172a"
                  stroke={region.color}
                  strokeWidth="3"
                  filter="url(#glow)"
                />
                <circle
                  cx={wp.x}
                  cy={wp.y}
                  r="4"
                  fill="#ffffff"
                />
                <rect
                  x={wp.x + 20}
                  y={wp.y - 12}
                  width="70"
                  height="24"
                  rx="12"
                  fill="rgba(15, 23, 42, 0.8)"
                  stroke={region.color}
                  strokeWidth="1"
                  className="backdrop-blur-sm"
                />
                <text
                  x={wp.x + 55}
                  y={wp.y + 4}
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none drop-shadow-md select-none"
                >
                  {wp.label}
                </text>
              </g>
            ))}
            
            {/* Animated Character Avatar along the path using animateMotion */}
            <g>
              <g className="rpg-character">
                {/* Character Image positioned so its feet are on the path */}
                <image href={region.icon || "/images/characters/hero_back.png"} x="-45" y="-90" width="90" height="90" preserveAspectRatio="xMidYMid meet" style={{ imageRendering: 'pixelated' }} />
                
                {/* Modern glow indicator beneath character */}
                <ellipse cx="0" cy="-5" rx="20" ry="8" fill={region.color} opacity="0.4" filter="url(#glow)" />
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
