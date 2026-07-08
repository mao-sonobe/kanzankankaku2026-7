import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Gemini APIキーはサーバー側の環境変数(.env.local)にのみ保持し、クライアントには渡さない。
 * Ollama版と異なりエンドポイントはユーザー入力ではなく固定のGoogle APIを使う。
 */
export function getGoogleProvider() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEYが設定されていません。.env.localに設定してから`npm run dev`を再起動してください。"
    );
  }
  return createGoogleGenerativeAI({ apiKey });
}
