import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { scrapeWantedJobs, type ScrapedPosting } from "./scrape-wanted";
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
          sample_postings?: SamplePosting[];
          segment_stats?: Record<string, Record<string, number>>;
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
type TaggedPosting = ScrapedPosting & { site: PostingSource };
type SamplePosting = {
  site: PostingSource;
  title: string;
  companyName: string;
  url: string;
};

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
    postings: {
      type: SchemaType.ARRAY,
      description: "Array of parsed information for each posting, maintaining the original order (index).",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          position: { 
            type: SchemaType.STRING, 
            description: "One of: frontend, backend, fullstack, mobile, data, ai, or other" 
          },
          experience: { 
            type: SchemaType.STRING, 
            description: "One of: junior, mid, senior, or any" 
          },
          company_type: { 
            type: SchemaType.STRING, 
            description: "One of: startup, enterprise, agency, or unknown" 
          }
        },
        required: ["position", "experience", "company_type"]
      }
    },
    mentions: {
      type: SchemaType.ARRAY,
      description: "Which skills were mentioned in which postings.",
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
  required: ["postings", "mentions"],
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
  postingsText: string,
): Promise<{
  postings: { position: string; experience: string; company_type: string }[];
  mentions: { skill_id: string; posting_indices: number[] }[];
}> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: trendMentionSchema,
    },
  });

  const prompt = `
당신은 채용 공고(JD) 분석 전문가입니다. 주어진 채용 공고 목록을 분석하여 다음 두 가지를 수행하세요.

1. 각 공고(0번부터 순서대로)의 성격을 다음 기준으로 분류(Classification)하세요:
   - position: frontend, backend, fullstack, mobile, data, ai, other 중 택 1
   - experience: junior(0-3년), mid(4-7년), senior(8년 이상), any(무관) 중 택 1
   - company_type: startup(스타트업), enterprise(대기업/중견), agency(SI/에이전시), unknown 중 택 1

2. 제공된 기술 스택(Skills) 목록 중, 어떤 기술이 어느 공고에 등장(언급)했는지 매핑하세요.
   - 명시적으로 기재된 것뿐만 아니라, 문맥상 강하게 암시되는 경우도 포함하세요.
   - 예: "React" -> react, "RSC" -> react-server-components

[분석할 스킬 목록]
${skills.map((s) => `- ${s.id}: ${s.title}`).join("\n")}

[분석할 채용 공고 목록]
${postingsText}
  `.trim();

  const result = await model.generateContent(prompt);
  const jsonText = result.response.text();
  return JSON.parse(jsonText) as {
    postings: { position: string; experience: string; company_type: string }[];
    mentions: { skill_id: string; posting_indices: number[] }[];
  };
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
  mentions: Map<string, { wanted: number; jumpit: number; sampleIndices: Set<number> }>,
  segmentStats: Record<string, Record<string, Record<string, number>>>,
  postings: TaggedPosting[],
): Promise<number> {
  const trendUpdatedAt = new Date().toISOString();

  await Promise.all(
    Array.from(mentions.entries()).map(async ([skill_id, counts]) => {
      const uniqueIndices = Array.from(counts.sampleIndices);
      const trendScore = deriveTrendScore(uniqueIndices.length, postings.length);
      const samplePostings: SamplePosting[] = uniqueIndices.slice(0, 2).map((index) => {
        const posting = postings[index];
        return { site: posting.site, title: posting.title, companyName: posting.companyName, url: posting.url };
      });

      const { error } = await supabaseAdmin
        .from("skills")
        .update({
          trend_score: trendScore,
          wanted_mentions: counts.wanted,
          jumpit_mentions: counts.jumpit,
          total_postings_analyzed: postings.length,
          trend_updated_at: trendUpdatedAt,
          sample_postings: samplePostings,
          segment_stats: segmentStats[skill_id] || {},
        })
        .eq("id", skill_id);

      if (error) {
        throw new Error(`Failed to update ${skill_id}: ${error.message}`);
      }
    }),
  );

  return mentions.size;
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
  const wantedJobs = [...await scrapeWantedJobs(872, 25), ...await scrapeWantedJobs(669, 25)];
  const jumpitJobs = [...await scrapeJumpitJobs(1, 25), ...await scrapeJumpitJobs(2, 25)];

  const allPostings: TaggedPosting[] = [
    ...wantedJobs.map((p) => ({ ...p, site: "wanted" as const })),
    ...jumpitJobs.map((p) => ({ ...p, site: "jumpit" as const })),
  ];

  if (allPostings.length === 0) {
    console.log("스크래핑된 채용 공고가 없습니다.");
    return;
  }

  const totalAnalyzed = allPostings.length;
  console.log(`\nFound ${wantedJobs.length} Wanted jobs, ${jumpitJobs.length} Jumpit jobs. Total: ${totalAnalyzed}`);

  const BATCH_SIZE = 5;
  const mentionCounts = new Map<string, { wanted: number; jumpit: number; sampleIndices: Set<number> }>();
  const segmentStats: Record<string, Record<string, Record<string, number>>> = {};
  
  for (let i = 0; i < allPostings.length; i += BATCH_SIZE) {
    const batchPostings = allPostings.slice(i, i + BATCH_SIZE);
    const postingsText = buildTaggedPostingsText(batchPostings);

    try {
      console.log(`Analyzing batch ${i / BATCH_SIZE + 1}...`);
      const analysis = await analyzeSkillMentions(genAI, skills, postingsText);

      for (const m of analysis.mentions) {
        if (!mentionCounts.has(m.skill_id)) {
          mentionCounts.set(m.skill_id, { wanted: 0, jumpit: 0, sampleIndices: new Set<number>() });
        }
        const counts = mentionCounts.get(m.skill_id)!;

        if (!segmentStats[m.skill_id]) {
          segmentStats[m.skill_id] = { position: {}, experience: {}, company_type: {} };
        }
        
        for (const localIdx of m.posting_indices) {
          const globalIdx = i + localIdx;
          const p = batchPostings[localIdx];
          if (!p) continue;

          counts.sampleIndices.add(globalIdx);
          if (p.site === "wanted") counts.wanted++;
          else counts.jumpit++;
          
          const postingMeta = analysis.postings[localIdx];
          if (postingMeta) {
            const { position, experience, company_type } = postingMeta;
            if (position) segmentStats[m.skill_id].position[position] = (segmentStats[m.skill_id].position[position] || 0) + 1;
            if (experience) segmentStats[m.skill_id].experience[experience] = (segmentStats[m.skill_id].experience[experience] || 0) + 1;
            if (company_type) segmentStats[m.skill_id].company_type[company_type] = (segmentStats[m.skill_id].company_type[company_type] || 0) + 1;
          }
        }
      }
    } catch (e) {
      console.error(`Batch ${i} failed`, e);
    }
  }

  const updatedCount = await bulkUpdateTrendData(supabaseAdmin, skills, mentionCounts, segmentStats, allPostings);
  const wantedCount = allPostings.filter((p) => p.site === "wanted").length;
  const jumpitCount = allPostings.filter((p) => p.site === "jumpit").length;
  console.log(`trend 데이터 ${updatedCount}건 갱신 완료 (원티드 ${wantedCount}건, 점핏 ${jumpitCount}건 분석).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
