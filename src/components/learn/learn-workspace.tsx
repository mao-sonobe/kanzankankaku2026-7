"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectStore } from "@/lib/store/project-store";
import { getAIProvider } from "@/lib/ai/get-provider";
import { getExecutionProvider } from "@/lib/execution/webcontainer-provider";
import { buildFileContent } from "@/lib/domain/chunk-code";
import { SCAFFOLD_PATHS } from "@/lib/generated-app/scaffold";
import { CodeEditor } from "./code-editor";
import { BlockPalette, type RelatedNodeInfo } from "./block-palette";
import { DataFlowView } from "./data-flow-view";

type LearnMode = "flow" | "fill";

export function LearnWorkspace() {
  const generatedFiles = useProjectStore((s) => s.generatedFiles);
  const previewUrl = useProjectStore((s) => s.previewUrl);
  const chunkedFiles = useProjectStore((s) => s.chunkedFiles);
  const setChunkedFile = useProjectStore((s) => s.setChunkedFile);
  const slotAnswers = useProjectStore((s) => s.slotAnswers);
  const setSlotAnswer = useProjectStore((s) => s.setSlotAnswer);
  const stackProposal = useProjectStore((s) => s.stackProposal);

  const learnableFiles = useMemo(
    () => generatedFiles.filter((f) => !SCAFFOLD_PATHS.has(f.path)),
    [generatedFiles]
  );

  const [mode, setMode] = useState<LearnMode>("flow");
  const [selectedPath, setSelectedPath] = useState<string | null>(learnableFiles[0]?.path ?? null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [isChunking, setIsChunking] = useState(false);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const nodeById = useMemo(
    () => new Map(stackProposal?.nodes.map((n) => [n.id, n]) ?? []),
    [stackProposal]
  );

  const currentPath = selectedPath ?? learnableFiles[0]?.path ?? null;
  const currentFile = learnableFiles.find((f) => f.path === currentPath) ?? null;
  const chunked = currentPath ? chunkedFiles[currentPath] : undefined;
  const answers = (currentPath && slotAnswers[currentPath]) || {};

  const activeSlot = chunked?.segments.find(
    (s) => s.type === "slot" && s.slot.id === activeSlotId
  );
  const activeSlotData = activeSlot?.type === "slot" ? activeSlot.slot : null;

  // アクティブな空欄が技術スタックノードに紐づいている場合、
  // そのノードが関わるデータの流れ(エッジ)をパレットに表示する。
  const relatedNodeInfo: RelatedNodeInfo | null = useMemo(() => {
    const nodeId = activeSlotData?.relatedStackNodeId;
    const node = nodeId ? nodeById.get(nodeId) : undefined;
    if (!node || !stackProposal) return null;
    const edge = stackProposal.edges.find((e) => e.source === node.id || e.target === node.id);
    const edgeText = edge
      ? `${nodeById.get(edge.source)?.label ?? edge.source} → ${nodeById.get(edge.target)?.label ?? edge.target}`
      : undefined;
    return { node, edgeText };
  }, [activeSlotData, nodeById, stackProposal]);

  const totalSlots = chunked?.segments.filter((s) => s.type === "slot").length ?? 0;
  const correctCount =
    chunked?.segments.filter(
      (s) => s.type === "slot" && s.slot.choices.find((c) => c.id === answers[s.slot.id])?.isCorrect
    ).length ?? 0;

  async function handleChunk() {
    if (!currentFile) return;
    setChunkError(null);
    setIsChunking(true);
    try {
      const provider = getAIProvider();
      const result = await provider.chunkCode({
        file: currentFile,
        stackProposal: stackProposal ?? undefined,
      });
      setChunkedFile(currentFile.path, result.chunked);
    } catch (err) {
      setChunkError(err instanceof Error ? err.message : "コードの分解に失敗しました");
    } finally {
      setIsChunking(false);
    }
  }

  async function handleChoose(choiceId: string) {
    if (!currentPath || !chunked || !activeSlotId) return;
    setWriteError(null);
    setSlotAnswer(currentPath, activeSlotId, choiceId);
    const updatedAnswers = { ...answers, [activeSlotId]: choiceId };
    const content = buildFileContent(chunked, updatedAnswers);
    try {
      const execution = getExecutionProvider();
      await execution.writeFile(currentPath, content);
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : "プレビューへの反映に失敗しました");
    }
  }

  if (learnableFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>生成されたコードがありません</CardTitle>
          <CardDescription>先に②でコードを生成してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/build" />}>
            コード生成に戻る
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as LearnMode)}>
        <TabsList>
          <TabsTrigger value="flow">① データフロー解説</TabsTrigger>
          <TabsTrigger value="fill">② ブロック穴埋め</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "flow" && <DataFlowView onProceedToFill={() => setMode("fill")} />}

      {mode === "fill" && (
        <div className="flex flex-col gap-4">
      {learnableFiles.length > 1 && (
        <Tabs value={currentPath ?? undefined} onValueChange={(v) => setSelectedPath(v)}>
          <TabsList>
            {learnableFiles.map((f) => (
              <TabsTrigger key={f.path} value={f.path}>
                {f.path}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {!chunked && currentFile && (
        <Card>
          <CardHeader>
            <CardTitle>{currentFile.path}</CardTitle>
            <CardDescription>
              このファイルをブロック穴埋め形式に分解して学習を始めます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleChunk} disabled={isChunking}>
              {isChunking ? "分解中…" : "この単元を解析する"}
            </Button>
            {chunkError && (
              <Alert variant="destructive">
                <AlertTitle>分解に失敗しました</AlertTitle>
                <AlertDescription>{chunkError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {chunked && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{chunked.path}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {correctCount}/{totalSlots} 正解
                </span>
              </CardTitle>
              <CardDescription>
                点線の空欄をクリックし、右のパレットから正しいブロックを選んでください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeEditor
                chunked={chunked}
                answers={answers}
                activeSlotId={activeSlotId}
                onSlotClick={setActiveSlotId}
                nodeById={nodeById}
              />
              {totalSlots > 0 && correctCount === totalSlots && (
                <Alert className="mt-3">
                  <AlertTitle>すべて正解しました🎉</AlertTitle>
                  <AlertDescription>
                    生成されたコードと完全に一致しました。プレビューで動作を確認してみましょう。
                  </AlertDescription>
                </Alert>
              )}
              {writeError && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTitle>プレビューへの反映に失敗しました</AlertTitle>
                  <AlertDescription>{writeError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>ブロックパレット</CardTitle>
              </CardHeader>
              <CardContent>
                <BlockPalette
                  slot={activeSlotData ?? null}
                  selectedChoiceId={activeSlotId ? answers[activeSlotId] : undefined}
                  onChoose={handleChoose}
                  relatedNodeInfo={relatedNodeInfo}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ライブプレビュー</CardTitle>
                <CardDescription>
                  {previewUrl ? "ブロックを埋めるとここに反映されます。" : "②でプレビューを起動すると表示されます。"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="h-[360px] w-full rounded-md border bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                ) : (
                  <Button nativeButton={false} render={<Link href="/build" />} variant="secondary">
                    コード生成画面でプレビューを起動する
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
