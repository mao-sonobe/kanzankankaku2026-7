/** Ollama呼び出しの失敗理由を初心者にも分かりやすいメッセージに変換する。 */
export function toFriendlyOllamaError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("failed to fetch") ||
    lower.includes("cannot connect") ||
    lower.includes("network")
  ) {
    return "Ollamaに接続できませんでした。`ollama serve` が起動しているか、設定画面のエンドポイントURLが正しいか確認してください。";
  }
  if (lower.includes("404") || lower.includes("not found") || lower.includes("model")) {
    return `指定したモデルが見つからない可能性があります。設定画面で \`ollama pull <モデル名>\` 済みか確認してください。(詳細: ${message})`;
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Ollamaの応答がタイムアウトしました。モデルのサイズやマシンの性能によっては時間がかかることがあります。もう一度お試しください。";
  }
  return message;
}

/** Gemini呼び出しの失敗理由を分かりやすいメッセージに変換する。 */
export function toFriendlyGeminiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("api_key") || lower.includes("api key") || lower.includes("google_generative_ai_api_key")) {
    return "Gemini APIキーが未設定か無効です。.env.localのGOOGLE_GENERATIVE_AI_API_KEYを確認してください。";
  }
  if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit")) {
    return "Gemini APIのレート制限/クォータに達しました。しばらく待ってから再試行してください。";
  }
  if (lower.includes("404") || lower.includes("not found") || lower.includes("model")) {
    return `指定したモデル名が無効な可能性があります。(詳細: ${message})`;
  }
  return message;
}
