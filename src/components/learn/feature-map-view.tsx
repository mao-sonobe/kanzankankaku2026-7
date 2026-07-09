"use client";

import { useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView, Decoration, type DecorationSet } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectStore } from "@/lib/store/project-store";
import { getAIProvider } from "@/lib/ai/get-provider";
import { SCAFFOLD_PATHS } from "@/lib/generated-app/scaffold";
import { locateFeatureSpansInFile, type FeatureSpan } from "@/lib/domain/feature-map";
import { featureColor } from "@/lib/domain/feature-colors";
import { cn } from "@/lib/utils";

/**
 * 機能マップモード。アプリを構成する「機能」単位(例: 予定の追加)を一覧表示し、
 * クリックするとその機能が実装されているコードをファイル横断でハイライトする。
 */
export function FeatureMapView({ onProceedToFill }: { onProceedToFill: () => void }) {
  const generatedFiles = useProjectStore((s) => s.generatedFiles);
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const featureMap = useProjectStore((s) => s.featureMap);
  const setFeatureMap = useProjectStore((s) => s.setFeatureMap);

  const learnableFiles = useMemo(
    () => generatedFiles.filter((f) => !SCAFFOLD_PATHS.has(f.path)),
    [generatedFiles]
  );

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  const provider = getAIProvider();
  const supportsFeatureMap = typeof provider.analyzeFeatureMap === "function";

  const currentPath = selectedPath ?? learnableFiles[0]?.path ?? null;
  const currentFile = learnableFiles.find((f) => f.path === currentPath) ?? null;

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
  const activeFilePaths = useMemo(() => new Set(activeSpans.map((s) => s.filePath)), [activeSpans]);

  const spansInCurrentFile = useMemo(
    () =>
      currentFile
        ? locateFeatureSpansInFile(
            currentFile.content,
            activeSpans.filter((s) => s.filePath === currentFile.path)
          )
        : [],
    [currentFile, activeSpans]
  );

  const extensions = useMemo(() => {
    const decos = spansInCurrentFile.map((m) =>
      Decoration.mark({
        class: "cm-feature-span",
        attributes: {
          style: `background-color: ${activeColor?.hex.bg ?? "transparent"}; border-bottom: 2px solid ${activeColor?.hex.border ?? "transparent"};`,
        },
      }).range(m.start, m.end)
    );
    const decorations: DecorationSet = Decoration.set(decos, true);
    return [
      javascript({ jsx: true }),
      EditorView.editable.of(false),
      EditorView.decorations.of(decorations),
      EditorView.theme({ ".cm-feature-span": { borderRadius: "3px" } }),
    ];
  }, [spansInCurrentFile, activeColor]);

  function handleSelectSpan(span: FeatureSpan) {
    if (span.filePath !== currentPath) {
      setSelectedPath(span.filePath);
      return; // ファイル切り替え後はデコレーションの再構築に任せる
    }
    const match = spansInCurrentFile.find((m) => m.item.id === span.id);
    const view = editorViewRef.current;
    if (match && view) {
      view.dispatch({ effects: EditorView.scrollIntoView(match.start, { y: "center" }) });
    }
  }

  async function handleAnalyze() {
    if (learnableFiles.length === 0 || !provider.analyzeFeatureMap) return;
    setAnalyzeError(null);
    setIsAnalyzing(true);
    try {
      const result = await provider.analyzeFeatureMap({
        files: learnableFiles,
        stackProposal: stackProposal ?? undefined,
      });
      setFeatureMap(result);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "機能マップの解析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (learnableFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>生成コードがありません</CardTitle>
          <CardDescription>先にコードを生成してください。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!supportsFeatureMap) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>機能マップはこのAIプロバイダーでは利用できません</CardTitle>
          <CardDescription>
            設定でChatGPTプロバイダーを選ぶと利用できます。穴埋め学習はそのまま進められます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={onProceedToFill}>
            穴埋め学習へ進む
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!featureMap) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>機能マップを読む</CardTitle>
          <CardDescription>
            生成されたコードをAIが機能単位(例: 予定の追加)に分解し、各機能がどのファイル・
            どのコードで実装されているかを可視化します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "解析中…" : "機能マップを解析する"}
          </Button>
          {analyzeError && (
            <Alert variant="destructive">
              <AlertTitle>解析に失敗しました</AlertTitle>
              <AlertDescription>{analyzeError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>生成コード</CardTitle>
            <CardDescription>
              右の機能一覧から選ぶと、関わるコードに色がつきます。ファイルをまたぐ機能は、
              タブにも同じ色の印がつきます。選ばれていない間は無色です。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {learnableFiles.length > 1 && (
              <Tabs value={currentPath ?? undefined} onValueChange={(v) => setSelectedPath(v)}>
                <TabsList>
                  {learnableFiles.map((f) => (
                    <TabsTrigger key={f.path} value={f.path} className="gap-1.5">
                      {activeFeatureId && activeFilePaths.has(f.path) && (
                        <span className={cn("size-1.5 rounded-full", activeColor?.dot)} />
                      )}
                      {f.path}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            {currentFile && (
              <CodeMirror
                value={currentFile.content}
                height="480px"
                basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
                extensions={extensions}
                onCreateEditor={(view) => {
                  editorViewRef.current = view;
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>機能一覧</CardTitle>
            <CardDescription>クリックすると、関わるコードがハイライトされます。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {features.map((f, i) => {
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
              <div className="mt-3 space-y-2 rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground">扱うデータの形式</p>
                <p className="text-sm">{activeFeature.dataShape}</p>
                <div className="space-y-1.5 pt-2">
                  {activeSpans.map((span) => (
                    <button
                      key={span.id}
                      type="button"
                      onClick={() => handleSelectSpan(span)}
                      className="w-full rounded-md border bg-background p-2 text-left transition-colors hover:brightness-95"
                    >
                      <p className="text-xs leading-relaxed">{span.explanation}</p>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {span.filePath}: {span.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onProceedToFill}
          className="rounded-full text-white"
          style={{ background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))" }}
        >
          次へ: 穴埋めで再入力する→
        </Button>
      </div>
    </div>
  );
}
