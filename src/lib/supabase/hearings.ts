import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, ChunkedFile, GeneratedFile } from "@/lib/ai/types";
import type { TechStackProposal } from "@/lib/domain/stack";
import type { StackQuizState } from "@/lib/domain/stack-quiz";
import type { DataFlowResult } from "@/lib/domain/data-flow";
import type { FeatureFlowResult } from "@/lib/domain/feature-flow";
import type { PlanStep, Screen } from "@/lib/store/project-store";

/** `hearings`テーブルの行(src/lib/store/project-store.tsのpartialize対象と対応)。 */
export interface HearingRow {
  id: string;
  user_id: string;
  title: string | null;
  plan_step: PlanStep;
  last_screen: Screen;
  plan_text: string;
  hearing_ready: boolean;
  chat_messages: ChatMessage[];
  stack_proposal: TechStackProposal | null;
  stack_quiz: StackQuizState;
  stack_quiz_skipped: boolean;
  generated_files: GeneratedFile[];
  chunked_files: Record<string, ChunkedFile>;
  slot_answers: Record<string, Record<string, string>>;
  data_flow: DataFlowResult | null;
  feature_flows: FeatureFlowResult | null;
  created_at: string;
  updated_at: string;
}

export type HearingUpsertInput = Omit<HearingRow, "id" | "user_id" | "created_at" | "updated_at"> & {
  id?: string;
};

export async function listHearings(): Promise<HearingRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hearings")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as HearingRow[];
}

export async function getHearing(id: string): Promise<HearingRow> {
  const supabase = createClient();
  const { data, error } = await supabase.from("hearings").select("*").eq("id", id).single();
  if (error) throw error;
  return data as HearingRow;
}

/** idが無ければ新規作成、あれば更新。作成/更新後の行を返す。 */
export async function upsertHearing(input: HearingUpsertInput): Promise<HearingRow> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインしていません");

  const { data, error } = await supabase
    .from("hearings")
    .upsert(
      {
        ...input,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as HearingRow;
}

export async function renameHearing(id: string, title: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("hearings")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHearing(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("hearings").delete().eq("id", id);
  if (error) throw error;
}
