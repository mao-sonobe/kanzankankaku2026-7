"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

type Status = { kind: "idle" } | { kind: "sent" } | { kind: "error"; message: string };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus({ kind: "idle" });
    setIsSendingLink(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setStatus({ kind: "sent" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "送信に失敗しました" });
    } finally {
      setIsSendingLink(false);
    }
  }

  async function handleGoogleLogin() {
    setStatus({ kind: "idle" });
    setIsGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // 成功時はGoogleへリダイレクトされるため、ここでのsetIsGoogleLoading(false)は不要。
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "ログインに失敗しました" });
      setIsGoogleLoading(false);
    }
  }

  async function handleGuestLogin() {
    setStatus({ kind: "idle" });
    setIsGuestLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      // router.push(クライアント側遷移)だと、セッションCookieの反映が
      // middlewareのチェックに間に合わずログイン前のページへ戻されることがあるため、
      // 確実に最新のCookieを読ませるハードナビゲーションにする。
      window.location.href = "/plan";
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "ログインに失敗しました" });
      setIsGuestLoading(false);
    }
  }

  const isBusy = isSendingLink || isGoogleLoading || isGuestLoading;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-24">
      <h1 className="text-2xl font-bold tracking-tight">ログイン</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        ログインすると、作ったプロダクトの履歴が保存され、あとから見返せます。
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>メールでログイン</CardTitle>
          <CardDescription>ログイン用のリンクをメールで送ります(パスワード不要)。</CardDescription>
        </CardHeader>
        <CardContent>
          {status.kind === "sent" ? (
            <Alert>
              <AlertTitle>メールを送信しました</AlertTitle>
              <AlertDescription>届いたリンクをクリックしてログインしてください。</AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isBusy}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isBusy}>
                {isSendingLink ? "送信中…" : "ログインリンクを送る"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        または
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="mt-4 w-full"
        onClick={handleGoogleLogin}
        disabled={isBusy}
      >
        {isGoogleLoading ? "リダイレクト中…" : "Googleでログイン"}
      </Button>

      <Button
        variant="ghost"
        className="mt-2 w-full text-muted-foreground"
        onClick={handleGuestLogin}
        disabled={isBusy}
      >
        {isGuestLoading ? "準備中…" : "ゲストとして始める"}
      </Button>

      {status.kind === "error" && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
