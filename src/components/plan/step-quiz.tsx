"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { orderPipeline } from "@/lib/domain/stack-pipeline";
import {
  buildQuizChoices,
  getQuizEntry,
  isQuizComplete,
  type QuizChoice,
} from "@/lib/domain/stack-quiz";
import type { TechStackProposal } from "@/lib/domain/stack";
import { getAIProvider } from "@/lib/ai/get-provider";
import { getScaffoldFiles } from "@/lib/generated-app/scaffold";
import { useProjectStore } from "@/lib/store/project-store";
import { QuizPipeline } from "./quiz-pipeline";
import { QuizDeck } from "./quiz-deck";
import { QuizHistory, type QuizHistoryItem } from "./quiz-history";

/**
 * ②カードクイズ。左=回答履歴 / 中央=回答するたび育つ縦チェーン構成図 / 右=カードデッキ。
 * 出題はパイプラインの流れ順。クイズ回答中に裏でコード生成を先回しする。
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
  const planText = useProjectStore((s) => s.planText);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const ordered = useMemo(() => orderPipeline(proposal), [proposal]);
  const quizNodes = useMemo(
    () => ordered.filter((n) => buildQuizChoices(n) !== null),
    [ordered]
  );

  // 回答済みノードをパイプライン順で(中央の縦チェーンに使う)
  const revealedNodes = ordered.filter(
    (n) => stackQuizSkipped || getQuizEntry(stackQuiz, n.id) || buildQuizChoices(n) === null
  );

  // 履歴カードは新しい順
  const answeredItems: QuizHistoryItem[] = quizNodes
    .filter((n) => getQuizEntry(stackQuiz, n.id))
    .map((n) => ({ node: n, entry: getQuizEntry(stackQuiz, n.id)! }))
    .reverse();

  const currentNode = quizNodes.find((n) => !getQuizEntry(stackQuiz, n.id));
  const complete = isQuizComplete(proposal, stackQuiz, stackQuizSkipped);
  const answeredCount =
    quizNodes.length - quizNodes.filter((n) => !getQuizEntry(stackQuiz, n.id)).length;

  const currentChoices = useMemo(
    () => (currentNode ? buildQuizChoices(currentNode) ?? [] : []),
    [currentNode]
  );

  function handleAnswer(choice: QuizChoice) {
    if (!currentNode) return;
    answerQuizNode(
      currentNode.id,
      choice.isCorrect ? { status: "correct" } : { status: "wrong", chosen: choice.label }
    );
  }

  // --- クイズ中にコード生成を先回し(/buildの待ち時間を消す) ---
  const pregenStarted = useRef(false);
  useEffect(() => {
    const store = useProjectStore.getState();
    if (pregenStarted.current) return;
    if (store.generatedFiles.length > 0 || store.isPregenerating) return;
    pregenStarted.current = true;
    store.setIsPregenerating(true);
    (async () => {
      try {
        const provider = getAIProvider();
        const result = await provider.generateCode({
          planSummary: planText,
          stackNodes: proposal.nodes,
        });
        // /buildと同じくスキャフォールドをマージしておく
        const scaffold = getScaffoldFiles();
        const aiPaths = new Set(result.files.map((f) => f.path));
        const merged = [...scaffold.filter((f) => !aiPaths.has(f.path)), ...result.files];
        // 生成中にユーザーが/buildで自前生成した場合は上書きしない
        if (useProjectStore.getState().generatedFiles.length === 0) {
          useProjectStore.getState().setGeneratedFiles(merged);
        }
      } catch {
        // 失敗しても/buildで再生成できるので握りつぶす
      } finally {
        useProjectStore.getState().setIsPregenerating(false);
      }
    })();
  }, [planText, proposal]);

  return (
    <div className="relative">
      {!complete && (
        <div className="absolute right-0 top-0 z-20">
          <Button variant="ghost" size="sm" onClick={skipQuiz}>
            全部見る
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(130px,180px)_1fr]">
        {/* 左: 回答履歴 */}
        <div className="order-2 lg:order-1">
          <QuizHistory
            items={answeredItems}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={setHoveredNodeId}
          />
        </div>

        {/* 主エリア: 上=構成図 / 下=カードデッキ */}
        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <QuizPipeline nodes={revealedNodes} highlightNodeId={hoveredNodeId} />

          {!complete && currentNode ? (
            <QuizDeck
              node={currentNode}
              choices={currentChoices}
              remaining={quizNodes.length - answeredCount}
              onAnswer={handleAnswer}
            />
          ) : (
            <div className="mx-auto flex min-h-[200px] w-full max-w-md flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-pink-300 bg-pink-50/60 p-6 text-center">
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
                配線パズルへ→
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
