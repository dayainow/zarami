export type Pt = [number, number];

export interface MapPathData {
  id: string;
  points: Pt[];
  isStraight?: boolean;
}

// 각 지도의 입구(하단) → 최종 목표(성)까지, 실제 길을 따라가는 정밀 꼭짓점 데이터.
// 곡선 렌더링(Catmull-Rom)을 기반으로 하며, isStraight가 true일 경우에만 직선으로 꺾인다.
export const MAP_PATHS: Record<string, MapPathData> = {
  forest: {
    id: "forest",
    points: [[500, 950], [500, 500], [870, 500], [870, 180], [500, 180], [500, 500], [240, 500]],
    isStraight: true, // 숲은 인공 다리와 90도 격자 길이므로 직선 사용
  },
  desert: {
    id: "desert",
    points: [[500, 950], [500, 800], [250, 800], [250, 600], [550, 600], [550, 500], [800, 500], [800, 250]],
    isStraight: true,
  },
  winter: {
    id: "winter",
    points: [[430, 950], [380, 850], [350, 750], [350, 650], [400, 550], [500, 480], [600, 420], [700, 350], [750, 280]],
  },
  volcano: {
    id: "volcano",
    points: [[50, 950], [450, 550], [550, 550], [620, 480], [620, 350]],
    isStraight: true,
  },
  cyberpunk: {
    id: "cyberpunk",
    points: [[50, 950], [450, 550], [550, 550], [620, 480], [620, 350]],
    isStraight: true,
  },
  sky: {
    id: "sky",
    points: [[500, 950], [500, 850], [500, 750], [400, 650], [350, 550], [500, 480], [500, 400], [600, 350], [700, 250], [800, 150]],
  },
  ocean: {
    id: "ocean",
    points: [[480, 950], [500, 850], [400, 750], [350, 650], [400, 550], [500, 500], [600, 450], [700, 400], [780, 350]],
  },
  ruins: {
    id: "ruins",
    points: [[500, 950], [500, 850], [450, 750], [350, 650], [300, 500], [350, 400], [450, 300], [550, 250], [650, 250], [750, 150]],
  },
};
