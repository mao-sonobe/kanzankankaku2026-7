import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { toFriendlyOllamaError } from "@/lib/ai/friendly-error";

export async function POST(req: NextRequest) {
  const { endpoint, model, messages } = await req.json();

  const provider = createOpenAICompatible({
    name: "ollama",
    baseURL: `${String(endpoint).replace(/\/$/, "")}/v1`,
  });

  try {
    const result = streamText({
      model: provider.chatModel(model),
      messages,
      allowSystemInMessages: true,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    return new Response(toFriendlyOllamaError(err), { status: 502 });
  }
}
