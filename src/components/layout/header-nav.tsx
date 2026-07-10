"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { WizardSteps } from "@/components/plan/wizard-steps";
import { useAuth } from "@/lib/supabase/use-auth";
import { createClient } from "@/lib/supabase/client";

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
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
        <Link
          href="/settings"
          aria-label="設定"
          className={cn(
            "flex-none rounded-full p-2 transition-colors hover:bg-muted",
            pathname === "/settings" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Wrench className="size-5" />
        </Link>
      </div>
    </header>
  );
}
