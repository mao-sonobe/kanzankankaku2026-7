import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, ChunkedFile, GeneratedFile } from "@/lib/ai/types";
import type { TechStackProposal } from "@/lib/domain/stack";
import { idbStorage } from "./idb-storage";

export interface Highlight {
  type: "phrase" | "node";
  id: string;
}

interface ProjectState {
  planText: string;
  chatMessages: ChatMessage[];
  stackProposal: TechStackProposal | null;
  highlighted: Highlight | null;
  pinned: boolean;
  generatedFiles: GeneratedFile[];
  previewUrl: string | null;
  chunkedFiles: Record<string, ChunkedFile>;
  slotAnswers: Record<string, Record<string, string>>;
  hasHydrated: boolean;

  setPlanText: (text: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStackProposal: (proposal: TechStackProposal | null) => void;
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
  planText: "",
  chatMessages: [],
  stackProposal: null,
  highlighted: null,
  pinned: false,
  generatedFiles: [],
  previewUrl: null,
  chunkedFiles: {},
  slotAnswers: {},
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      hasHydrated: false,

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

      setStackProposal: (proposal) => set({ stackProposal: proposal }),

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

      resetStack: () => set({ stackProposal: null, highlighted: null, pinned: false }),

      setGeneratedFiles: (files) =>
        set({ generatedFiles: files, chunkedFiles: {}, slotAnswers: {}, previewUrl: null }),

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
        planText: state.planText,
        chatMessages: state.chatMessages,
        stackProposal: state.stackProposal,
        generatedFiles: state.generatedFiles,
        chunkedFiles: state.chunkedFiles,
        slotAnswers: state.slotAnswers,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
