"use client";

import { usePathname } from "next/navigation";
import { ProductSidebar } from "./product-sidebar";
import { useProductSync } from "@/lib/supabase/use-product-sync";

const SIDEBAR_PATHS = ["/plan", "/build", "/learn"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useProductSync();

  const showSidebar = SIDEBAR_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-1 overflow-x-hidden">
      <ProductSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
