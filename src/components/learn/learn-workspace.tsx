"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProjectStore } from "@/lib/store/project-store";
import { getAIProvider } from "@/lib/ai/get-provider";
import { getExecutionProvider } from "@/lib/execution/webcontainer-provider";
import { buildFileContent } from "@/lib/domain/chunk-code";
import { SCAFFOLD_PATHS } from "@/lib/generated-app/scaffold";
import { filePathsForFeature, locateFeatureRangesInChunked } from "@/lib/domain/feature-map";
import { featureColor } from "@/lib/domain/feature-colors";
import { CodeEditor } from "./code-editor";
import { BlockPalette, type RelatedNodeInfo } from "./block-palette";
import { FileTree } from "./file-tree";
import { PlainCodeView } from "./plain-code-view";
import { cn } from "@/lib/utils";

export function LearnWorkspace() {
  const generatedFiles = useProjectStore((s) => s.generatedFiles);
  const previewUrl = useProjectStore((s) => s.previewUrl);
  const chunkedFiles = useProjectStore((s) => s.chunkedFiles);
  const setChunkedFile = useProjectStore((s) => s.setChunkedFile);
  const slotAnswers = useProjectStore((s) => s.slotAnswers);
  const setSlotAnswer = useProjectStore((s) => s.setSlotAnswer);
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const toggleClickHighlight = useProjectStore((s) => s.toggleClickHighlight);
  const featureMap = useProjectStore((s) => s.featureMap);
  const setFeatureMap = useProjectStore((s) => s.setFeatureMap);

  const learnableFiles = useMemo(
    () => generatedFiles.filter((f) => !SCAFFOLD_PATHS.has(f.path)),
    [generatedFiles]
  );
  const learnablePaths = useMemo(() => new Set(learnableFiles.map((f) => f.path)), [learnableFiles]);
  const allPaths = useMemo(() => generatedFiles.map((f) => f.path), [generatedFiles]);

  const [selectedPath, setSelectedPath] = useState<string | null>(learnableFiles[0]?.path ?? null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [isChunking, setIsChunking] = useState(false);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [isAnalyzingFeatures, setIsAnalyzingFeatures] = useState(false);
  const [analyzeFeatureError, setAnalyzeFeatureError] = useState<string | null>(null);

  const nodeById = useMemo(
    () => new Map(stackProposal?.nodes.map((n) => [n.id, n]) ?? []),
    [stackProposal]
  );

  const currentPath = selectedPath ?? learnableFiles[0]?.path ?? generatedFiles[0]?.path ?? null;
  const currentFile = generatedFiles.find((f) => f.path === currentPath) ?? null;
  const isLearnableFile = currentPath ? learnablePaths.has(currentPath) : false;
  const chunked = currentPath ? chunkedFiles[currentPath] : undefined;
  const answers = useMemo(
    () => (currentPath && slotAnswers[currentPath]) || {},
    [currentPath, slotAnswers]
  );

  const provider = getAIProvider();
  const supportsFeatureMap = typeof provider.analyzeFeatureMap === "function";
  const features = useMemo(() => featureMap?.features ?? [], [featureMap]);
  const spans = useMemo(() => featureMap?.spans ?? [], [featureMap]);
  const colorByFeatureId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof featureColor>>();
    features.forEach((f, i) => map.set(f.id, featureColor(i)));
    return map;
  }, [features]);
  const activeFeature = features.find((f) => f.id === activeFeatureId) ?? null;
  const activeColor = activeFeatureId ? colorByFeatureId.get(activeFeatureId) : undefined;
  const activeSpans = useMemo(
    () => (activeFeatureId ? spans.filter((s) => s.featureId === activeFeatureId) : []),
    [spans, activeFeatureId]
  );
  // 左のファイルツリー: アクティブな機能に関わるファイルだけをその機能の色で塗る。
  const fileColorByPath = useMemo(() => {
    if (!activeFeatureId || !activeColor) return undefined;
    const paths = filePathsForFeature(spans, activeFeatureId);
    const map = new Map<string, ReturnType<typeof featureColor>>();
    paths.forEach((p) => map.set(p, activeColor));
    return map;
  }, [spans, activeFeatureId, activeColor]);
  // 現在開いているファイル内で、アクティブな機能が占める範囲(通常コード+関わる空欄)。
  const activeFeatureRanges = useMemo(() => {
    if (!chunked || !activeFeatureId) return null;
    const spansInFile = activeSpans.filter((s) => s.filePath === currentPath);
    if (spansInFile.length === 0) return null;
    return locateFeatureRangesInChunked(chunked, answers, spansInFile);
  }, [chunked, activeFeatureId, activeSpans, currentPath, answers]);

  const activeSlot = chunked?.segments.find(
    (s) => s.type === "slot" && s.slot.id === activeSlotId
  );
  const activeSlotData = activeSlot?.type === "slot" ? activeSlot.slot : null;

  function handleSlotClick(slotId: string) {
    setActiveSlotId(slotId);
    const slot = chunked?.segments.find((s) => s.type === "slot" && s.slot.id === slotId);
    const nodeId = slot?.type === "slot" ? slot.slot.relatedStackNodeId : undefined;
    if (nodeId) toggleClickHighlight({ type: "node", id: nodeId });
  }

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

  async function handleAnalyzeFeatures() {
    if (learnableFiles.length === 0 || !provider.analyzeFeatureMap) return;
    setAnalyzeFeatureError(null);
    setIsAnalyzingFeatures(true);
    try {
      const result = await provider.analyzeFeatureMap({
        files: learnableFiles,
        stackProposal: stackProposal ?? undefined,
      });
      setFeatureMap(result);
    } catch (err) {
      setAnalyzeFeatureError(err instanceof Error ? err.message : "機能マップの解析に失敗しました");
    } finally {
      setIsAnalyzingFeatures(false);
    }
  }

  if (generatedFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>生成されたコードがありません</CardTitle>
          <CardDescription>先に④でコードを生成してください。</CardDescription>
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_1fr]">
      <Card className="lg:row-span-2">
        <CardHeader>
          <CardTitle className="text-sm">ファイル</CardTitle>
          <CardDescription className="text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              穴埋め学習の対象
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <FileTree
            paths={allPaths}
            selectedPath={currentPath}
            learnablePaths={learnablePaths}
            featureColorByPath={fileColorByPath}
            onSelect={(path) => {
              setSelectedPath(path);
              setActiveSlotId(null);
            }}
          />
        </CardContent>
      </Card>

      {!isLearnableFile && currentFile && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{currentFile.path}</CardTitle>
            <CardDescription>
              このファイルはプロジェクトの固定のひな形なので、穴埋め学習の対象外です。内容の確認のみできます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlainCodeView path={currentFile.path} content={currentFile.content} />
          </CardContent>
        </Card>
      )}

      {isLearnableFile && !chunked && currentFile && (
        <Card className="lg:col-span-2">
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

      {isLearnableFile && chunked && (
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
              下の機能一覧から選ぶと、関わるコードに色がつきます。
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
              nodeById={nodeById}
              featureRanges={activeFeatureRanges}
              featureColorHex={activeColor?.hex}
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
      )}

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>機能一覧</CardTitle>
            <CardDescription>
              クリックすると、関わるコード・ファイルに色がつきます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!supportsFeatureMap && (
              <p className="text-sm text-muted-foreground">
                機能マップはこのAIプロバイダーでは利用できません。設定でChatGPTプロバイダーを選ぶと利用できます。
              </p>
            )}

            {supportsFeatureMap && !featureMap && (
              <div className="space-y-2">
                <Button onClick={handleAnalyzeFeatures} disabled={isAnalyzingFeatures}>
                  {isAnalyzingFeatures ? "解析中…" : "機能マップを解析する"}
                </Button>
                {analyzeFeatureError && (
                  <Alert variant="destructive">
                    <AlertTitle>解析に失敗しました</AlertTitle>
                    <AlertDescription>{analyzeFeatureError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {featureMap &&
              features.map((f, i) => {
                const color = colorByFeatureId.get(f.id) ?? featureColor(i);
                const isActive = f.id === activeFeatureId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFeatureId(isActive ? null : f.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      isActive ? cn(color.bg, "ring-2 ring-offset-1") : "hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn("size-2 shrink-0 rounded-full", color.dot)} />
                      <p className="text-sm font-semibold">{f.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                  </button>
                );
              })}

            {activeFeature && (
              <div className="mt-1 space-y-1 rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground">扱うデータの形式</p>
                <p className="text-sm">{activeFeature.dataShape}</p>
              </div>
            )}
          </CardContent>
        </Card>

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
              {previewUrl
                ? "ブロックを埋めるとここに反映されます。"
                : "②でプレビューを起動すると表示されます。"}
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
  );
}
