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
        Update: {
          id?: string;
          trend_score?: string;
          wanted_mentions?: number;
          jumpit_mentions?: number;
          total_postings_analyzed?: number;
          trend_updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

type SupabaseAdmin = SupabaseClient<Database>;
type SkillRow = { id: string; title: string };
type PostingSource = "wanted" | "jumpit";
type TaggedPosting = { site: PostingSource; text: string };

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Gemini returns which posting indices mention each skill (semantic match,
// e.g. "리액트" counts for react-components) instead of a pre-judged
// High/Medium/Low - the actual score is derived deterministically from
// those indices in code, so it stays traceable back to real postings
// instead of being an opaque LLM judgment call.
const trendMentionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    mentions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          skill_id: { type: SchemaType.STRING },
          posting_indices: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.INTEGER },
          },
        },
        required: ["skill_id", "posting_indices"],
      },
    },
  },
  required: ["mentions"],
};

async function fetchSkillCatalog(supabaseAdmin: SupabaseAdmin): Promise<SkillRow[]> {
  const { data, error } = await supabaseAdmin.from("skills").select("id, title").order("id");

  if (error) {
    throw new Error(`Failed to fetch skill catalog: ${error.message}`);
  }

  return (data ?? []) as SkillRow[];
}

function buildTaggedPostingsText(postings: TaggedPosting[]): string {
  return postings
    .map((posting, index) => {
      const siteLabel = posting.site === "wanted" ? "원티드" : "점핏";
      return `[공고 ${index} · ${siteLabel}]\n${posting.text}`;
    })
    .join("\n\n");
}

async function analyzeSkillMentions(
  genAI: GoogleGenerativeAI,
  skills: SkillRow[],
  postings: TaggedPosting[],
): Promise<{ skill_id: string; posting_indices: number[] }[]> {
  const skillCatalog = skills.map((skill) => `${skill.id}: ${skill.title}`).join("\n");
  const postingsText = buildTaggedPostingsText(postings);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    systemInstruction:
      "당신은 실제 채용 공고 텍스트를 분석해 기술 스택이 어떤 공고에서 언급되는지 찾아내는 어시스턴트입니다. " +
      "주어진 스킬 카탈로그의 각 항목이 등장하거나 의미상 요구되는(예: '리액트'는 react-components에 해당) 공고들의 " +
      "[공고 N · 사이트] 번호(N)를 모두 찾아 posting_indices 배열로 반환하십시오. " +
      "카탈로그에 없는 스킬은 만들어내지 말고, 언급이 전혀 없으면 빈 배열을 반환하십시오.",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: trendMentionSchema,
    },
  });

  const prompt = `## 스킬 카탈로그\n${skillCatalog}\n\n## 실제 채용 공고 모음\n${postingsText}`;

  const response = await model.generateContent(prompt);
  const text = response.response.text();
  const parsed = JSON.parse(text);

  return parsed.mentions;
}

function deriveTrendScore(totalMentions: number, totalPostings: number): "High" | "Medium" | "Low" {
  if (totalPostings === 0) {
    return "Low";
  }

  const ratio = totalMentions / totalPostings;
  if (ratio >= 0.5) return "High";
  if (ratio >= 0.2) return "Medium";
  return "Low";
}

async function bulkUpdateTrendData(
  supabaseAdmin: SupabaseAdmin,
  skills: SkillRow[],
  mentions: { skill_id: string; posting_indices: number[] }[],
  siteByIndex: PostingSource[],
): Promise<number> {
  const knownSkillIds = new Set(skills.map((skill) => skill.id));
  const validMentions = mentions.filter((mention) => knownSkillIds.has(mention.skill_id));

  if (validMentions.length === 0) {
    return 0;
  }

  const trendUpdatedAt = new Date().toISOString();

  await Promise.all(
    validMentions.map(async (mention) => {
      const uniqueIndices = [...new Set(mention.posting_indices)].filter(
        (index) => index >= 0 && index < siteByIndex.length,
      );
      const wantedMentions = uniqueIndices.filter((index) => siteByIndex[index] === "wanted").length;
      const jumpitMentions = uniqueIndices.filter((index) => siteByIndex[index] === "jumpit").length;
      const trendScore = deriveTrendScore(uniqueIndices.length, siteByIndex.length);

      const { error } = await supabaseAdmin
        .from("skills")
        .update({
          trend_score: trendScore,
          wanted_mentions: wantedMentions,
          jumpit_mentions: jumpitMentions,
          total_postings_analyzed: siteByIndex.length,
          trend_updated_at: trendUpdatedAt,
        })
        .eq("id", mention.skill_id);

      if (error) {
        throw new Error(`Failed to update ${mention.skill_id}: ${error.message}`);
      }
    }),
  );

  return validMentions.length;
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

  const postings: TaggedPosting[] = [
    ...wantedBackend.map((text) => ({ site: "wanted" as const, text })),
    ...wantedFrontend.map((text) => ({ site: "wanted" as const, text })),
    ...jumpitBackend.map((text) => ({ site: "jumpit" as const, text })),
    ...jumpitFrontend.map((text) => ({ site: "jumpit" as const, text })),
  ];

  if (postings.length === 0) {
    console.log("스크래핑된 채용 공고가 없습니다.");
    return;
  }

  const siteByIndex = postings.map((posting) => posting.site);
  console.log(`${skills.length}개 스킬에 대해 ${postings.length}건의 실제 공고를 분석합니다...`);

  const mentions = await analyzeSkillMentions(genAI, skills, postings);
  const updatedCount = await bulkUpdateTrendData(supabaseAdmin, skills, mentions, siteByIndex);

  console.log(`trend 데이터 ${updatedCount}건 갱신 완료 (원티드 ${siteByIndex.filter((s) => s === "wanted").length}건, 점핏 ${siteByIndex.filter((s) => s === "jumpit").length}건 분석).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
