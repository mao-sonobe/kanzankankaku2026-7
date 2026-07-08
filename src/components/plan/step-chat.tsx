"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/ai/types";

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";
  return (
    <div
      className={cn(
        "max-w-[75%] rounded-3xl bg-sky-200/80 px-5 py-3 text-sm leading-relaxed",
        isAssistant ? "self-start" : "self-end"
      )}
    >
      {message.content || "…"}
    </div>
  );
}

function ChatInput({
  placeholder,
  disabled,
  onSend,
}: {
  placeholder: string;
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");

  function handleSend() {
    const text = input.trim();
    if (!text || disabled) return;
    setInput("");
    onSend(text);
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-full bg-sky-200/80 py-2 pl-6 pr-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        aria-label="送信"
        className="flex size-9 flex-none items-center justify-center rounded-full bg-background shadow-sm transition-opacity disabled:opacity-40"
      >
        <ArrowUp className="size-5" />
      </button>
    </div>
  );
}

/**
 * ①企画チャット。ChatGPT風に「企画を伝える→AIがヒアリング→まとまったらクイズへ」を
 * 1画面のチャットで行う。企画名は上部中央に表示される。
 */
export function StepChat({
  chatMessages,
  projectTitle,
  hearingReady,
  isChatting,
  isProposing,
  chatError,
  proposeError,
  onSendMessage,
  onProceed,
}: {
  chatMessages: ChatMessage[];
  projectTitle: string | null;
  hearingReady: boolean;
  isChatting: boolean;
  isProposing: boolean;
  chatError: string | null;
  proposeError: string | null;
  onSendMessage: (text: string) => void;
  onProceed: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasStarted = chatMessages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!hasStarted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          <ChatInput
            placeholder="君のユーモア溢れる企画を教えて"
            disabled={isChatting}
            onSend={onSendMessage}
          />
        </div>
        {chatError && (
          <Alert variant="destructive" className="mt-4 max-w-2xl">
            <AlertTitle>AIとの対話に失敗しました</AlertTitle>
            <AlertDescription>{chatError}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col">
      <h2 className="mb-4 text-center text-lg font-semibold">
        {projectTitle ?? "企画を考え中…"}
      </h2>

      <div className="flex flex-1 flex-col gap-4 pb-4">
        {chatMessages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {chatError && (
        <Alert variant="destructive" className="mb-3">
          <AlertTitle>対話に失敗しました</AlertTitle>
          <AlertDescription>{chatError}</AlertDescription>
        </Alert>
      )}
      {proposeError && (
        <Alert variant="destructive" className="mb-3">
          <AlertTitle>技術スタックの提案に失敗しました</AlertTitle>
          <AlertDescription>{proposeError}</AlertDescription>
        </Alert>
      )}

      {hearingReady && (
        <div className="mb-3 flex justify-center">
          <Button
            size="lg"
            onClick={onProceed}
            disabled={isProposing}
            className="rounded-full text-white"
            style={{ background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))" }}
          >
            {isProposing ? "技術スタックを考えています…" : "技術クイズへ→"}
          </Button>
        </div>
      )}

      <div className="sticky bottom-4">
        <ChatInput
          placeholder="君の企画についてもっと教えて!"
          disabled={isChatting || isProposing}
          onSend={onSendMessage}
        />
      </div>
    </div>
  );
}
