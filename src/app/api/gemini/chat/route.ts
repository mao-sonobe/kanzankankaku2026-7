import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getGoogleProvider } from "@/lib/ai/gemini-server";
import { toFriendlyGeminiError } from "@/lib/ai/friendly-error";

export async function POST(req: NextRequest) {
  const { model, messages } = await req.json();

  // Geminiはmessages配列内のrole:"system"を受け付けないため、
  // 別のsystemパラメータに分離する。
  const systemMessages = Array.isArray(messages)
    ? messages.filter((m: { role: string }) => m.role === "system")
    : [];
  const chatMessages = Array.isArray(messages)
    ? messages.filter((m: { role: string }) => m.role !== "system")
    : [];
  const system = systemMessages.map((m: { content: string }) => m.content).join("\n\n") || undefined;

  try {
    const provider = getGoogleProvider();
    const result = streamText({
      model: provider.chat(model),
      system,
      messages: chatMessages,
    });
    return result.toTextStreamResponse();
  } catch (err) {
    return new Response(toFriendlyGeminiError(err), { status: 502 });
  }
}
