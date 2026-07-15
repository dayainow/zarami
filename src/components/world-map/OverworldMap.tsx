"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { SkillTreeNode } from "@/types/skill-tree";
import { getThemeForTree, THEMES, type ThemeId } from "./themes";

// ---------------------------------------------------------------------------
// 로드맵 목록 = "전체 세계지도".
// 각 로드맵이 하나의 영토(섬)가 되고, 섬의 지형/랜드마크/소품은 해당 로드맵의
// 테마(숲/사막/설원/화산/사이버펑크)를 그대로 따른다. 섬 모양과 소품 배치는
// tree.id 로 시드된 난수로 생성되므로 새로고침해도 항상 같은 지도가 나온다.
// ---------------------------------------------------------------------------

export const OCEAN_BG = "#2f86cf";

const OCEAN = {
  base: OCEAN_BG,
  deep: "#2a7ac2",
  halo: "#4fa3dd", // 섬 주변 얕은 물 바깥 단계
  line: "#2b6ca8", // 해안선(모래 테두리)
  wave: "#eaf8ff",
};

type TerrainPalette = {
  land: string;
  landLight: string;
  sand: string;
  cliff: string;
  ring: string; // 섬을 감싸는 얕은 물
  trail: string;
  pennant: string;
};

const TERRAIN: Record<ThemeId, TerrainPalette> = {
  forest: {
    land: "#73c856", landLight: "#8ade6b", sand: "#eed9a2", cliff: "#8a6a44",
    ring: "#8fd4f2", trail: "#b98a4e", pennant: "#10b981",
  },
  desert: {
    land: "#e8c878", landLight: "#f2d894", sand: "#f6e4b4", cliff: "#a97e4a",
    ring: "#8fd4f2", trail: "#c0904a", pennant: "#f59e0b",
  },
  winter: {
    land: "#eef6fb", landLight: "#ffffff", sand: "#cfe4ef", cliff: "#9fbecf",
    ring: "#aadff6", trail: "#b7cddb", pennant: "#38bdf8",
  },
  volcano: {
    land: "#6e4a41", landLight: "#7d564b", sand: "#57403a", cliff: "#3c2b27",
    ring: "#8fd4f2", trail: "#33241f", pennant: "#ef4444",
  },
  cyberpunk: {
    land: "#2b2150", landLight: "#372a63", sand: "#1f1840", cliff: "#151030",
    ring: "#7b6cf0", trail: "#a855f7", pennant: "#a855f7",
  },
  sky: {
    land: "#fce7f3", landLight: "#fdf2f8", sand: "#fbcfe8", cliff: "#f9a8d4",
    ring: "#60a5fa", trail: "#eab308", pennant: "#eab308",
  },
  ocean: {
    land: "#1e3a8a", landLight: "#2563eb", sand: "#1d4ed8", cliff: "#1e40af",
    ring: "#3b82f6", trail: "#c084fc", pennant: "#c084fc",
  },
  ruins: {
    land: "#14532d", landLight: "#166534", sand: "#15803d", cliff: "#16a34a",
    ring: "#22c55e", trail: "#84cc16", pennant: "#84cc16",
  },
};

// ---------------------------------------------------------------------------
// 시드 난수 / 도형 생성
// ---------------------------------------------------------------------------

type Rand = () => number;
const TAU = Math.PI * 2;

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
    h |= 0;
  }
  return Math.abs(h) || 1;
}

function mulberry32(seed: number): Rand {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface IslandShape {
  pts: Array<[number, number]>;
  radii: number[];
  steps: number;
}

// 방사형 다각형을 격자에 스냅해 레트로 게임의 각진 해안선을 만든다.
function makeShape(rng: Rand, R: number, steps = 20, grid = 8, squash = 0.9): IslandShape {
  let radii = Array.from({ length: steps }, () => R * (0.62 + rng() * 0.43));
  radii = radii.map((r, i) => (radii[(i - 1 + steps) % steps] + r * 2 + radii[(i + 1) % steps]) / 4);
  radii = radii.map((r) => r * (0.95 + rng() * 0.1));
  const pts = radii.map((r, i) => {
    const a = (i / steps) * TAU;
    return [
      Math.round((Math.cos(a) * r) / grid) * grid,
      Math.round((Math.sin(a) * r * squash) / grid) * grid,
    ] as [number, number];
  });
  return { pts, radii, steps };
}

function shapePath(shape: IslandShape, scale = 1, dy = 0): string {
  return (
    shape.pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${Math.round(x * scale)},${Math.round(y * scale) + dy}`)
      .join(" ") + " Z"
  );
}

function radiusAt(shape: IslandShape, angle: number): number {
  const t = ((angle / TAU) % 1 + 1) % 1 * shape.steps;
  const i0 = Math.floor(t) % shape.steps;
  const i1 = (i0 + 1) % shape.steps;
  const f = t - Math.floor(t);
  return shape.radii[i0] * (1 - f) + shape.radii[i1] * f;
}

// ---------------------------------------------------------------------------
// 월드 스펙 생성
// ---------------------------------------------------------------------------

export interface OverworldTree {
  id: string;
  title: string;
  nodes: SkillTreeNode[];
}

type PropKind =
  | "tree" | "bush" | "pond" | "rock"
  | "pine" | "snowman" | "crystal"
  | "cactus" | "palm" | "dune"
  | "deadtree" | "lavapool" | "ember"
  | "tower" | "sign" | "holotree"
  | "flagpole"
  | "castle" | "icecastle" | "pyramid" | "volcano" | "citadel";

interface PlacedProp { kind: PropKind; x: number; y: number; s: number }

interface IslandSpec {
  id: string;
  title: string;
  label: string;
  plateW: number;
  done: number;
  total: number;
  pct: number;
  themeId: ThemeId;
  heroIcon: string | null;
  heroPos: [number, number] | null;
  cx: number;
  cy: number;
  R: number;
  shape: IslandShape;
  ringWaves: Array<[number, number]>;
  trail: Array<[number, number]>;
  props: PlacedProp[];
  accents: Array<[number, number, number]>;
  bannerTop: number;
}

interface CloudSpec { x: number; y: number; s: number; delay: number; dur: number }
interface WaveSpec { x: number; y: number; delay: number }
interface BlobSpec { x: number; y: number; path: string }

interface WorldSpec {
  islands: IslandSpec[];
  deepPatches: BlobSpec[];
  waves: WaveSpec[];
  islets: Array<[number, number]>;
  whirlpool: [number, number] | null;
  serpent: [number, number] | null;
  birds: Array<[number, number]>;
  clouds: CloudSpec[];
  compass: [number, number];
  routes: string[];
  shipPath: string | null;
}

const PROP_POOL: Record<ThemeId, PropKind[]> = {
  forest: ["tree", "tree", "tree", "bush", "rock", "pond"],
  winter: ["pine", "pine", "pine", "snowman", "rock", "crystal"],
  desert: ["cactus", "cactus", "palm", "dune", "rock", "dune"],
  volcano: ["deadtree", "lavapool", "rock", "ember", "deadtree", "rock"],
  cyberpunk: ["tower", "sign", "holotree", "tower", "rock", "sign"],
  sky: ["tree", "rock", "crystal", "tree", "bush", "tower"],
  ocean: ["rock", "crystal", "pond", "rock", "crystal", "pond"],
  ruins: ["deadtree", "rock", "tower", "sign", "bush", "rock"],
};

const LANDMARK: Record<ThemeId, PropKind> = {
  forest: "castle",
  winter: "icecastle",
  desert: "pyramid",
  volcano: "volcano",
  cyberpunk: "citadel",
  sky: "castle",
  ocean: "icecastle",
  ruins: "pyramid",
};

// 전체지도에서는 정면을 보고 서 있는 스프라이트를 쓴다 (테마별 의상)
const HERO_FRONT: Record<ThemeId, string> = {
  forest: "/images/characters/hero.png",
  desert: "/images/characters/hero_desert_front.png",
  winter: "/images/characters/hero_snow_front.png",
  volcano: "/images/characters/hero_volcano_front.png",
  cyberpunk: "/images/characters/hero_cyber_front.png",
  sky: "/images/characters/hero.png",
  ocean: "/images/characters/hero_snow_front.png",
  ruins: "/images/characters/hero_desert_front.png",
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// 슬롯: [cx, cy, R] — 로드맵 개수별로 손튜닝한 균형 잡힌 구도
function islandSlots(n: number, portrait: boolean): Array<[number, number, number]> {
  if (portrait) {
    if (n === 1) return [[500, 760, 225]];
    if (n === 2) return [[480, 430, 195], [520, 1190, 195]];
    if (n === 3) return [[330, 380, 175], [690, 810, 180], [340, 1250, 175]];
    if (n === 4) return [[330, 350, 168], [680, 730, 168], [330, 1090, 168], [680, 1400, 158]];
    if (n === 5) return [[320, 330, 160], [700, 560, 160], [300, 880, 160], [700, 1130, 160], [340, 1400, 150]];
    if (n <= 8) {
      // 현판(섬 위 ~1.5R 높이)이 윗줄 섬을 가리지 않도록 줄 간격을 넉넉히 잡는다
      return [
        [290, 260, 140], [710, 320, 140], [280, 660, 140], [720, 720, 140],
        [290, 1060, 140], [710, 1120, 140], [300, 1450, 115], [700, 1490, 112],
      ].slice(0, n) as Array<[number, number, number]>;
    }
    return Array.from({ length: n }, (_, i) => [190 + (i % 3) * 320, 200 + Math.floor(i / 3) * 300, 100] as [number, number, number]);
  }
  if (n === 1) return [[800, 500, 235]];
  if (n === 2) return [[470, 380, 200], [1130, 630, 200]];
  if (n === 3) return [[430, 330, 185], [1180, 300, 185], [800, 700, 190]];
  if (n === 4) return [[420, 300, 175], [1190, 280, 175], [390, 720, 175], [1190, 730, 175]];
  if (n === 5) return [[400, 290, 170], [1200, 270, 170], [380, 730, 170], [1210, 740, 170], [800, 500, 160]];
  if (n <= 8) {
    return [
      [380, 290, 165], [860, 200, 145], [1310, 320, 160], [330, 730, 155],
      [820, 590, 165], [1330, 710, 155], [590, 950, 112], [1090, 925, 112],
    ].slice(0, n) as Array<[number, number, number]>;
  }
  // 9개 이상: 5열 그리드 (15개까지 화면 안에 들어온다)
  return Array.from({ length: n }, (_, i) => [165 + (i % 5) * 315, 185 + Math.floor(i / 5) * 285, 98] as [number, number, number]);
}

function findOpenWater(
  rng: Rand,
  islands: Array<{ cx: number; cy: number; R: number }>,
  W: number,
  H: number,
  margin: number,
  clearance: number,
  others: Array<[number, number]> = [],
  minOtherDist = 140,
): [number, number] | null {
  for (let t = 0; t < 60; t++) {
    const x = Math.round(margin + rng() * (W - margin * 2));
    const y = Math.round(margin + rng() * (H - margin * 2));
    const clearIslands = islands.every((is) => Math.hypot(x - is.cx, y - is.cy) > is.R * 1.45 + clearance);
    const clearOthers = others.every(([ox, oy]) => Math.hypot(x - ox, y - oy) > minOtherDist);
    if (clearIslands && clearOthers) return [x, y];
  }
  return null;
}

function measurePlate(label: string): number {
  let w = 0;
  for (const ch of label) {
    w += ch.charCodeAt(0) > 0x2e80 ? 17.5 : 10;
  }
  return Math.round(clamp(w + 62, 150, 330));
}

const TOP_LEVEL = (n: SkillTreeNode) => !n.id.includes("-");

function buildIsland(tree: OverworldTree, cx: number, cy: number, R: number, mapCx: number, mapCy: number, isLatest: boolean): IslandSpec {
  const rng = mulberry32(hashString(tree.id));
  const theme = getThemeForTree(tree.id);
  const themeId = theme.id as ThemeId;
  const shape = makeShape(rng, R);

  const total = (tree.nodes || []).filter(TOP_LEVEL).length;
  const done = (tree.nodes || []).filter((n) => TOP_LEVEL(n) && n.data.is_completed).length;
  const pct = total > 0 ? done / total : 0;
  const title = tree.title || "무제 로드맵";
  const label = title.length > 14 ? title.slice(0, 13) + "…" : title;

  // 랜드마크는 섬 중심 살짝 위, 이름 현판은 섬 위 하늘에 띄운다
  const landmarkY = -Math.round(R * 0.1);
  const landmarkScale = clamp(R / 115, 1.15, 1.9);
  const bannerTop = Math.max(-Math.round(R * 1.02) - 66, 12 - cy);
  const poleScale = clamp(R / 150, 1, 1.4);
  const polePos: [number, number] = [Math.round(R * 0.38), -Math.round(R * 0.02)];

  // 해변에서 랜드마크로 이어지는 오솔길: 지도 중심 방향의 해안에서 출발
  let dirAngle = Math.atan2(mapCy - cy, mapCx - cx);
  if (Math.hypot(mapCx - cx, mapCy - cy) < 40) dirAngle = Math.PI * 0.75;
  const edgeR = radiusAt(shape, dirAngle) * 1.02;
  const edge: [number, number] = [Math.cos(dirAngle) * edgeR, Math.sin(dirAngle) * edgeR * 0.9];
  const trailEnd: [number, number] = [0, landmarkY + Math.round(20 * landmarkScale)];
  const trail: Array<[number, number]> = [];
  const dotCount = 7;
  const perp = dirAngle + Math.PI / 2;
  for (let i = 0; i < dotCount; i++) {
    const t = 0.1 + (i / (dotCount - 1)) * 0.82;
    const jitter = (rng() - 0.5) * 14;
    trail.push([
      Math.round(edge[0] + (trailEnd[0] - edge[0]) * t + Math.cos(perp) * jitter),
      Math.round(edge[1] + (trailEnd[1] - edge[1]) * t + Math.sin(perp) * jitter * 0.9),
    ]);
  }

  const heroPos: [number, number] | null = isLatest
    ? [Math.round(edge[0] * 0.78), Math.round(edge[1] * 0.78)]
    : null;

  // 소품 배치 (랜드마크/깃대/오솔길/영웅과 겹치지 않게 rejection sampling)
  // 회피 반경은 랜드마크의 실제 발자국 크기만큼만 잡는다 (섬 전체를 비우지 않도록)
  const avoid: Array<[number, number, number]> = [
    [0, landmarkY - Math.round(18 * landmarkScale), Math.round(62 * landmarkScale)],
    [polePos[0], polePos[1], 50],
    ...(heroPos ? [[heroPos[0], heroPos[1], 52] as [number, number, number]] : []),
  ];
  const pool = PROP_POOL[themeId];
  const propCount = clamp(Math.round(R / 14), 8, 16);
  const placed: PlacedProp[] = [];
  let tries = 0;
  while (placed.length < propCount && tries < propCount * 60) {
    tries++;
    const a = rng() * TAU;
    const f = 0.12 + rng() * 0.66;
    const r = radiusAt(shape, a) * f;
    const x = Math.round(Math.cos(a) * r);
    const y = Math.round(Math.sin(a) * r * 0.9);
    if (avoid.some(([ax, ay, ad]) => Math.hypot(x - ax, y - ay) < ad)) continue;
    if (placed.some((p) => Math.hypot(x - p.x, y - p.y) < 40)) continue;
    if (trail.some(([tx, ty]) => Math.hypot(x - tx, y - ty) < 24)) continue;
    placed.push({ kind: pool[Math.floor(rng() * pool.length)], x, y, s: 1.05 + rng() * 0.55 });
  }
  placed.push({ kind: LANDMARK[themeId], x: 0, y: landmarkY, s: landmarkScale });
  placed.push({ kind: "flagpole", x: polePos[0], y: polePos[1], s: poleScale });
  placed.sort((a, b) => a.y - b.y);

  // 테마별 바닥 질감 (풀꽃/모래결/눈더미/균열/네온 도트)
  const accents: Array<[number, number, number]> = [];
  for (let i = 0; i < 18; i++) {
    const a = rng() * TAU;
    const f = 0.1 + rng() * 0.62;
    const r = radiusAt(shape, a) * f;
    accents.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r * 0.9), Math.floor(rng() * 3)]);
  }

  // 섬을 감싸는 잔파도
  const ringWaves: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const a = rng() * TAU;
    const r = radiusAt(shape, a) * (1.38 + rng() * 0.18);
    ringWaves.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r * 0.9)]);
  }

  return {
    id: tree.id,
    title: tree.title,
    label,
    plateW: measurePlate(pct >= 1 ? "★ " + label : label),
    done,
    total,
    pct,
    themeId,
    heroIcon: isLatest ? HERO_FRONT[themeId] : null,
    heroPos,
    cx,
    cy,
    R,
    shape,
    ringWaves,
    trail,
    props: placed,
    accents,
    bannerTop,
  };
}

function buildWorld(trees: OverworldTree[], portrait: boolean): WorldSpec {
  const W = portrait ? 1000 : 1600;
  const H = portrait ? 1600 : 1000;
  const worldRng = mulberry32(hashString(trees.map((t) => t.id).join("|") + (portrait ? "P" : "L") + "zarami"));

  const slots = islandSlots(Math.max(trees.length, 1), portrait);
  const islands = trees.map((tree, i) => {
    const [sx, sy, sR] = slots[i % slots.length];
    const jx = trees.length > 1 ? Math.round((worldRng() - 0.5) * 44) : 0;
    const jy = trees.length > 1 ? Math.round((worldRng() - 0.5) * 36) : 0;
    return buildIsland(tree, sx + jx, sy + jy, sR, W / 2, H / 2, i === 0);
  });

  // 좌상단 타이틀 박스(HUD)에 섬 이름 현판이 가려지지 않도록,
  // 현판이 HUD 영역을 침범하는 섬은 그 아래로 내려오게 밀어낸다.
  // HUD 크기는 화면 비율에 따라 달라지므로 뷰박스 기준 넉넉히 잡는다.
  const hud = portrait ? { right: 430, bottom: 150 } : { right: 560, bottom: 165 };
  for (const island of islands) {
    const bannerTopAbs = island.cy + island.bannerTop;
    const bannerLeftAbs = island.cx - island.plateW / 2;
    if (bannerLeftAbs < hud.right && bannerTopAbs < hud.bottom) {
      island.cy += hud.bottom - bannerTopAbs;
    }
  }

  // 깊은 바다 얼룩 (화면 가장자리 밖까지 이어져 레터박스 경계를 감춘다)
  const deepPatches: BlobSpec[] = [];
  for (let i = 0; i < 7; i++) {
    const r = 60 + worldRng() * 90;
    const blob = makeShape(worldRng, r, 12, 12, 0.75);
    deepPatches.push({
      x: Math.round(-120 + worldRng() * (W + 240)),
      y: Math.round(-120 + worldRng() * (H + 240)),
      path: shapePath(blob),
    });
  }

  const waves: WaveSpec[] = [];
  let waveTries = 0;
  while (waves.length < 34 && waveTries < 500) {
    waveTries++;
    const x = Math.round(-120 + worldRng() * (W + 240));
    const y = Math.round(-80 + worldRng() * (H + 160));
    if (islands.some((is) => Math.hypot(x - is.cx, y - is.cy) < is.R * 1.4 + 24)) continue;
    waves.push({ x, y, delay: (waves.length % 5) * 0.65 });
  }

  const decoPts: Array<[number, number]> = [];
  const islets: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const p = findOpenWater(worldRng, islands, W, H, 70, 70, decoPts);
    if (p) { islets.push(p); decoPts.push(p); }
  }
  const whirlpool = findOpenWater(worldRng, islands, W, H, 90, 90, decoPts);
  if (whirlpool) decoPts.push(whirlpool);
  const serpent = findOpenWater(worldRng, islands, W, H, 120, 110, decoPts, 180);
  if (serpent) decoPts.push(serpent);

  const birds: Array<[number, number]> = [];
  for (let i = 0; i < 2; i++) {
    const p = findOpenWater(worldRng, islands, W, H, 80, 30, decoPts, 90);
    if (p) { birds.push([p[0], Math.round(p[1] * 0.6)]); decoPts.push(p); }
  }

  const cloudAnchors: Array<[number, number]> = [
    [0.12, 0.1], [0.87, 0.14], [0.08, 0.85], [0.9, 0.8], [0.48, 0.06],
  ];
  const clouds: CloudSpec[] = cloudAnchors.map(([fx, fy]) => ({
    x: Math.round(fx * W + (worldRng() - 0.5) * 120),
    y: Math.round(fy * H + (worldRng() - 0.5) * 80),
    s: 0.9 + worldRng() * 0.7,
    delay: worldRng() * 8,
    dur: 26 + worldRng() * 12,
  }));

  const compassCandidates: Array<[number, number]> = [
    [W - 108, H - 92], [W - 108, 122], [112, H - 92], [112, 122],
  ];
  const compass =
    compassCandidates.find(([x, y]) => islands.every((is) => Math.hypot(x - is.cx, y - is.cy) > is.R * 1.3 + 78)) ??
    compassCandidates[0];

  // 섬과 섬을 잇는 항로 (직각으로 꺾이는 픽셀 항로)
  const routes: string[] = [];
  const shipSegs: string[] = [];
  for (let i = 0; i < islands.length - 1; i++) {
    const a = islands[i];
    const b = islands[i + 1];
    const seg =
      i % 2 === 0
        ? `M${a.cx},${a.cy} L${b.cx},${a.cy} L${b.cx},${b.cy}`
        : `M${a.cx},${a.cy} L${a.cx},${b.cy} L${b.cx},${b.cy}`;
    routes.push(seg);
    shipSegs.push(i === 0 ? seg : seg.replace(/^M[^L]+/, ""));
  }
  const shipPath = shipSegs.length > 0 ? shipSegs.join(" ") : null;

  return { islands, deepPatches, waves, islets, whirlpool, serpent, birds, clouds, compass, routes, shipPath };
}

// ---------------------------------------------------------------------------
// 스프라이트 (원점 = 바닥 중앙, 위쪽이 -y)
// ---------------------------------------------------------------------------

function GroundShadow({ w = 22 }: { w?: number }) {
  return <rect x={-w / 2} y={-2} width={w} height={4} fill="rgba(0,0,0,0.16)" />;
}

function TreeSprite() {
  return (
    <g>
      <GroundShadow />
      <rect x={-3} y={-9} width={6} height={9} fill="#7c4f2a" />
      <rect x={-13} y={-22} width={26} height={13} fill="#2f9e44" />
      <rect x={-10} y={-29} width={20} height={9} fill="#40c057" />
      <rect x={-6} y={-36} width={12} height={8} fill="#55cf68" />
      <rect x={-4} y={-32} width={5} height={4} fill="#8ce99a" />
    </g>
  );
}

function BushSprite() {
  return (
    <g>
      <GroundShadow w={20} />
      <rect x={-11} y={-12} width={22} height={12} fill="#2f9e44" />
      <rect x={-8} y={-17} width={16} height={6} fill="#40c057" />
      <rect x={-4} y={-14} width={4} height={3} fill="#8ce99a" />
    </g>
  );
}

function PondSprite() {
  return (
    <g>
      <rect x={-16} y={-8} width={32} height={11} fill="#2b6ca8" />
      <rect x={-14} y={-7} width={28} height={9} fill="#3fa7e0" />
      <rect x={-9} y={-5} width={9} height={2} fill="#a5d8ff" />
      <rect x={3} y={-3} width={5} height={2} fill="#a5d8ff" />
    </g>
  );
}

function RockSprite({ themeId }: { themeId: ThemeId }) {
  const tint = {
    forest: ["#8d979e", "#c2ccd2", "#6c757c"],
    desert: ["#c2a377", "#e0c69c", "#96794e"],
    winter: ["#9fb4c4", "#e8f2f8", "#7d94a6"],
    volcano: ["#5d4a44", "#7a635b", "#42332e"],
    cyberpunk: ["#3a3357", "#57508a", "#262043"],
    sky: ["#8fa3b3", "#d0dfe8", "#6a7b8a"],
    ocean: ["#638e9e", "#a1cddb", "#496a78"],
    ruins: ["#7d7d7d", "#b0b0b0", "#5c5c5c"],
  }[themeId] || ["#8d979e", "#c2ccd2", "#6c757c"];
  return (
    <g>
      <GroundShadow w={24} />
      <rect x={-10} y={-9} width={20} height={9} fill={tint[0]} />
      <rect x={-5} y={-14} width={10} height={5} fill={tint[0]} />
      <rect x={-8} y={-8} width={4} height={3} fill={tint[1]} />
      <rect x={-10} y={-2} width={20} height={2} fill={tint[2]} />
      {themeId === "winter" && <rect x={-5} y={-15} width={10} height={3} fill="#ffffff" />}
    </g>
  );
}

function PineSprite() {
  return (
    <g>
      <GroundShadow w={20} />
      <rect x={-2} y={-6} width={5} height={6} fill="#6b4226" />
      <rect x={-13} y={-15} width={26} height={9} fill="#1f7a4d" />
      <rect x={-10} y={-22} width={20} height={7} fill="#269363" />
      <rect x={-7} y={-29} width={14} height={7} fill="#2fae74" />
      <rect x={-13} y={-17} width={9} height={3} fill="#ffffff" />
      <rect x={4} y={-17} width={9} height={3} fill="#ffffff" />
      <rect x={-10} y={-24} width={8} height={3} fill="#ffffff" />
      <rect x={-7} y={-31} width={14} height={3} fill="#ffffff" />
    </g>
  );
}

function SnowmanSprite() {
  return (
    <g>
      <GroundShadow w={18} />
      <rect x={-8} y={-11} width={16} height={11} fill="#ffffff" />
      <rect x={-8} y={-3} width={16} height={3} fill="#d7e9f2" />
      <rect x={-5} y={-20} width={10} height={9} fill="#ffffff" />
      <rect x={-3} y={-17} width={2} height={2} fill="#212529" />
      <rect x={1} y={-17} width={2} height={2} fill="#212529" />
      <rect x={0} y={-14} width={4} height={2} fill="#ff922b" />
      <rect x={-13} y={-13} width={5} height={2} fill="#6b4226" />
      <rect x={8} y={-13} width={5} height={2} fill="#6b4226" />
    </g>
  );
}

function CrystalSprite() {
  return (
    <g>
      <GroundShadow w={18} />
      <rect x={-3} y={-20} width={6} height={20} fill="#99e9f2" />
      <rect x={-8} y={-14} width={5} height={14} fill="#66d9e8" />
      <rect x={3} y={-12} width={5} height={12} fill="#66d9e8" />
      <rect x={-2} y={-18} width={2} height={5} fill="#ffffff" className="ow-sparkle" />
    </g>
  );
}

function CactusSprite() {
  return (
    <g>
      <GroundShadow w={18} />
      <rect x={-4} y={-28} width={8} height={28} fill="#2f9e44" />
      <rect x={-9} y={-18} width={5} height={4} fill="#2f9e44" />
      <rect x={-13} y={-26} width={4} height={12} fill="#2f9e44" />
      <rect x={4} y={-14} width={5} height={4} fill="#2f9e44" />
      <rect x={9} y={-22} width={4} height={12} fill="#2f9e44" />
      <rect x={-4} y={-28} width={2} height={28} fill="#55cf68" />
      <rect x={-2} y={-31} width={4} height={3} fill="#f783ac" />
    </g>
  );
}

function PalmSprite() {
  return (
    <g>
      <GroundShadow w={20} />
      <rect x={-2} y={-8} width={5} height={9} fill="#a9743f" />
      <rect x={0} y={-15} width={5} height={8} fill="#a9743f" />
      <rect x={2} y={-22} width={5} height={8} fill="#a9743f" />
      <rect x={-14} y={-27} width={16} height={5} fill="#37b24d" />
      <rect x={6} y={-29} width={16} height={5} fill="#2f9e44" />
      <rect x={-8} y={-33} width={12} height={4} fill="#2f9e44" />
      <rect x={4} y={-34} width={10} height={4} fill="#37b24d" />
      <rect x={-17} y={-24} width={4} height={4} fill="#37b24d" />
      <rect x={20} y={-26} width={4} height={4} fill="#2f9e44" />
      <rect x={1} y={-26} width={4} height={4} fill="#6b4226" />
      <rect x={6} y={-24} width={4} height={4} fill="#6b4226" />
    </g>
  );
}

function DuneSprite() {
  return (
    <g>
      <rect x={-14} y={-5} width={28} height={5} fill="#d8b16a" />
      <rect x={-8} y={-9} width={16} height={4} fill="#cfa75f" />
    </g>
  );
}

function DeadTreeSprite() {
  return (
    <g>
      <GroundShadow w={16} />
      <rect x={-2} y={-20} width={5} height={20} fill="#5d4037" />
      <rect x={-11} y={-17} width={9} height={3} fill="#5d4037" />
      <rect x={-11} y={-21} width={3} height={4} fill="#5d4037" />
      <rect x={3} y={-24} width={10} height={3} fill="#5d4037" />
      <rect x={10} y={-28} width={3} height={4} fill="#5d4037" />
    </g>
  );
}

function LavaPoolSprite() {
  return (
    <g>
      <rect x={-14} y={-7} width={28} height={9} fill="#7a2f1d" />
      <rect x={-11} y={-6} width={22} height={7} fill="#ff7a1a" />
      <rect x={-6} y={-4} width={10} height={3} fill="#ffd43b" className="ow-lava" />
    </g>
  );
}

function EmberSprite() {
  return (
    <g>
      <rect x={-6} y={-4} width={4} height={4} fill="#ff7a1a" className="ow-lava" />
      <rect x={2} y={-7} width={3} height={3} fill="#ffd43b" className="ow-lava" />
      <rect x={-1} y={-2} width={3} height={2} fill="#ff922b" />
    </g>
  );
}

function TowerSprite() {
  return (
    <g>
      <GroundShadow w={20} />
      <rect x={-8} y={-40} width={16} height={40} fill="#1b1435" />
      <rect x={-5} y={-36} width={3} height={3} fill="#22d3ee" className="ow-blinkA" />
      <rect x={2} y={-36} width={3} height={3} fill="#f0abfc" />
      <rect x={-5} y={-29} width={3} height={3} fill="#f0abfc" />
      <rect x={2} y={-29} width={3} height={3} fill="#22d3ee" />
      <rect x={-5} y={-22} width={3} height={3} fill="#22d3ee" />
      <rect x={2} y={-22} width={3} height={3} fill="#f0abfc" className="ow-blinkB" />
      <rect x={-5} y={-15} width={3} height={3} fill="#22d3ee" />
      <rect x={2} y={-15} width={3} height={3} fill="#22d3ee" className="ow-blinkA" />
      <rect x={-1} y={-50} width={2} height={10} fill="#56607a" />
      <rect x={-2} y={-53} width={4} height={4} fill="#f43f5e" className="ow-blinkB" />
      <rect x={-8} y={-3} width={16} height={3} fill="#a855f7" className="ow-neon" />
    </g>
  );
}

function SignSprite() {
  return (
    <g>
      <GroundShadow w={14} />
      <rect x={-1} y={-14} width={3} height={14} fill="#495057" />
      <rect x={-12} y={-27} width={24} height={13} fill="#12102a" stroke="#a855f7" strokeWidth={2} className="ow-neon" />
      <rect x={-8} y={-23} width={6} height={2} fill="#22d3ee" />
      <rect x={1} y={-23} width={7} height={2} fill="#f0abfc" />
      <rect x={-8} y={-19} width={11} height={2} fill="#22d3ee" />
    </g>
  );
}

function HoloTreeSprite() {
  return (
    <g className="ow-holo">
      <rect x={-2} y={-9} width={4} height={9} fill="#155e75" />
      <rect x={-8} y={-20} width={16} height={11} fill="#22d3ee" opacity={0.75} />
      <rect x={-5} y={-26} width={10} height={6} fill="#67e8f9" opacity={0.85} />
    </g>
  );
}

// 영토에 꽂힌 깃발 — 페넌트는 테마 색
function FlagpoleSprite({ themeId }: { themeId: ThemeId }) {
  const pennant = TERRAIN[themeId].pennant;
  return (
    <g>
      <GroundShadow w={16} />
      <rect x={-2} y={-64} width={5} height={64} fill="#4a3524" stroke="#000000" strokeWidth={1.5} />
      <rect x={-4} y={-71} width={9} height={7} fill="#FFE128" stroke="#000000" strokeWidth={1.5} />
      <path d="M3,-62 L42,-62 L31,-53 L42,-44 L3,-44 Z" fill={pennant} stroke="#000000" strokeWidth={2.5} />
    </g>
  );
}

function CastleSprite() {
  return (
    <g>
      <GroundShadow w={80} />
      {/* 본체 + 총안 */}
      <rect x={-24} y={-30} width={48} height={30} fill="#f1f0ec" />
      <rect x={-24} y={-30} width={5} height={30} fill="#d8d5cd" />
      {[-24, -14, -4, 6, 16].map((x) => (
        <rect key={x} x={x} y={-35} width={6} height={5} fill="#f1f0ec" />
      ))}
      {/* 좌우 탑 + 붉은 지붕 */}
      {[-38, 24].map((tx) => (
        <g key={tx}>
          <rect x={tx} y={-52} width={14} height={52} fill="#f1f0ec" />
          <rect x={tx} y={-52} width={4} height={52} fill="#d8d5cd" />
          <rect x={tx - 2} y={-58} width={18} height={6} fill="#e03131" />
          <rect x={tx + 1} y={-64} width={12} height={6} fill="#e03131" />
          <rect x={tx + 4} y={-70} width={6} height={6} fill="#c92a2a" />
          <rect x={tx + 6} y={-77} width={2} height={7} fill="#343a40" />
          <rect x={tx + 8} y={-77} width={7} height={4} fill="#FFE128" />
          <rect x={tx + 4} y={-24} width={6} height={8} fill="#364fc7" />
        </g>
      ))}
      {/* 중앙 탑 */}
      <rect x={-8} y={-48} width={16} height={18} fill="#f1f0ec" />
      <rect x={-11} y={-54} width={22} height={6} fill="#e03131" />
      <rect x={-7} y={-60} width={14} height={6} fill="#e03131" />
      <rect x={-3} y={-65} width={6} height={5} fill="#c92a2a" />
      <rect x={-6} y={-14} width={12} height={14} fill="#6b4226" />
      <rect x={-4} y={-16} width={8} height={3} fill="#6b4226" />
      <rect x={-16} y={-24} width={5} height={7} fill="#364fc7" />
      <rect x={11} y={-24} width={5} height={7} fill="#364fc7" />
    </g>
  );
}

function IceCastleSprite() {
  return (
    <g>
      <GroundShadow w={80} />
      <rect x={-26} y={-4} width={52} height={4} fill="#a9cde3" />
      <rect x={-24} y={-28} width={48} height={28} fill="#cfe6f5" />
      <rect x={-24} y={-28} width={5} height={28} fill="#a9cde3" />
      {[-24, -14, -4, 6, 16].map((x) => (
        <rect key={x} x={x} y={-33} width={6} height={5} fill="#cfe6f5" />
      ))}
      {[-38, 24].map((tx) => (
        <g key={tx}>
          <rect x={tx} y={-52} width={14} height={52} fill="#cfe6f5" />
          <rect x={tx} y={-52} width={4} height={52} fill="#a9cde3" />
          <rect x={tx - 2} y={-58} width={18} height={6} fill="#339af0" />
          <rect x={tx + 1} y={-65} width={12} height={7} fill="#4dabf7" />
          <rect x={tx + 4} y={-72} width={6} height={7} fill="#74c0fc" />
          <rect x={tx + 4} y={-75} width={6} height={3} fill="#ffffff" />
          <rect x={tx + 4} y={-24} width={6} height={8} fill="#1864ab" />
        </g>
      ))}
      <rect x={-8} y={-46} width={16} height={18} fill="#cfe6f5" />
      <rect x={-11} y={-52} width={22} height={6} fill="#339af0" />
      <rect x={-6} y={-59} width={12} height={7} fill="#4dabf7" />
      <rect x={-6} y={-62} width={12} height={3} fill="#ffffff" />
      <rect x={-6} y={-14} width={12} height={14} fill="#3f6f92" />
      <rect x={-15} y={-22} width={5} height={7} fill="#1864ab" />
      <rect x={10} y={-22} width={5} height={7} fill="#1864ab" />
      <rect x={-20} y={-44} width={3} height={5} fill="#ffffff" className="ow-sparkle" />
      <rect x={30} y={-38} width={3} height={5} fill="#ffffff" className="ow-sparkle" />
    </g>
  );
}

function PyramidSprite() {
  return (
    <g>
      <GroundShadow w={92} />
      <rect x={-48} y={-11} width={96} height={11} fill="#c99a56" />
      <rect x={-38} y={-22} width={76} height={11} fill="#d2a765" />
      <rect x={-28} y={-33} width={56} height={11} fill="#dcb474" />
      <rect x={-18} y={-44} width={36} height={11} fill="#e6c286" />
      <rect x={-9} y={-54} width={18} height={10} fill="#f0d29c" />
      <rect x={-48} y={-11} width={8} height={11} fill="#8f6b38" />
      <rect x={-38} y={-22} width={8} height={11} fill="#8f6b38" />
      <rect x={-28} y={-33} width={8} height={11} fill="#8f6b38" />
      <rect x={-18} y={-44} width={8} height={11} fill="#8f6b38" />
      <rect x={-9} y={-54} width={6} height={10} fill="#8f6b38" />
      <rect x={-6} y={-11} width={12} height={11} fill="#5d4423" />
    </g>
  );
}

function VolcanoSprite() {
  return (
    <g>
      <GroundShadow w={92} />
      {/* 계단식 원뿔 (섬 지면보다 확실히 어둡게) */}
      <rect x={-46} y={-14} width={92} height={14} fill="#3a2a26" />
      <rect x={-36} y={-28} width={72} height={14} fill="#463229" />
      <rect x={-27} y={-41} width={54} height={13} fill="#52392e" />
      <rect x={-19} y={-53} width={38} height={12} fill="#5d4233" />
      {/* 분화구 림 + 용암 */}
      <rect x={-15} y={-61} width={30} height={8} fill="#2b1f1c" />
      <rect x={-11} y={-59} width={22} height={5} fill="#ff7a1a" />
      <rect x={-6} y={-58} width={12} height={3} fill="#ffd43b" className="ow-lava" />
      {/* 흘러내리는 용암 줄기 */}
      <rect x={8} y={-53} width={5} height={17} fill="#ff7a1a" className="ow-lava" />
      <rect x={10} y={-36} width={4} height={10} fill="#ff922b" />
      <rect x={-14} y={-51} width={4} height={13} fill="#ff922b" />
      <rect x={-16} y={-38} width={4} height={8} fill="#ff7a1a" className="ow-lava" />
      {/* 균열 */}
      <rect x={-30} y={-24} width={9} height={3} fill="#ff7a1a" opacity={0.85} />
      <rect x={18} y={-33} width={8} height={3} fill="#ff922b" opacity={0.8} />
      {/* 연기 */}
      <g className="ow-smoke">
        <rect x={-5} y={-75} width={12} height={9} fill="#cbd5e1" />
        <rect x={4} y={-89} width={14} height={10} fill="#dee2e6" />
      </g>
      <rect x={-34} y={-20} width={6} height={4} fill="#2b1f1c" />
      <rect x={24} y={-25} width={6} height={4} fill="#2b1f1c" />
    </g>
  );
}

function CitadelSprite() {
  return (
    <g>
      <GroundShadow w={84} />
      <rect x={-38} y={-3} width={72} height={4} fill="#a855f7" className="ow-neon" />
      <rect x={-36} y={-54} width={20} height={54} fill="#1b1435" />
      <rect x={-16} y={-38} width={12} height={4} fill="#2a2154" />
      <rect x={-6} y={-82} width={22} height={82} fill="#221a44" />
      <rect x={18} y={-46} width={17} height={46} fill="#191233" />
      {[-31, -24].map((x) =>
        [-48, -38, -28, -18].map((y) => (
          <rect key={`${x}${y}`} x={x} y={y} width={4} height={4} fill={(x + y) % 3 === 0 ? "#f0abfc" : "#22d3ee"} />
        )),
      )}
      {[-1, 7].map((x) =>
        [-74, -62, -50, -38, -26, -14].map((y, i) => (
          <rect
            key={`${x}${y}`}
            x={x}
            y={y}
            width={4}
            height={5}
            fill={i % 2 === 0 ? "#22d3ee" : "#f0abfc"}
            className={i === 2 ? "ow-blinkA" : i === 5 ? "ow-blinkB" : undefined}
          />
        )),
      )}
      {[22, 29].map((x) =>
        [-40, -30, -20].map((y) => (
          <rect key={`${x}${y}`} x={x} y={y} width={4} height={4} fill="#22d3ee" />
        )),
      )}
      <rect x={3} y={-98} width={3} height={16} fill="#56607a" />
      <rect x={2} y={-103} width={5} height={5} fill="#f43f5e" className="ow-blinkA" />
    </g>
  );
}

function PropSprite({ kind, themeId }: { kind: PropKind; themeId: ThemeId }) {
  switch (kind) {
    case "tree": return <TreeSprite />;
    case "bush": return <BushSprite />;
    case "pond": return <PondSprite />;
    case "rock": return <RockSprite themeId={themeId} />;
    case "pine": return <PineSprite />;
    case "snowman": return <SnowmanSprite />;
    case "crystal": return <CrystalSprite />;
    case "cactus": return <CactusSprite />;
    case "palm": return <PalmSprite />;
    case "dune": return <DuneSprite />;
    case "deadtree": return <DeadTreeSprite />;
    case "lavapool": return <LavaPoolSprite />;
    case "ember": return <EmberSprite />;
    case "tower": return <TowerSprite />;
    case "sign": return <SignSprite />;
    case "holotree": return <HoloTreeSprite />;
    case "flagpole": return <FlagpoleSprite themeId={themeId} />;
    case "castle": return <CastleSprite />;
    case "icecastle": return <IceCastleSprite />;
    case "pyramid": return <PyramidSprite />;
    case "volcano": return <VolcanoSprite />;
    case "citadel": return <CitadelSprite />;
    default: return null;
  }
}

// --- 바다 장식 ---------------------------------------------------------------

function WaveTick() {
  return (
    <g fill={OCEAN.wave}>
      <rect x={-12} y={0} width={8} height={3} />
      <rect x={-4} y={-4} width={8} height={3} />
      <rect x={4} y={0} width={8} height={3} />
    </g>
  );
}

function CloudSprite() {
  return (
    <g>
      <rect x={-44} y={-12} width={88} height={20} fill="#ffffff" />
      <rect x={-30} y={-24} width={26} height={14} fill="#ffffff" />
      <rect x={0} y={-22} width={22} height={12} fill="#ffffff" />
      <rect x={-10} y={-30} width={16} height={8} fill="#ffffff" />
      <rect x={-44} y={4} width={88} height={5} fill="#d9e9f6" />
    </g>
  );
}

function ShipSprite() {
  return (
    <g className="ow-ship">
      <rect x={-16} y={-8} width={32} height={9} fill="#7a4a2b" />
      <rect x={-16} y={-10} width={32} height={3} fill="#955d34" />
      <rect x={-1} y={-30} width={3} height={20} fill="#4a2f1d" />
      <rect x={3} y={-28} width={13} height={15} fill="#f5f0e2" />
      <rect x={3} y={-28} width={13} height={3} fill="#e03131" />
      <rect x={-1} y={-34} width={8} height={4} fill="#e03131" />
    </g>
  );
}

function SerpentSprite() {
  return (
    <g className="ow-serpent">
      <rect x={-40} y={-8} width={16} height={8} fill="#2b7a8c" />
      <rect x={-37} y={-12} width={10} height={4} fill="#3fa7bd" />
      <rect x={-14} y={-9} width={16} height={9} fill="#2b7a8c" />
      <rect x={-11} y={-13} width={10} height={4} fill="#3fa7bd" />
      <rect x={12} y={-18} width={14} height={18} fill="#2b7a8c" />
      <rect x={14} y={-22} width={12} height={6} fill="#3fa7bd" />
      <rect x={22} y={-16} width={3} height={3} fill="#ffffff" />
      <rect x={26} y={-12} width={6} height={2} fill="#e03131" />
    </g>
  );
}

function WhirlpoolSprite() {
  return (
    <g className="ow-spin" fill="none" strokeDasharray="7 8">
      <circle r={20} stroke="#cfeafc" strokeWidth={3} />
      <circle r={13} stroke="#9fd4f2" strokeWidth={3} />
      <circle r={6} stroke={OCEAN.wave} strokeWidth={3} />
    </g>
  );
}

function IsletSprite({ i }: { i: number }) {
  const kind = i % 3;
  return (
    <g>
      <rect x={-26} y={-7} width={52} height={16} fill={OCEAN.halo} />
      <rect x={-20} y={-4} width={40} height={11} fill="#8fd4f2" />
      {kind === 0 && (
        <>
          <rect x={-16} y={-2} width={32} height={7} fill="#eed9a2" />
          <g transform="translate(0,2) scale(1.05)"><PalmSprite /></g>
        </>
      )}
      {kind === 1 && (
        <>
          <rect x={-16} y={-2} width={32} height={7} fill="#8fce74" />
          <g transform="translate(0,2) scale(0.95)"><TreeSprite /></g>
        </>
      )}
      {kind === 2 && (
        <g transform="translate(0,2) scale(1.1)"><RockSprite themeId="forest" /></g>
      )}
    </g>
  );
}

function BirdSprite() {
  return (
    <g fill="#1e4f74" className="ow-bird">
      <rect x={-10} y={-3} width={8} height={3} />
      <rect x={-3} y={-6} width={6} height={3} />
      <rect x={3} y={-3} width={8} height={3} />
    </g>
  );
}

function CompassSprite() {
  return (
    <g opacity={0.92}>
      <path d="M0,-34 L8,-8 L34,0 L8,8 L0,34 L-8,8 L-34,0 L-8,-8 Z" fill="#e9d8ac" stroke="#1d4f7c" strokeWidth={3} />
      <path d="M0,-20 L5,-5 L20,0 L5,5 L0,20 L-5,5 L-20,0 L-5,-5 Z" fill="#c9a25e" />
      <rect x={-3} y={-3} width={6} height={6} fill="#7a5a34" />
      <text x={0} y={-42} textAnchor="middle" fontSize={15} fill="#eaf6ff" className="ow-txt" fontWeight="bold">N</text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// 섬 (영토) 렌더링
// ---------------------------------------------------------------------------

// 테마별 바닥 질감 조각
function GroundAccent({ themeId, v }: { themeId: ThemeId; v: number }) {
  switch (themeId) {
    case "forest":
      if (v === 0) {
        return (
          <g fill="#5cae4a">
            <rect x={-4} y={-2} width={3} height={3} />
            <rect x={1} y={-4} width={3} height={3} />
          </g>
        );
      }
      if (v === 1) {
        return (
          <g>
            <rect x={-2} y={-4} width={5} height={4} fill="#ffffff" />
            <rect x={-1} y={-3} width={3} height={2} fill="#ffd43b" />
          </g>
        );
      }
      return <rect x={-3} y={-2} width={6} height={3} fill="#63bd52" />;
    case "desert":
      return (
        <g fill="#d8b16a">
          <rect x={-6} y={-2} width={12} height={2} />
          {v !== 1 && <rect x={-2} y={-5} width={9} height={2} />}
        </g>
      );
    case "winter":
      if (v === 0) return <rect x={-5} y={-2} width={10} height={3} fill="#dbeaf4" />;
      return (
        <g>
          <rect x={-4} y={-3} width={8} height={2} fill="#ffffff" />
          <rect x={-1} y={-5} width={4} height={2} fill="#dbeaf4" />
        </g>
      );
    case "volcano":
      if (v === 0) {
        return (
          <g fill="#3c2b27">
            <rect x={-5} y={-2} width={10} height={2} />
            <rect x={2} y={-4} width={5} height={2} />
          </g>
        );
      }
      if (v === 1) return <rect x={-2} y={-3} width={3} height={3} fill="#ff7a1a" className="ow-lava" />;
      return <rect x={-4} y={-2} width={7} height={2} fill="#59413a" />;
    case "cyberpunk":
      if (v === 0) return <rect x={-13} y={-2} width={26} height={2} fill="#a855f7" opacity={0.4} />;
      if (v === 1) return <rect x={-2} y={-4} width={4} height={4} fill="#2dd4bf" opacity={0.6} />;
      return <rect x={-8} y={-2} width={8} height={2} fill="#6366f1" opacity={0.4} />;
    default:
      return null;
  }
}

// 섬 위 하늘에 떠 있는 이름 현판 (클릭 대상임을 알리는 호버 화살표 포함)
function IslandBanner({ island }: { island: IslandSpec }) {
  const t = TERRAIN[island.themeId];
  const top = island.bannerTop;
  const plateW = island.plateW;
  const barX = -plateW / 2 + 12;
  const barW = plateW - 24 - 48;
  const pctText = `${Math.round(island.pct * 100)}%`;

  return (
    <g className="ow-flagbob">
      <rect x={-plateW / 2 + 4} y={top + 4} width={plateW} height={54} fill="#000000" />
      <rect x={-plateW / 2} y={top} width={plateW} height={54} fill="#1c1c1c" stroke="#000000" strokeWidth={3} className="ow-plate-body" />
      <rect x={-plateW / 2 + 10} y={top + 11} width={12} height={12} fill={t.pennant} stroke="#000000" strokeWidth={2} />
      <text x={7} y={top + 23} textAnchor="middle" fontSize={17} fill="#ffffff" className="ow-txt">
        {island.pct >= 1 && <tspan fill="#FFE128">★ </tspan>}
        {island.label}
      </text>
      <rect x={barX} y={top + 34} width={barW} height={10} fill="#3c3c3c" stroke="#000000" strokeWidth={2} />
      <rect x={barX} y={top + 34} width={Math.round(barW * island.pct)} height={10} fill="#FFE128" />
      <text x={plateW / 2 - 10} y={top + 44} textAnchor="end" fontSize={13} fill="#FFE128" className="ow-txt">
        {pctText}
      </text>
      {/* 호버 시 섬을 가리키는 화살표 */}
      <path
        d={`M-10,${top + 62} L10,${top + 62} L0,${top + 76} Z`}
        fill="#FFE128"
        stroke="#000000"
        strokeWidth={2}
        className="ow-hint"
      />
    </g>
  );
}

function Island({ island, onSelect }: { island: IslandSpec; onSelect: (id: string) => void }) {
  const t = TERRAIN[island.themeId];
  const themeName = THEMES[island.themeId].name;

  return (
    <g transform={`translate(${island.cx},${island.cy})`}>
      <g
        className="ow-hit"
        role="button"
        tabIndex={0}
        aria-label={`${island.title} 로드맵 열기`}
        onClick={() => onSelect(island.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(island.id);
          }
        }}
      >
        <title>{`${island.title} · ${themeName} 영토 — ${island.done}/${island.total} 완료 (${Math.round(island.pct * 100)}%)`}</title>
        <g className="ow-hover">
          {/* 물 → 모래 → 절벽 → 땅 순서로 쌓는다 */}
          <path d={shapePath(island.shape, 1.32)} fill={OCEAN.halo} />
          <path d={shapePath(island.shape, 1.2)} fill={t.ring} />
          {island.ringWaves.map(([wx, wy], i) => (
            <g key={i} transform={`translate(${wx},${wy})`} className="ow-wave" style={{ animationDelay: `${(i % 3) * 1.1}s` }}>
              <WaveTick />
            </g>
          ))}
          <path d={shapePath(island.shape, 1.1)} fill={t.sand} stroke={OCEAN.line} strokeWidth={3} />
          <path d={shapePath(island.shape, 1, 14)} fill={t.cliff} />
          <path d={shapePath(island.shape, 1)} fill={t.land} />
          <path d={shapePath(island.shape, 0.78, -6)} fill={t.landLight} />
          {/* 바닥 질감 */}
          {island.accents.map(([ax, ay, v], i) => (
            <g key={i} transform={`translate(${ax},${ay}) scale(1.35)`}>
              <GroundAccent themeId={island.themeId} v={v} />
            </g>
          ))}
          {/* 오솔길 */}
          {island.trail.map(([tx, ty], i) => (
            <rect key={i} x={tx - 3} y={ty - 2} width={6} height={5} fill={t.trail} opacity={0.9} />
          ))}
          {/* 소품 + 랜드마크 + 깃대 (y 정렬 → 아래 있는 것이 앞에 그려짐) */}
          {island.props.map((p, i) => (
            <g key={i} transform={`translate(${p.x},${p.y}) scale(${p.s})`}>
              <PropSprite kind={p.kind} themeId={island.themeId} />
            </g>
          ))}
          {/* 최근 작업한 로드맵 섬에는 캐릭터가 서 있다 */}
          {island.heroIcon && island.heroPos && (
            <g transform={`translate(${island.heroPos[0]},${island.heroPos[1]})`}>
              <rect x={-13} y={-3} width={26} height={5} fill="rgba(0,0,0,0.2)" />
              <image
                href={island.heroIcon}
                x={-32}
                y={-64}
                width={64}
                height={64}
                style={{ imageRendering: "pixelated" }}
              />
            </g>
          )}
          <IslandBanner island={island} />
        </g>
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// 빈 상태 / 로딩
// ---------------------------------------------------------------------------

function EmptyIsland({ cx, cy, onCreate }: { cx: number; cy: number; onCreate: () => void }) {
  const shape = useMemo(() => makeShape(mulberry32(hashString("zarami-first-adventure")), 215), []);
  const t = TERRAIN.forest;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <g
        className="ow-hit"
        role="button"
        tabIndex={0}
        aria-label="새 로드맵 만들기"
        onClick={onCreate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCreate();
          }
        }}
      >
        <title>새 로드맵을 만들어 첫 영토를 개척해 보세요!</title>
        <g className="ow-hover">
          <path d={shapePath(shape, 1.32)} fill={OCEAN.halo} />
          <path d={shapePath(shape, 1.2)} fill={t.ring} />
          <path d={shapePath(shape, 1.1)} fill={t.sand} stroke={OCEAN.line} strokeWidth={3} />
          <path d={shapePath(shape, 1, 14)} fill={t.cliff} />
          <path d={shapePath(shape, 1)} fill={t.land} />
          <path d={shapePath(shape, 0.78, -6)} fill={t.landLight} />
          <g transform="translate(-130,-30)"><TreeSprite /></g>
          <g transform="translate(-80,40) scale(1.2)"><TreeSprite /></g>
          <g transform="translate(130,-10)"><TreeSprite /></g>
          <g transform="translate(90,60) scale(0.9)"><BushSprite /></g>
          <g transform="translate(-30,90) scale(0.9)"><RockSprite themeId="forest" /></g>
          <g transform="translate(124,52)">
            <rect x={-13} y={-3} width={26} height={5} fill="rgba(0,0,0,0.2)" />
            <image
              href="/images/characters/hero.png"
              x={-32}
              y={-64}
              width={64}
              height={64}
              style={{ imageRendering: "pixelated" }}
            />
          </g>
          {/* 표지판 */}
          <g className="ow-flagbob">
            <rect x={-24} y={-26} width={8} height={28} fill="#6b4226" stroke="#000000" strokeWidth={2} />
            <rect x={16} y={-26} width={8} height={28} fill="#6b4226" stroke="#000000" strokeWidth={2} />
            <rect x={-126} y={-96} width={252} height={74} fill="#000000" opacity={0.9} transform="translate(4,4)" />
            <rect x={-126} y={-96} width={252} height={74} fill="#b98a4e" stroke="#000000" strokeWidth={3} className="ow-plate-body" />
            <text x={0} y={-70} textAnchor="middle" fontSize={17} fill="#3b2a1a" className="ow-txt">
              아직 개척한 영토가 없어!
            </text>
            <rect x={-92} y={-58} width={184} height={26} fill="#FFE128" stroke="#000000" strokeWidth={2} />
            <text x={0} y={-40} textAnchor="middle" fontSize={16} fill="#000000" className="ow-txt">
              + 새 로드맵 만들기
            </text>
          </g>
        </g>
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// 메인 컴포넌트
// ---------------------------------------------------------------------------

const OVERWORLD_CSS = `
  .ow-hit { cursor: pointer; outline: none; }
  .ow-hover { transition: transform .25s ease; }
  .ow-hit:hover .ow-hover, .ow-hit:focus-visible .ow-hover { transform: translateY(-7px); }
  .ow-hit:active .ow-hover { transform: translateY(-2px); }
  .ow-hit:hover .ow-plate-body, .ow-hit:focus-visible .ow-plate-body { stroke: #FFE128; }
  .ow-hint { opacity: 0; transition: opacity .2s ease; }
  .ow-hit:hover .ow-hint, .ow-hit:focus-visible .ow-hint { opacity: 1; }
  .ow-txt { font-family: 'Galmuri11', 'Courier New', monospace; }
  .ow-flagbob { animation: owBob 2.6s ease-in-out infinite; }
  @keyframes owBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  .ow-cloud { animation: owDrift 30s ease-in-out infinite alternate; }
  @keyframes owDrift { from { transform: translateX(-24px); } to { transform: translateX(24px); } }
  .ow-wave { animation: owWave 3.6s ease-in-out infinite; }
  @keyframes owWave { 0%, 100% { opacity: .15; } 50% { opacity: .85; } }
  .ow-lava { animation: owLava 2.1s ease-in-out infinite; }
  @keyframes owLava { 0%, 100% { opacity: .6; } 50% { opacity: 1; } }
  .ow-smoke { animation: owSmoke 4.2s linear infinite; }
  @keyframes owSmoke { 0% { transform: translateY(8px); opacity: 0; } 30% { opacity: .85; } 100% { transform: translateY(-26px); opacity: 0; } }
  .ow-blinkA { animation: owBlink 1.6s steps(2, end) infinite; }
  .ow-blinkB { animation: owBlink 2.3s steps(2, end) infinite .6s; }
  @keyframes owBlink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: .2; } }
  .ow-neon { animation: owNeon 3s ease-in-out infinite; }
  @keyframes owNeon { 0%, 100% { opacity: .65; } 50% { opacity: 1; } }
  .ow-spin { animation: owSpin 8s linear infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes owSpin { to { transform: rotate(360deg); } }
  .ow-ship { animation: owShipBob 2.8s ease-in-out infinite; }
  @keyframes owShipBob { 0%, 100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-3px) rotate(1.5deg); } }
  .ow-serpent { animation: owSerp 3.4s ease-in-out infinite; }
  @keyframes owSerp { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  .ow-sparkle { animation: owWave 2.4s ease-in-out infinite; }
  .ow-holo { animation: owNeon 2.2s ease-in-out infinite; }
  .ow-bird { animation: owBob 3.2s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .ow-flagbob, .ow-cloud, .ow-wave, .ow-lava, .ow-smoke, .ow-blinkA, .ow-blinkB,
    .ow-neon, .ow-spin, .ow-ship, .ow-serpent, .ow-sparkle, .ow-holo, .ow-bird { animation: none; }
  }
`;

interface OverworldMapProps {
  trees: OverworldTree[] | undefined; // undefined = 아직 로딩 중
  onSelectTree: (treeId: string) => void;
  onCreateTree: () => void;
}

export function OverworldMap({ trees, onSelectTree, onCreateTree }: OverworldMapProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setPortrait(rect.height > rect.width * 1.05);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = portrait ? 1000 : 1600;
  const H = portrait ? 1600 : 1000;
  const loading = trees === undefined;

  const world = useMemo(() => buildWorld(trees ?? [], portrait), [trees, portrait]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" style={{ backgroundColor: OCEAN.base }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full overflow-visible"
        shapeRendering="crispEdges"
      >
        <defs>
          <style>{OVERWORLD_CSS}</style>
        </defs>

        {/* 심해 얼룩 */}
        {world.deepPatches.map((p, i) => (
          <g key={i} transform={`translate(${p.x},${p.y})`}>
            <path d={p.path} fill={OCEAN.deep} />
          </g>
        ))}

        {/* 잔파도 */}
        {world.waves.map((w, i) => (
          <g key={i} transform={`translate(${w.x},${w.y})`} className="ow-wave" style={{ animationDelay: `${w.delay}s` }}>
            <WaveTick />
          </g>
        ))}

        {/* 바다 장식 */}
        {world.islets.map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <IsletSprite i={i} />
          </g>
        ))}
        {world.whirlpool && (
          <g transform={`translate(${world.whirlpool[0]},${world.whirlpool[1]})`}>
            <WhirlpoolSprite />
          </g>
        )}
        {world.serpent && (
          <g transform={`translate(${world.serpent[0]},${world.serpent[1]}) scale(1.5)`}>
            <SerpentSprite />
          </g>
        )}

        {/* 항로 + 배 */}
        {world.routes.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#e8f6ff" strokeWidth={4} strokeDasharray="8 10" opacity={0.55} />
        ))}
        {world.shipPath && (
          <g>
            <ShipSprite />
            <animateMotion
              dur={`${Math.max(world.islands.length * 16, 24)}s`}
              repeatCount="indefinite"
              path={world.shipPath}
              calcMode="linear"
              keyPoints="0;1;0"
              keyTimes="0;0.5;1"
            />
          </g>
        )}

        {/* 구름 (현판을 가리지 않도록 섬 아래 레이어에 깔린다) */}
        {world.clouds.map((c, i) => (
          <g key={i} transform={`translate(${c.x},${c.y}) scale(${c.s})`}>
            <g className="ow-cloud" style={{ animationDelay: `${-c.delay}s`, animationDuration: `${c.dur}s` }}>
              <CloudSprite />
            </g>
          </g>
        ))}

        {/* 영토 (북쪽 섬부터 그려서 자연스러운 겹침) */}
        {[...world.islands]
          .sort((a, b) => a.cy - b.cy)
          .map((island) => (
            <Island key={island.id} island={island} onSelect={onSelectTree} />
          ))}

        {!loading && world.islands.length === 0 && (
          <EmptyIsland cx={W / 2} cy={Math.round(H * 0.52)} onCreate={onCreateTree} />
        )}

        {/* 나침반 */}
        <g transform={`translate(${world.compass[0]},${world.compass[1]})`}>
          <CompassSprite />
        </g>

        {/* 새 */}
        {world.birds.map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`} style={{ animationDelay: `${i * 1.4}s` }}>
            <BirdSprite />
          </g>
        ))}

        {loading && (
          <g transform={`translate(${W / 2},${H / 2})`}>
            <g className="ow-flagbob">
              <rect x={-146} y={-24} width={300} height={56} fill="#000000" transform="translate(4,4)" />
              <rect x={-146} y={-24} width={300} height={56} fill="#1c1c1c" stroke="#000000" strokeWidth={3} />
              <text x={4} y={10} textAnchor="middle" fontSize={18} fill="#ffffff" className="ow-txt">
                지도를 펼치는 중...
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
