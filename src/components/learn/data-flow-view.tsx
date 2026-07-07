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
import { locateSpansInFile, type DataFlowSpan } from "@/lib/domain/data-flow";
import { orderPipeline } from "@/lib/domain/stack-pipeline";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import { CATEGORY_HEX } from "./code-editor";
import { cn } from "@/lib/utils";

/**
 * データフロー解説モード。技術スタックの各エッジ(データの流れ)が
 * 生成コードのどこで実装されているかをハイライトし、パイプライン図と対応付けて読む。
 */
export function DataFlowView({ onProceedToFill }: { onProceedToFill: () => void }) {
  const generatedFiles = useProjectStore((s) => s.generatedFiles);
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const dataFlow = useProjectStore((s) => s.dataFlow);
  const setDataFlow = useProjectStore((s) => s.setDataFlow);

  const learnableFiles = useMemo(
    () => generatedFiles.filter((f) => !SCAFFOLD_PATHS.has(f.path)),
    [generatedFiles]
  );

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  const provider = getAIProvider();
  const supportsDataFlow = typeof provider.analyzeDataFlow === "function";

  const currentPath = selectedPath ?? learnableFiles[0]?.path ?? null;
  const currentFile = learnableFiles.find((f) => f.path === currentPath) ?? null;

  const nodeById = useMemo(
    () => new Map(stackProposal?.nodes.map((n) => [n.id, n]) ?? []),
    [stackProposal]
  );
  const edgeById = useMemo(
    () => new Map(stackProposal?.edges.map((e) => [e.id, e]) ?? []),
    [stackProposal]
  );
  const pipeline = useMemo(
    () => (stackProposal ? orderPipeline(stackProposal) : []),
    [stackProposal]
  );

  const spans = useMemo(() => dataFlow?.spans ?? [], [dataFlow]);
  const spansInCurrentFile = useMemo(
    () =>
      currentFile ? locateSpansInFile(currentFile.content, spans.filter((s) => s.filePath === currentFile.path)) : [],
    [currentFile, spans]
  );

  /** エッジのtargetノードのカテゴリ色でスパンを塗る(データの行き先が一目で分かるように)。 */
  function spanCategory(span: DataFlowSpan) {
    const edge = edgeById.get(span.edgeId);
    const node = edge ? nodeById.get(edge.target) ?? nodeById.get(edge.source) : undefined;
    return node?.category ?? "other";
  }

  function edgeLabel(span: DataFlowSpan): string {
    const edge = edgeById.get(span.edgeId);
    if (!edge) return "";
    const source = nodeById.get(edge.source)?.label ?? edge.source;
    const target = nodeById.get(edge.target)?.label ?? edge.target;
    return `${source} → ${target}`;
  }

  const spansByEdge = useMemo(() => {
    const grouped = new Map<string, DataFlowSpan[]>();
    for (const span of spans) {
      const list = grouped.get(span.edgeId) ?? [];
      list.push(span);
      grouped.set(span.edgeId, list);
    }
    return grouped;
  }, [spans]);

  const extensions = useMemo(() => {
    const decos = spansInCurrentFile.map((m) => {
      const hex = CATEGORY_HEX[spanCategory(m.item)];
      const isActive = m.item.id === activeSpanId;
      return Decoration.mark({
        class: "cm-flow-span",
        attributes: {
          "data-flow-id": m.item.id,
          style:
            `background-color: ${hex.bg}; border-bottom: 2px solid ${hex.border};` +
            (isActive ? " outline: 2px solid #6366f1;" : ""),
        },
      }).range(m.start, m.end);
    });
    const decorations: DecorationSet = Decoration.set(decos, true);
    return [
      javascript({ jsx: true }),
      EditorView.editable.of(false),
      EditorView.decorations.of(decorations),
      EditorView.domEventHandlers({
        mousedown(event) {
          const target = (event.target as HTMLElement)?.closest("[data-flow-id]");
          const flowId = target?.getAttribute("data-flow-id");
          if (flowId) {
            setActiveSpanId(flowId);
            return true;
          }
          return false;
        },
      }),
      EditorView.theme({
        ".cm-flow-span": {
          borderRadius: "3px",
          cursor: "pointer",
        },
      }),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spansInCurrentFile, activeSpanId]);

  function handleSelectSpan(span: DataFlowSpan) {
    setActiveSpanId(span.id);
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
    if (!stackProposal || learnableFiles.length === 0 || !provider.analyzeDataFlow) return;
    setAnalyzeError(null);
    setIsAnalyzing(true);
    try {
      const result = await provider.analyzeDataFlow({
        files: learnableFiles,
        stackProposal,
      });
      setDataFlow(result);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "データフローの解析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!stackProposal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>技術スタックがありません</CardTitle>
          <CardDescription>先に①で技術スタックを確定してください。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!supportsDataFlow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>データフロー解説はこのAIプロバイダーでは利用できません</CardTitle>
          <CardDescription>
            設定でGeminiプロバイダーを選ぶと利用できます。穴埋め学習はそのまま進められます。
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

  if (!dataFlow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>データの流れを読む</CardTitle>
          <CardDescription>
            ①で選んだ技術の間を、データが実際にコードのどこで受け渡されているかをAIが特定します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "解析中…" : "データフローを解析する"}
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
              色の付いた部分が「データが移動する瞬間」です。クリックすると解説が選択されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <CardTitle>パイプラインとの対応</CardTitle>
            <CardDescription>
              ①で学んだデータの流れが、左のコードのどこに現れているかを確認しましょう。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-start gap-1">
              {pipeline.map((node, i) => (
                <div key={node.id} className="w-full">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5">
                    <span className={cn("size-2 rounded-full", CATEGORY_COLORS[node.category].dot)} />
                    <p className="text-sm font-medium">{node.label}</p>
                  </div>
                  {i < pipeline.length - 1 && <div className="ml-4 h-3 border-l-2 border-dashed" />}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {[...spansByEdge.entries()].map(([edgeId, edgeSpans]) => (
                <div key={edgeId} className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {edgeLabel(edgeSpans[0])}
                    {edgeById.get(edgeId)?.label ? `(${edgeById.get(edgeId)?.label})` : ""}
                  </p>
                  {edgeSpans.map((span) => {
                    const colors = CATEGORY_COLORS[spanCategory(span)];
                    const isActive = span.id === activeSpanId;
                    return (
                      <button
                        key={span.id}
                        type="button"
                        onClick={() => handleSelectSpan(span)}
                        className={cn(
                          "w-full rounded-lg border p-2 text-left transition-colors",
                          colors.bg,
                          isActive && "ring-2 ring-indigo-500"
                        )}
                      >
                        <p className="text-xs leading-relaxed">{span.explanation}</p>
                        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                          {span.filePath}: {span.text}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
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
