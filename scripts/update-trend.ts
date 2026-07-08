import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { scrapeWantedJobs } from "./scrape-wanted";
import { scrapeJumpitJobs } from "./scrape-jumpit";

// Mock WebSocket for Node.js 20 compatibility since we don't use Supabase Realtime
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class {} as unknown as typeof WebSocket;
}

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
type SkillRow = { id: string; title: string };

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const trendScoreSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    scores: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          skill_id: { type: SchemaType.STRING },
          trend_score: { type: SchemaType.STRING, format: "enum", enum: ["High", "Medium", "Low"] }
        },
        required: ["skill_id", "trend_score"]
      }
    }
  },
  required: ["scores"]
};

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
  genAI: GoogleGenerativeAI,
  skills: SkillRow[],
  jobPostingsText: string
): Promise<{ skill_id: string; trend_score: string }[]> {
  const skillCatalog = skills.map((skill) => `${skill.id}: ${skill.title}`).join("\n");
  
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    systemInstruction: "당신은 실제 채용 공고 텍스트를 분석해 기술 스택의 수요 빈도를 채점하는 어시스턴트입니다. 주어진 스킬 카탈로그의 각 항목이 채용 공고들에서 얼마나 자주, 중요하게 언급되는지 분석하여 High, Medium, Low 중 하나로 평가하십시오. 카탈로그에 없는 스킬은 절대로 만들어내지 말고 카탈로그 ID를 정확히 유지하십시오.",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: trendScoreSchema,
    }
  });

  const prompt = `## 스킬 카탈로그\n${skillCatalog}\n\n## 실제 채용 공고 모음\n${jobPostingsText}`;
  
  const response = await model.generateContent(prompt);
  const text = response.response.text();
  const parsed = JSON.parse(text);
  
  return parsed.scores;
}

async function bulkUpdateTrendScores(
  supabaseAdmin: SupabaseAdmin,
  skills: SkillRow[],
  scores: { skill_id: string; trend_score: string }[],
): Promise<number> {
  const knownSkillIds = new Set(skills.map((skill) => skill.id));
  const validScores = scores.filter((score) => knownSkillIds.has(score.skill_id));

  if (validScores.length === 0) {
    return 0;
  }

  // Use update instead of upsert to avoid NOT NULL constraint errors on 'title' and 'category'
  await Promise.all(
    validScores.map(async (score) => {
      const { error } = await supabaseAdmin
        .from("skills")
        .update({ trend_score: score.trend_score })
        .eq("id", score.skill_id);
        
      if (error) {
        throw new Error(`Failed to update ${score.skill_id}: ${error.message}`);
      }
    })
  );

  return validScores.length;
}

async function main(): Promise<void> {
  const supabaseAdmin = createClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
  const genAI = new GoogleGenerativeAI(requireEnv("GEMINI_API_KEY"));

  const skills = await fetchSkillCatalog(supabaseAdmin);
  if (skills.length === 0) {
    console.log("skills 테이블이 비어 있어 트렌드 마이닝을 건너뜁니다.");
    return;
  }

  console.log("실제 채용 공고(원티드, 점핏)를 스크래핑합니다...");
  // Scrape backend (872 for wanted, 1 for jumpit) and frontend (669 for wanted, 2 for jumpit)
  const wantedBackend = await scrapeWantedJobs(872, 10);
  const wantedFrontend = await scrapeWantedJobs(669, 10);
  const jumpitBackend = await scrapeJumpitJobs(1, 10);
  const jumpitFrontend = await scrapeJumpitJobs(2, 10);
  
  const allJobs = [...wantedBackend, ...wantedFrontend, ...jumpitBackend, ...jumpitFrontend];
  
  if (allJobs.length === 0) {
    console.log("스크래핑된 채용 공고가 없습니다.");
    return;
  }
  
  const jobPostingsText = allJobs.map((text, i) => `[공고 ${i+1}]\n${text}`).join("\n\n");
  console.log(`${skills.length}개 스킬에 대해 ${allJobs.length}건의 실제 공고를 분석합니다...`);

  const scores = await analyzeTrendScores(genAI, skills, jobPostingsText);
  const updatedCount = await bulkUpdateTrendScores(supabaseAdmin, skills, scores);

  console.log(`trend_score ${updatedCount}건 갱신 완료.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
