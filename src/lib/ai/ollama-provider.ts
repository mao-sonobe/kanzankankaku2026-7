import type {
  AIProvider,
  ChatOptions,
  ChunkCodeOptions,
  ChunkCodeResult,
  GenerateCodeOptions,
  GenerateCodeResult,
  ProposeTechStackOptions,
} from "./types";
import type { TechStackProposal } from "@/lib/domain/stack";
import type { AIProviderSettings } from "./types";

/**
 * ローカルLLM(Ollama)を呼び出すAIProvider実装。
 * Next.jsのRoute Handler(/api/ollama/*)を経由してOllamaにリクエストを転送する。
 */
export class OllamaAIProvider implements AIProvider {
  constructor(private settings: AIProviderSettings) {}

  async chat(options: ChatOptions, onToken: (token: string) => void): Promise<string> {
    const res = await fetch("/api/ollama/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: this.settings.endpoint,
        model: this.settings.model,
        messages: options.messages,
      }),
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
      throw new Error(
        "Ollamaから応答がありませんでした。`ollama serve`が起動しているか、設定画面でモデル名を確認してください。"
      );
    }
    return full;
  }

  async proposeTechStack(options: ProposeTechStackOptions): Promise<TechStackProposal> {
    const res = await fetch("/api/ollama/tech-stack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: this.settings.endpoint,
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
    const res = await fetch("/api/ollama/generate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: this.settings.endpoint,
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
    const res = await fetch("/api/ollama/chunk-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: this.settings.endpoint,
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

  async checkConnection(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    const res = await fetch("/api/ollama/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: this.settings.endpoint }),
    });
    return res.json();
  }
}
