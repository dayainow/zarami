import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import type { SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";



const getGapSystemPrompt = (completedSkills: string[]) => `
You are an expert career counselor and tech lead. The user wants to apply to a specific company/role and will provide the Job Description (JD).
Your task is to analyze the JD, compare it against the user's ALREADY COMPLETED SKILLS, and generate a **"2-Week Short-Term Sprint Roadmap"** (Directed Acyclic Graph) ONLY for the MISSING skills.

User's Completed Skills (DO NOT include these in the generated tree):
${completedSkills.length > 0 ? completedSkills.map(s => `- ${s}`).join("\\n") : "None (The user is starting from scratch)"}

Rules:
1. Extract the core required skills and preferred qualifications from the provided JD.
2. Filter out any skills that the user has already completed.
3. Create exactly 3 to 5 key nodes representing a 2-week intensive sprint to learn and prove the missing skills before applying for the job.
4. Output ONLY valid JSON matching this schema:
{
  "title": "A short Korean roadmap title (e.g. '당근마켓 프론트엔드 대비 2주 단기 스프린트')",
  "nodes": [
    {
      "id": "unique-node-id",
      "data": {
        "title": "Short title",
        "description": "Brief explanation of why this skill is urgently needed for this JD",
        "category": "Gap Sprint",
        "level": number (1 for the starting node, 2 for next step, etc. up to 3),
        "estimatedMinutes": number (realistic learning time in minutes for a 2-week sprint context),
        "isTrending": true,
        "questMarkdown": "A short Korean practical quest in this exact format: '## 🚀 실전 미니 프로젝트 (2주 단기)\\n\\n(단순히 공부하라는 내용이 아니라, 무엇을 직접 만들어보아야 이력서/포트폴리오에 어필할 수 있는지 구체적인 미니 프로젝트나 트러블슈팅 과제를 1-2문장으로 제시)\\n\\n### 면접 대비 리뷰 포인트\\n\\n- (review point 1)\\n- (review point 2)\\n- (review point 3)'",
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
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const { jdText, completedSkills = [] } = await req.json();

    if (!jdText) {
      return NextResponse.json({ error: "jdText is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: getGapSystemPrompt(completedSkills)
    });

    const result = await model.generateContent(`Job Description:\n${jdText}`);
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

    const title = parsed.title?.trim() || "JD 대비 2주 단기 스프린트";

    return NextResponse.json({ title, nodes: finalNodes, edges: finalEdges });
  } catch (error) {
    console.error("Generate Gap Tree Error:", error);
    return NextResponse.json(
      { error: "Failed to generate gap tree" },
      { status: 500 }
    );
  }
}
