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
import { CodeEditor } from "./code-editor";
import { BlockPalette } from "./block-palette";

const SCAFFOLD_PATHS = new Set(["package.json", "next.config.mjs", "app/layout.js", "app/globals.css"]);

export function LearnWorkspace() {
  const generatedFiles = useProjectStore((s) => s.generatedFiles);
  const previewUrl = useProjectStore((s) => s.previewUrl);
  const chunkedFiles = useProjectStore((s) => s.chunkedFiles);
  const setChunkedFile = useProjectStore((s) => s.setChunkedFile);
  const slotAnswers = useProjectStore((s) => s.slotAnswers);
  const setSlotAnswer = useProjectStore((s) => s.setSlotAnswer);
  const stackNodes = useProjectStore((s) => s.stackProposal?.nodes ?? []);
  const toggleClickHighlight = useProjectStore((s) => s.toggleClickHighlight);

  const learnableFiles = useMemo(
    () => generatedFiles.filter((f) => !SCAFFOLD_PATHS.has(f.path)),
    [generatedFiles]
  );

  const [selectedPath, setSelectedPath] = useState<string | null>(learnableFiles[0]?.path ?? null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [isChunking, setIsChunking] = useState(false);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const currentPath = selectedPath ?? learnableFiles[0]?.path ?? null;
  const currentFile = learnableFiles.find((f) => f.path === currentPath) ?? null;
  const chunked = currentPath ? chunkedFiles[currentPath] : undefined;
  const answers = (currentPath && slotAnswers[currentPath]) || {};

  const activeSlot = chunked?.segments.find(
    (s) => s.type === "slot" && s.slot.id === activeSlotId
  );
  const activeSlotData = activeSlot?.type === "slot" ? activeSlot.slot : null;
  const activeStackNode = activeSlotData?.relatedStackNodeId
    ? stackNodes.find((n) => n.id === activeSlotData.relatedStackNodeId) ?? null
    : null;

  function handleSlotClick(slotId: string) {
    setActiveSlotId(slotId);
    const slot = chunked?.segments.find(
      (s) => s.type === "slot" && s.slot.id === slotId
    );
    const nodeId = slot?.type === "slot" ? slot.slot.relatedStackNodeId : undefined;
    if (nodeId) toggleClickHighlight({ type: "node", id: nodeId });
  }

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
      const result = await provider.chunkCode({ file: currentFile, stackNodes });
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
              {chunked.summary && (
                <Alert className="mb-3">
                  <AlertTitle>このファイルのポイント</AlertTitle>
                  <AlertDescription>{chunked.summary}</AlertDescription>
                </Alert>
              )}
              <CodeEditor
                chunked={chunked}
                answers={answers}
                activeSlotId={activeSlotId}
                onSlotClick={handleSlotClick}
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
              <CardContent className="space-y-3">
                <BlockPalette
                  slot={activeSlotData ?? null}
                  selectedChoiceId={activeSlotId ? answers[activeSlotId] : undefined}
                  onChoose={handleChoose}
                />
                {activeStackNode && (
                  <Alert>
                    <AlertTitle>技術スタックとの対応</AlertTitle>
                    <AlertDescription>
                      この空欄は「{activeStackNode.label}」を実現しています。{activeStackNode.description}
                    </AlertDescription>
                  </Alert>
                )}
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
  );
}
