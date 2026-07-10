"use client";

import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TechIcon } from "@/components/ui/tech-icon";
import { cn } from "@/lib/utils";
import {
  COST_COLORS,
  COST_LABEL,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABEL,
  JAPANESE_DOCS_COLORS,
  JAPANESE_DOCS_LABEL,
  LEARNING_PERIOD_COLORS,
  LEARNING_PERIOD_LABEL,
  POPULARITY_COLORS,
  POPULARITY_LABEL,
} from "@/lib/domain/technology-labels";
import type { TechnologySummary } from "@/lib/supabase/technologies";

export function FacetBadge({
  label,
  colors,
}: {
  label: string;
  colors: { bg: string; border: string; text: string };
}) {
  return (
    <Badge variant="outline" className={cn(colors.bg, colors.border, colors.text)}>
      {label}
    </Badge>
  );
}

export function TechnologyCard({ tech }: { tech: TechnologySummary }) {
  return (
    <Link href={`/tech/${tech.slug}`} className="block h-full">
      <Card className="h-full transition-colors hover:bg-muted">
        <CardHeader>
          <div className="flex items-center gap-3">
            {tech.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tech.logo_url} alt="" width={32} height={32} className="size-8 rounded" />
            ) : (
              <TechIcon name={tech.name} size={32} />
            )}
            <div>
              <CardTitle>{tech.name}</CardTitle>
              {tech.recommendation_score != null && (
                <div className="mt-0.5 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-3.5",
                        i < tech.recommendation_score! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <CardDescription className="line-clamp-2">{tech.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <FacetBadge label={DIFFICULTY_LABEL[tech.difficulty]} colors={DIFFICULTY_COLORS[tech.difficulty]} />
            <FacetBadge label={COST_LABEL[tech.cost]} colors={COST_COLORS[tech.cost]} />
            <FacetBadge
              label={LEARNING_PERIOD_LABEL[tech.learning_period]}
              colors={LEARNING_PERIOD_COLORS[tech.learning_period]}
            />
            <FacetBadge
              label={`日本語情報: ${JAPANESE_DOCS_LABEL[tech.japanese_docs]}`}
              colors={JAPANESE_DOCS_COLORS[tech.japanese_docs]}
            />
            <FacetBadge label={POPULARITY_LABEL[tech.popularity]} colors={POPULARITY_COLORS[tech.popularity]} />
          </div>

          {tech.platforms.length > 0 && (
            <p className="text-xs text-muted-foreground">
              対応環境: {tech.platforms.map((p) => p.name).join(" / ")}
            </p>
          )}

          {tech.relatedTechnologies.length > 0 && (
            <p className="text-xs text-muted-foreground">
              関連技術: {tech.relatedTechnologies.map((r) => r.name).join(" / ")}
            </p>
          )}

          {tech.official_url && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="size-3.5" />
              公式サイトあり
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
