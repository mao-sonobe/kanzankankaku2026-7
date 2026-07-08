"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { orderPipeline } from "@/lib/domain/stack-pipeline";
import {
  buildQuizChoices,
  getQuizEntry,
  isQuizComplete,
  type QuizChoice,
} from "@/lib/domain/stack-quiz";
import type { TechStackProposal } from "@/lib/domain/stack";
import { useProjectStore } from "@/lib/store/project-store";
import { StackDiagram } from "./stack-diagram";
import { QuizDeck } from "./quiz-deck";
import { QuizHistory, type QuizHistoryItem } from "./quiz-history";

/**
 * ②カードクイズ。左=回答履歴 / 中央=回答するたび育つ構成図 / 右=カードデッキ。
 * 出題はパイプラインの流れ順。
 */
export function StepQuiz({
  proposal,
  onNext,
}: {
  proposal: TechStackProposal;
  onNext: () => void;
}) {
  const stackQuiz = useProjectStore((s) => s.stackQuiz);
  const stackQuizSkipped = useProjectStore((s) => s.stackQuizSkipped);
  const answerQuizNode = useProjectStore((s) => s.answerQuizNode);
  const skipQuiz = useProjectStore((s) => s.skipQuiz);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const ordered = useMemo(() => orderPipeline(proposal), [proposal]);
  const quizNodes = useMemo(
    () => ordered.filter((n) => buildQuizChoices(n) !== null),
    [ordered]
  );

  const answeredItems: QuizHistoryItem[] = quizNodes
    .filter((n) => getQuizEntry(stackQuiz, n.id))
    .map((n) => ({ node: n, entry: getQuizEntry(stackQuiz, n.id)! }))
    .reverse();

  const currentNode = quizNodes.find((n) => !getQuizEntry(stackQuiz, n.id));
  const complete = isQuizComplete(proposal, stackQuiz, stackQuizSkipped);
  const answeredCount = quizNodes.length - quizNodes.filter((n) => !getQuizEntry(stackQuiz, n.id)).length;

  const currentChoices = useMemo(
    () => (currentNode ? buildQuizChoices(currentNode) ?? [] : []),
    [currentNode]
  );

  function isRevealed(nodeId: string) {
    if (stackQuizSkipped) return true;
    const node = proposal.nodes.find((n) => n.id === nodeId);
    return !!getQuizEntry(stackQuiz, nodeId) || (node ? buildQuizChoices(node) === null : false);
  }

  function handleAnswer(choice: QuizChoice) {
    if (!currentNode) return;
    answerQuizNode(
      currentNode.id,
      choice.isCorrect ? { status: "correct" } : { status: "wrong", chosen: choice.label }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium">技術スタッククイズ</h2>
          <p className="text-sm text-muted-foreground">
            やりたいことに合う技術を予想しましょう。答えるたびに構成図が育ちます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            クイズ {answeredCount}/{quizNodes.length}
          </span>
          {!complete && (
            <Button variant="ghost" size="sm" onClick={skipQuiz}>
              全部見る
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_400px]">
        <div className="order-3 lg:order-1">
          <QuizHistory
            items={answeredItems}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={setHoveredNodeId}
          />
        </div>

        <div className="order-2 rounded-2xl border-2 p-4" style={{ borderColor: "var(--brand-pink)" }}>
          <StackDiagram
            proposal={proposal}
            isRevealed={isRevealed}
            hideUnrevealed
            highlightNodeId={hoveredNodeId}
          />
        </div>

        <div className="order-1 lg:order-3">
          {!complete && currentNode ? (
            <QuizDeck
              node={currentNode}
              choices={currentChoices}
              remaining={quizNodes.length - answeredCount}
              onAnswer={handleAnswer}
            />
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-pink-300 bg-pink-50/60 p-6 text-center">
              <p className="text-sm font-medium">全カード回答済み!</p>
              <p className="text-xs text-muted-foreground">
                次は、この技術たちの間をデータがどう流れるかを学びましょう。
              </p>
              <Button
                size="lg"
                onClick={onNext}
                className="rounded-full text-white"
                style={{ background: "var(--brand-pink)" }}
              >
                パイプライン学習へ→
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
