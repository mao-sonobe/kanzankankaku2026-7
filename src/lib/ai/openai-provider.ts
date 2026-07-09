import type {
  AIProvider,
  AnalyzeDataFlowOptions,
  ChatOptions,
  ChunkCodeOptions,
  ChunkCodeResult,
  GenerateCodeOptions,
  GenerateCodeResult,
  ProposeTechStackOptions,
} from "./types";
import type { TechStackProposal } from "@/lib/domain/stack";
import type { DataFlowResult } from "@/lib/domain/data-flow";
import type { AIProviderSettings } from "./types";

/**
 * ChatGPT(OpenAI)を呼び出すAIProvider実装。
 * OllamaAIProviderと同じNext.jsのRoute Handler(/api/openai/*)経由の構造を踏襲する。
 * APIキーはクライアントに渡さず、サーバー側の環境変数からのみ読む。
 */
export class OpenAIAIProvider implements AIProvider {
  constructor(private settings: AIProviderSettings) {}

  async chat(options: ChatOptions, onToken: (token: string) => void): Promise<string> {
    const res = await fetch("/api/openai/chat", {
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
      throw new Error("ChatGPTから応答がありませんでした。APIキーとモデル名を確認してください。");
    }
    return full;
  }

  async proposeTechStack(options: ProposeTechStackOptions): Promise<TechStackProposal> {
    const res = await fetch("/api/openai/tech-stack", {
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
    const res = await fetch("/api/openai/generate-code", {
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
    const res = await fetch("/api/openai/chunk-code", {
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
    const res = await fetch("/api/openai/data-flow", {
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

  async checkConnection(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    const res = await fetch("/api/openai/check", { method: "POST" });
    return res.json();
  }
}
