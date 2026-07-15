import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

import type { SkillTreeEdge, SkillTreeNode } from "@/types/skill-tree";

const getSystemPrompt = (trendingSkillsText: string, targetCompany: string, careerLevel: string) => {
  let levelInstruction = "";
  if (careerLevel === "mid") {
    levelInstruction = "The user is a Mid-level developer. Generate Deep-Dive quests focused on complex problem solving, performance tuning, and intermediate architecture rather than basic tutorials.";
  } else if (careerLevel === "senior") {
    levelInstruction = "The user is a Senior developer. Generate highly advanced Deep-Dive quests focused on large-scale system architecture, high-availability, scalability, deep troubleshooting, and technical leadership.";
  } else {
    levelInstruction = "The user is a Junior developer. Focus on mastering the basics, practical usage, and standard best practices.";
  }

  return `
You are an expert career counselor and tech lead. The user will give you a career goal or skill they want to learn.
Your task is to generate a learning roadmap as a Directed Acyclic Graph (nodes and edges).
Create 6 to 9 key nodes representing the learning progression.

${levelInstruction}

Here are the currently HIGH-DEMAND skills in the job market based on recent hiring trends:
${trendingSkillsText || "(No specific trend data available right now)"}

When designing the roadmap, prioritize and heavily incorporate these trending skills if they are relevant to the user's goal.
${
  targetCompany
    ? `The user wants to eventually apply to: ${targetCompany}. Tailor node descriptions and quest content toward the kind of technical stack, engineering culture, and hiring bar these companies are generally known for, in addition to the trend data above.`
    : ""
}

# CRITICAL RULES (follow all of them)

## 1. The roadmap MUST be self-contained (include prerequisites)
Even if the goal title implies a starting point, the roadmap itself must contain every foundational skill that later nodes depend on. Do NOT skip a prerequisite just because it is "assumed".
For software-engineering goals, this almost always means explicitly including, when relevant to the stack:
- The core language / typing layer the stack relies on (e.g., **TypeScript** is mandatory if the roadmap uses React / Next.js / typed backends — never build a TS-based roadmap without a TypeScript node).
- **Version control & collaboration**: Git fundamentals and a branch / Pull Request review workflow (this underlies .env management, CI/CD, and team work that later nodes assume).
- **Testing**: unit/integration testing. If the roadmap mentions monitoring/logging/Sentry or "production quality", a testing node MUST exist — monitoring without testing is inconsistent.
Only omit one of these if it is genuinely irrelevant to the user's goal.

## 2. Node category MUST match the node's real nature (use exactly one of: CORE, ACTION, GOAL, TRENDING)
- **CORE**: a foundational concept or prerequisite skill that other nodes build on. This includes *learning* a language, a framework, or a library, and *design/architecture concepts*. Examples that are CORE (NOT action): "TypeScript 기초", "React 컴포넌트 설계", "상태관리 라이브러리(Zustand) 이해", "Git 워크플로우". Merely acquiring/understanding a technology is CORE.
- **ACTION**: a hands-on build/implementation challenge that produces a tangible, portfolio-ready artifact (a running app, an API, a pipeline). Use ACTION only when there is a concrete thing the user builds. Examples: "인증이 포함된 REST API 구축", "CI/CD 파이프라인 구성 및 배포".
- **GOAL**: the single final deliverable / capstone outcome (usually the last node). Exactly one GOAL node.
- **TRENDING**: use for a node whose primary value is a hot market skill (set isTrending true as well).
Do NOT mark a "learn a library / a design concept" node as ACTION. Do NOT place a hard prerequisite (e.g., component design) parallel to unrelated CORE nodes — it should sit earlier (lower level) with edges feeding the nodes that depend on it.

## 3. estimatedMinutes MUST be realistic and monotonic with depth
The estimate is the hands-on time for a developer to reach portfolio-ready competence (practice included), NOT just reading time.
- Simple/foundational concept: 90–240 min.
- Learning a substantial framework or library (React, Next.js, a state manager): 240–600 min.
- Build-heavy ACTION nodes (backend API + data modeling + CRUD, deployment + monitoring, CI/CD): **480–1500 min (8–25 hours)**. A task that involves modeling, API design, AND CRUD is NEVER "가볍게".
- The capstone GOAL: 600–1800 min.
Deeper / higher-level nodes generally take MORE time than earlier ones. NEVER give a Level 3–5 node a shorter estimate than a Level 1–2 node unless it is genuinely simpler. Avoid the paradox of "level goes up but time goes down".

Output ONLY valid JSON matching this schema:
{
  "title": "A short Korean roadmap title (e.g. '풀스택 개발자 로드맵', '데이터 엔지니어 로드맵'), based on the user's career goal",
  "nodes": [
    {
      "id": "unique-node-id",
      "data": {
        "title": "Short title",
        "description": "Brief explanation",
        "motivation": "A compelling 2-3 sentence Korean explanation of WHY this skill is crucial in the real-world job market. Motivate the user by connecting this skill to actual hiring trends.",
        "jobApplicationTip": "1-2 sentence Korean practical tip on how to highlight this skill in a resume, portfolio, or during a job interview (e.g., 'Mention your experience with X on Wanted/Jumpit by showing Y').",
        "category": "One of exactly: CORE | ACTION | GOAL | TRENDING (per rule 2 above)",
        "level": number (1 for the starting prerequisite, increasing with dependency depth, up to 5),
        "estimatedMinutes": number (realistic minutes per rule 3 above),
        "isTrending": boolean (Set to true ONLY IF this skill is directly related to the high-demand trends provided above),
        "questMarkdown": "A short Korean practical quest in this exact format: '## 실무형 미니 퀘스트\\n\\n(이론 공부가 아닌, 이 기술을 이력서 포트폴리오에 쓸 수 있도록 증명할 수 있는 실무 밀착형 미니 프로젝트나 구현 과제를 1-2문장으로 제시)\\n\\n### 리뷰 포인트\\n\\n- (review point 1)\\n- (review point 2)\\n- (review point 3)'",
        "checklist": ["3 to 5 short Korean checklist items, each a concrete, verifiable sub-step that must all be done to truly finish this skill"]
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
The nodes must form a valid DAG where edges point from a lower level (prerequisite) to a higher level (dependent). A node's prerequisites must have edges into it.
Level 1 is the starting prerequisite. There must be exactly one GOAL node as the final capstone.
Every node's data MUST include a non-empty questMarkdown and checklist as described above - never leave them out.
Do NOT wrap the JSON in Markdown formatting (no \`\`\`json). Just return the raw JSON object.
`;
}

export async function POST(req: Request) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const { prompt, targetCompany, careerLevel } = await req.json();

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
      model: "gemini-flash-latest",
      systemInstruction: getSystemPrompt(
        trendingSkillsText,
        typeof targetCompany === "string" ? targetCompany.trim() : "",
        typeof careerLevel === "string" ? careerLevel : "junior"
      )
    });

    const result = await model.generateContent(`Career Goal: ${prompt}`);
    const text = result.response.text();
    
    // Clean up possible markdown wrappers
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error("Invalid schema: missing nodes or edges array");
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError, "Raw output:", cleanedText);
      return NextResponse.json(
        { error: "AI failed to generate a valid roadmap format. Please try again." },
        { status: 422 }
      );
    }

    // Calculate positions based on levels
    const levelCounts: Record<number, number> = {};
    const levelYOffsets: Record<number, number> = {};

    parsed.nodes.forEach((n: { data: { level?: number } }) => {
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

    const finalNodes: SkillTreeNode[] = parsed.nodes.map((n: any) => {
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

    const finalEdges: SkillTreeEdge[] = parsed.edges.map((e: any) => ({
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
