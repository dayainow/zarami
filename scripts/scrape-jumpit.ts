export async function scrapeJumpitJobs(jobCategory: number = 1, limit: number = 20): Promise<string[]> {
  // jobCategory: 1 = 서버/백엔드 개발자, 2 = 프론트엔드 개발자, etc.
  // Jumpit API requires following redirects
  const listUrl = `https://api.jumpit.co.kr/api/positions?page=1&jobCategory=${jobCategory}&sort=relation`;
  
  try {
    const listRes = await fetch(listUrl, { redirect: "follow" });
    if (!listRes.ok) throw new Error("Failed to fetch job list from Jumpit");
    const listData = await listRes.json();
    const jobs = listData.result?.positions || [];

    const jds: string[] = [];
    const jobsToProcess = jobs.slice(0, limit);

    for (const job of jobsToProcess) {
      const detailUrl = `https://api.jumpit.co.kr/api/position/${job.id}`;
      const detailRes = await fetch(detailUrl, { redirect: "follow" });
      if (!detailRes.ok) continue;
      
      const detailData = await detailRes.json();
      const jobDetail = detailData.result;
      
      if (jobDetail) {
        const text = `
[주요업무]
${jobDetail.responsibility}

[자격요건]
${jobDetail.qualifications}

[우대사항]
${jobDetail.preferredRequirements}
        `.trim();
        jds.push(text);
      }
      
      // Delay to respect API limits
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return jds;
  } catch (err) {
    console.error("Jumpit Scraping error:", err);
    return [];
  }
}

// For standalone testing
if (require.main === module) {
  scrapeJumpitJobs(1, 2).then(jds => {
    console.log(`Scraped ${jds.length} jobs from Jumpit.`);
    console.log(jds[0]);
  });
}
