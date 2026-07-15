import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || "missing",
    });

    const { title, category, level } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const prompt = `
당신은 자람이(Zarami)라는 채용 스펙 트렌드 기반 커리어 로드맵 서비스의 AI 어시스턴트입니다.
사용자가 입력한 "노드(목표) 제목"을 바탕으로, 해당 목표를 달성하기 위한 구체적인 설명, 실무형 미니 퀘스트, 그리고 체크리스트를 작성해 주세요.

[요청 정보]
- 목표 제목: ${title}
- 분류: ${category || "CORE"}
- 레벨: ${level || 1}

[응답 요구사항]
오직 아래의 JSON 포맷으로만 응답하세요. 다른 설명이나 마크다운 래핑은 일절 추가하지 마세요.
{
  "description": "이 목표를 달성하면 무엇을 할 수 있는지, 왜 중요한지 1~2문장으로 명확하게 설명합니다.",
  "estimatedMinutes": 120,
  "questMarkdown": "## 🎯 실전 미니 퀘스트\\n\\n간단한 요구사항이나 시나리오를 통해 실무에서 이 기술을 어떻게 써볼 수 있을지 작성합니다. 복잡하지 않고 직관적이게 작성합니다.",
  "checklist": [
    "핵심 개념 1 이해하기",
    "개발 환경 설정하기",
    "간단한 예제 구현해 보기"
  ]
}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) throw new Error("No response from Groq");

    const result = JSON.parse(content);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate node details" }, { status: 500 });
  }
}
