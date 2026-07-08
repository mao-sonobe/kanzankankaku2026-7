"use client";

import { useState } from "react";
import { useProjectStore, type PlanStep } from "@/lib/store/project-store";
import { getAIProvider } from "@/lib/ai/get-provider";
import { WizardSteps } from "./wizard-steps";
import { StepChat } from "./step-chat";
import { StepQuiz } from "./step-quiz";
import { StepPipeline } from "./step-pipeline";

const READY_MARKER = "[READY]";

const DIALOGUE_SYSTEM_PROMPT =
  "あなたは初心者エンジニアの開発相談に乗るAIメンターです。" +
  "ユーザーの企画を読み、実現したいことをより具体的にするための質問を1つだけ、簡潔な日本語で尋ねてください。" +
  "説明や前置きは不要です。質問文だけを出力してください。\n" +
  "ただし、これまでの会話で企画が十分に具体化できた(作りたいもの・主要な機能・使う人のイメージが見えた)と判断したら、" +
  `質問の代わりに「${READY_MARKER}」から始めて、企画のまとめを2〜3文の簡潔な日本語で出力してください。`;

const TITLE_SYSTEM_PROMPT =
  "ユーザーの企画に、短くキャッチーな日本語の企画名を1つだけ付けてください。" +
  "10文字前後で、名前だけを出力してください。引用符・説明・記号は不要です。";

export function PlanWorkspace() {
  const planStep = useProjectStore((s) => s.planStep);
  const setPlanStep = useProjectStore((s) => s.setPlanStep);
  const planText = useProjectStore((s) => s.planText);
  const setPlanText = useProjectStore((s) => s.setPlanText);
  const projectTitle = useProjectStore((s) => s.projectTitle);
  const setProjectTitle = useProjectStore((s) => s.setProjectTitle);
  const hearingReady = useProjectStore((s) => s.hearingReady);
  const setHearingReady = useProjectStore((s) => s.setHearingReady);
  const chatMessages = useProjectStore((s) => s.chatMessages);
  const addChatMessage = useProjectStore((s) => s.addChatMessage);
  const updateLastAssistantMessage = useProjectStore((s) => s.updateLastAssistantMessage);
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const setStackProposal = useProjectStore((s) => s.setStackProposal);

  const [isChatting, setIsChatting] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);

  const provider = getAIProvider();
  const maxReached: PlanStep = stackProposal ? 3 : 1;

  async function generateTitle(firstMessage: string) {
    try {
      let title = "";
      await provider.chat(
        {
          messages: [
            { role: "system", content: TITLE_SYSTEM_PROMPT },
            { role: "user", content: firstMessage },
          ],
        },
        (token) => {
          title += token;
        }
      );
      const cleaned = title.trim().split("\n")[0].replace(/["「」『』]/g, "").slice(0, 30);
      if (cleaned) setProjectTitle(cleaned);
    } catch {
      // 企画名は装飾なので失敗しても会話は続行する
    }
  }

  async function handleSendMessage(text: string) {
    if (isChatting) return;
    setChatError(null);

    const isFirst = useProjectStore.getState().chatMessages.length === 0;
    if (isFirst) {
      setPlanText(text);
      void generateTitle(text);
    }
    addChatMessage({ role: "user", content: text });
    const history = useProjectStore.getState().chatMessages;

    setIsChatting(true);
    addChatMessage({ role: "assistant", content: "" });
    try {
      let buffer = "";
      await provider.chat(
        {
          messages: [{ role: "system", content: DIALOGUE_SYSTEM_PROMPT }, ...history],
        },
        (token) => {
          buffer += token;
          updateLastAssistantMessage(buffer.replace(READY_MARKER, "").trimStart());
        }
      );
      if (buffer.trimStart().startsWith(READY_MARKER)) {
        setHearingReady(true);
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "AIとの対話に失敗しました");
    } finally {
      setIsChatting(false);
    }
  }

  async function proposeStack() {
    if (isProposing) return;
    if (stackProposal) {
      setPlanStep(2);
      return;
    }
    setProposeError(null);
    setIsProposing(true);
    try {
      const history = useProjectStore
        .getState()
        .chatMessages.filter((m) => m.content.trim().length > 0);
      const proposal = await provider.proposeTechStack({
        planText,
        chatHistory: history,
      });
      setStackProposal(proposal);
      setPlanStep(2);
    } catch (err) {
      setProposeError(err instanceof Error ? err.message : "技術スタックの提案に失敗しました");
    } finally {
      setIsProposing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <WizardSteps current={planStep} maxReached={maxReached} onSelect={setPlanStep} />
      </div>

      {planStep === 1 && (
        <StepChat
          chatMessages={chatMessages}
          projectTitle={projectTitle}
          hearingReady={hearingReady}
          isChatting={isChatting}
          isProposing={isProposing}
          chatError={chatError}
          proposeError={proposeError}
          onSendMessage={handleSendMessage}
          onProceed={() => void proposeStack()}
        />
      )}

      {planStep === 2 &&
        (stackProposal ? (
          <StepQuiz proposal={stackProposal} onNext={() => setPlanStep(3)} />
        ) : (
          <p className="text-sm text-muted-foreground">技術スタックを準備しています…</p>
        ))}

      {planStep === 3 && stackProposal && (
        <StepPipeline proposal={stackProposal} onBack={() => setPlanStep(2)} />
      )}
    </div>
  );
}
