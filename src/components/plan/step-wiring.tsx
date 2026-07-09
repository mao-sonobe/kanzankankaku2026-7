"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAIProvider } from "@/lib/ai/get-provider";
import { useProjectStore } from "@/lib/store/project-store";
import { SCAFFOLD_PATHS } from "@/lib/generated-app/scaffold";
import type { FeatureFlow } from "@/lib/domain/feature-flow";
import { WiringCanvas } from "./wiring-canvas";
import { cn } from "@/lib/utils";

/**
 * ③配線パズル。実際の生成コードから機能ごとのデータフローを解析し、
 * ユーザーがドラッグでノードをつなぐことで「どのデータが誰から誰へ渡るか」を学ぶ。
 */
export function StepWiring({ onBack }: { onBack: () => void }) {
  const generatedFiles = useProjectStore((s) => s.generatedFiles);
  const isPregenerating = useProjectStore((s) => s.isPregenerating);
  const planText = useProjectStore((s) => s.planText);
  const featureFlows = useProjectStore((s) => s.featureFlows);
  const setFeatureFlows = useProjectStore((s) => s.setFeatureFlows);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  // featureId -> 確定済みステップindexの配列(順番)
  const [progress, setProgress] = useState<Record<string, number[]>>({});
  const startedRef = useRef(false);

  const provider = getAIProvider();
  const supported = typeof provider.analyzeFeatureFlows === "function";
  const learnableFiles = useMemo(
    () => generatedFiles.filter((f) => !SCAFFOLD_PATHS.has(f.path)),
    [generatedFiles]
  );

  async function analyze() {
    if (!provider.analyzeFeatureFlows || learnableFiles.length === 0) return;
    setAnalyzeError(null);
    setIsAnalyzing(true);
    try {
      const result = await provider.analyzeFeatureFlows({ files: learnableFiles, planText });
      setFeatureFlows(result);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "機能フローの解析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  }

  // コードが揃っていて未解析なら自動で解析する。
  useEffect(() => {
    if (startedRef.current) return;
    if (!supported || featureFlows || learnableFiles.length === 0) return;
    startedRef.current = true;
    void analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, featureFlows, learnableFiles]);

  const features = featureFlows?.features ?? [];
  const feature: FeatureFlow | undefined = features[activeFeature];
  const done = feature ? progress[feature.id] ?? [] : [];
  const activeStepIndex = feature
    ? feature.steps.findIndex((_, i) => !done.includes(i))
    : -1;
  const currentStep =
    feature && activeStepIndex >= 0 ? feature.steps[activeStepIndex] : undefined;
  // 直前に確定したステップ(下部パネルで解説を見せる)
  const lastStep =
    feature && done.length > 0 ? feature.steps[done[done.length - 1]] : undefined;
  const panelStep = currentStep ?? lastStep;
  const panelStepNo = currentStep
    ? done.length + 1
    : done.length; // 完了後は最後の番号
  // このステップで動くコード(起点ノードの抜粋)
  const panelSnippet = feature && panelStep
    ? feature.nodes.find((n) => n.id === panelStep.fromId)?.snippet
    : undefined;
  const featureDone = feature ? done.length >= feature.steps.length : false;
  const allDone =
    features.length > 0 &&
    features.every((f) => (progress[f.id] ?? []).length >= f.steps.length);

  function handleConnect(stepIndex: number) {
    if (!feature) return;
    setProgress((prev) => {
      const cur = prev[feature.id] ?? [];
      if (cur.includes(stepIndex)) return prev;
      return { ...prev, [feature.id]: [...cur, stepIndex] };
    });
  }

  // ---- 各種状態表示 ----
  if (!supported) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          配線パズルはGeminiプロバイダーでのみ利用できます。設定でGeminiを選ぶと表示されます。
        </p>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            ←クイズに戻る
          </Button>
          <Button size="lg" nativeButton={false} render={<Link href="/build" />}>
            次へ: コードを生成する→
          </Button>
        </div>
      </div>
    );
  }

  if (!featureFlows) {
    const preparing = isPregenerating || learnableFiles.length === 0 || isAnalyzing;
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
        {preparing && !analyzeError ? (
          <p className="text-sm text-muted-foreground">
            {learnableFiles.length === 0
              ? "コードを準備しています…(クイズ中に生成した内容を解析します)"
              : "コードを解析して配線パズルを作っています…"}
          </p>
        ) : (
          <>
            {analyzeError && (
              <Alert variant="destructive" className="max-w-md">
                <AlertTitle>解析に失敗しました</AlertTitle>
                <AlertDescription>{analyzeError}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={() => void analyze()}
              disabled={isAnalyzing || learnableFiles.length === 0}
            >
              {isAnalyzing ? "解析中…" : "配線パズルを作る"}
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={onBack}>
          ←クイズに戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">配線パズル — データの流れを組み立てよう</h2>
        <p className="text-sm text-muted-foreground">
          機能ごとに、データがどのノードからどのノードへ渡るかをドラッグでつなぎましょう。
        </p>
      </div>

      {/* 機能タブ */}
      <div className="flex flex-wrap gap-2">
        {features.map((f, i) => {
          const fDone = (progress[f.id] ?? []).length >= f.steps.length;
          const active = i === activeFeature;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFeature(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-pink-100" : "bg-background"
              )}
              style={{ borderColor: active ? "var(--brand-pink)" : "var(--border)" }}
            >
              {fDone && <Check className="size-3.5 text-emerald-600" strokeWidth={3} />}
              {f.name}
            </button>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6" style={{ background: "var(--brand-blue)" }} />
          呼び出し(データを渡す)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6" style={{ background: "var(--brand-pink)" }} />
          戻り値(結果が返ってくる)
        </span>
      </div>

      {feature && (
        <WiringCanvas
          key={feature.id}
          feature={feature}
          completedSteps={done}
          activeStepIndex={activeStepIndex}
          onConnect={handleConnect}
        />
      )}

      {/* STEPパネル */}
      {feature && panelStep && (
        <div
          className="rounded-2xl border-2 p-4"
          style={{ borderColor: "var(--brand-pink)" }}
        >
          <p className="text-sm font-semibold">
            {featureDone ? "✔ " : ""}STEP {panelStepNo} / {feature.steps.length} —{" "}
            {panelStep.kind === "call" ? "呼び出し(データを渡す)" : "戻り値(結果が返る)"}
          </p>
          <p className="mt-1 text-sm leading-relaxed">{panelStep.explanation}</p>
          <p className="mt-1 text-xs text-muted-foreground">流れるデータ: {panelStep.dataLabel}</p>
          {panelSnippet && (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {panelSnippet}
            </pre>
          )}
          {panelStep.uiResult && (
            <p className="mt-2 rounded-lg bg-pink-50 px-3 py-2 text-xs">
              画面に出るもの: {panelStep.uiResult}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          ←クイズに戻る
        </Button>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/build" />}
          className={cn("rounded-full", allDone && "text-white")}
          style={allDone ? { background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))" } : undefined}
        >
          次へ: コードを生成する→
        </Button>
      </div>
    </div>
  );
}
