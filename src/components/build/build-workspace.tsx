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
import { getScaffoldFiles } from "@/lib/generated-app/scaffold";

type Phase = "idle" | "generating" | "error";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "準備しています…",
  generating: "AIがコードを生成しています…",
  error: "エラーが発生しました",
};

export function BuildWorkspace() {
  const router = useRouter();
  const planText = useProjectStore((s) => s.planText);
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const generatedFiles = useProjectStore((s) => s.generatedFiles);
  const setGeneratedFiles = useProjectStore((s) => s.setGeneratedFiles);
  const isPregenerating = useProjectStore((s) => s.isPregenerating);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // コード生成だけをここで行い、完了したらすぐにコード理解画面へ移動する。
  // 依存関係のインストール(WebContainer起動)はスマホだと時間がかかるため、
  // ここでは待たずコード理解画面側の自動起動に任せる。
  async function handleGenerate() {
    if (!stackProposal) return;
    setError(null);
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
      router.replace("/learn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーが発生しました");
      setPhase("error");
    }
  }

  // 生成されたコードの全文をここで見せてしまうと、穴埋め学習の前に答えを見せることになるため、
  // コード生成は裏側で自動的に走らせ、完了したらコード理解画面へ自動遷移する。
  useEffect(() => {
    if (!stackProposal || startedRef.current) return;
    // クイズ中の先回し生成がまだ走っている場合は、二重生成を避けて完了(generatedFiles反映)を待つ。
    if (isPregenerating && generatedFiles.length === 0) return;
    startedRef.current = true;
    if (generatedFiles.length > 0) {
      router.replace("/learn");
    } else {
      void handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackProposal, generatedFiles, isPregenerating, router]);

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
            AIがコードを生成しています。完了すると自動的にコード理解画面に移動します。
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
            {phase !== "error" && <span className="size-2 animate-pulse rounded-full bg-primary" />}
            {PHASE_LABEL[phase]}
          </div>

          {phase === "error" && (
            <>
              <Alert variant="destructive">
                <AlertTitle>エラーが発生しました</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button onClick={() => void handleGenerate()}>もう一度試す</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
