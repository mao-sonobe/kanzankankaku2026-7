import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export async function POST(req: NextRequest) {
  const { endpoint, model, messages } = await req.json();

  const provider = createOpenAICompatible({
    name: "ollama",
    baseURL: `${String(endpoint).replace(/\/$/, "")}/v1`,
  });

  const result = streamText({
    model: provider.chatModel(model),
    messages,
    allowSystemInMessages: true,
  });

  return result.toTextStreamResponse();
}
