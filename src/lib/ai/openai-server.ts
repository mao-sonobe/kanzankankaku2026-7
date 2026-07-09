import { createOpenAI } from "@ai-sdk/openai";

/**
 * OpenAI(ChatGPT) APIキーはサーバー側の環境変数(.env.local)にのみ保持し、クライアントには渡さない。
 * Ollama版と異なりエンドポイントはユーザー入力ではなく固定のOpenAI APIを使う。
 */
export function getOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEYが設定されていません。.env.localに設定してから`npm run dev`を再起動してください。"
    );
  }
  return createOpenAI({ apiKey });
}
