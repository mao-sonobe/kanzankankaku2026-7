import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, ChunkedFile, GeneratedFile } from "@/lib/ai/types";
import type { TechStackProposal } from "@/lib/domain/stack";
import { reconcileQuizState, type StackQuizEntry, type StackQuizState } from "@/lib/domain/stack-quiz";
import type { DataFlowResult } from "@/lib/domain/data-flow";
import { idbStorage } from "./idb-storage";

export interface Highlight {
  type: "phrase" | "node";
  id: string;
}

export type PlanStep = 1 | 2 | 3 | 4;

interface ProjectState {
  planStep: PlanStep;
  planText: string;
  chatMessages: ChatMessage[];
  stackProposal: TechStackProposal | null;
  /** STEP3の4択クイズの回答状況(nodeId -> 状態) */
  stackQuiz: StackQuizState;
  /** 「全部見る」でクイズを飛ばしたか */
  stackQuizSkipped: boolean;
  highlighted: Highlight | null;
  pinned: boolean;
  generatedFiles: GeneratedFile[];
  previewUrl: string | null;
  chunkedFiles: Record<string, ChunkedFile>;
  slotAnswers: Record<string, Record<string, string>>;
  /** データフロー解説の解析結果(生成コードに紐づく) */
  dataFlow: DataFlowResult | null;
  hasHydrated: boolean;

  setPlanStep: (step: PlanStep) => void;
  setPlanText: (text: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStackProposal: (
    proposal: TechStackProposal | null,
    opts?: { regenerated?: boolean }
  ) => void;
  answerQuizNode: (nodeId: string, entry: StackQuizEntry) => void;
  skipQuiz: () => void;
  setDataFlow: (result: DataFlowResult | null) => void;
  hoverHighlight: (highlight: Highlight) => void;
  clearHoverHighlight: (highlight: Highlight) => void;
  toggleClickHighlight: (highlight: Highlight) => void;
  resetStack: () => void;
  setGeneratedFiles: (files: GeneratedFile[]) => void;
  updateGeneratedFile: (path: string, content: string) => void;
  setPreviewUrl: (url: string | null) => void;
  setChunkedFile: (path: string, chunked: ChunkedFile) => void;
  setSlotAnswer: (path: string, slotId: string, choiceId: string) => void;
  resetProject: () => void;
  setHasHydrated: (value: boolean) => void;
}

function sameHighlight(a: Highlight | null, b: Highlight | null): boolean {
  return !!a && !!b && a.type === b.type && a.id === b.id;
}

const INITIAL_STATE = {
  planStep: 1 as PlanStep,
  planText: "",
  chatMessages: [],
  stackProposal: null,
  stackQuiz: {} as StackQuizState,
  stackQuizSkipped: false,
  highlighted: null,
  pinned: false,
  generatedFiles: [],
  previewUrl: null,
  chunkedFiles: {},
  slotAnswers: {},
  dataFlow: null,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      hasHydrated: false,

      setPlanStep: (step) => set({ planStep: step }),

      setPlanText: (text) => set({ planText: text }),

      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

      updateLastAssistantMessage: (content) =>
        set((state) => {
          const messages = [...state.chatMessages];
          const last = messages[messages.length - 1];
          if (last && last.role === "assistant") {
            messages[messages.length - 1] = { ...last, content };
          }
          return { chatMessages: messages };
        }),

      setStackProposal: (proposal, opts) => {
        if (!proposal) {
          set({ stackProposal: null, stackQuiz: {}, stackQuizSkipped: false });
          return;
        }
        if (opts?.regenerated) {
          // 再生成: ユーザーが変更を要望したノードを再度クイズしても意味がないため、
          // 変更・追加分は開示済みとして引き継ぐ。
          set({
            stackProposal: proposal,
            stackQuiz: reconcileQuizState(get().stackQuiz, get().stackProposal, proposal),
          });
        } else {
          set({ stackProposal: proposal, stackQuiz: {}, stackQuizSkipped: false });
        }
      },

      answerQuizNode: (nodeId, entry) =>
        set((state) => ({ stackQuiz: { ...state.stackQuiz, [nodeId]: entry } })),

      skipQuiz: () => set({ stackQuizSkipped: true }),

      setDataFlow: (result) => set({ dataFlow: result }),

      hoverHighlight: (highlight) => {
        if (!get().pinned) set({ highlighted: highlight });
      },

      clearHoverHighlight: (highlight) => {
        if (!get().pinned && sameHighlight(get().highlighted, highlight)) {
          set({ highlighted: null });
        }
      },

      toggleClickHighlight: (highlight) => {
        const { pinned, highlighted } = get();
        if (pinned && sameHighlight(highlighted, highlight)) {
          set({ highlighted: null, pinned: false });
        } else {
          set({ highlighted: highlight, pinned: true });
        }
      },

      resetStack: () =>
        set({
          stackProposal: null,
          stackQuiz: {},
          stackQuizSkipped: false,
          highlighted: null,
          pinned: false,
        }),

      setGeneratedFiles: (files) =>
        set({
          generatedFiles: files,
          chunkedFiles: {},
          slotAnswers: {},
          previewUrl: null,
          dataFlow: null,
        }),

      updateGeneratedFile: (path, content) =>
        set((state) => ({
          generatedFiles: state.generatedFiles.map((f) => (f.path === path ? { ...f, content } : f)),
        })),

      setPreviewUrl: (url) => set({ previewUrl: url }),

      setChunkedFile: (path, chunked) =>
        set((state) => ({ chunkedFiles: { ...state.chunkedFiles, [path]: chunked } })),

      setSlotAnswer: (path, slotId, choiceId) =>
        set((state) => ({
          slotAnswers: {
            ...state.slotAnswers,
            [path]: { ...state.slotAnswers[path], [slotId]: choiceId },
          },
        })),

      resetProject: () => set({ ...INITIAL_STATE }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "project-state",
      storage: createJSONStorage(() => idbStorage),
      // WebContainerのプレビューURL・ハイライト等の一時的なUI状態は保存しない。
      partialize: (state) => ({
        planStep: state.planStep,
        planText: state.planText,
        chatMessages: state.chatMessages,
        stackProposal: state.stackProposal,
        stackQuiz: state.stackQuiz,
        stackQuizSkipped: state.stackQuizSkipped,
        generatedFiles: state.generatedFiles,
        chunkedFiles: state.chunkedFiles,
        slotAnswers: state.slotAnswers,
        dataFlow: state.dataFlow,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
