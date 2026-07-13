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
    icon: "/images/characters/hero_back.png",
    path: "M 520,850 L 520,540 L 280,540 L 280,460",
    waypoints: [
      { x: 520, y: 850, label: "입문" },      // 시작의 다리
      { x: 520, y: 540, label: "기초" },      // 중앙 교차로
      { x: 280, y: 540, label: "심화" },      // 성문 앞 다리
      { x: 280, y: 460, label: "최종 목표" }  // 캐슬 입구
    ]
  },
  {
    category: "Backend",
    name: "Mountain Keep (바위 산맥)",
    color: "#f97316", // Orange
    icon: "/images/characters/hero_back.png",
    path: "M 760,850 L 760,540 L 520,540 L 520,200",
    waypoints: [
      { x: 760, y: 850, label: "입문" },      // 남동쪽 버섯집
      { x: 760, y: 540, label: "기초" },      // 동쪽 교차로
      { x: 520, y: 540, label: "심화" },      // 중앙 교차로
      { x: 520, y: 200, label: "최종 목표" }  // 북쪽 산맥
    ]
  },
  {
    category: "AI",
    name: "Forest Castle (유령 숲)",
    color: "#a855f7", // Purple
    icon: "/images/characters/hero_back.png",
    path: "M 520,850 L 520,540 L 760,540 L 760,240 L 880,240",
    waypoints: [
      { x: 520, y: 850, label: "입문" },      // 시작의 다리
      { x: 520, y: 540, label: "기초" },      // 중앙 교차로
      { x: 760, y: 540, label: "심화" },      // 동쪽 교차로
      { x: 880, y: 240, label: "최종 목표" }  // 북동쪽 버섯집
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
            
            {/* Retro Waypoints Render (Blocky 8-bit style) */}
            {region.waypoints?.map((wp, i) => (
              <g key={`wp-${i}`} className="transition-all duration-300 hover:scale-110">
                
                {/* Pointer Triangle pointing at the object */}
                <path
                  d={`M ${wp.x - 8} ${wp.y - 10} L ${wp.x + 8} ${wp.y - 10} L ${wp.x} ${wp.y - 2} Z`}
                  fill={region.color}
                  stroke="#000000"
                  strokeWidth="3"
                />
                
                {/* Blocky Label Badge (Centered above the object) */}
                <rect
                  x={wp.x - 50}
                  y={wp.y - 42}
                  width="100"
                  height="32"
                  fill="#FFE128"
                  stroke="#000000"
                  strokeWidth="3"
                />
                <text
                  x={wp.x}
                  y={wp.y - 21}
                  fill="#000000"
                  fontSize="16"
                  fontWeight="900"
                  fontFamily='"Courier New", Courier, monospace'
                  textAnchor="middle"
                  className="pointer-events-none select-none drop-shadow-sm"
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
                
                {/* Simple position marker (bouncing arrow) above character */}
                <path d="M -10 -115 L 10 -115 L 0 -95 Z" fill="#FFE128" stroke="black" strokeWidth="3" className="bounce-arrow" />
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
