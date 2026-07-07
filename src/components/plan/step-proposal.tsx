"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import type { TechStackProposal } from "@/lib/domain/stack";
import { orderPipeline } from "@/lib/domain/stack-pipeline";
import { buildQuizChoices, isQuizComplete } from "@/lib/domain/stack-quiz";
import { useProjectStore } from "@/lib/store/project-store";
import { StackQuizCard } from "./stack-quiz-card";
import { cn } from "@/lib/utils";

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
  const pipeline = useMemo(() => orderPipeline(proposal), [proposal]);

  const quizComplete = isQuizComplete(proposal, stackQuiz, stackQuizSkipped);
  const quizNodes = proposal.nodes.filter((n) => buildQuizChoices(n) !== null);
  const answeredCount = quizNodes.filter((n) => stackQuiz[n.id]).length;

  function effectiveStatus(nodeId: string) {
    const status = stackQuiz[nodeId];
    if (status) return status;
    return stackQuizSkipped ? ("revealed" as const) : undefined;
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
                status={effectiveStatus(node.id)}
                onAnswer={(status) => answerQuizNode(node.id, status)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border-2 p-4" style={{ borderColor: "var(--brand-blue)" }}>
          <p className="mb-3 text-xs font-medium text-muted-foreground">パイプライン</p>
          <div className="flex flex-col items-start gap-1">
            {pipeline.map((node, i) => {
              const revealed = effectiveStatus(node.id) !== undefined || buildQuizChoices(node) === null;
              return (
                <div key={node.id} className="w-full">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                    <span className={cn("size-2 rounded-full", CATEGORY_COLORS[node.category].dot)} />
                    <div
                      className={cn(
                        "transition-[filter] duration-500",
                        !revealed && "select-none blur-sm"
                      )}
                      aria-hidden={!revealed}
                    >
                      <p className="text-sm font-medium">{node.label}</p>
                      <p className="text-xs text-muted-foreground">{node.description}</p>
                    </div>
                  </div>
                  {i < pipeline.length - 1 && <div className="ml-4 h-4 border-l-2 border-dashed" />}
                </div>
              );
            })}
          </div>
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
