"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="pagination" className="flex items-center justify-center gap-3">
      {page > 1 ? (
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={buildHref(page - 1)} />}>
          <ChevronLeft className="size-4" />
          前へ
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft className="size-4" />
          前へ
        </Button>
      )}

      <span className="text-sm text-muted-foreground">
        {page} / {pageCount}
      </span>

      {page < pageCount ? (
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={buildHref(page + 1)} />}>
          次へ
          <ChevronRight className="size-4" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          次へ
          <ChevronRight className="size-4" />
        </Button>
      )}
    </nav>
  );
}
