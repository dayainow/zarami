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
- [x] KAN-5: 다크 모드 토글 및 UI 폴리싱

🎉 **V2.0 릴리즈 로드맵이 모두 성공적으로 완료되었습니다!**

## [V3.0 로드맵: 내 트리 관리 및 UX 확장]

- [x] KAN-6: 전역 네비게이션(사이드바) 및 내 트리 커스텀 편집기
- [ ] KAN-7: 개인화된 스킬 트리 DB 연동 및 동적 렌더링
- [ ] KAN-8: 유저 랭킹(리더보드) 및 소셜 기능 추가

## [최근 완료된 작업]

- **[KAN-6] 글로벌 네비게이션 및 내 트리 관리** (담당: 고속 UI 빌더 Codex)
  - 목표: 전역 사이드바 레이아웃 도입 및 커스텀 트리를 위한 '내 트리 관리' 화면 구축
  - `src/components/layout/Sidebar.tsx` 제작 및 `app/layout.tsx`에 배치 (ThemeToggle 통합)
  - `src/app/manage-tree` 라우트 신설 및 `ManageTreeClient` UI 뼈대 구현 (DIY 에디터형)
  - 기존 각 화면(`DashboardClient`, `ProfileClient` 등)의 상단 영역과 사이드바가 충돌하지 않도록 레이아웃 리팩토링
  - 새 노드 추가/선택, 노드 기본 정보 편집, 연결선 생성, JSON 복사 흐름 검증 완료
