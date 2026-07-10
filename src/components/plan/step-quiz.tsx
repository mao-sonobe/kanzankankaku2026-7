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
import { TechFlowDiagram } from "./tech-flow-diagram";
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

  // 回答済み(または誤答を作れずクイズ対象外)のノードだけ構成図に出す。
  function isRevealed(nodeId: string) {
    if (stackQuizSkipped) return true;
    const node = proposal.nodes.find((n) => n.id === nodeId);
    return !!getQuizEntry(stackQuiz, nodeId) || (node ? buildQuizChoices(node) === null : false);
  }

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
    // コンテンツ領域(サイドバーを除いた幅)いっぱいに広げ、
    // ヘッダー分を除いた高さに収めてスクロールを無くす。
    <div className="relative h-[calc(100vh-4rem-1px)] w-full overflow-hidden">
      {!complete && (
        <div className="absolute right-4 top-2 z-30">
          <Button variant="ghost" size="sm" onClick={skipQuiz}>
            全部見る
          </Button>
        </div>
      )}

      <div className="flex h-full">
        {/* 左: 回答履歴(画面左端に密着・ゲームカード風)。ホバー展開が図の上に来るようz付与 */}
        <div className="relative z-20 w-[120px] flex-none pt-4">
          <QuizHistory
            items={answeredItems}
            proposal={proposal}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={setHoveredNodeId}
          />
        </div>

        {/* 主エリア: 中央に構成図を下地として置き、その真上にカードデッキを重ねる。
            カードを答え終わると中央の構成図が現れる。 */}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <TechFlowDiagram
              proposal={proposal}
              isRevealed={isRevealed}
              hideUnrevealed
              highlightNodeId={hoveredNodeId}
              onHoverNode={setHoveredNodeId}
            />
          </div>

          {!complete && currentNode ? (
            <div className="absolute left-1/2 top-1/2 z-10 w-[380px] max-w-[42vw] -translate-x-1/2 -translate-y-1/2">
              <QuizDeck
                node={currentNode}
                choices={currentChoices}
                remaining={quizNodes.length - answeredCount}
                onAnswer={handleAnswer}
              />
            </div>
          ) : (
            <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2">
              <Button
                size="lg"
                onClick={onNext}
                className="rounded-full text-white shadow-lg"
                style={{ background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))" }}
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
