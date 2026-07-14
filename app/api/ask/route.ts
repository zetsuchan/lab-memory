import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { nanoid } from "nanoid";
import { answerSchema } from "@/lib/types";
import { getSession, saveSession } from "@/lib/store";
import { SYSTEM_PROMPT, buildPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60; // Claude reasoning over a corpus can take a bit

export async function POST(req: Request) {
  const { sessionId, question } = (await req.json()) as { sessionId: string; question: string };
  if (!sessionId || !question?.trim()) {
    return new Response("missing sessionId or question", { status: 400 });
  }
  const session = await getSession(sessionId);
  if (!session) return new Response("session not found", { status: 404 });

  const model = process.env.LLM_MODEL || "claude-sonnet-5";

  const result = streamObject({
    model: anthropic(model),
    schema: answerSchema,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(session, question),
    onFinish: async ({ object }) => {
      if (!object) return;
      const now = Date.now();
      session.messages.push({ id: nanoid(), role: "user", question, createdAt: now });
      session.messages.push({ id: nanoid(), role: "assistant", answer: object, createdAt: now + 1 });
      await saveSession(session);
    },
  });

  return result.toTextStreamResponse();
}
