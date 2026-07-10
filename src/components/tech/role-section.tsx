"use client";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoleRow } from "@/lib/supabase/technologies";

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return LucideIcons.Wrench;
  return (LucideIcons as unknown as Record<string, LucideIcon>)[name] ?? LucideIcons.Wrench;
}

export function RoleSection({
  roles,
  purposeName,
  onSelect,
  onBack,
}: {
  roles: RoleRow[];
  purposeName: string;
  onSelect: (slug: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="size-4" />
          目的を選び直す
        </Button>
        <span>/</span>
        <span>{purposeName}</span>
      </div>
      <h2 className="mt-2 text-lg font-semibold">どの役割の技術を探しますか?</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const Icon = resolveIcon(role.icon);
          return (
            <button key={role.id} type="button" onClick={() => onSelect(role.slug)} className="text-left">
              <Card className="h-full transition-colors hover:bg-muted">
                <CardHeader>
                  <Icon className="size-8 text-primary" />
                  <CardTitle className="mt-2">{role.name}</CardTitle>
                  {role.description && <CardDescription>{role.description}</CardDescription>}
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
