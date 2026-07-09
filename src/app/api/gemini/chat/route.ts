import { NextRequest } from "next/server";
import { generateText } from "ai";
import { getGoogleProvider, retryGemini } from "@/lib/ai/gemini-server";
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
    // 無料枠はストリーム途中でレート制限エラーになり空応答を返すことがあるため、
    // streamTextではなくgenerateText+リトライで確実に本文を得てから返す。
    const text = await retryGemini(
      async () => {
        const { text } = await generateText({
          model: provider.chat(model),
          system,
          messages: chatMessages,
        });
        return text;
      },
      { isEmpty: (t) => !t.trim() }
    );
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    return new Response(toFriendlyGeminiError(err), { status: 502 });
  }
}
