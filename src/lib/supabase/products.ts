import type { ChatMessage, ChunkedFile, GeneratedFile } from "@/lib/ai/types";
import type { TechStackProposal } from "@/lib/domain/stack";
import type { StackQuizState } from "@/lib/domain/stack-quiz";
import type { FeatureMapResult } from "@/lib/domain/feature-map";
import type { FeatureFlowResult } from "@/lib/domain/feature-flow";
import type { PlanStep } from "@/lib/store/project-store";
import { createClient } from "./client";

/** supabase/schema.sql の products テーブルに対応する型(DBはsnake_case)。 */
export interface ProductRow {
  id: string;
  user_id: string;
  title: string;
  plan_step: PlanStep;
  plan_text: string;
  project_title: string | null;
  hearing_ready: boolean;
  chat_messages: ChatMessage[];
  stack_proposal: TechStackProposal | null;
  stack_quiz: StackQuizState;
  stack_quiz_skipped: boolean;
  generated_files: GeneratedFile[];
  chunked_files: Record<string, ChunkedFile>;
  slot_answers: Record<string, Record<string, string>>;
  feature_map: FeatureMapResult | null;
  feature_flows: FeatureFlowResult | null;
  /** trueの間は自動保存がtitleを上書きしない(ユーザーが手動でリネームした)。 */
  title_is_custom: boolean;
  created_at: string;
  updated_at: string;
}

/** サイドバーの一覧表示に必要な最小限のカラムだけ取得する。 */
export type ProductSummary = Pick<ProductRow, "id" | "title" | "updated_at">;

export async function listProducts(userId: string): Promise<ProductSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProduct(id: string): Promise<ProductRow> {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** タイトル未確定時のフォールバック(企画文の先頭を使う)。 */
export function deriveTitle(projectTitle: string | null, planText: string): string {
  if (projectTitle) return projectTitle;
  const trimmed = planText.trim();
  if (!trimmed) return "無題のプロダクト";
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed;
}

export interface ProductUpsertPayload {
  title?: string;
  plan_step: PlanStep;
  plan_text: string;
  project_title: string | null;
  hearing_ready: boolean;
  chat_messages: ChatMessage[];
  stack_proposal: TechStackProposal | null;
  stack_quiz: StackQuizState;
  stack_quiz_skipped: boolean;
  generated_files: GeneratedFile[];
  chunked_files: Record<string, ChunkedFile>;
  slot_answers: Record<string, Record<string, string>>;
  feature_map: FeatureMapResult | null;
  feature_flows: FeatureFlowResult | null;
}

export async function createProduct(
  userId: string,
  payload: ProductUpsertPayload
): Promise<ProductRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ user_id: userId, ...payload })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductUpsertPayload>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) throw error;
}

/** サイドバーの「名前を変更」から呼ばれる。以後、自動保存はtitleを上書きしなくなる。 */
export async function renameProduct(id: string, title: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({ title, title_is_custom: true })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
