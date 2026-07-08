import { OllamaAIProvider } from "./ollama-provider";
import { GeminiAIProvider } from "./gemini-provider";
import { loadAISettings } from "./settings";
import type { AIProvider } from "./types";

/** 現在の設定に基づくAIProviderインスタンスを返す。呼び出し元はこの関数のみに依存する。 */
export function getAIProvider(): AIProvider {
  const settings = loadAISettings();
  if (settings.provider === "gemini") {
    return new GeminiAIProvider(settings);
  }
  return new OllamaAIProvider(settings);
}
