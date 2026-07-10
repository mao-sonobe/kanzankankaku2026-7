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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * OpenAI APIはレート制限や一時的な障害で断続的にエラー/空応答を返すことがある。
 * その場合に指数バックオフでリトライする。`isEmpty`で「成功したが中身が空」も
 * 失敗扱いにできる(ストリーム途中でエラーになり空を返すケース対策)。
 */
export async function retryOpenAI<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelayMs = 800, isEmpty }: { retries?: number; baseDelayMs?: number; isEmpty?: (v: T) => boolean } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      if (isEmpty && isEmpty(result)) {
        lastError = new Error("OpenAIから空の応答が返りました");
      } else {
        return result;
      }
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) await sleep(baseDelayMs * Math.pow(2, attempt));
  }
  throw lastError instanceof Error ? lastError : new Error("OpenAIの呼び出しに失敗しました");
}
