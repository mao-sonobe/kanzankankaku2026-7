"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/plan", label: "① 企画・技術選定" },
  { href: "/build", label: "② コード生成" },
  { href: "/learn", label: "③ コード理解" },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Output→Input
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors hover:bg-muted",
                pathname === item.href
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/settings"
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors hover:bg-muted",
              pathname === "/settings"
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground"
            )}
          >
            設定
          </Link>
        </nav>
      </div>
    </header>
  );
}
