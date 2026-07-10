"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { TechnologySummary } from "@/lib/supabase/technologies";
import { TechnologyCard } from "./technology-card";

export function TechnologyGrid({
  rows,
  loading,
  error,
}: {
  rows: TechnologySummary[];
  loading: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込みに失敗しました</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        条件に一致する技術が見つかりませんでした。フィルターを調整してみてください。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((tech) => (
        <TechnologyCard key={tech.id} tech={tech} />
      ))}
    </div>
  );
}
