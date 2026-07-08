"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { WizardSteps } from "@/components/plan/wizard-steps";

export function HeaderNav() {
  const pathname = usePathname();

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
