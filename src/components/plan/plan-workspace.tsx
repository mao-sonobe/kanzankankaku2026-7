"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectStore } from "@/lib/store/project-store";
import { getAIProvider } from "@/lib/ai/get-provider";
import { HighlightedPlanText } from "./highlighted-plan-text";
import { StackGraph } from "./stack-graph";
import { STACK_CATEGORY_LABEL } from "@/lib/domain/stack";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { cn } from "@/lib/utils";

const DIALOGUE_SYSTEM_PROMPT =
  "あなたは初心者エンジニアの開発相談に乗るAIメンターです。" +
  "ユーザーの企画書を読み、実現したいことをより具体的にするための質問を1つだけ、簡潔な日本語で尋ねてください。" +
  "説明や前置きは不要です。質問文だけを出力してください。";

export function PlanWorkspace() {
  const planText = useProjectStore((s) => s.planText);
  const setPlanText = useProjectStore((s) => s.setPlanText);
  const chatMessages = useProjectStore((s) => s.chatMessages);
  const addChatMessage = useProjectStore((s) => s.addChatMessage);
  const updateLastAssistantMessage = useProjectStore((s) => s.updateLastAssistantMessage);
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const setStackProposal = useProjectStore((s) => s.setStackProposal);
  const resetStack = useProjectStore((s) => s.resetStack);

  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);

  const provider = getAIProvider();

  async function startDialogue() {
    if (!planText.trim() || isChatting) return;
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

  async function sendReply() {
    const reply = chatInput.trim();
    if (!reply || isChatting) return;
    setChatError(null);
    setChatInput("");
    addChatMessage({ role: "user", content: reply });
    const history = useProjectStore.getState().chatMessages;
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

  async function proposeStack() {
    if (!planText.trim() || isProposing) return;
    setProposeError(null);
    setIsProposing(true);
    try {
      const history = useProjectStore
        .getState()
        .chatMessages.filter((m) => m.content.trim().length > 0);
      const proposal = await provider.proposeTechStack({ planText, chatHistory: history });
      setStackProposal(proposal);
    } catch (err) {
      setProposeError(err instanceof Error ? err.message : "技術スタックの提案に失敗しました");
    } finally {
      setIsProposing(false);
    }
  }

  const visibleMessages = chatMessages;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>企画書</CardTitle>
          <CardDescription>作りたいものを自然文で入力してください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={planText}
            onChange={(e) => setPlanText(e.target.value)}
            placeholder="例: 友人と旅行の計画を立てるときに、みんなの希望日程とやりたいことを持ち寄って、自動で最適な旅程を提案してくれるWebアプリを作りたい。..."
            rows={8}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button onClick={startDialogue} disabled={!planText.trim() || isChatting}>
              AIと相談する
            </Button>
            <Button onClick={proposeStack} disabled={!planText.trim() || isProposing} variant="secondary">
              {isProposing ? "提案中…" : "技術スタックを提案してもらう"}
            </Button>
            {stackProposal && (
              <Button onClick={resetStack} variant="ghost">
                リセット
              </Button>
            )}
          </div>
          {proposeError && (
            <Alert variant="destructive">
              <AlertTitle>技術スタックの提案に失敗しました</AlertTitle>
              <AlertDescription>{proposeError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {visibleMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AIとの対話</CardTitle>
            <CardDescription>質問に答えることで、より的確な技術提案が受けられます。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-64 rounded-md border p-3">
              <div className="flex flex-col gap-3">
                {visibleMessages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      m.role === "assistant"
                        ? "self-start bg-muted"
                        : "self-end bg-primary text-primary-foreground"
                    )}
                  >
                    {m.content || (isChatting && i === visibleMessages.length - 1 ? "…" : "")}
                  </div>
                ))}
              </div>
            </ScrollArea>
            {chatError && (
              <Alert variant="destructive">
                <AlertTitle>対話に失敗しました</AlertTitle>
                <AlertDescription>{chatError}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="回答を入力…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendReply();
                }}
                disabled={isChatting}
              />
              <Button onClick={sendReply} disabled={!chatInput.trim() || isChatting}>
                送信
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stackProposal && (
        <Card>
          <CardHeader>
            <CardTitle>提案された技術スタック</CardTitle>
            <CardDescription>
              企画書のフレーズと技術要素をクリックすると、対応する要素がハイライトされます。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-md border p-4">
              <HighlightedPlanText
                planText={planText}
                phrases={stackProposal.phrases}
                nodes={stackProposal.nodes}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(STACK_CATEGORY_LABEL).map(([key, label]) => {
                  const colors = CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS];
                  return (
                    <span
                      key={key}
                      className={cn(
                        "flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                        colors.bg,
                        colors.text
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", colors.dot)} />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
            <StackGraph nodes={stackProposal.nodes} edges={stackProposal.edges} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
