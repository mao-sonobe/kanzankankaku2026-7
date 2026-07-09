import { OllamaAIProvider } from "./ollama-provider";
import { OpenAIAIProvider } from "./openai-provider";
import { loadAISettings } from "./settings";
import type { AIProvider } from "./types";

/** 現在の設定に基づくAIProviderインスタンスを返す。呼び出し元はこの関数のみに依存する。 */
export function getAIProvider(): AIProvider {
  const settings = loadAISettings();
  if (settings.provider === "ollama") {
    return new OllamaAIProvider(settings);
  }
  return new OpenAIAIProvider(settings);
}
