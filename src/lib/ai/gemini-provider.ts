import type {
  AIProvider,
  AnalyzeDataFlowOptions,
  AnalyzeFeatureFlowsOptions,
  ChatOptions,
  ChunkCodeOptions,
  ChunkCodeResult,
  GenerateCodeOptions,
  GenerateCodeResult,
  ProposeTechStackOptions,
} from "./types";
import type { TechStackProposal } from "@/lib/domain/stack";
import type { DataFlowResult } from "@/lib/domain/data-flow";
import type { FeatureFlowResult } from "@/lib/domain/feature-flow";
import type { AIProviderSettings } from "./types";

/**
 * Gemini(Google Generative AI)を呼び出すAIProvider実装。実験用ブランチ。
 * OllamaAIProviderと同じNext.jsのRoute Handler(/api/gemini/*)経由の構造を踏襲する。
 * APIキーはクライアントに渡さず、サーバー側の環境変数からのみ読む。
 */
export class GeminiAIProvider implements AIProvider {
  constructor(private settings: AIProviderSettings) {}

  async chat(options: ChatOptions, onToken: (token: string) => void): Promise<string> {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.settings.model, messages: options.messages }),
      signal: options.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(`AIチャットに失敗しました: ${res.status} ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      onToken(chunk);
    }
    if (!full.trim()) {
      throw new Error("Geminiから応答がありませんでした。APIキーとモデル名を確認してください。");
    }
    return full;
  }

  async proposeTechStack(options: ProposeTechStackOptions): Promise<TechStackProposal> {
    const res = await fetch("/api/gemini/tech-stack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.settings.model,
        planText: options.planText,
        chatHistory: options.chatHistory,
        currentProposal: options.currentProposal,
        feedback: options.feedback,
      }),
      signal: options.signal,
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error ?? "技術スタックの提案に失敗しました");
    }
    return data.proposal as TechStackProposal;
  }

  async generateCode(options: GenerateCodeOptions): Promise<GenerateCodeResult> {
    const res = await fetch("/api/gemini/generate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.settings.model,
        planSummary: options.planSummary,
        stackNodes: options.stackNodes,
      }),
      signal: options.signal,
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error ?? "コード生成に失敗しました");
    }
    return data.result as GenerateCodeResult;
  }

  async chunkCode(options: ChunkCodeOptions): Promise<ChunkCodeResult> {
    const res = await fetch("/api/gemini/chunk-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.settings.model,
        file: options.file,
        stackProposal: options.stackProposal,
      }),
      signal: options.signal,
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error ?? "コードのチャンク化に失敗しました");
    }
    return data.result as ChunkCodeResult;
  }

  async analyzeDataFlow(options: AnalyzeDataFlowOptions): Promise<DataFlowResult> {
    const res = await fetch("/api/gemini/data-flow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.settings.model,
        files: options.files,
        stackProposal: options.stackProposal,
      }),
      signal: options.signal,
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error ?? "データフローの解析に失敗しました");
    }
    return data.result as DataFlowResult;
  }

  async analyzeFeatureFlows(options: AnalyzeFeatureFlowsOptions): Promise<FeatureFlowResult> {
    const res = await fetch("/api/gemini/feature-flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.settings.model,
        files: options.files,
        planText: options.planText,
      }),
      signal: options.signal,
    });
    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error ?? "機能フローの解析に失敗しました");
    }
    return data.result as FeatureFlowResult;
  }

  async checkConnection(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    const res = await fetch("/api/gemini/check", { method: "POST" });
    return res.json();
  }
}
