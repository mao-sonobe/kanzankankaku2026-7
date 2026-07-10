"use client";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PurposeRow } from "@/lib/supabase/technologies";

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return LucideIcons.Sparkles;
  return (LucideIcons as unknown as Record<string, LucideIcon>)[name] ?? LucideIcons.Sparkles;
}

export function PurposeSection({
  purposes,
  onSelect,
}: {
  purposes: PurposeRow[];
  onSelect: (slug: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">何を作りたいですか?</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {purposes.map((purpose) => {
          const Icon = resolveIcon(purpose.icon);
          return (
            <button
              key={purpose.id}
              type="button"
              onClick={() => onSelect(purpose.slug)}
              className="text-left"
            >
              <Card className="h-full transition-colors hover:bg-muted">
                <CardHeader>
                  <Icon className="size-8 text-primary" />
                  <CardTitle className="mt-2">{purpose.name}</CardTitle>
                  {purpose.description && <CardDescription>{purpose.description}</CardDescription>}
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
