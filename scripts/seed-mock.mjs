import fs from 'fs';

const SUPABASE_URL = "https://oejkzayunagyhznevzad.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lamt6YXl1bmFneWh6bmV2emFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk3MzYzMywiZXhwIjoyMDk4NTQ5NjMzfQ.dIZRGLvs2dAhPsP7AA0nLvrL1H5iATHDZVEMF9Le2X8";

const updates = [
  { id: 'react', wanted_mentions: 852, jumpit_mentions: 388, trend_score: 'High', total_postings_analyzed: 2500 },
  { id: 'ts', wanted_mentions: 740, jumpit_mentions: 240, trend_score: 'High', total_postings_analyzed: 2500 },
  { id: 'nextjs', wanted_mentions: 420, jumpit_mentions: 120, trend_score: 'High', total_postings_analyzed: 2500 },
  { id: 'zustand', wanted_mentions: 210, jumpit_mentions: 55, trend_score: 'Medium', total_postings_analyzed: 2500 },
  { id: 'cicd', wanted_mentions: 180, jumpit_mentions: 42, trend_score: 'Medium', total_postings_analyzed: 2500 },
];

async function run() {
  for (const update of updates) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/skills?id=eq.${update.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        wanted_mentions: update.wanted_mentions,
        jumpit_mentions: update.jumpit_mentions,
        trend_score: update.trend_score,
        total_postings_analyzed: update.total_postings_analyzed,
        trend_updated_at: new Date().toISOString()
      })
    });
    console.log(update.id, res.status);
  }
}

run();
