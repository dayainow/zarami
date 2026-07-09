export type ScrapedPosting = {
  title: string;
  companyName: string;
  url: string;
  text: string;
};

export async function scrapeWantedJobs(tagId: number = 872, limit: number = 20): Promise<ScrapedPosting[]> {
  // tag_type_ids: 872 = Backend, 669 = Frontend, etc.
  const listUrl = `https://www.wanted.co.kr/api/v4/jobs?country=kr&tag_type_ids=${tagId}&job_sort=job.latest_order&locations=all&years=-1&limit=${limit}&offset=0`;

  try {
    const listRes = await fetch(listUrl);
    if (!listRes.ok) throw new Error("Failed to fetch job list");
    const listData = await listRes.json();
    const jobs = listData.data || [];

    const postings: ScrapedPosting[] = [];

    for (const job of jobs) {
      const detailUrl = `https://www.wanted.co.kr/api/v4/jobs/${job.id}`;
      const detailRes = await fetch(detailUrl);
      if (!detailRes.ok) continue;
      const detailData = await detailRes.json();

      const jobDetail = detailData.job?.detail;
      if (jobDetail) {
        const text = `
[주요업무]
${jobDetail.main_tasks}

[자격요건]
${jobDetail.requirements}

[우대사항]
${jobDetail.preferred_points}
        `.trim();
        postings.push({
          title: job.position ?? "",
          companyName: job.company?.name ?? "",
          url: `https://www.wanted.co.kr/wd/${job.id}`,
          text,
        });
      }

      // Delay to respect API limits
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return postings;
  } catch (err) {
    console.error("Scraping error:", err);
    return [];
  }
}

// For standalone testing
if (require.main === module) {
  scrapeWantedJobs(872, 3).then(postings => {
    console.log(`Scraped ${postings.length} jobs.`);
    console.log(postings[0]);
  });
}
