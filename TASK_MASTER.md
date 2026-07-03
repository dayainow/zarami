# 🌿 자람이(Zarami) 프로젝트 관리 대장

## [Role]

- **총괄 PM/팀장**: Gemini 1.5 Pro (전체 아키텍처 리드 및 태스크 분배)
- **메인 엔지니어**: Claude 3.5 Sonnet (핵심 로직 및 스토어 구현)[cite: 3]
- **고속 UI 빌더**: Codex (컴포넌트 및 UI 스타일링)[cite: 3]

## [로드맵 및 진척 현황]

- [x] 1단계: Supabase DB 스키마 및 인덱스 세팅
- [x] 2단계: Zustand 스토어 및 데이터 마이그레이션 코어 구현[cite: 3]
- [x] 3단계: React Flow 캔버스 & 드로워 UI 양산[cite: 3]
- [x] 4단계: 에러 핸들링 및 오프라인 복구 레이어 탑재[cite: 3]
- [x] 5단계: AI 채용 데이터 마이닝 파이프라인 연동[cite: 3]
- [x] 6단계: 전체 정합성 오디팅 및 배포[cite: 3]

## [V2.0 로드맵 및 진척 현황]

- [x] KAN-2: Vercel 프로덕션 배포 및 CI 연동
- [x] KAN-3: 유저 프로필 및 통계 대시보드 화면
- [x] KAN-4: 스킬 노드 어드민(Admin) 편집기
- [ ] KAN-5: 다크 모드 토글 및 UI 폴리싱

## [현재 진행 중인 작업]

- **[KAN-5] 다크 모드 토글 및 UI 폴리싱** (담당: 고속 UI 빌더 Codex)
  - 목표: Light/Dark 모드 완벽 대응 및 '글래스모피즘(Glassmorphism)' 스타일 기반 화사한 UI 폴리싱
  - `next-themes`의 `ThemeProvider` 세팅 (`app/layout.tsx` 등)
  - `ThemeToggle` 컴포넌트 생성 및 헤더 배치
  - 앱 전반(`ProfileClient`, `AdminEditorClient`, `DashboardClient` 등)의 하드코딩된 다크 테마 컬러를 `bg-slate-50 dark:bg-slate-950` 등 라이트/다크 대응 형태로 전면 교체
  - 블러(backdrop-blur) 및 부드러운 애니메이션(transition) 효과 추가
