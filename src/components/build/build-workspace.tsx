"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useProjectStore } from "@/lib/store/project-store";
import { getAIProvider } from "@/lib/ai/get-provider";
import { getExecutionProvider } from "@/lib/execution/webcontainer-provider";
import { getScaffoldFiles } from "@/lib/generated-app/scaffold";

type Phase = "idle" | "generating" | "booting" | "installing" | "running" | "ready" | "error";

export function BuildWorkspace() {
  const planText = useProjectStore((s) => s.planText);
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const generatedFiles = useProjectStore((s) => s.generatedFiles);
  const setGeneratedFiles = useProjectStore((s) => s.setGeneratedFiles);
  const previewUrl = useProjectStore((s) => s.previewUrl);
  const setPreviewUrl = useProjectStore((s) => s.setPreviewUrl);

  const [phase, setPhase] = useState<Phase>(generatedFiles.length > 0 ? "ready" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  function appendLog(line: string) {
    const cleaned = line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/[\r\n]+/g, "\n").trim();
    if (!cleaned) return;
    setLogs((prev) => [...prev.slice(-300), cleaned]);
    queueMicrotask(() => logsEndRef.current?.scrollIntoView({ block: "end" }));
  }

  async function runInWebContainer(files: typeof generatedFiles) {
    setPhase("booting");
    const execution = getExecutionProvider();
    await execution.boot(appendLog);
    await execution.mountFiles(files);

    setPhase("installing");
    const url = await execution.installAndRun((line) => {
      appendLog(line);
      if (line.includes("npm run dev") || /Local:\s*http/i.test(line)) {
        setPhase("running");
      }
    });
    setPreviewUrl(url);
    setPhase("ready");
  }

  async function handleGenerateAndRun() {
    if (!stackProposal) return;
    setError(null);
    setLogs([]);
    setPhase("generating");
    try {
      const provider = getAIProvider();
      const result = await provider.generateCode({
        planSummary: planText,
        stackNodes: stackProposal.nodes,
      });
      const scaffold = getScaffoldFiles();
      const aiPaths = new Set(result.files.map((f) => f.path));
      const merged = [...scaffold.filter((f) => !aiPaths.has(f.path)), ...result.files];
      setGeneratedFiles(merged);
      await runInWebContainer(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーが発生しました");
      setPhase("error");
    }
  }

  async function handleResume() {
    setError(null);
    setLogs([]);
    try {
      await runInWebContainer(generatedFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーが発生しました");
      setPhase("error");
    }
  }

  if (!stackProposal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>技術スタックが未確定です</CardTitle>
          <CardDescription>
            先に企画書の入力と技術スタックの提案を行ってください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/plan" />}>
            企画・技術選定に戻る
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isBusy = phase === "generating" || phase === "booting" || phase === "installing";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>確定した技術スタック</CardTitle>
          <CardDescription>この内容をもとにAIがコードを生成します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {stackProposal.nodes.map((node) => (
              <Badge key={node.id} variant="outline">
                {node.label}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerateAndRun} disabled={isBusy}>
              {phase === "generating" && "コードを生成中…"}
              {phase === "booting" && "WebContainerを起動中…"}
              {phase === "installing" && "依存関係をインストール中…"}
              {(phase === "idle" || phase === "ready" || phase === "error") &&
                (generatedFiles.length > 0 ? "再生成して起動する" : "コードを生成して起動する")}
              {phase === "running" && "起動中…"}
            </Button>
            {phase === "idle" && generatedFiles.length > 0 && !previewUrl && (
              <Button variant="secondary" onClick={handleResume} disabled={isBusy}>
                保存されたコードでプレビューを再開する
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>エラーが発生しました</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {generatedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>生成されたファイル</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {generatedFiles.map((file) => (
                <li key={file.path}>
                  <p className="font-mono text-xs text-muted-foreground">{file.path}</p>
                  <pre className="mt-1 max-h-56 overflow-auto rounded-md border bg-muted p-3 text-xs">
                    {file.content}
                  </pre>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>実行ログ</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-48 overflow-auto rounded-md border bg-black p-3 text-xs text-green-400">
              {logs.join("\n")}
              <div ref={logsEndRef} />
            </pre>
          </CardContent>
        </Card>
      )}

      {previewUrl && (
        <Card>
          <CardHeader>
            <CardTitle>ライブプレビュー</CardTitle>
            <CardDescription>{previewUrl}</CardDescription>
          </CardHeader>
          <CardContent>
            <iframe
              src={previewUrl}
              className="h-[600px] w-full rounded-md border bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </CardContent>
        </Card>
      )}

      {previewUrl && (
        <div className="flex justify-end">
          <Button size="lg" nativeButton={false} render={<Link href="/learn" />}>
            次へ: コードを理解する →
          </Button>
        </div>
      )}
    </div>
  );
}
