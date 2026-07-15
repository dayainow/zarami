import { createClient } from "@supabase/supabase-js";
import { scrapeWantedJobs } from "./scrape-wanted";
import { scrapeJumpitJobs } from "./scrape-jumpit";

// Mock WebSocket for Node.js 20 compatibility
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class {} as unknown as typeof WebSocket;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } }
);

// Regex mapping for skills
const skillMatchers: Record<string, RegExp> = {
  'web-foundation': /html|css|javascript|자바스크립트/i,
  'react-components': /react|리액트/i,
  'state-zustand': /zustand|주스탠드|redux|리덕스/i,
  'next-app-router': /next\.?js|넥스트/i,
  'supabase-progress': /supabase|수파베이스|firebase|파이어베이스/i,
  'offline-queue': /offline|오프라인|service worker/i,
  'http-api-design': /rest api|http|api 설계|graphql/i,
  'database-modeling': /sql|database|db 설계|데이터베이스|rdbms|postgresql/i,
  'auth-security': /oauth|jwt|인증|보안/i,
  'cicd-deploy': /ci\/cd|배포|github actions|jenkins|docker|도커/i,
  'react': /react|리액트/i,
  'ts': /typescript|타입스크립트/i,
  'nextjs': /next\.?js|넥스트/i,
  'zustand': /zustand|주스탠드/i,
  'cicd': /ci\/cd|배포|github actions|jenkins|docker/i,
};

async function main() {
  console.log("Scraping jobs...");
  const wantedJobs = await scrapeWantedJobs(872, 100); // 100 backend
  const wantedFrontend = await scrapeWantedJobs(669, 100); // 100 frontend
  const jumpitJobs = await scrapeJumpitJobs(1, 100); // 100 backend
  const jumpitFrontend = await scrapeJumpitJobs(2, 100); // 100 frontend

  const allPostings = [
    ...wantedJobs.map(j => ({ ...j, site: 'wanted' as const })),
    ...wantedFrontend.map(j => ({ ...j, site: 'wanted' as const })),
    ...jumpitJobs.map(j => ({ ...j, site: 'jumpit' as const })),
    ...jumpitFrontend.map(j => ({ ...j, site: 'jumpit' as const }))
  ];

  console.log(`Total postings scraped: ${allPostings.length}`);

  // Fetch all skills
  const { data: skills } = await supabase.from("skills").select("id, title");
  if (!skills) {
    console.error("Failed to fetch skills");
    return;
  }

  for (const skill of skills) {
    const matcher = skillMatchers[skill.id] || new RegExp(skill.title.replace(/[\-\s]/g, '|'), 'i');
    
    let wantedMentions = 0;
    let jumpitMentions = 0;
    const samplePostings = [];

    for (const posting of allPostings) {
      if (matcher.test(posting.text)) {
        if (posting.site === 'wanted') wantedMentions++;
        if (posting.site === 'jumpit') jumpitMentions++;
        if (samplePostings.length < 5) {
          samplePostings.push({
            site: posting.site,
            title: posting.title,
            companyName: posting.companyName,
            url: posting.url,
          });
        }
      }
    }

    const totalMentions = wantedMentions + jumpitMentions;
    const mentionRatio = totalMentions / allPostings.length;
    let trendScore = "Low";
    if (mentionRatio > 0.4) trendScore = "High";
    else if (mentionRatio > 0.1) trendScore = "Medium";

    console.log(`Skill: ${skill.id}, Mentions: ${totalMentions}, Score: ${trendScore}`);

    await supabase.from("skills").update({
      wanted_mentions: wantedMentions,
      jumpit_mentions: jumpitMentions,
      total_postings_analyzed: allPostings.length,
      trend_score: trendScore,
      sample_postings: samplePostings,
      trend_updated_at: new Date().toISOString(),
    }).eq("id", skill.id);
  }

  console.log("Done updating skills via Regex!");
}

main().catch(console.error);
