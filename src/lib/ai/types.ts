// AIプロバイダーの抽象化。呼び出し元（対話UI・コード生成・チャンク化処理）は
// このインターフェースにのみ依存し、具体的なプロバイダー実装（Ollama/将来のGemini等）を意識しない。

import type { TechStackProposal } from "@/lib/domain/stack";
import type { DataFlowResult } from "@/lib/domain/data-flow";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface ProposeTechStackOptions {
  planText: string;
  /** これまでの対話履歴（企画の深掘り質問と回答） */
  chatHistory: ChatMessage[];
  /** 直前の提案(再生成時のベース)。指定時はfeedbackで要求された部分だけを変更する */
  currentProposal?: TechStackProposal;
  /** 「ここだけ変更してほしい」というユーザーからの要望テキスト */
  feedback?: string;
  signal?: AbortSignal;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateCodeOptions {
  /** 確定した企画書の要約 */
  planSummary: string;
  /** 確定した技術スタックノードのリスト */
  stackNodes: { id: string; label: string; category: string; description: string }[];
  signal?: AbortSignal;
}

export interface GenerateCodeResult {
  files: GeneratedFile[];
}

export type BlockRole =
  | "state"
  | "event-handler"
  | "api-fetch"
  | "jsx"
  | "logic"
  | "import"
  | "style"
  | "other";

export interface CodeBlockChoice {
  id: string;
  code: string;
  isCorrect: boolean;
}

export interface CodeBlockSlot {
  id: string;
  role: BlockRole;
  label: string;
  choices: CodeBlockChoice[];
  /** この空欄が関わる技術スタックノードのid(STEP3の提案との紐付け。任意) */
  relatedStackNodeId?: string;
  /** 正解した際に表示する、このコードが何をしていて何とつながっているかの説明文(1〜2文) */
  explanation?: string;
}

/** チャンク化されたファイル: ゴーストコード + 空欄スロットの並び */
export interface ChunkedFile {
  path: string;
  /** このファイルで何が重要かを2〜3文で説明した概要 */
  summary: string;
  /** ファイル内容をスロットとプレーンテキストの断片に分解したもの（順序通りに連結すると元コードに戻る） */
  segments: (
    | { type: "text"; content: string }
    | { type: "slot"; slot: CodeBlockSlot }
  )[];
}

export interface ChunkCodeOptions {
  file: GeneratedFile;
  /** 指定時、空欄を技術間のデータ受け渡し箇所に寄せ、relatedStackNodeIdを付与する */
  stackProposal?: TechStackProposal;
  signal?: AbortSignal;
}

export interface ChunkCodeResult {
  chunked: ChunkedFile;
}

export interface AnalyzeDataFlowOptions {
  files: GeneratedFile[];
  stackProposal: TechStackProposal;
  signal?: AbortSignal;
}

/**
 * AI呼び出しの抽象インターフェース。
 * v1実装は OllamaAIProvider のみ。将来 GeminiAIProvider に差し替える計画があるため
 * 呼び出し元はこの型にのみ依存すること。
 */
export interface AIProvider {
  /** 対話形式のチャット（ストリーミング）。chunkごとにonTokenが呼ばれる */
  chat(options: ChatOptions, onToken: (token: string) => void): Promise<string>;
  /** 企画書と対話履歴から技術スタックを提案する（構造化出力） */
  proposeTechStack(options: ProposeTechStackOptions): Promise<TechStackProposal>;
  generateCode(options: GenerateCodeOptions): Promise<GenerateCodeResult>;
  chunkCode(options: ChunkCodeOptions): Promise<ChunkCodeResult>;
  /**
   * 生成コード内で技術スタックのエッジ(データの流れ)が実装されている箇所を特定する。
   * 未対応のプロバイダー(Ollama)は実装しなくてよく、UI側はその場合機能を隠す。
   */
  analyzeDataFlow?(options: AnalyzeDataFlowOptions): Promise<DataFlowResult>;
  /** 疎通確認。利用可能なモデル一覧を返す */
  checkConnection(): Promise<{ ok: boolean; models?: string[]; error?: string }>;
}

export type AIProviderKind = "ollama" | "gemini";

export interface AIProviderSettings {
  provider: AIProviderKind;
  /** Ollama使用時のみ参照するエンドポイントURL */
  endpoint: string;
  model: string;
}
