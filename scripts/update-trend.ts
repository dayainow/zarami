import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// Minimal hand-written schema covering only what this script touches;
// not a full generated Database type.
type Database = {
  public: {
    Tables: {
      skills: {
        Row: { id: string; title: string; trend_score: string };
        Insert: { id: string; title?: string; category?: string; trend_score?: string };
        Update: { id?: string; trend_score?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

type SupabaseAdmin = SupabaseClient<Database>;

// Weekly batch job: mine mock job-posting text for frontend-stack frequency
// and cache the result as `skills.trend_score`, so the dashboard never pays
// an LLM call at request time.

const MOCK_JOB_POSTINGS: string[] = [
  `[프론트엔드 개발자] Next.js 15 App Router 기반 서비스 개발. React 18+, Server Components, Zustand를 활용한 클라이언트 상태 관리 경험자 우대. TypeScript strict 모드 필수.`,
  `[시니어 프론트엔드] React, Next.js 실무 3년 이상. Supabase 또는 Firebase 등 BaaS 연동 경험, TanStack Query를 활용한 오프라인 대응 캐싱 전략 설계 경험 우대.`,
  `[웹 프론트엔드 엔지니어] Zustand/Redux 등 상태관리 라이브러리 능숙자. Next.js App Router, React Flow 기반 인터랙티브 UI 개발 경험자 환영.`,
  `[스타트업 프론트엔드] React + TypeScript 기반 대시보드 개발. Supabase Auth/DB 연동, 소셜 로그인 및 게스트-회원 데이터 마이그레이션 파이프라인 구축 경험.`,
  `[프론트엔드 인턴] HTML/CSS/JavaScript 기초 역량. React 학습 의지 필수. Next.js, Zustand는 우대사항이며 신입도 지원 가능합니다.`,
];

const trendScoreSchema = z.object({
  scores: z
    .array(
      z.object({
        skill_id: z.string(),
        trend_score: z.enum(["High", "Medium", "Low"]),
      }),
    )
    .describe("One entry per skill_id provided in the input catalog."),
});

type SkillRow = { id: string; title: string };

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

async function fetchSkillCatalog(
  supabaseAdmin: SupabaseAdmin,
): Promise<SkillRow[]> {
  const { data, error } = await supabaseAdmin
    .from("skills")
    .select("id, title")
    .order("id");

  if (error) {
    throw new Error(`Failed to fetch skill catalog: ${error.message}`);
  }

  return (data ?? []) as SkillRow[];
}

async function analyzeTrendScores(
  anthropic: Anthropic,
  skills: SkillRow[],
): Promise<z.infer<typeof trendScoreSchema>["scores"]> {
  const skillCatalog = skills.map((skill) => `${skill.id}: ${skill.title}`).join("\n");
  const jobPostings = MOCK_JOB_POSTINGS.map((text, index) => `[공고 ${index + 1}]\n${text}`).join(
    "\n\n",
  );

  const response = await anthropic.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system:
      "당신은 채용 공고 텍스트를 분석해 프론트엔드 기술 스택의 수요 빈도를 채점하는 데이터 마이닝 어시스턴트입니다. " +
      "주어진 스킬 카탈로그의 각 항목이 채용 공고들에서 얼마나 자주, 얼마나 핵심적으로 언급되는지 근거로 High, Medium, Low 중 하나의 가중치를 매기십시오. " +
      "카탈로그에 없는 스킬을 만들어내지 말고, 카탈로그의 모든 skill_id에 대해 정확히 하나씩만 응답하십시오.",
    messages: [
      {
        role: "user",
        content: `## 스킬 카탈로그\n${skillCatalog}\n\n## 채용 공고\n${jobPostings}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(trendScoreSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Claude 응답을 스키마에 맞게 파싱하지 못했습니다.");
  }

  return response.parsed_output.scores;
}

async function bulkUpdateTrendScores(
  supabaseAdmin: SupabaseAdmin,
  skills: SkillRow[],
  scores: z.infer<typeof trendScoreSchema>["scores"],
): Promise<number> {
  const knownSkillIds = new Set(skills.map((skill) => skill.id));
  const rows = scores
    .filter((score) => knownSkillIds.has(score.skill_id))
    .map((score) => ({ id: score.skill_id, trend_score: score.trend_score }));

  if (rows.length === 0) {
    return 0;
  }

  const { error } = await supabaseAdmin.from("skills").upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to bulk update trend_score: ${error.message}`);
  }

  return rows.length;
}

async function main(): Promise<void> {
  const supabaseAdmin = createClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
  const anthropic = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });

  const skills = await fetchSkillCatalog(supabaseAdmin);
  if (skills.length === 0) {
    console.log("skills 테이블이 비어 있어 트렌드 마이닝을 건너뜁니다.");
    return;
  }

  console.log(`${skills.length}개 스킬에 대해 ${MOCK_JOB_POSTINGS.length}건의 공고를 분석합니다.`);

  const scores = await analyzeTrendScores(anthropic, skills);
  const updatedCount = await bulkUpdateTrendScores(supabaseAdmin, skills, scores);

  console.log(`trend_score ${updatedCount}건 갱신 완료.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
