"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TechIcon } from "@/components/ui/tech-icon";
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
  RELATION_TYPE_COLORS,
  RELATION_TYPE_LABEL,
} from "@/lib/domain/technology-labels";
import { getTechnologyBySlug, type TechnologyDetail as TechnologyDetailData } from "@/lib/supabase/technologies";
import { FacetBadge } from "./technology-card";

export function TechnologyDetail({ slug }: { slug: string }) {
  const [tech, setTech] = useState<TechnologyDetailData | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTech(undefined);
    setError(null);
    getTechnologyBySlug(slug)
      .then((data) => {
        if (!cancelled) setTech(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "取得に失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込みに失敗しました</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (tech === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  if (tech === null) {
    return (
      <Alert>
        <AlertTitle>見つかりませんでした</AlertTitle>
        <AlertDescription>指定された技術は存在しないか、削除された可能性があります。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/tech" />}>
        <ArrowLeft className="size-4" />
        技術辞書に戻る
      </Button>

      <div className="flex items-start gap-4">
        {tech.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tech.logo_url} alt="" width={56} height={56} className="size-14 rounded" />
        ) : (
          <TechIcon name={tech.name} size={56} />
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tech.name}</h1>
          <p className="mt-1 text-muted-foreground">{tech.description}</p>
          {tech.official_url && (
            <a
              href={tech.official_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
            >
              <ExternalLink className="size-3.5" />
              公式サイト
            </a>
          )}
        </div>
      </div>

      {/*
        将来の拡張点: 「全体の技術フロー」ページからこの詳細ページに遷移してきた場合、
        ここに「この技術を使用する」ボタンを追加する想定(今回は未実装)。押下時の処理は
        history-workspace.tsxのhandleNewHearing/handleResumeと同じパターンで実装できる:
          useProjectStore.getState().resetProject();
          useProjectStore.getState().setPlanText(`${tech.name}を使いたい`);
          useProjectStore.getState().addChatMessage({ role: "user", content: `${tech.name}を使いたい` });
          router.push("/plan");
        ただしPlanWorkspace側に「未回答のユーザーメッセージが1件だけならAIの最初のヒアリング
        ターンを自動発火する」処理の追加が別途必要。詳細はdocs/tech-dictionary.mdを参照。
      */}

      <div className="flex flex-wrap gap-2">
        <FacetBadge label={`難易度: ${DIFFICULTY_LABEL[tech.difficulty]}`} colors={DIFFICULTY_COLORS[tech.difficulty]} />
        <FacetBadge label={`費用: ${COST_LABEL[tech.cost]}`} colors={COST_COLORS[tech.cost]} />
        <FacetBadge
          label={`学習期間: ${LEARNING_PERIOD_LABEL[tech.learning_period]}`}
          colors={LEARNING_PERIOD_COLORS[tech.learning_period]}
        />
        <FacetBadge
          label={`日本語情報: ${JAPANESE_DOCS_LABEL[tech.japanese_docs]}`}
          colors={JAPANESE_DOCS_COLORS[tech.japanese_docs]}
        />
        <FacetBadge label={`人気度: ${POPULARITY_LABEL[tech.popularity]}`} colors={POPULARITY_COLORS[tech.popularity]} />
      </div>

      {tech.platforms.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold">対応環境</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tech.platforms.map((p) => (
              <Badge key={p.id} variant="secondary">
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {tech.tags.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold">タグ</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tech.tags.map((t) => (
              <Badge key={t.id} variant="outline">
                {t.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {tech.relations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold">関連技術・組み合わせ</h2>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tech.relations.map((rel) => (
              <Link key={rel.technology.slug} href={`/tech/${rel.technology.slug}`}>
                <Card className="h-full transition-colors hover:bg-muted">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TechIcon name={rel.technology.name} size={24} />
                      <CardTitle className="text-base">{rel.technology.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FacetBadge
                      label={RELATION_TYPE_LABEL[rel.relation_type]}
                      colors={RELATION_TYPE_COLORS[rel.relation_type]}
                    />
                    {rel.note && <p className="mt-2 text-xs text-muted-foreground">{rel.note}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tech.learningResources.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold">学習リソース</h2>
          <ul className="mt-2 space-y-1.5">
            {tech.learningResources.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
                >
                  <ExternalLink className="size-3.5" />
                  {r.title}
                </a>
                {r.is_japanese && (
                  <Badge variant="outline" className="ml-1.5">
                    日本語
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
