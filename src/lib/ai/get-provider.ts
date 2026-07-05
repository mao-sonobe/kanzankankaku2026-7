import { OllamaAIProvider } from "./ollama-provider";
import { loadAISettings } from "./settings";
import type { AIProvider } from "./types";

/** 現在の設定に基づくAIProviderインスタンスを返す。呼び出し元はこの関数のみに依存する。 */
export function getAIProvider(): AIProvider {
  return new OllamaAIProvider(loadAISettings());
}
