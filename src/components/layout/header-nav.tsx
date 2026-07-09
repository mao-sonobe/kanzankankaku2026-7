"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, LogIn, LogOut, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { WizardSteps } from "@/components/plan/wizard-steps";
import { useAuthStore } from "@/lib/store/auth-store";
import { useProjectStore } from "@/lib/store/project-store";
import { createClient } from "@/lib/supabase/client";

function iconLinkClass(active: boolean) {
  return cn(
    "flex-none rounded-full p-2 transition-colors hover:bg-muted",
    active ? "text-foreground" : "text-muted-foreground"
  );
}

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // ログアウト後に前のアカウントのヒアリング内容が残らないようにする(共有端末での取り違え防止)。
    useProjectStore.getState().resetProject();
    router.push("/");
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex flex-none items-center gap-2">
          <Image src="/logo-icon.png" alt="" width={32} height={32} priority />
          <Image src="/logo-wordmark.png" alt="Out↓In" width={84} height={32} priority className="h-7 w-auto" />
        </Link>
        <div className="flex flex-1 justify-center">
          <WizardSteps />
        </div>
        <div className="flex flex-none items-center gap-1">
          {user && (
            <Link href="/history" aria-label="履歴" className={iconLinkClass(pathname === "/history")}>
              <History className="size-5" />
            </Link>
          )}
          <Link href="/settings" aria-label="設定" className={iconLinkClass(pathname === "/settings")}>
            <Wrench className="size-5" />
          </Link>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="ログアウト"
              title={user.email ?? undefined}
              className={iconLinkClass(false)}
            >
              <LogOut className="size-5" />
            </button>
          ) : (
            <Link href="/login" aria-label="ログイン" className={iconLinkClass(pathname === "/login")}>
              <LogIn className="size-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
