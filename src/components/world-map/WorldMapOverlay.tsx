"use client";

import { useMemo, useLayoutEffect, useRef, useState } from "react";

import type { SkillTreeNode } from "@/types/skill-tree";
import { MAP_PATHS, type Pt } from "./map-paths";

// 전체지도(로드맵 목록)는 OverworldMap이 그리고,
// 이 오버레이는 "선택된 로드맵 한 개"의 상세 모험 경로를 담당한다.
// 하이브리드 벡터 시스템: 꼭짓점을 기반으로 완벽한 곡선(SVG d)을 생성하고,
// DOM의 getPointAtLength를 사용해 마커와 캐릭터의 위치를 1픽셀 오차 없이 계산한다.

interface WorldMapOverlayProps {
  activeTree?: { title: string; nodes: SkillTreeNode[] };
  theme?: { id?: string; pathColor: string; icon: string; [key: string]: unknown };
}

const isTopLevel = (n: SkillTreeNode) => n.type === "skill" || n.type === "custom";

// 점들을 이어 완벽하게 부드러운 베지에 곡선(Catmull-Rom Spline) SVG 문자열 생성
function catmullRom2bezier(points: Pt[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]},${points[0][1]} `;
  if (points.length === 2) {
    return d + `L ${points[1][0]},${points[1][1]}`;
  }
  
  // 양 끝점을 복제하여 자연스러운 곡률을 만든다
  const p = [points[0], ...points, points[points.length - 1]];
  
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;

    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]} `;
  }
  return d;
}

export function WorldMapOverlay({ activeTree, theme }: WorldMapOverlayProps) {
  const pathRef = useRef<SVGPathElement>(null);
  
  const [measured, setMeasured] = useState<{
    stations: Array<{ pos: Pt; step: number; completed: boolean; current: boolean; isPlaceholder: boolean }>;
    charPos: Pt;
  } | null>(null);

  const model = useMemo(() => {
    if (!activeTree) return null;

    const themeId = theme?.id && MAP_PATHS[theme.id] ? theme.id : "forest";
    const pathData = MAP_PATHS[themeId];
    const points = pathData.points;
    
    // 맵 데이터에 isStraight가 true로 설정되어 있으면 직선을 사용하고, 나머지는 자연스러운 곡선을 사용한다.
    const pathD = pathData.isStraight 
      ? points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`).join(" ")
      : catmullRom2bezier(points);

    const color = theme?.pathColor ?? "#10b981";
    const icon = theme?.icon ?? "/images/characters/hero_back.png";

    const topNodes = activeTree.nodes.filter(isTopLevel);
    const total = topNodes.length;
    const done = topNodes.filter((n) => n.data.is_completed).length;
    const allDone = total > 0 && done >= total;

    const empty = total === 0;
    const stationsCount = empty ? 3 : total;
    const charT = empty ? 0 : allDone ? 1 : (done + 1) / (total + 1);

    const rawTitle = empty ? "아직 단계가 없어요" : allDone ? "완주!" : topNodes[done]?.data.title ?? "";
    const label = rawTitle.length > 16 ? rawTitle.slice(0, 15) + "…" : rawTitle;

    return {
      themeId,
      color,
      icon,
      pathD,
      total,
      done,
      allDone,
      empty,
      stationsCount,
      charT,
      entrance: points[0],
      goal: points[points.length - 1],
      label,
    };
  }, [activeTree, theme]);

  // SVG Path 요소가 렌더링된 직후, getPointAtLength를 사용해 곡선 상의 오차 없는 좌표를 추출 (깜빡임 방지)
  useLayoutEffect(() => {
    if (!pathRef.current || !model) return;
    
    const pathEl = pathRef.current;
    const length = pathEl.getTotalLength();
    if (length === 0) return;

    // 단계별 마커 좌표 추출
    const stations = Array.from({ length: model.stationsCount }).map((_, i) => {
      const t = (i + 1) / (model.stationsCount + 1);
      const point = pathEl.getPointAtLength(t * length);
      return {
        pos: [point.x, point.y] as Pt,
        step: i + 1,
        completed: !model.empty && i < model.done,
        current: model.empty ? false : i === model.done,
        isPlaceholder: model.empty,
      };
    });

    // 캐릭터 좌표 추출
    const charPoint = pathEl.getPointAtLength(model.charT * length);
    const charPos: Pt = [charPoint.x, charPoint.y];

    setMeasured({ stations, charPos });
  }, [model]);

  if (!model) return null;

  const chip = model.empty ? "" : model.allDone ? "완주" : "현재";
  const chipW = chip ? 44 : 0;
  const badgeW = Math.max(150, model.label.length * 15 + chipW + 40);

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" className="h-full w-full drop-shadow-2xl">
        <defs>
          <filter id="wm-glow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <style>
            {`
              @keyframes wm-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
              .wm-char { animation: wm-bob 1s infinite step-start; }
              @keyframes wm-pulse { 0%{transform:scale(1);opacity:.8} 70%{transform:scale(2.4);opacity:0} 100%{opacity:0} }
              .wm-ping { transform-box: fill-box; transform-origin: center; animation: wm-pulse 1.8s ease-out infinite; }
              @keyframes wm-hop { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
              .wm-badge { animation: wm-hop 2.2s ease-in-out infinite; }
              .wm-txt { font-family: 'Galmuri11','Courier New',monospace; }
              @media (prefers-reduced-motion: reduce){ .wm-char,.wm-ping,.wm-badge{animation:none} }
            `}
          </style>
        </defs>

        {/* 측정용 투명 가이드 패스 (DOM 접근용) */}
        <path ref={pathRef} d={model.pathD} fill="none" stroke="none" opacity="0" />

        {/* 경로 바탕(전체 길) */}
        <path d={model.pathD} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={12} strokeDasharray="14 14" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* 지나온 길(현재 위치까지 색 채우기) */}
        {model.charT > 0 && (
          <path
            d={model.pathD}
            fill="none"
            stroke={model.color}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#wm-glow)"
            opacity={0.95}
            pathLength={100}
            style={{ strokeDasharray: "100 100", strokeDashoffset: 100 - model.charT * 100, transition: "stroke-dashoffset 1s ease-in-out" }}
          />
        )}

        {/* 입구 / 최종 목표 앵커 */}
        <Anchor x={model.entrance[0]} y={model.entrance[1]} label="입문" tone="#38bdf8" />
        {!model.allDone && <Anchor x={model.goal[0]} y={model.goal[1]} label="최종 목표" tone="#FFE128" />}

        {/* 측정된 좌표 기반 마커 렌더링 */}
        {measured && measured.stations.map((s, i) => (
          <g key={i} opacity={s.isPlaceholder ? 0.6 : 1}>
            {s.current && !model.allDone && !model.empty && (
              <circle cx={s.pos[0]} cy={s.pos[1]} r={14} fill={model.color} className="wm-ping" />
            )}
            <circle
              cx={s.pos[0]}
              cy={s.pos[1]}
              r={s.current && !model.allDone && !model.empty ? 14 : 12}
              fill={s.completed ? "#22c55e" : s.current && !model.empty ? model.color : "#f1f5f9"}
              stroke="#000000"
              strokeWidth={3}
            />
            {s.completed ? (
              <path d={`M ${s.pos[0] - 5.5} ${s.pos[1]} l 3.5 4.5 l 7 -9`} fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <text x={s.pos[0]} y={s.pos[1] + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill={s.current && !model.empty ? "#ffffff" : "#475569"} className="wm-txt">
                {s.step}
              </text>
            )}
            
            {/* 비어있는 트리일 때 마커 위에 추가될 퀘스트라는 설명 표시 */}
            {s.isPlaceholder && (
              <g transform={`translate(${s.pos[0]}, ${s.pos[1] - 30})`}>
                <rect x={-45} y={-14} width={90} height={24} rx={4} fill="#000000" opacity={0.7} />
                <text x={0} y={2} textAnchor="middle" fontSize={11} fill="#ffffff" className="wm-txt">추가될 퀘스트</text>
              </g>
            )}
          </g>
        ))}

        {/* 측정된 좌표 기반 현재 위치 캐릭터 + 단계 이름 */}
        {measured && !model.empty && (
          <g transform={`translate(${measured.charPos[0]},${measured.charPos[1]})`}>
            <g className="wm-badge">
              <g transform="translate(0,-132)">
                <rect x={-badgeW / 2 + 4} y={4} width={badgeW} height={34} rx={4} fill="#000000" />
                <rect x={-badgeW / 2} y={0} width={badgeW} height={34} rx={4} fill="#1c1c1c" stroke="#000000" strokeWidth={3} />
                {chip && (
                  <>
                    <rect x={-badgeW / 2 + 9} y={7} width={chipW} height={20} rx={3} fill={model.allDone ? "#f59e0b" : model.color} stroke="#000000" strokeWidth={2} />
                    <text x={-badgeW / 2 + 9 + chipW / 2} y={22} textAnchor="middle" fontSize={13} fontWeight={900} fill="#000000" className="wm-txt">{chip}</text>
                  </>
                )}
                <text x={-badgeW / 2 + 18 + chipW} y={22} fontSize={15} fill="#ffffff" className="wm-txt">{model.label}</text>
                <path d="M -9 38 L 9 38 L 0 49 Z" fill="#1c1c1c" stroke="#000000" strokeWidth={3} />
              </g>
            </g>
            <g className="wm-char">
              <image href={model.icon} x={-42} y={-92} width={84} height={84} preserveAspectRatio="xMidYMid meet" style={{ imageRendering: "pixelated" }} />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}

function Anchor({ x, y, label, tone }: { x: number; y: number; label: string; tone: string }) {
  const w = label.length * 16 + 20;
  return (
    <g>
      <path d={`M ${x - 7} ${y - 9} L ${x + 7} ${y - 9} L ${x} ${y - 2} Z`} fill={tone} stroke="#000000" strokeWidth={3} />
      <rect x={x - w / 2 + 3} y={y - 36} width={w} height={26} fill="#000000" />
      <rect x={x - w / 2} y={y - 39} width={w} height={26} fill={tone} stroke="#000000" strokeWidth={3} />
      <text x={x} y={y - 21} textAnchor="middle" fontSize={14} fontWeight={900} fill="#000000" className="wm-txt">
        {label}
      </text>
    </g>
  );
}
