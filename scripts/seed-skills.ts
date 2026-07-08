import { createClient } from "@supabase/supabase-js";
import { dashboardSkillNodes } from "../src/data/skill-tree";

// Mock WebSocket for Node.js 20 compatibility since we don't use Supabase Realtime
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class {} as unknown as typeof WebSocket;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } }
);

async function seed() {
  const rows = dashboardSkillNodes.map(node => ({
    id: node.id,
    title: node.data.title,
    category: node.data.category || "Core",
    trend_score: "Low", // Default before trend update
    description: node.data.description
  }));

  const { error } = await supabase.from("skills").upsert(rows, { onConflict: "id" });
  
  if (error) {
    console.error("Failed to seed skills:", error.message);
  } else {
    console.log(`Successfully seeded ${rows.length} baseline skills to Supabase!`);
  }
}

seed();
