"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TechIcon } from "@/components/ui/tech-icon";
import { useProjectStore } from "@/lib/store/project-store";
import { getAIProvider } from "@/lib/ai/get-provider";
import { getExecutionProvider } from "@/lib/execution/webcontainer-provider";
import { getScaffoldFiles } from "@/lib/generated-app/scaffold";

type Phase = "idle" | "generating" | "booting" | "installing" | "running" | "ready" | "error";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "準備しています…",
  generating: "AIがコードを生成しています…",
  booting: "実行環境を起動しています…",
  installing: "依存関係をインストールしています…",
  running: "アプリを起動しています…",
  ready: "完了しました。移動します…",
  error: "エラーが発生しました",
};

export function BuildWorkspace() {
  const router = useRouter();
  const planText = useProjectStore((s) => s.planText);
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const generatedFiles = useProjectStore((s) => s.generatedFiles);
  const setGeneratedFiles = useProjectStore((s) => s.setGeneratedFiles);
  const previewUrl = useProjectStore((s) => s.previewUrl);
  const setPreviewUrl = useProjectStore((s) => s.setPreviewUrl);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

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

  // 生成されたコードの全文をここで見せてしまうと、③の穴埋め学習の前に答えを見せることになるため、
  // コード生成〜WebContainer起動は裏側で自動的に走らせ、完了したら③のコード理解画面へ自動遷移する。
  useEffect(() => {
    if (!stackProposal || startedRef.current) return;
    startedRef.current = true;
    if (previewUrl) {
      router.replace("/learn");
    } else if (generatedFiles.length > 0) {
      void handleResume();
    } else {
      void handleGenerateAndRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackProposal, previewUrl, generatedFiles, router]);

  useEffect(() => {
    if (phase === "ready" && previewUrl) {
      router.replace("/learn");
    }
  }, [phase, previewUrl, router]);

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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>アプリを準備しています</CardTitle>
          <CardDescription>
            AIがコードを生成し、実行環境を起動しています。完了すると自動的にコード理解画面に移動します(数分かかることがあります)。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {stackProposal.nodes.map((node) => (
              <Badge key={node.id} variant="outline" className="gap-1.5">
                <TechIcon name={node.label} size={14} />
                {node.label}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {phase !== "error" && phase !== "ready" && (
              <span className="size-2 animate-pulse rounded-full bg-primary" />
            )}
            {PHASE_LABEL[phase]}
          </div>

          {phase === "error" && (
            <>
              <Alert variant="destructive">
                <AlertTitle>エラーが発生しました</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button onClick={() => void handleGenerateAndRun()}>もう一度試す</Button>
            </>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
