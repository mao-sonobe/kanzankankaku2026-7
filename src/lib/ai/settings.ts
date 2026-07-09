import type { AIProviderSettings } from "./types";

const STORAGE_KEY = "ai-provider-settings";

// 公開版(Vercel)はGeminiが前提(Ollamaはlocalhost必須のため開発者向けオプション)。
export const DEFAULT_AI_SETTINGS: AIProviderSettings = {
  provider: "gemini",
  endpoint: "http://localhost:11434",
  model: "gemini-2.5-flash",
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
