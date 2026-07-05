import type { AIProviderSettings } from "./types";

const STORAGE_KEY = "ai-provider-settings";

export const DEFAULT_AI_SETTINGS: AIProviderSettings = {
  endpoint: "http://localhost:11434",
  model: "qwen2.5:3b",
};

export function loadAISettings(): AIProviderSettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
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
