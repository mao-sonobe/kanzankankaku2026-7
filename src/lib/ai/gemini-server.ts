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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Geminiの無料枠はレート制限で断続的にエラー/空応答を返すことがある。
 * その場合に指数バックオフでリトライする。`isEmpty`で「成功したが中身が空」も
 * 失敗扱いにできる(streamTextがストリーム途中でエラーになり空を返すケース対策)。
 */
export async function retryGemini<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelayMs = 800, isEmpty }: { retries?: number; baseDelayMs?: number; isEmpty?: (v: T) => boolean } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      if (isEmpty && isEmpty(result)) {
        lastError = new Error("Geminiから空の応答が返りました");
      } else {
        return result;
      }
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) await sleep(baseDelayMs * Math.pow(2, attempt));
  }
  throw lastError instanceof Error ? lastError : new Error("Geminiの呼び出しに失敗しました");
}
