# 🌿 자람이 (Zarami)

**개인화 동적 기술트리 기반 커리어 가이드 서비스**

주니어 프론트엔드 개발자가 미들/시니어 레벨로 성장하는 과정에서 겪는 '학습 방향성 상실' 문제를 해결하기 위한 개인화 동적 로드맵 플랫폼입니다. 
'아는 지식은 영리하게 건너뛰고', 실무 채용 시장 데이터를 반영한 '가장 트렌디한 다음 행동'을 게임화된 UX로 제공합니다.

## 핵심 기능 (Core Features)
1. **Optimistic Updates & Viewport Lock**: 즉각적인 피드백과 안정적인 React Flow 캔버스 조작 환경
2. **Guest Data & Migration Pipeline**: 비회원 데이터 로컬 저장 및 로그인 시 안전한 데이터 병합 (Supabase Upsert)
3. **Offline Queueing**: 오프라인 상태 트래킹 및 뮤테이션 큐잉 (TanStack Query 연동)
4. **Gamification**: 기술 마스터 개수에 따른 반려식물 진화 (씨앗 -> 새싹 -> 줄기 -> 개화)

## 기술 스택 (Tech Stack)
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, React Flow v11, Zustand
- **Backend & DB**: Supabase (PostgreSQL, GoTrue Auth)
