"use client";

import { useMemo } from "react";

type CategoryStats = Record<string, { total: number; completed: number }>;

import type { SkillTreeNode } from "@/types/skill-tree";

interface WorldMapOverlayProps {
  userTrees?: { id: string; title: string; nodes: SkillTreeNode[] }[];
  onTreeClick?: (treeId: string) => void;
  activeTree?: { title: string; nodes: SkillTreeNode[] };
  theme?: { pathColor: string; icon: string; [key: string]: unknown };
  categoryStats?: CategoryStats;
}

// We use a viewBox of 1000 1000 but make the paths jagged for a retro RPG feel
const REGIONS = [
  {
    category: "Frontend",
    name: "Grass Castle (초원)",
    color: "#38bdf8", // Sky blue
    icon: "/images/characters/hero_back.png",
    path: "M 540,850 L 540,540 L 380,540 L 240,540 L 240,490",
    waypoints: [
      { x: 540, y: 850, label: "입문" },      // 시작의 다리
      { x: 540, y: 540, label: "기초" },      // 중앙 교차로
      { x: 380, y: 540, label: "심화" },      // 성문 앞 다리
      { x: 240, y: 490, label: "최종 목표" }  // 캐슬 입구
    ]
  },
  {
    category: "Backend",
    name: "Mountain Keep (바위 산맥)",
    color: "#f97316", // Orange
    icon: "/images/characters/hero_back.png",
    path: "M 810,850 L 810,540 L 540,540 L 540,200",
    waypoints: [
      { x: 810, y: 850, label: "입문" },      // 남동쪽 교차로
      { x: 810, y: 540, label: "기초" },      // 동쪽 교차로
      { x: 540, y: 540, label: "심화" },      // 중앙 교차로
      { x: 540, y: 200, label: "최종 목표" }  // 북쪽 산맥
    ]
  },
  {
    category: "AI",
    name: "Forest Castle (유령 숲)",
    color: "#a855f7", // Purple
    icon: "/images/characters/hero_back.png",
    path: "M 540,850 L 540,540 L 810,540 L 810,250",
    waypoints: [
      { x: 540, y: 850, label: "입문" },      // 시작의 다리
      { x: 540, y: 540, label: "기초" },      // 중앙 교차로
      { x: 810, y: 540, label: "심화" },      // 동쪽 교차로
      { x: 810, y: 250, label: "최종 목표" }  // 북동쪽 목적지
    ]
  }
];

export function WorldMapOverlay({ userTrees, onTreeClick, activeTree, theme }: WorldMapOverlayProps) {
  const activeRegions = useMemo(() => {
    // If activeTree is provided, we show only one path for this tree
    if (activeTree) {
      const displayTotal = activeTree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-')).length;
      const displayCompleted = activeTree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-') && n.data.is_completed).length;
      let progress = displayTotal > 0 ? displayCompleted / displayTotal : 0.05;
      progress = Math.max(0.05, Math.min(progress, 1.0));
      
      const shortLabel = activeTree.title.length > 15 ? activeTree.title.slice(0, 15) + "..." : activeTree.title;

      return [{
        ...REGIONS[0],
        category: "Custom",
        progress,
        label: shortLabel,
        color: theme ? theme.pathColor : "#10b981",
        icon: theme ? theme.icon : "/images/characters/hero_back.png",
        isActiveTree: true,
        treeId: "active",
        displayTotal,
        displayCompleted,
        markerPos: REGIONS[0].waypoints[0]
      }];
    }

    // "All" overview mode: Map each userTree to a region on the map
    if (userTrees && userTrees.length > 0) {
      const OVERVIEW_WAYPOINTS = [
        { x: 500, y: 630 }, // Central Huge Castle
        { x: 500, y: 180 }, // Top Snow Castle
        { x: 200, y: 500 }, // Left Coastal City
        { x: 750, y: 280 }, // Right Forest City
        { x: 230, y: 780 }, // Bottom Left Tower
        { x: 750, y: 430 }, // Middle Right Castle
        { x: 820, y: 800 }, // Bottom Right Village
        { x: 370, y: 560 }, // Small middle tower
      ];

      return userTrees.map((tree, idx) => {
        const displayTotal = tree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-')).length;
        const displayCompleted = tree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-') && n.data.is_completed).length;
        const progress = displayTotal > 0 ? displayCompleted / displayTotal : 0;
        
        const shortLabel = tree.title.length > 15 ? tree.title.slice(0, 15) + "..." : tree.title;
        
        return {
          category: "Overview",
          treeId: tree.id,
          label: shortLabel,
          progress,
          displayTotal,
          displayCompleted,
          isActiveTree: false,
          markerPos: OVERVIEW_WAYPOINTS[idx % OVERVIEW_WAYPOINTS.length],
          index: idx,
          isLast: idx === userTrees.length - 1
        };
      });
    }

    return [];
  }, [userTrees, activeTree, theme]);

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

        {/* Paths are removed in Overview Mode as requested */}

        {activeRegions.map((region) => (
          <g key={region.category || region.treeId}>
            {region.isActiveTree ? (
              <>
                <path
                  d={region.path}
                  fill="none"
                  stroke="rgba(0,0,0,0.6)"
                  strokeWidth="12"
                  strokeDasharray="15 15"
                  strokeLinecap="square"
                />
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
                
                {region.waypoints?.map((wp, i) => (
                  <g key={`wp-${i}`} className="transition-all duration-300 hover:scale-110">
                    <path
                      d={`M ${wp.x - 8} ${wp.y - 10} L ${wp.x + 8} ${wp.y - 10} L ${wp.x} ${wp.y - 2} Z`}
                      fill={region.color}
                      stroke="#000000"
                      strokeWidth="3"
                    />
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
                
                <g>
                  <g className="rpg-character">
                    <image href={region.icon || "/images/characters/hero_back.png"} x="-45" y="-90" width="90" height="90" preserveAspectRatio="xMidYMid meet" style={{ imageRendering: 'pixelated' }} />
                    <path d="M -10 -115 L 10 -115 L 0 -95 Z" fill="#FFE128" stroke="black" strokeWidth="3" className="bounce-arrow" />
                  </g>
                  <animateMotion
                    dur="10s"
                    repeatCount="indefinite"
                    path={region.path}
                    calcMode="linear"
                    keyPoints={`0;${region.progress};${region.progress};0`}
                    keyTimes="0;0.45;0.55;1"
                  />
                </g>
              </>
            ) : (
              // Map Overview Mode (Markers only)
              <g 
                className="cursor-pointer transition-all duration-300 hover:scale-110 pointer-events-auto"
                onClick={() => onTreeClick && onTreeClick(region.treeId)}
              >
                {/* Interactive City Node */}
                <foreignObject x={region.markerPos.x - 80} y={region.markerPos.y - 80} width="160" height="160" className="overflow-visible">
                  <div className="group relative w-full h-full flex flex-col items-center justify-center">
                    
                    {/* Tooltip Background (shows on hover) */}
                    <div className="pointer-events-none absolute bottom-[110px] left-1/2 mb-2 w-max -translate-x-1/2 opacity-0 transition-all duration-300 group-hover:-translate-y-2 group-hover:opacity-100 z-50">
                      <div className="relative flex flex-col items-center rounded-xl border-4 border-slate-900 bg-[#fef3c7] px-3 py-2 shadow-[4px_4px_0_0_rgba(0,0,0,0.8)]">
                        <p className="max-w-[200px] truncate text-xs font-black tracking-wide text-slate-900">
                          {region.label}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold text-slate-700">
                          달성률: {region.displayCompleted}/{region.displayTotal} ({Math.round(region.progress * 100)}%)
                        </p>
                        <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-4 border-r-4 border-slate-900 bg-[#fef3c7]" />
                      </div>
                    </div>

                    {/* Invisible Hitbox with Subtle Glow on Hover */}
                    <div className="w-[100px] h-[100px] rounded-full transition-all duration-300 group-hover:bg-amber-100/20 group-hover:shadow-[0_0_30px_10px_rgba(251,191,36,0.3)]" />
                  </div>
                </foreignObject>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
