"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_TABS = [
  { href: "/plan", label: "技術スタック" },
  { href: "/learn", label: "コード理解" },
] as const;

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="" width={32} height={32} priority />
          <Image src="/logo-wordmark.png" alt="Out↓In" width={84} height={32} priority className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-2">
            {NAV_TABS.map((tab) => {
              const active =
                tab.href === "/plan"
                  ? pathname === "/plan" || pathname === "/build"
                  : pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded-full border px-5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-transparent text-white"
                      : "border-foreground/80 text-foreground hover:bg-muted"
                  )}
                  style={
                    active
                      ? { background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))" }
                      : undefined
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
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
        </div>
      </div>
    </header>
  );
}
