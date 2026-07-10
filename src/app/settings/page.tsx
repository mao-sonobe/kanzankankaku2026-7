"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_AI_SETTINGS, OPENAI_DEFAULT_MODEL, loadAISettings, saveAISettings } from "@/lib/ai/settings";
import type { AIProviderKind } from "@/lib/ai/types";
import { useAuth } from "@/lib/supabase/use-auth";
import { createClient } from "@/lib/supabase/client";

type ConnectionState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "success"; models: string[] }
  | { status: "error"; message: string };

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [provider, setProvider] = useState<AIProviderKind>(DEFAULT_AI_SETTINGS.provider);
  const [endpoint, setEndpoint] = useState(DEFAULT_AI_SETTINGS.endpoint);
  const [model, setModel] = useState(DEFAULT_AI_SETTINGS.model);
  const [conn, setConn] = useState<ConnectionState>({ status: "idle" });
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "アカウントの削除に失敗しました");
      await createClient().auth.signOut();
      router.push("/login");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "アカウントの削除に失敗しました");
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    const settings = loadAISettings();
    setProvider(settings.provider);
    setEndpoint(settings.endpoint);
    setModel(settings.model);
  }, []);

  function handleProviderChange(next: AIProviderKind) {
    setProvider(next);
    setConn({ status: "idle" });
    // プロバイダー切り替え時、モデル名が切り替え前のデフォルトのままなら
    // 新しいプロバイダーの適切なデフォルトに合わせる。
    if (model === DEFAULT_AI_SETTINGS.model || model === OPENAI_DEFAULT_MODEL) {
      setModel(next === "ollama" ? "qwen3:8b" : OPENAI_DEFAULT_MODEL);
    }
  }

  function handleSave() {
    saveAISettings({ provider, endpoint, model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleCheckConnection() {
    setConn({ status: "checking" });
    saveAISettings({ provider, endpoint, model });
    try {
      const res = await fetch(provider === "ollama" ? "/api/ollama/tags" : "/api/openai/check", {
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
        {provider === "openai"
          ? "ChatGPT(OpenAI)を使用します。APIキーはサーバー側の.env.localに設定してください(このAPIキーはブラウザには渡りません)。"
          : <>
              このアプリはローカルで動作するOllamaを利用します。事前に <code>ollama serve</code>{" "}
              を起動し、使用したいモデルを <code>ollama pull</code> 済みにしておいてください。
              APIキーは不要です。
            </>}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>接続設定</CardTitle>
          <CardDescription>使用するAIプロバイダーとモデル名を選んでください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>プロバイダー</Label>
            <Tabs value={provider} onValueChange={(v) => handleProviderChange(v as AIProviderKind)}>
              <TabsList>
                <TabsTrigger value="openai">ChatGPT</TabsTrigger>
                <TabsTrigger value="ollama">Ollama(ローカル)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {provider === "ollama" && (
            <div className="space-y-2">
              <Label htmlFor="endpoint">エンドポイントURL</Label>
              <Input
                id="endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="model">モデル名</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "ollama" ? "qwen3:8b" : OPENAI_DEFAULT_MODEL}
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
                      モデルが1つも見つかりませんでした。
                      {provider === "ollama"
                        ? `\`ollama pull ${model}\` を実行してください。`
                        : "APIキーの権限を確認してください。"}
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
                    指定したモデル「{model}」が見つかりません。上記のいずれかを指定してください。
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

      {user && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>アカウント消去</CardTitle>
            <CardDescription>
              アカウント({user.is_anonymous ? "ゲスト" : user.email})と、保存されているすべてのプロダクト履歴を完全に削除します。この操作は元に戻せません。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!deleteConfirm ? (
              <Button variant="destructive" onClick={() => setDeleteConfirm(true)}>
                アカウントを削除する
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-destructive">
                  本当に削除しますか?すべてのプロダクト履歴も失われ、元に戻せません。
                </span>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                  {isDeleting ? "削除中…" : "完全に削除する"}
                </Button>
                <Button variant="ghost" onClick={() => setDeleteConfirm(false)} disabled={isDeleting}>
                  キャンセル
                </Button>
              </div>
            )}
            {deleteError && (
              <Alert variant="destructive">
                <AlertTitle>削除に失敗しました</AlertTitle>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
