import { createOpenAI } from "@ai-sdk/openai";

/**
 * OpenAI(ChatGPT) APIキーはサーバー側の環境変数(.env.local)にのみ保持し、クライアントには渡さない。
 *
 * `OPENAI_BASE_URL` を設定すると、OpenAI互換の任意のエンドポイントに切り替えられる。
 * これにより、無料のQwen(例: ローカルOllamaの http://localhost:11434/v1、OpenRouterや
 * DashScopeのOpenAI互換API)をテスト用途で使い、最終的に本物のChatGPT APIへ差し替えられる。
 */
export function getOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEYが設定されていません。.env.localに設定してから`npm run dev`を再起動してください。" +
        "(Qwen等のOpenAI互換エンドポイントを使う場合はダミー値でも可)"
    );
  }
  return createOpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL || undefined });
}

/**
 * 実際に使うモデル名。`OPENAI_MODEL` があればサーバー側で強制的に上書きする
 * (Qwen等の互換エンドポイントへ向ける際、クライアント設定のモデル名と不一致でも動くように)。
 */
export function resolveModel(clientModel: string): string {
  return process.env.OPENAI_MODEL || clientModel;
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
