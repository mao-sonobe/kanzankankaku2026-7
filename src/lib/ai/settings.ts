import type { AIProviderSettings } from "./types";

const STORAGE_KEY = "ai-provider-settings";

// Gemini APIが利用できない状況のため、ローカルLLM(Ollama)をデフォルトに戻す。
export const DEFAULT_AI_SETTINGS: AIProviderSettings = {
  provider: "ollama",
  endpoint: "http://localhost:11434",
  model: "qwen3:8b",
};

export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

export function loadAISettings(): AIProviderSettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider === "gemini" ? "gemini" : "ollama",
      endpoint: parsed.endpoint || DEFAULT_AI_SETTINGS.endpoint,
      model: parsed.model || DEFAULT_AI_SETTINGS.model,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings: AIProviderSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
