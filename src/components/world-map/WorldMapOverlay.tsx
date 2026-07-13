"use client";

import { useMemo } from "react";

type CategoryStats = Record<string, { total: number; completed: number }>;

import type { SkillTreeNode } from "@/types/skill-tree";

interface WorldMapOverlayProps {
  userTrees?: { id: string; title: string; nodes: SkillTreeNode[] }[];
  onTreeClick?: (treeId: string) => void;
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
        isActiveTree: true
      }];
    }

    // "All" overview mode: Map each userTree to a region on the map
    if (userTrees && userTrees.length > 0) {
      return userTrees.map((tree, idx) => {
        const regionTemplate = REGIONS[idx % REGIONS.length];
        
        const displayTotal = tree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-')).length;
        const displayCompleted = tree.nodes.filter((n: SkillTreeNode) => !n.id.includes('-') && n.data.is_completed).length;
        let progress = displayTotal > 0 ? displayCompleted / displayTotal : 0;
        
        const shortLabel = tree.title.length > 15 ? tree.title.slice(0, 15) + "..." : tree.title;
        
        return {
          ...regionTemplate,
          treeId: tree.id,
          label: shortLabel,
          progress,
          displayTotal,
          displayCompleted,
          isActiveTree: false,
          // We'll place the marker at the last waypoint of the region
          markerPos: regionTemplate.waypoints[regionTemplate.waypoints.length - 1]
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
                {/* Tooltip Background */}
                <rect
                  x={region.markerPos.x - 70}
                  y={region.markerPos.y - 100}
                  width="140"
                  height="60"
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth="3"
                  rx="8"
                  className="drop-shadow-md"
                />
                
                {/* Tree Title */}
                <text
                  x={region.markerPos.x}
                  y={region.markerPos.y - 75}
                  fill="#000000"
                  fontSize="14"
                  fontWeight="900"
                  fontFamily='"Courier New", Courier, monospace'
                  textAnchor="middle"
                >
                  {region.label}
                </text>
                
                {/* Completion Rate / Tooltip content */}
                <text
                  x={region.markerPos.x}
                  y={region.markerPos.y - 55}
                  fill="#64748b"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily='"Courier New", Courier, monospace'
                  textAnchor="middle"
                >
                  달성률: {region.displayCompleted}/{region.displayTotal} ({Math.round(region.progress * 100)}%)
                </text>

                {/* Action Hint */}
                <rect
                  x={region.markerPos.x - 50}
                  y={region.markerPos.y + 15}
                  width="100"
                  height="24"
                  fill="#10b981"
                  stroke="#000000"
                  strokeWidth="2"
                  rx="4"
                />
                <text
                  x={region.markerPos.x}
                  y={region.markerPos.y + 31}
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily='"Courier New", Courier, monospace'
                  textAnchor="middle"
                >
                  모험 시작 ⚔️
                </text>

                {/* Marker Icon */}
                <image 
                  href={region.icon || "/images/characters/hero_back.png"} 
                  x={region.markerPos.x - 30} 
                  y={region.markerPos.y - 45} 
                  width="60" 
                  height="60" 
                  preserveAspectRatio="xMidYMid meet" 
                  style={{ imageRendering: 'pixelated' }} 
                  className="rpg-character"
                />
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
