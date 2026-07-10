"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProjectStore } from "@/lib/store/project-store";
import { getAIProvider } from "@/lib/ai/get-provider";
import { getExecutionProvider } from "@/lib/execution/webcontainer-provider";
import { buildFileContent } from "@/lib/domain/chunk-code";
import { getScaffoldFiles, SCAFFOLD_PATHS } from "@/lib/generated-app/scaffold";
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
  const setPreviewUrl = useProjectStore((s) => s.setPreviewUrl);
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
  const [previewPhase, setPreviewPhase] = useState<
    "booting" | "installing" | "running" | "error"
  >("booting");
  const [previewError, setPreviewError] = useState<string | null>(null);

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
    // プレビューが起動していないときは書き込む先が無いのでスキップする
    // (起動前に「反映に失敗しました」と出てしまうのを防ぐ)。
    if (!previewUrl) return;
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

  // ファイルを開いたら手動クリック不要で自動的にブロック分解する。
  const chunkRequestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isLearnableFile || !currentFile || chunked) return;
    if (chunkRequestedRef.current.has(currentFile.path)) return;
    chunkRequestedRef.current.add(currentFile.path);
    handleChunk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLearnableFile, currentFile?.path, chunked]);

  /** 分解に失敗したファイルを再試行できるよう、リクエスト済みマークを消してやり直す。 */
  function handleRetryChunk() {
    if (currentFile) chunkRequestedRef.current.delete(currentFile.path);
    handleChunk();
  }

  // コードが生成されたら手動クリック不要で自動的に機能マップを解析する。
  const featureMapRequestedRef = useRef(false);
  useEffect(() => {
    if (!supportsFeatureMap || featureMap || learnableFiles.length === 0) return;
    if (featureMapRequestedRef.current) return;
    featureMapRequestedRef.current = true;
    handleAnalyzeFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportsFeatureMap, featureMap, learnableFiles.length]);

  function handleRetryAnalyzeFeatures() {
    featureMapRequestedRef.current = false;
    handleAnalyzeFeatures();
  }

  /** WebContainerを起動してライブプレビューを立ち上げる(/buildと同じ手順)。 */
  async function startPreview() {
    setPreviewError(null);
    try {
      setPreviewPhase("booting");
      const execution = getExecutionProvider();
      await execution.boot();
      // 生成コードにスキャフォールド(package.json等)を合わせてマウントする。
      const scaffold = getScaffoldFiles();
      const aiPaths = new Set(generatedFiles.map((f) => f.path));
      await execution.mountFiles([
        ...scaffold.filter((f) => !aiPaths.has(f.path)),
        ...generatedFiles,
      ]);
      setPreviewPhase("installing");
      const url = await execution.installAndRun((line) => {
        if (line.includes("npm run dev") || /Local:\s*http/i.test(line)) {
          setPreviewPhase("running");
        }
      });
      setPreviewUrl(url);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "プレビューの起動に失敗しました");
      setPreviewPhase("error");
    }
  }

  // このページに来たら、ボタン操作なしで自動的にライブプレビューを起動する。
  const previewStartedRef = useRef(false);
  useEffect(() => {
    if (previewUrl || generatedFiles.length === 0) return;
    if (previewStartedRef.current) return;
    previewStartedRef.current = true;
    void startPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, generatedFiles.length]);

  if (generatedFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>生成されたコードがありません</CardTitle>
          <CardDescription>先にコード生成画面でコードを生成してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/build" />}>
            コード生成に戻る
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ライブプレビューの説明と中身。穴埋め画面(統合ブロック内)と
  // それ以外の画面(単独カード)の両方で使うため共通化しておく。
  const previewDescription = previewUrl
    ? "ブロックを埋めるとここに反映されます。"
    : previewPhase === "error"
      ? "プレビューの起動に失敗しました。"
      : "プレビューを自動で準備しています…";

  const previewBody = previewUrl ? (
    <iframe
      src={previewUrl}
      className="h-[360px] w-full rounded-md border bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  ) : previewPhase === "error" ? (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertTitle>起動に失敗しました</AlertTitle>
        <AlertDescription>{previewError}</AlertDescription>
      </Alert>
      <Button onClick={() => void startPreview()} variant="secondary">
        もう一度試す
      </Button>
    </div>
  ) : (
    <div className="flex h-[360px] w-full items-center justify-center rounded-md border bg-muted/30">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        {previewPhase === "booting" && "実行環境を起動しています…"}
        {previewPhase === "installing" && "依存関係をインストールしています…"}
        {previewPhase === "running" && "アプリを起動しています…"}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_1fr]">
      <Card className="lg:row-span-2">
        <CardContent className="px-2">
          {/* 機能一覧(コンパクト表示)。機能を選ぶと下のファイルツリーと本文コードに色がつく */}
          {supportsFeatureMap && (
            <div className="mb-3 border-b pb-3">
              <p className="mb-1 px-2 text-[11px] font-semibold text-muted-foreground">機能</p>
              {!featureMap &&
                (analyzeFeatureError ? (
                  <button
                    type="button"
                    onClick={handleRetryAnalyzeFeatures}
                    disabled={isAnalyzingFeatures}
                    className="px-2 text-left text-[11px] text-destructive underline-offset-2 hover:underline"
                  >
                    {isAnalyzingFeatures ? "解析中…" : "解析に失敗しました。もう一度試す"}
                  </button>
                ) : (
                  <p className="px-2 text-[11px] text-muted-foreground">解析しています…</p>
                ))}
              {featureMap &&
                features.map((f, i) => {
                  const color = colorByFeatureId.get(f.id) ?? featureColor(i);
                  const isActive = f.id === activeFeatureId;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      title={f.description}
                      onClick={() => setActiveFeatureId(isActive ? null : f.id)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors",
                        isActive ? cn(color.bg, "font-semibold") : "hover:bg-muted/60"
                      )}
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", color.dot)} />
                      <span className="truncate">{f.label}</span>
                    </button>
                  );
                })}
              {activeFeature && (
                <p className="mt-1 px-2 text-[10px] leading-snug text-muted-foreground">
                  データ: {activeFeature.dataShape}
                </p>
              )}
            </div>
          )}
          {/* ファイル見出し(機能一覧の区切り線の下に置く) */}
          <div className="mb-2 px-2">
            <p className="font-heading text-sm font-medium">ファイル</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                穴埋め学習の対象
              </span>
            </p>
          </div>
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
              {chunkError ? "分解に失敗しました。" : "このファイルを自動でブロック穴埋め形式に分解しています…"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {chunkError ? (
              <>
                <Alert variant="destructive">
                  <AlertTitle>分解に失敗しました</AlertTitle>
                  <AlertDescription>{chunkError}</AlertDescription>
                </Alert>
                <Button onClick={handleRetryChunk} disabled={isChunking}>
                  {isChunking ? "分解中…" : "もう一度試す"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">分解中…</p>
            )}
          </CardContent>
        </Card>
      )}

      {isLearnableFile && chunked && (
        // コード・このファイルのポイント・ライブプレビューを1つのブロックにまとめ、
        // 間は1本線(divide)で区切る。
        <Card className="gap-0 py-0 lg:col-span-2">
          <div className="grid grid-cols-1 max-lg:divide-y lg:grid-cols-2 lg:divide-x">
            {/* コード */}
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-heading font-medium">{chunked.path}</span>
                <span className="text-sm text-muted-foreground">
                  {correctCount}/{totalSlots} 正解
                </span>
              </div>
              <CodeEditor
              chunked={chunked}
              answers={answers}
              activeSlotId={activeSlotId}
              onSlotClick={handleSlotClick}
              nodeById={nodeById}
              featureRanges={activeFeatureRanges}
              featureColorHex={activeColor?.hex}
              slotPopover={
                activeSlotData ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">
                        正しいブロックを選ぼう
                      </p>
                      <button
                        type="button"
                        aria-label="閉じる"
                        onClick={() => setActiveSlotId(null)}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <BlockPalette
                      slot={activeSlotData}
                      selectedChoiceId={activeSlotId ? answers[activeSlotId] : undefined}
                      onChoose={handleChoose}
                      relatedNodeInfo={relatedNodeInfo}
                    />
                  </div>
                ) : null
              }
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
            </div>

            {/* 右側: このファイルのポイント / ライブプレビュー(1本線で区切る) */}
            <div className="flex flex-col divide-y">
              <div className="p-4">
                <p className="font-heading font-medium">このファイルのポイント</p>
                <div className="mt-2 space-y-1.5 text-sm">
                  {chunked.summary && <p>{chunked.summary}</p>}
                  <p className="text-muted-foreground">
                    点線の空欄をクリックすると、その場に選択肢が表示されます。
                    機能一覧から選ぶと、関わるコードに色がつきます。
                  </p>
                </div>
              </div>
              <div className="flex-1 p-4">
                <p className="font-heading font-medium">ライブプレビュー</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{previewDescription}</p>
                <div className="mt-3">{previewBody}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 穴埋め画面以外(ひな形ファイル閲覧・分解中)では、プレビューを単独カードで出す */}
      {!(isLearnableFile && chunked) && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>ライブプレビュー</CardTitle>
              <CardDescription>{previewDescription}</CardDescription>
            </CardHeader>
            <CardContent>{previewBody}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
