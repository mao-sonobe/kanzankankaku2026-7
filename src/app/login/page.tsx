import { LoginWorkspace } from "@/components/auth/login-workspace";

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">ログイン</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        ログインすると、ヒアリングの内容をいつでも見返せるように保存できます。
      </p>
      <LoginWorkspace />
    </div>
  );
}
