"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_AI_SETTINGS, loadAISettings, saveAISettings } from "@/lib/ai/settings";
import { useProjectStore } from "@/lib/store/project-store";

type ConnectionState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "success"; models: string[] }
  | { status: "error"; message: string };

export default function SettingsPage() {
  const [endpoint, setEndpoint] = useState(DEFAULT_AI_SETTINGS.endpoint);
  const [model, setModel] = useState(DEFAULT_AI_SETTINGS.model);
  const [conn, setConn] = useState<ConnectionState>({ status: "idle" });
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const resetProject = useProjectStore((s) => s.resetProject);
  const planText = useProjectStore((s) => s.planText);

  useEffect(() => {
    const settings = loadAISettings();
    setEndpoint(settings.endpoint);
    setModel(settings.model);
  }, []);

  function handleSave() {
    saveAISettings({ endpoint, model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleCheckConnection() {
    setConn({ status: "checking" });
    saveAISettings({ endpoint, model });
    try {
      const res = await fetch("/api/ollama/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      const data = await res.json();
      if (data.ok) {
        setConn({ status: "success", models: data.models ?? [] });
      } else {
        setConn({ status: "error", message: data.error ?? "接続に失敗しました" });
      }
    } catch (err) {
      setConn({
        status: "error",
        message: err instanceof Error ? err.message : "接続に失敗しました",
      });
    }
  }

  const modelAvailable =
    conn.status === "success" && conn.models.includes(model);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">AIプロバイダー設定</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        このアプリはローカルで動作するOllamaを利用します。事前に <code>ollama serve</code>{" "}
        を起動し、使用したいモデルを <code>ollama pull</code> 済みにしておいてください。
        APIキーは不要です。
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ollama接続設定</CardTitle>
          <CardDescription>エンドポイントURLとモデル名を入力してください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint">エンドポイントURL</Label>
            <Input
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">モデル名</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="qwen2.5:3b"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} variant="secondary">
              保存
            </Button>
            <Button onClick={handleCheckConnection} disabled={conn.status === "checking"}>
              {conn.status === "checking" ? "確認中…" : "疎通確認"}
            </Button>
            {saved && <span className="text-sm text-muted-foreground">保存しました</span>}
          </div>

          {conn.status === "success" && (
            <Alert>
              <AlertTitle>接続に成功しました</AlertTitle>
              <AlertDescription>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {conn.models.length === 0 && (
                    <span className="text-sm">
                      モデルが1つも見つかりませんでした。`ollama pull {model}` を実行してください。
                    </span>
                  )}
                  {conn.models.map((m) => (
                    <Badge key={m} variant={m === model ? "default" : "outline"}>
                      {m}
                    </Badge>
                  ))}
                </div>
                {!modelAvailable && conn.models.length > 0 && (
                  <p className="mt-2 text-sm text-destructive">
                    指定したモデル「{model}」が見つかりません。上記のいずれかを指定するか、
                    `ollama pull {model}` を実行してください。
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {conn.status === "error" && (
            <Alert variant="destructive">
              <AlertTitle>接続に失敗しました</AlertTitle>
              <AlertDescription>{conn.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>プロジェクトのリセット</CardTitle>
          <CardDescription>
            企画書・技術スタック・生成コード・学習の進捗をすべて削除し、新しいプロジェクトを始めます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!resetConfirm ? (
            <Button
              variant="destructive"
              disabled={!planText}
              onClick={() => setResetConfirm(true)}
            >
              プロジェクトをリセットする
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-destructive">本当に削除しますか?元に戻せません。</span>
              <Button
                variant="destructive"
                onClick={() => {
                  resetProject();
                  setResetConfirm(false);
                }}
              >
                削除する
              </Button>
              <Button variant="ghost" onClick={() => setResetConfirm(false)}>
                キャンセル
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
