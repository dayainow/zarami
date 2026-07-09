import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

import type { SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const getSystemPrompt = (trendingSkillsText: string) => `
You are an expert career counselor and tech lead. The user will give you a career goal or skill they want to learn.
Your task is to generate a learning roadmap as a Directed Acyclic Graph (nodes and edges).
Create exactly 5 to 7 key nodes representing the learning progression.

Here are the currently HIGH-DEMAND skills in the job market based on recent hiring trends:
${trendingSkillsText || "(No specific trend data available right now)"}

When designing the roadmap, prioritize and heavily incorporate these trending skills if they are relevant to the user's goal.

Output ONLY valid JSON matching this schema:
{
  "title": "A short Korean roadmap title (e.g. '풀스택 개발자 로드맵', '데이터 엔지니어 로드맵'), based on the user's career goal",
  "nodes": [
    {
      "id": "unique-node-id",
      "data": {
        "title": "Short title",
        "description": "Brief explanation",
        "category": "Core/Action/Goal/etc",
        "level": number (1 for the starting node, 2 for next step, etc. up to 4),
        "estimatedMinutes": number (realistic learning time in minutes, typically between 30 and 300),
        "isTrending": boolean (Set to true ONLY IF this skill is directly related to the high-demand trends provided above),
        "questMarkdown": "A short Korean practical quest in this exact format: '## 실무 퀘스트\\n\\n(1-2 sentence description of a concrete task to practice this skill)\\n\\n### 리뷰 포인트\\n\\n- (review point 1)\\n- (review point 2)\\n- (review point 3)'",
        "checklist": ["2 to 4 short Korean checklist items, each a concrete sub-step toward finishing this skill"]
      }
    }
  ],
  "edges": [
    {
      "source": "source-node-id",
      "target": "target-node-id"
    }
  ]
}
The nodes must form a valid tree/graph where edges point from a lower level to a higher level.
Level 1 should be the starting point (prerequisite).
Every node's data MUST include a non-empty questMarkdown and checklist as described above - never leave them out.
Do NOT wrap the JSON in Markdown formatting (no \`\`\`json). Just return the raw JSON object.
`;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Fetch trending skills from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
    let trendingSkillsText = "";
    try {
      const { data } = await supabase
        .from("skills")
        .select("title, trend_score")
        .in("trend_score", ["High", "Medium"]);
      
      if (data && data.length > 0) {
        trendingSkillsText = data
          .map((s) => `- ${s.title} (Demand: ${s.trend_score})`)
          .join("\n");
      }
    } catch (dbError) {
      console.error("Failed to fetch trending skills:", dbError);
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      systemInstruction: getSystemPrompt(trendingSkillsText)
    });

    const result = await model.generateContent(`Career Goal: ${prompt}`);
    const text = result.response.text();
    
    // Clean up possible markdown wrappers
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();

    const parsed = JSON.parse(cleanedText) as {
      title?: string;
      nodes: { id: string; data: { level?: number; title: string; category?: string; isTrending?: boolean; [key: string]: unknown } }[];
      edges: { source: string; target: string }[];
    };

    // Calculate positions based on levels
    const levelCounts: Record<number, number> = {};
    const levelYOffsets: Record<number, number> = {};

    parsed.nodes.forEach((n) => {
      const lvl = Number(n.data.level) || 1;
      levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
    });

    // Initialize Y offsets to center the nodes
    Object.keys(levelCounts).forEach((lvlStr) => {
      const lvl = Number(lvlStr);
      const count = levelCounts[lvl];
      const spacing = 180;
      const startY = -((count - 1) * spacing) / 2;
      levelYOffsets[lvl] = startY;
    });

    const finalNodes: SkillTreeNode[] = parsed.nodes.map((n) => {
      const lvl = Number(n.data.level) || 1;
      const x = (lvl - 1) * 360;
      const y = levelYOffsets[lvl];
      levelYOffsets[lvl] += 180;

      return {
        id: n.id,
        type: "skill",
        position: { x, y: y + 80 }, // +80 to add some initial top margin
        data: {
          ...n.data,
          id: n.id,
          status: lvl === 1 ? "available" : "locked",
        },
      };
    });

    const finalEdges: SkillTreeEdge[] = parsed.edges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: true,
    }));

    const title = parsed.title?.trim() || `${prompt} 로드맵`;

    return NextResponse.json({ title, nodes: finalNodes, edges: finalEdges });
  } catch (error) {
    console.error("Generate Tree Error:", error);
    return NextResponse.json(
      { error: "Failed to generate career tree" },
      { status: 500 }
    );
  }
}
