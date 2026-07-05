import { create } from "zustand";
import type { ChatMessage } from "@/lib/ai/types";
import type { TechStackProposal } from "@/lib/domain/stack";

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

  setPlanText: (text: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStackProposal: (proposal: TechStackProposal | null) => void;
  hoverHighlight: (highlight: Highlight) => void;
  clearHoverHighlight: (highlight: Highlight) => void;
  toggleClickHighlight: (highlight: Highlight) => void;
  resetStack: () => void;
}

function sameHighlight(a: Highlight | null, b: Highlight | null): boolean {
  return !!a && !!b && a.type === b.type && a.id === b.id;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  planText: "",
  chatMessages: [],
  stackProposal: null,
  highlighted: null,
  pinned: false,

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
}));
