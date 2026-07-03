import type { SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

export const dashboardSkillNodes: SkillTreeNode[] = [
  {
    id: "web-foundation",
    type: "skill",
    position: { x: 0, y: 80 },
    data: {
      id: "web-foundation",
      title: "웹 기초 체력",
      description: "HTML, CSS, 접근성, 브라우저 렌더링의 기본기를 다집니다.",
      category: "Core",
      level: 1,
      estimatedMinutes: 45,
      is_completed: true,
      questMarkdown:
        "## 실무 퀘스트\n\n시맨틱 HTML로 카드 목록을 만들고 키보드 탐색이 가능한 인터랙션을 붙입니다.\n\n### 산출물\n\n- 반응형 카드 레이아웃\n- 포커스 링과 aria-label 적용\n- Lighthouse 접근성 점검",
      checklist: ["시맨틱 태그 사용", "모바일 360px 폭 확인", "키보드 포커스 순서 검수"],
    },
  },
  {
    id: "react-components",
    type: "skill",
    position: { x: 340, y: -60 },
    data: {
      id: "react-components",
      title: "React 컴포넌트 설계",
      description: "상태와 표현을 분리하고 재사용 가능한 UI 단위를 설계합니다.",
      category: "Frontend",
      level: 2,
      estimatedMinutes: 60,
      prerequisiteIds: ["web-foundation"],
      questMarkdown:
        "## 실무 퀘스트\n\n스킬 카드와 상세 패널을 각각 독립 컴포넌트로 분리하고 props 계약을 명확히 정의합니다.\n\n### 리뷰 포인트\n\n- 컴포넌트 책임이 한 문장으로 설명되는가\n- 리스트 렌더링에 안정적인 key를 쓰는가\n- 불필요한 re-render 구독이 없는가",
      checklist: ["props 타입 정의", "상태 구독 최소화", "반복 UI 컴포넌트 추출"],
    },
  },
  {
    id: "state-zustand",
    type: "skill",
    position: { x: 340, y: 220 },
    data: {
      id: "state-zustand",
      title: "Zustand 상태 운영",
      description: "전역 UI 상태와 게스트 진행도를 persist로 관리합니다.",
      category: "Architecture",
      level: 2,
      estimatedMinutes: 50,
      prerequisiteIds: ["web-foundation"],
      questMarkdown:
        "## 실무 퀘스트\n\n완료 액션을 낙관적으로 반영하고 실패 시 이전 스냅샷으로 롤백하는 store 액션을 작성합니다.\n\n### 검수 기준\n\n- LocalStorage에 게스트 완료 목록 저장\n- 로그인 후 Supabase upsert 경로 준비\n- 실패 토스트 메시지 노출",
      checklist: ["persist key 확인", "낙관적 업데이트 적용", "롤백 경로 확인"],
    },
  },
  {
    id: "next-app-router",
    type: "skill",
    position: { x: 700, y: -60 },
    data: {
      id: "next-app-router",
      title: "Next.js App Router",
      description: "서버/클라이언트 경계를 나누고 URL 상태를 UI와 동기화합니다.",
      category: "Framework",
      level: 3,
      estimatedMinutes: 75,
      prerequisiteIds: ["react-components"],
      questMarkdown:
        "## 실무 퀘스트\n\n`/dashboard?node=id` URL 상태로 드로워를 직접 열 수 있게 만들고 새로고침 후에도 같은 노드가 선택되도록 합니다.\n\n### 구현 힌트\n\n- Server Component는 레이아웃 중심으로 유지\n- 상호작용은 leaf Client Component로 제한\n- URL 변경 시 스크롤 유지",
      checklist: ["searchParams 동기화", "직접 진입 검증", "닫기 시 URL 정리"],
    },
  },
  {
    id: "supabase-progress",
    type: "skill",
    position: { x: 700, y: 220 },
    data: {
      id: "supabase-progress",
      title: "Supabase 진행도 저장",
      description: "완료한 스킬을 사용자 계정에 안전하게 병합합니다.",
      category: "Backend",
      level: 3,
      estimatedMinutes: 80,
      prerequisiteIds: ["state-zustand"],
      questMarkdown:
        "## 실무 퀘스트\n\n게스트 완료 목록을 로그인 시 `user_skills` 테이블로 bulk upsert하고 중복 충돌을 무시합니다.\n\n### DB 계약\n\n- `user_id`, `skill_id` 복합 unique 기준\n- `is_completed` 기본값 true 또는 completion row 존재 기준\n- 성공 후 게스트 저장소 정리",
      checklist: ["upsert conflict 설정", "성공 후 localStorage 정리", "실패 토스트 확인"],
    },
  },
  {
    id: "offline-queue",
    type: "skill",
    position: { x: 1080, y: 80 },
    data: {
      id: "offline-queue",
      title: "오프라인 큐잉",
      description: "네트워크가 끊겨도 사용자의 완료 액션을 잃지 않습니다.",
      category: "Resilience",
      level: 4,
      estimatedMinutes: 90,
      prerequisiteIds: ["next-app-router", "supabase-progress"],
      questMarkdown:
        "## 실무 퀘스트\n\n네트워크 상태를 감지하고 오프라인 완료 요청을 큐에 넣은 뒤 재연결 시 순차적으로 flush합니다.\n\n### UX 기준\n\n- 상단 오프라인 배너\n- 중복 완료 방지\n- 재연결 후 성공/실패 결과 표시",
      checklist: ["navigator.onLine 감지", "큐 중복 방지", "재연결 flush 처리"],
    },
  },
];

export const dashboardSkillEdges: SkillTreeEdge[] = [
  {
    id: "web-foundation-react-components",
    source: "web-foundation",
    target: "react-components",
    type: "smoothstep",
    animated: true,
  },
  {
    id: "web-foundation-state-zustand",
    source: "web-foundation",
    target: "state-zustand",
    type: "smoothstep",
    animated: true,
  },
  {
    id: "react-components-next-app-router",
    source: "react-components",
    target: "next-app-router",
    type: "smoothstep",
  },
  {
    id: "state-zustand-supabase-progress",
    source: "state-zustand",
    target: "supabase-progress",
    type: "smoothstep",
  },
  {
    id: "next-app-router-offline-queue",
    source: "next-app-router",
    target: "offline-queue",
    type: "smoothstep",
  },
  {
    id: "supabase-progress-offline-queue",
    source: "supabase-progress",
    target: "offline-queue",
    type: "smoothstep",
  },
];
