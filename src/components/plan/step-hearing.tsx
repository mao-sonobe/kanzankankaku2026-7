"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/ai/types";

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={cn("relative max-w-[85%] rounded-2xl border-2 px-4 py-3 text-sm", isAssistant ? "self-start" : "self-end")}
      style={{ borderColor: "var(--brand-blue)" }}
    >
      {message.content || "…"}
      <span
        className="absolute -bottom-2 size-4 rotate-45 border-b-2 border-r-2 bg-background"
        style={{ borderColor: "var(--brand-blue)", [isAssistant ? "left" : "right"]: "1rem" } as React.CSSProperties}
      />
    </div>
  );
}

export function StepHearing({
  planText,
  chatMessages,
  isChatting,
  chatError,
  onStartDialogue,
  onSendReply,
  onNext,
}: {
  planText: string;
  chatMessages: ChatMessage[];
  isChatting: boolean;
  chatError: string | null;
  onStartDialogue: () => void;
  onSendReply: (text: string) => void;
  onNext: () => void;
}) {
  const [input, setInput] = useState("");

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    onSendReply(text);
  }

  const visibleMessages = chatMessages.filter((m) => m.content.trim().length > 0 || m.role === "assistant");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">AIヒアリング</h2>
        <p className="text-sm text-muted-foreground">作りたいものについて、AIが確認したいことを質問します。</p>
      </div>

      {chatMessages.length === 0 && (
        <Button onClick={onStartDialogue} disabled={!planText.trim() || isChatting}>
          {isChatting ? "確認中…" : "AIに聞いてみる"}
        </Button>
      )}

      {visibleMessages.length > 0 && (
        <div className="flex flex-col gap-6 py-2">
          {visibleMessages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}
        </div>
      )}

      {chatError && (
        <Alert variant="destructive">
          <AlertTitle>対話に失敗しました</AlertTitle>
          <AlertDescription>{chatError}</AlertDescription>
        </Alert>
      )}

      {chatMessages.length > 0 && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="回答を入力…"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            disabled={isChatting}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isChatting}>
            送信
          </Button>
        </div>
      )}

      {chatMessages.some((m) => m.role === "assistant" && m.content.trim()) && (
        <div className="flex justify-end pt-2">
          <Button
            size="lg"
            onClick={onNext}
            className="rounded-full text-white"
            style={{ background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))" }}
          >
            技術スタック提案へ→
          </Button>
        </div>
      )}
    </div>
  );
}
