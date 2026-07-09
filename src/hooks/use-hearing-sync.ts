"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useProjectStore } from "@/lib/store/project-store";
import { upsertHearing, type HearingUpsertInput } from "@/lib/supabase/hearings";

const DEBOUNCE_MS = 1500;

function toHearingInput(state: ReturnType<typeof useProjectStore.getState>): HearingUpsertInput {
  return {
    id: state.currentHearingId ?? undefined,
    title: state.projectTitle,
    plan_step: state.planStep,
    last_screen: state.lastScreen,
    plan_text: state.planText,
    hearing_ready: state.hearingReady,
    chat_messages: state.chatMessages,
    stack_proposal: state.stackProposal,
    stack_quiz: state.stackQuiz,
    stack_quiz_skipped: state.stackQuizSkipped,
    generated_files: state.generatedFiles,
    chunked_files: state.chunkedFiles,
    slot_answers: state.slotAnswers,
    data_flow: state.dataFlow,
    feature_flows: state.featureFlows,
  };
}

function hasContent(state: ReturnType<typeof useProjectStore.getState>): boolean {
  return (
    !!state.currentHearingId || state.chatMessages.length > 0 || state.planText.trim().length > 0
  );
}

/**
 * ログイン中、ヒアリング内容の変更をデバウンスしてSupabaseへ自動保存する。
 * 未ログイン時は何もしない(今まで通りIndexedDBのみで動作する)。
 */
export function useHearingSync() {
  const user = useAuthStore((s) => s.user);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    async function save() {
      if (savingRef.current) return;
      const state = useProjectStore.getState();
      if (!hasContent(state)) return;
      savingRef.current = true;
      try {
        const input = toHearingInput(state);
        let row;
        try {
          row = await upsertHearing(input);
        } catch (err) {
          if (!input.id) throw err;
          // 保存先の行が無効(削除済み・別アカウント所有など)な場合、新規作成にフォールバックする。
          console.warn("既存のヒアリング行を更新できなかったため、新規作成します", err);
          row = await upsertHearing({ ...input, id: undefined });
        }
        if (useProjectStore.getState().currentHearingId !== row.id) {
          useProjectStore.getState().setCurrentHearingId(row.id);
        }
      } catch (err) {
        console.error("ヒアリングの自動保存に失敗しました", err);
      } finally {
        savingRef.current = false;
      }
    }

    function scheduleSave() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void save(), DEBOUNCE_MS);
    }

    // ログイン時点で既にローカル(IndexedDB)にヒアリング内容があれば、
    // その後の変更を待たずに保存する(未ログインで進めた後にログインするケース)。
    scheduleSave();
    const unsubscribe = useProjectStore.subscribe(scheduleSave);

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [user]);
}
