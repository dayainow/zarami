import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const getGithubSyncPrompt = () => \`
You are an expert tech lead evaluating a developer's GitHub commits.
You will be provided with:
1. A list of recent commit messages from their repository.
2. A list of their currently "in-progress" (incomplete) skills/nodes.

Your task is to analyze the commits and determine if there is CLEAR evidence that the user has utilized or demonstrated any of their incomplete skills.

Output ONLY valid JSON matching this schema:
{
  "certifiedNodes": [
    {
      "treeId": "the tree id the node belongs to",
      "nodeId": "the node id",
      "skillTitle": "the title of the skill",
      "reason": "1 sentence Korean explanation of why this commit history proves they know this skill"
    }
  ]
}

If no skills match, return {"certifiedNodes": []}.
Do NOT wrap the JSON in Markdown formatting (no \\\`\\\`\\\`json). Just return the raw JSON object.
\`;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const { repoUrl, userId } = await req.json();

    if (!repoUrl || !userId) {
      return NextResponse.json({ error: "repoUrl and userId are required" }, { status: 400 });
    }

    // 1. Parse GitHub URL
    // e.g. https://github.com/dayainow/zarami
    const urlParts = repoUrl.split("github.com/");
    if (urlParts.length < 2) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }
    const pathParts = urlParts[1].split("/");
    const owner = pathParts[0];
    const repo = pathParts[1]?.replace(".git", "");

    if (!owner || !repo) {
      return NextResponse.json({ error: "Could not extract owner/repo from URL" }, { status: 400 });
    }

    // 2. Fetch commits from GitHub
    const githubRes = await fetch(\`https://api.github.com/repos/\${owner}/\${repo}/commits?per_page=30\`, {
      headers: {
        "User-Agent": "Zarami-App",
        ...(process.env.GITHUB_TOKEN ? { Authorization: \`token \${process.env.GITHUB_TOKEN}\` } : {})
      }
    });

    if (!githubRes.ok) {
      return NextResponse.json({ error: "Failed to fetch from GitHub. Is the repository public?" }, { status: 400 });
    }

    const commitsData = await githubRes.json();
    const commitMessages = commitsData.map((c: any) => c.commit.message);

    // 3. Fetch user's incomplete skills from Supabase
    const { data: trees, error: dbError } = await supabase
      .from("trees")
      .select("*")
      .eq("user_id", userId);

    if (dbError || !trees) {
      return NextResponse.json({ error: "Failed to fetch user trees" }, { status: 500 });
    }

    const incompleteNodes: any[] = [];
    trees.forEach(tree => {
      if (tree.nodes && Array.isArray(tree.nodes)) {
        tree.nodes.forEach((node: any) => {
          if (!node.data.is_completed) {
            incompleteNodes.push({
              treeId: tree.id,
              nodeId: node.id,
              title: node.data.title,
              description: node.data.description
            });
          }
        });
      }
    });

    if (incompleteNodes.length === 0) {
      return NextResponse.json({ message: "No incomplete skills to certify.", certifiedNodes: [] });
    }

    // 4. Analyze with Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction: getGithubSyncPrompt()
    });

    const userPrompt = \`
Recent Commits:
\${commitMessages.join("\\n")}

Incomplete Skills:
\${JSON.stringify(incompleteNodes, null, 2)}
\`;

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```json\\n?|\\n?```/g, "").trim();
    
    let parsed: { certifiedNodes: { treeId: string; nodeId: string; skillTitle: string; reason: string }[] };
    try {
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // 5. Update certified nodes in DB
    const certified = parsed.certifiedNodes || [];
    if (certified.length > 0) {
      for (const tree of trees) {
        let treeChanged = false;
        const nodesToUpdate = certified.filter(c => c.treeId === tree.id).map(c => c.nodeId);
        
        if (nodesToUpdate.length > 0) {
          const updatedNodes = tree.nodes.map((node: any) => {
            if (nodesToUpdate.includes(node.id)) {
              treeChanged = true;
              return {
                ...node,
                data: {
                  ...node.data,
                  is_completed: true,
                  status: "completed",
                  completedAt: new Date().toISOString()
                }
              };
            }
            return node;
          });

          if (treeChanged) {
            await supabase
              .from("trees")
              .update({ nodes: updatedNodes })
              .eq("id", tree.id);
          }
        }
      }
    }

    return NextResponse.json({ certifiedNodes: certified });

  } catch (error) {
    console.error("GitHub Sync Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
