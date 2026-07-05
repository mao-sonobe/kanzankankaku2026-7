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
