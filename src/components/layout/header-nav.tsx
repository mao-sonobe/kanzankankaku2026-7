"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, LogOut, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { WizardSteps } from "@/components/plan/wizard-steps";
import { useAuth } from "@/lib/supabase/use-auth";
import { createClient } from "@/lib/supabase/client";
import { useProjectStore } from "@/lib/store/project-store";

export function HeaderNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // ローカルのストア(IndexedDB永続化)はユーザーをまたいで共有されているため、
    // ここでリセットしないと次にログインした別アカウント/ゲストにも
    // 前のユーザーのチャット内容が残って見えてしまう。
    useProjectStore.getState().startNewProduct();
    // リセットのIndexedDBへの書き込み(非同期)がページ遷移で打ち切られないよう一呼吸置く。
    await new Promise((resolve) => setTimeout(resolve, 80));
    // router.push(クライアント側遷移)だとセッションCookie失効のタイミングと
    // middlewareのチェックがずれることがあるため、ハードナビゲーションにする。
    window.location.href = "/login";
  }

  return (
    <>
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex flex-none items-center gap-2">
            <Image src="/logo-icon.png" alt="" width={32} height={32} priority />
            <Image src="/logo-wordmark.png" alt="Out↓In" width={84} height={32} priority className="h-7 w-auto" />
          </Link>
          {/* スマホでは横に収まりきらないため、下部の固定バーに移す(下のfixed部分を参照)。 */}
          <div className="hidden flex-1 justify-center md:flex">
            <WizardSteps />
          </div>
          <div className="flex flex-none items-center gap-1">
            <Link
              href="/tech"
              aria-label="技術辞書"
              className={cn(
                "rounded-full p-2 transition-colors hover:bg-muted",
                pathname.startsWith("/tech") ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Library className="size-5" />
            </Link>
            <Link
              href="/settings"
              aria-label="設定"
              className={cn(
                "rounded-full p-2 transition-colors hover:bg-muted",
                pathname === "/settings" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Wrench className="size-5" />
            </Link>
            {user && (
              <div className="flex flex-none items-center gap-2">
                <span className="hidden max-w-32 truncate text-xs text-muted-foreground sm:inline">
                  {user.is_anonymous ? "ゲスト" : user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="ログアウト"
                  title="ログアウト"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* スマホ専用: ステップナビを下部固定バーとして表示する。 */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center border-t bg-background/95 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <WizardSteps />
      </nav>
    </>
  );
}
