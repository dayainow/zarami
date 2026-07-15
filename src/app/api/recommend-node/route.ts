import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";



const getRecommendationPrompt = () => `
You are an expert tech lead and career mentor.
A developer is building their own skill roadmap (tech tree).
You are provided with their current roadmap's nodes (skills).
Your task is to recommend EXACTLY 3 skills/technologies that would be the most logical next steps for them to learn, based on what they already have on their map.

Output ONLY valid JSON matching this schema:
{
  "recommendations": [
    {
      "title": "Skill name (e.g., React Query, Docker)",
      "description": "A 1-2 sentence Korean explanation of why they should learn this next.",
      "category": "Core"
    }
  ]
}

Ensure you provide exactly 3 recommendations.
The category MUST be one of: "Core", "Tool", "Optional".
Do NOT wrap the JSON in Markdown formatting (no \`\`\`json). Just return the raw JSON object.
`;

export async function POST(req: Request) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const { nodes } = await req.json();

    if (!nodes) {
      return NextResponse.json({ error: "Nodes data is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: getRecommendationPrompt()
    });

    const userPrompt = `
Current Roadmap Nodes:
${JSON.stringify(nodes.map((n: { data: { title: string } }) => n.data.title), null, 2)}
`;

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
    
    let parsed: { recommendations: { title: string; description: string; category: string }[] };
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Recommend Node Error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
