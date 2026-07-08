"use client";

import { useState } from "react";
import { useProjectStore, type PlanStep } from "@/lib/store/project-store";
import { getAIProvider } from "@/lib/ai/get-provider";
import { WizardSteps } from "./wizard-steps";
import { StepInput } from "./step-input";
import { StepHearing } from "./step-hearing";
import { StepProposal } from "./step-proposal";
import { StepExplain } from "./step-explain";

const DIALOGUE_SYSTEM_PROMPT =
  "あなたは初心者エンジニアの開発相談に乗るAIメンターです。" +
  "ユーザーの企画書を読み、実現したいことをより具体的にするための質問を1つだけ、簡潔な日本語で尋ねてください。" +
  "説明や前置きは不要です。質問文だけを出力してください。";

export function PlanWorkspace() {
  const planStep = useProjectStore((s) => s.planStep);
  const setPlanStep = useProjectStore((s) => s.setPlanStep);
  const planText = useProjectStore((s) => s.planText);
  const setPlanText = useProjectStore((s) => s.setPlanText);
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
  const maxReached: PlanStep = stackProposal ? 4 : chatMessages.length > 0 ? 3 : planStep;

  function goToStep(step: PlanStep) {
    setPlanStep(step);
  }

  async function runDialogue(history: typeof chatMessages) {
    setChatError(null);
    setIsChatting(true);
    addChatMessage({ role: "assistant", content: "" });
    try {
      let buffer = "";
      await provider.chat(
        {
          messages: [
            { role: "system", content: DIALOGUE_SYSTEM_PROMPT },
            { role: "user", content: `企画書:\n${planText}` },
            ...history,
          ],
        },
        (token) => {
          buffer += token;
          updateLastAssistantMessage(buffer);
        }
      );
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "AIとの対話に失敗しました");
    } finally {
      setIsChatting(false);
    }
  }

  async function handleStartDialogue() {
    if (!planText.trim() || isChatting) return;
    await runDialogue([]);
  }

  async function handleSendReply(text: string) {
    if (isChatting) return;
    addChatMessage({ role: "user", content: text });
    const history = useProjectStore.getState().chatMessages;
    await runDialogue(history);
  }

  async function proposeStack(feedback?: string) {
    if (isProposing) return;
    setProposeError(null);
    setIsProposing(true);
    try {
      const history = useProjectStore
        .getState()
        .chatMessages.filter((m) => m.content.trim().length > 0);
      const proposal = await provider.proposeTechStack({
        planText,
        chatHistory: history,
        currentProposal: feedback ? stackProposal ?? undefined : undefined,
        feedback,
      });
      setStackProposal(proposal, { regenerated: Boolean(feedback) });
      if (planStep < 3) setPlanStep(3);
    } catch (err) {
      setProposeError(err instanceof Error ? err.message : "技術スタックの提案に失敗しました");
    } finally {
      setIsProposing(false);
    }
  }

  return (
    <div className="space-y-6">
      <WizardSteps current={planStep} maxReached={maxReached} onSelect={goToStep} />

      {planStep === 1 && (
        <StepInput
          planText={planText}
          onChangePlanText={setPlanText}
          onNext={() => setPlanStep(2)}
        />
      )}

      {planStep === 2 && (
        <StepHearing
          planText={planText}
          chatMessages={chatMessages}
          isChatting={isChatting}
          chatError={chatError}
          onStartDialogue={handleStartDialogue}
          onSendReply={handleSendReply}
          onNext={() => {
            if (stackProposal) {
              setPlanStep(3);
            } else {
              void proposeStack();
            }
          }}
        />
      )}

      {planStep === 3 &&
        (stackProposal ? (
          <StepProposal
            proposal={stackProposal}
            isProposing={isProposing}
            proposeError={proposeError}
            onRegenerate={(feedback) => void proposeStack(feedback)}
            onBack={() => setPlanStep(2)}
            onNext={() => setPlanStep(4)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {isProposing ? "技術スタックを提案しています…" : "技術スタックの提案を準備しています…"}
          </p>
        ))}

      {planStep === 4 && stackProposal && (
        <StepExplain proposal={stackProposal} onBack={() => setPlanStep(3)} />
      )}
    </div>
  );
}
