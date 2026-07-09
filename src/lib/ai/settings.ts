import type { AIProviderSettings } from "./types";

const STORAGE_KEY = "ai-provider-settings";

// 公開版(Vercel)はGeminiが前提(Ollamaはlocalhost必須のため開発者向けオプション)。
// gemini-2.5-flash等は共有無料枠の日次クォータが枯渇しやすいため、別クォータで
// 高スループット向けの gemini-2.5-flash-lite をデフォルトにする。
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash-lite";

export const DEFAULT_AI_SETTINGS: AIProviderSettings = {
  provider: "gemini",
  endpoint: "http://localhost:11434",
  model: GEMINI_DEFAULT_MODEL,
};

// 以前デフォルトだった(=ユーザーが明示選択したわけではない)モデル。
// これらが保存されている場合は現行デフォルトへ自動アップグレードする。
const STALE_GEMINI_MODELS = new Set(["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]);

export function loadAISettings(): AIProviderSettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    const provider = parsed.provider === "gemini" ? "gemini" : "ollama";
    let model = parsed.model || DEFAULT_AI_SETTINGS.model;
    // クォータ枯渇しやすい旧デフォルトモデルは現行デフォルトへ引き上げる。
    if (provider === "gemini" && STALE_GEMINI_MODELS.has(model)) {
      model = GEMINI_DEFAULT_MODEL;
    }
    return {
      provider,
      endpoint: parsed.endpoint || DEFAULT_AI_SETTINGS.endpoint,
      model,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings: AIProviderSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
