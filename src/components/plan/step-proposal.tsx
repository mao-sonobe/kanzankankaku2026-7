"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { TechStackProposal } from "@/lib/domain/stack";
import { buildQuizChoices, getQuizEntry, isQuizComplete } from "@/lib/domain/stack-quiz";
import { useProjectStore } from "@/lib/store/project-store";
import { StackQuizCard } from "./stack-quiz-card";
import { StackDiagram } from "./stack-diagram";

export function StepProposal({
  proposal,
  isProposing,
  proposeError,
  onRegenerate,
  onBack,
  onNext,
}: {
  proposal: TechStackProposal;
  isProposing: boolean;
  proposeError: string | null;
  onRegenerate: (feedback: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const stackQuiz = useProjectStore((s) => s.stackQuiz);
  const stackQuizSkipped = useProjectStore((s) => s.stackQuizSkipped);
  const answerQuizNode = useProjectStore((s) => s.answerQuizNode);
  const skipQuiz = useProjectStore((s) => s.skipQuiz);

  const [feedback, setFeedback] = useState("");

  const quizComplete = isQuizComplete(proposal, stackQuiz, stackQuizSkipped);
  const quizNodes = proposal.nodes.filter((n) => buildQuizChoices(n) !== null);
  const answeredCount = quizNodes.filter((n) => getQuizEntry(stackQuiz, n.id)).length;

  function effectiveEntry(nodeId: string) {
    const entry = getQuizEntry(stackQuiz, nodeId);
    if (entry) return entry;
    return stackQuizSkipped ? ({ status: "revealed" } as const) : undefined;
  }

  function handleRegenerate() {
    const text = feedback.trim();
    if (!text) return;
    onRegenerate(text);
    setFeedback("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium">
            {quizComplete ? "技術スタックの提案" : "技術スタッククイズ"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {quizComplete
              ? "それぞれの技術を選んだ理由も表示しています。気になる部分があれば下から変更を依頼できます。"
              : "AIの提案は隠されています。それぞれの役割に最適な技術を予想してみましょう。"}
          </p>
        </div>
        {!quizComplete && quizNodes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              クイズ {answeredCount}/{quizNodes.length}
            </span>
            <Button variant="ghost" size="sm" onClick={skipQuiz}>
              全部見る
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border-2 p-4" style={{ borderColor: "var(--brand-blue)" }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {proposal.nodes.map((node) => (
              <StackQuizCard
                key={node.id}
                node={node}
                entry={effectiveEntry(node.id)}
                onAnswer={(entry) => answerQuizNode(node.id, entry)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border-2 p-4" style={{ borderColor: "var(--brand-blue)" }}>
          <p className="mb-3 text-xs font-medium text-muted-foreground">構成図(データの流れ)</p>
          <StackDiagram
            proposal={proposal}
            isRevealed={(nodeId) => {
              const node = proposal.nodes.find((n) => n.id === nodeId);
              return (
                effectiveEntry(nodeId) !== undefined || (node ? buildQuizChoices(node) === null : true)
              );
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="変更したい部分を書いてください(例: DBはSupabaseにしたい)"
          rows={2}
          disabled={!quizComplete}
        />
        <div className="flex items-center justify-end gap-3">
          {!quizComplete && (
            <span className="text-xs text-muted-foreground">クイズに答えると次へ進めます</span>
          )}
          <Button
            variant="secondary"
            onClick={handleRegenerate}
            disabled={!quizComplete || !feedback.trim() || isProposing}
          >
            {isProposing ? "再生成中…" : "この内容で再生成"}
          </Button>
        </div>
        {proposeError && (
          <Alert variant="destructive">
            <AlertTitle>再生成に失敗しました</AlertTitle>
            <AlertDescription>{proposeError}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          ←AIヒアリングに戻る
        </Button>
        <Button
          size="lg"
          onClick={onNext}
          disabled={!quizComplete}
          className="rounded-full text-white"
          style={{ background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))" }}
        >
          技術解説へ→
        </Button>
      </div>
    </div>
  );
}
