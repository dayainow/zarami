# 🌿 자람이 (Zarami)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdayainow%2Fzarami)
**🚀 Live Demo:** [https://zarami-iota.vercel.app](https://zarami-iota.vercel.app)
**실제 채용 시장 기반 개인화 커리어 로드맵 서비스**

단순한 지식 학습용 퀴즈나 추상적인 증명보다는, **실제 채용 공고 스펙을 기반으로 로드맵을 그리고, 학습 후 실제 입사 지원까지 직결되는 실전 지향형 커리어 가이드 서비스**입니다. 주니어 개발자가 미들/시니어 레벨로 성장하는 과정에서 겪는 '방향성 상실' 문제를 명확한 트렌드 데이터와 함께 해결해 드립니다.

## 핵심 가치 및 주요 기능 (Core Flow)

1. 🎯 **정확한 채용 스펙 트렌드 추출**
   - 원티드(Wanted), 점핏(Jumpit) 등 채용 사이트들의 최근 실제 백엔드/프론트엔드 채용 공고 스펙 트렌드를 직접 스크래핑하여 정확하게 가져옵니다.
   - 대시보드를 통해 현재 시장에서 가장 수요가 높은 기술(Trending Skills)을 투명하게 공개합니다.

2. 🗺️ **트렌드 기반 로드맵 생성 (with AI)**
   - 수집된 정확한 채용 정보를 기반으로, AI(Gemini & Groq Llama3)가 뻔하지 않은 현실적이고 실무적인 커리어 로드맵 트리를 만들어 줍니다.
   - 유저가 목표로 하는 회사의 채용 공고(JD)를 복사해 넣으면, 현재 보유한 스킬과 비교하여 **단기 갭 좁히기 스프린트 로드맵**을 그려주는 강력한 기능도 제공합니다.

3. ⚔️ **실무형 퀘스트 및 게임화된 학습 동기 (World Map)**
   - 딱딱한 트리 구조 대신 레트로 픽셀 아트 스타일의 **'스킬 모험 지도(World Map)' UI**를 도입하여 몰입감을 높였습니다.
   - 스킬 노드를 클릭하면 "이 스펙을 왜 배워야 하는지" 강력한 동기를 부여하고, "무엇을 만들어봐야 증명되는지" 명확한 **실무형 미니 퀘스트**를 제공합니다.

4. 💼 **GitHub 연동 및 실제 채용 지원 연계**
   - **GitHub 연동**: 자신의 깃허브 URL을 입력하면 AI가 커밋 내역을 분석해 어떤 스킬을 마스터했는지 자동으로 인증(Certified) 해줍니다.
   - **실채용 지원**: 부족한 스킬을 채우고 나면, 해당 스킬을 요구하는 **실제 채용 사이트 공고로 매끄럽게 지원할 수 있도록 직결되는 플로우**를 제공합니다.

## 기술 스택 (Tech Stack)
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, React Flow v11, Zustand, Framer Motion
- **Backend & DB**: Supabase (PostgreSQL, Authentication), Next.js API Routes (Edge)
- **AI Integration**: Groq SDK (Llama 3), Google Generative AI (Gemini 1.5)
- **Deployment**: Vercel

## 로컬 실행 (Getting Started)

```bash
# 1. 패키지 설치
npm install

# 2. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일에 아래 환경 변수들을 채워 넣으세요.

# 3. 개발 서버 실행
npm run dev
# http://localhost:3000 접속
```

### 필수 환경 변수 (`.env.local`)

| 변수 | 역할 | 비고 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Vercel 배포 시 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | Vercel 배포 시 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | 백엔드 관리자 권한 키 | Vercel 배포 시 서버단 필수 |
| `GROQ_API_KEY` | 스킬 상세/퀘스트 설명 AI 생성용 | Vercel 배포 시 필수 |
| `GEMINI_API_KEY` | 커리어 로드맵, JD 갭 분석, 깃허브 연동용 | Vercel 배포 시 필수 |
| `GITHUB_TOKEN` | 깃허브 API Rate Limit 완화용 | 선택 (권장) |

### 채용 공고 트렌드 스크래핑 스크립트 실행
로컬 머신이나 크론(Cron) 작업에서 실제 원티드/점핏의 공고를 긁어와 Supabase DB에 실시간 트렌드 점수를 업데이트합니다.
```bash
npx tsx scripts/update-trend-regex.ts
```

## 배포 가이드 (Vercel)

1. Vercel 프로젝트에 GitHub 저장소를 연결합니다.
2. Vercel **Environment Variables** 설정 메뉴에서 위 표에 있는 **필수 환경 변수 5가지**를 모두 등록합니다.
3. 배포(Deploy)를 진행하면 끝입니다!
