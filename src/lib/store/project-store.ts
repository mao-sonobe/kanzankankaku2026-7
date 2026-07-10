import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, ChunkedFile, GeneratedFile } from "@/lib/ai/types";
import type { TechStackProposal } from "@/lib/domain/stack";
import { reconcileQuizState, type StackQuizEntry, type StackQuizState } from "@/lib/domain/stack-quiz";
import type { FeatureMapResult } from "@/lib/domain/feature-map";
import type { FeatureFlowResult } from "@/lib/domain/feature-flow";
import { idbStorage } from "./idb-storage";

export interface Highlight {
  type: "phrase" | "node";
  id: string;
}

/** ①企画チャット ②カードクイズ ③配線パズル */
export type PlanStep = 1 | 2 | 3;

interface ProjectState {
  planStep: PlanStep;
  /** 最初に入力された企画テキスト(tech-stack API互換用。会話全体はchatMessages) */
  planText: string;
  /** AIが生成した企画名(チャット画面の上部に表示) */
  projectTitle: string | null;
  /** AIが「企画が十分まとまった」と判断したか([READY]検出) */
  hearingReady: boolean;
  chatMessages: ChatMessage[];
  stackProposal: TechStackProposal | null;
  /** STEP3の4択クイズの回答状況(nodeId -> 状態) */
  stackQuiz: StackQuizState;
  /** 「全部見る」でクイズを飛ばしたか */
  stackQuizSkipped: boolean;
  highlighted: Highlight | null;
  pinned: boolean;
  generatedFiles: GeneratedFile[];
  /** クイズ中に裏でコード生成を走らせている間true(非永続) */
  isPregenerating: boolean;
  previewUrl: string | null;
  chunkedFiles: Record<string, ChunkedFile>;
  slotAnswers: Record<string, Record<string, string>>;
  /** 機能マップの解析結果(生成コードに紐づく) */
  featureMap: FeatureMapResult | null;
  /** 配線パズル(機能ごとのデータフロー)の解析結果(生成コードに紐づく) */
  featureFlows: FeatureFlowResult | null;
  /** Supabase products テーブルの行id。未保存(ゲスト新規チャットの初回操作前など)はnull */
  currentProductId: string | null;
  /** trueの間は自動保存がtitleを上書きしない(サイドバーで手動リネームした) */
  titleIsCustom: boolean;
  hasHydrated: boolean;

  setPlanStep: (step: PlanStep) => void;
  setPlanText: (text: string) => void;
  setProjectTitle: (title: string | null) => void;
  setHearingReady: (ready: boolean) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStackProposal: (
    proposal: TechStackProposal | null,
    opts?: { regenerated?: boolean }
  ) => void;
  answerQuizNode: (nodeId: string, entry: StackQuizEntry) => void;
  skipQuiz: () => void;
  setFeatureMap: (result: FeatureMapResult | null) => void;
  setFeatureFlows: (result: FeatureFlowResult | null) => void;
  hoverHighlight: (highlight: Highlight) => void;
  clearHoverHighlight: (highlight: Highlight) => void;
  toggleClickHighlight: (highlight: Highlight) => void;
  resetStack: () => void;
  setGeneratedFiles: (files: GeneratedFile[]) => void;
  setIsPregenerating: (value: boolean) => void;
  updateGeneratedFile: (path: string, content: string) => void;
  setPreviewUrl: (url: string | null) => void;
  setChunkedFile: (path: string, chunked: ChunkedFile) => void;
  setSlotAnswer: (path: string, slotId: string, choiceId: string) => void;
  setCurrentProductId: (id: string | null) => void;
  setTitleIsCustom: (value: boolean) => void;
  /** 新規チャットを開始する(状態を初期化しつつ、Supabaseの行idも切り離す)。 */
  startNewProduct: () => void;
  /** Supabaseから読み込んだプロダクトの内容をストアに反映する。 */
  loadProduct: (product: {
    id: string;
    planStep: PlanStep;
    planText: string;
    projectTitle: string | null;
    hearingReady: boolean;
    chatMessages: ChatMessage[];
    stackProposal: TechStackProposal | null;
    stackQuiz: StackQuizState;
    stackQuizSkipped: boolean;
    generatedFiles: GeneratedFile[];
    chunkedFiles: Record<string, ChunkedFile>;
    slotAnswers: Record<string, Record<string, string>>;
    featureMap: FeatureMapResult | null;
    featureFlows: FeatureFlowResult | null;
    titleIsCustom: boolean;
  }) => void;
  setHasHydrated: (value: boolean) => void;
}

function sameHighlight(a: Highlight | null, b: Highlight | null): boolean {
  return !!a && !!b && a.type === b.type && a.id === b.id;
}

const INITIAL_STATE = {
  planStep: 1 as PlanStep,
  planText: "",
  projectTitle: null as string | null,
  hearingReady: false,
  chatMessages: [],
  stackProposal: null,
  stackQuiz: {} as StackQuizState,
  stackQuizSkipped: false,
  highlighted: null,
  pinned: false,
  generatedFiles: [],
  isPregenerating: false,
  previewUrl: null,
  chunkedFiles: {},
  slotAnswers: {},
  featureMap: null,
  featureFlows: null,
  currentProductId: null as string | null,
  titleIsCustom: false,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      hasHydrated: false,

      setPlanStep: (step) => set({ planStep: step }),

      setPlanText: (text) => set({ planText: text }),

      setProjectTitle: (title) => set({ projectTitle: title }),

      setHearingReady: (ready) => set({ hearingReady: ready }),

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

      setFeatureMap: (result) => set({ featureMap: result }),

      setFeatureFlows: (result) => set({ featureFlows: result }),

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
          featureMap: null,
          featureFlows: null,
        }),

      setIsPregenerating: (value) => set({ isPregenerating: value }),

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

      setCurrentProductId: (id) => set({ currentProductId: id }),

      setTitleIsCustom: (value) => set({ titleIsCustom: value }),

      startNewProduct: () => set({ ...INITIAL_STATE }),

      loadProduct: (product) =>
        set({
          currentProductId: product.id,
          titleIsCustom: product.titleIsCustom,
          planStep: product.planStep,
          planText: product.planText,
          projectTitle: product.projectTitle,
          hearingReady: product.hearingReady,
          chatMessages: product.chatMessages,
          stackProposal: product.stackProposal,
          stackQuiz: product.stackQuiz,
          stackQuizSkipped: product.stackQuizSkipped,
          generatedFiles: product.generatedFiles,
          chunkedFiles: product.chunkedFiles,
          slotAnswers: product.slotAnswers,
          featureMap: product.featureMap,
          featureFlows: product.featureFlows,
          // WebContainerは行をまたいで復元できないため、プレビューは再生成が必要。
          previewUrl: null,
          highlighted: null,
          pinned: false,
        }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "project-state",
      storage: createJSONStorage(() => idbStorage),
      version: 3,
      // v1(4ステップ構成)の永続化データを3ステップ構成へ変換する。
      // v2→v3: dataFlow(技術スタックのエッジ単位)をfeatureMap(機能単位、ファイル横断)に置き換え。
      migrate: (persisted, version) => {
        const state = persisted as Partial<ProjectState> & { planStep?: number; dataFlow?: unknown };
        if (version < 2) {
          const old = state.planStep ?? 1;
          state.planStep = (old <= 2 ? 1 : old === 3 ? 2 : 3) as PlanStep;
        }
        if (version < 3) {
          delete state.dataFlow;
          state.featureMap = null;
        }
        return state as ProjectState;
      },
      // WebContainerのプレビューURL・ハイライト等の一時的なUI状態は保存しない。
      partialize: (state) => ({
        planStep: state.planStep,
        planText: state.planText,
        projectTitle: state.projectTitle,
        hearingReady: state.hearingReady,
        chatMessages: state.chatMessages,
        stackProposal: state.stackProposal,
        stackQuiz: state.stackQuiz,
        stackQuizSkipped: state.stackQuizSkipped,
        generatedFiles: state.generatedFiles,
        chunkedFiles: state.chunkedFiles,
        slotAnswers: state.slotAnswers,
        featureMap: state.featureMap,
        featureFlows: state.featureFlows,
        currentProductId: state.currentProductId,
        titleIsCustom: state.titleIsCustom,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
