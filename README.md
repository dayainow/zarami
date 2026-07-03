# 🌿 자람이 (Zarami)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdayainow%2Fzarami)
**🚀 Live Demo:** [https://zarami.vercel.app](https://zarami.vercel.app) *(배포 후 실제 URL로 변경해주세요)*
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
- **Data 파이프라인**: TanStack Query(오프라인 뮤테이션 큐잉), Anthropic API + GitHub Actions(주간 채용 트렌드 배치)

## 로컬 실행 (Getting Started)

```bash
npm install
cp .env.local.example .env.local   # 값 채우기 (아래 환경 변수 참고)
npm run dev                        # http://localhost:3000
```

로컬 Supabase 환경이 필요하면 Docker 실행 후:

```bash
npx supabase start   # supabase/migrations 의 스키마를 로컬 DB에 적용
```

### 환경 변수

| 변수 | 사용처 | 비고 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저/서버 Supabase 클라이언트 | 클라이언트 번들에 노출됨 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저/서버 Supabase 클라이언트 | 클라이언트 번들에 노출됨 |
| `SUPABASE_URL` | `scripts/update-trend.ts` (배치 스크립트 전용) | 서버 전용, 클라이언트에 노출 금지 |
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/update-trend.ts` (배치 스크립트 전용) | RLS 우회 — 서버 전용, 클라이언트에 노출 금지 |
| `ANTHROPIC_API_KEY` | `scripts/update-trend.ts` (배치 스크립트 전용) | 서버 전용 |

### 주간 채용 트렌드 배치 (수동 실행)

```bash
npm run update-trend
```

`.github/workflows/job-trend-pipeline.yml`이 매주 월요일 00:00 KST에 동일한 스크립트를 자동 실행합니다 — GitHub 저장소 Secrets에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`(Anthropic API 키)를 등록해야 합니다.

## 배포 (Deployment, Vercel 기준)

1. Vercel에 저장소를 연결하고 빌드 커맨드는 기본값(`next build`)을 사용합니다.
2. Vercel 프로젝트 환경 변수에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 등록합니다(Production/Preview 모두).
3. `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY`는 Vercel에는 필요 없습니다 — 배치 스크립트는 Vercel이 아닌 GitHub Actions에서 실행되므로 해당 값들은 GitHub 저장소 Secrets에만 등록하면 됩니다.
4. 실제 Supabase 프로젝트에 `supabase/migrations`의 스키마를 적용합니다: `npx supabase link --project-ref <ref>` 후 `npx supabase db push`.
5. 배포 전 로컬에서 최종 점검: `npm run build && npx tsc --noEmit && npm run lint`.

## 🛠️ AI 연동 및 자동화 워크플로우 (Jira & Claude Code)

프로젝트 고도화 관리를 위해 Jira와 AI 코딩 어시스턴트를 활용한 자동화 워크플로우가 세팅되어 있습니다.

1. `.env.local.example`에 명시된 `JIRA_*` 환경 변수 4가지를 `.env.local`에 복사하고 자신의 Jira 자격 증명으로 채웁니다.
2. `CLAUDE.md` 파일에 정의된 프롬프트 양식에 따라 Claude Code (또는 Gemini, Cursor 등 터미널 제어 권한이 있는 AI)에게 지시를 내리면, AI가 직접 Jira API를 호출해 티켓 상태를 업데이트하고 코드를 작성하여 Pull Request까지 생성해줍니다.
3. 세부 프롬프트 템플릿과 Jira 이슈 타입 ID 등은 프로젝트 최상단의 `CLAUDE.md`를 참고해 주세요!
