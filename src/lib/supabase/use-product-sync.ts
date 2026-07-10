"use client";

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/lib/store/project-store";
import { useAuth } from "./use-auth";
import { createProduct, deriveTitle, updateProduct, type ProductUpsertPayload } from "./products";

const SAVE_DEBOUNCE_MS = 1500;

/**
 * 現在の企画・生成物の状態をSupabaseへ自動保存する。
 * currentProductIdが未設定の間は「何か書き込みがあった時点」で新規行を作成し、
 * 以降はその行を更新し続ける(=普通のチャットAIの「初回送信で会話が作られる」挙動と同じ)。
 */
export function useProductSync() {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const save = async () => {
      const state = useProjectStore.getState();
      // 何も入力されていない真っさらな状態は保存しない。
      const hasContent =
        state.planText.trim().length > 0 || state.chatMessages.length > 0;
      if (!hasContent) return;
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        const payload: ProductUpsertPayload = {
          plan_step: state.planStep,
          plan_text: state.planText,
          project_title: state.projectTitle,
          hearing_ready: state.hearingReady,
          chat_messages: state.chatMessages,
          stack_proposal: state.stackProposal,
          stack_quiz: state.stackQuiz,
          stack_quiz_skipped: state.stackQuizSkipped,
          generated_files: state.generatedFiles,
          chunked_files: state.chunkedFiles,
          slot_answers: state.slotAnswers,
          feature_map: state.featureMap,
          feature_flows: state.featureFlows,
        };

        if (state.currentProductId) {
          // 手動リネーム済みのプロダクトはtitleを自動上書きしない。
          const updatePayload = state.titleIsCustom
            ? payload
            : { ...payload, title: deriveTitle(state.projectTitle, state.planText) };
          await updateProduct(state.currentProductId, updatePayload);
        } else {
          const row = await createProduct(user.id, {
            ...payload,
            title: deriveTitle(state.projectTitle, state.planText),
          });
          useProjectStore.getState().setCurrentProductId(row.id);
        }
        window.dispatchEvent(new Event("product-saved"));
      } catch {
        // 自動保存の失敗はユーザー体験を止めるほどではないため、静かに諦めて次の変更を待つ。
      } finally {
        savingRef.current = false;
      }
    };

    const unsubscribe = useProjectStore.subscribe(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(save, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);
}
