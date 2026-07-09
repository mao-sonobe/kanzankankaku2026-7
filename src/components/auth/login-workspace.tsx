"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Mode = "login" | "signup";
type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "signup-check-email" };

const PASSWORD_MIN_LENGTH = 6;

/** Supabaseから返る英語のエラーメッセージを、よくあるケースだけ日本語に置き換える。 */
function translateAuthError(message: string): string {
  if (/password.*at least/i.test(message)) {
    return `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`;
  }
  if (/user already registered/i.test(message)) {
    return "このメールアドレスは既に登録されています。ログインしてください。";
  }
  if (/invalid login credentials/i.test(message)) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (/rate limit/i.test(message)) {
    return "試行回数が多すぎます。しばらく待ってから再度お試しください。";
  }
  return message;
}

export function LoginWorkspace() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<FormState>({ status: "idle" });

  function handleModeChange(next: Mode) {
    setMode(next);
    setState({ status: "idle" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setState({ status: "error", message: "メールアドレスを入力してください。" });
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setState({
        status: "error",
        message: `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`,
      });
      return;
    }

    if (!isSupabaseConfigured()) {
      setState({
        status: "error",
        message: "Supabaseが設定されていません(.env.localを確認してください)。",
      });
      return;
    }

    setState({ status: "submitting" });
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setState({ status: "error", message: translateAuthError(error.message) });
        return;
      }
      router.push("/plan");
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setState({ status: "error", message: translateAuthError(error.message) });
      return;
    }
    if (!data.session) {
      // メール確認が有効なSupabaseプロジェクト設定の場合、ここに来る。
      setState({ status: "signup-check-email" });
      return;
    }
    router.push("/plan");
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <Tabs value={mode} onValueChange={(v) => handleModeChange(v as Mode)}>
          <TabsList>
            <TabsTrigger value="login">ログイン</TabsTrigger>
            <TabsTrigger value="signup">新規登録</TabsTrigger>
          </TabsList>
        </Tabs>
        <CardTitle className="sr-only">{mode === "login" ? "ログイン" : "新規登録"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_MIN_LENGTH}文字以上で入力してください。</p>
          </div>

          <Button type="submit" disabled={state.status === "submitting"} className="w-full">
            {state.status === "submitting"
              ? "送信中…"
              : mode === "login"
                ? "ログイン"
                : "登録する"}
          </Button>

          {state.status === "error" && (
            <Alert variant="destructive">
              <AlertTitle>{mode === "login" ? "ログインに失敗しました" : "登録に失敗しました"}</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          {state.status === "signup-check-email" && (
            <Alert>
              <AlertTitle>確認メールを送信しました</AlertTitle>
              <AlertDescription>
                メール内のリンクをクリックすると登録が完了します。
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
