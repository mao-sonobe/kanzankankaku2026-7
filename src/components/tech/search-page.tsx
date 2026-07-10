"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TECH_PAGE_SIZE,
  parseTechSearchParams,
  serializeTechSearchParams,
  withTechSearchPatch,
  type TechSearchState,
} from "@/lib/domain/tech-search-params";
import {
  listPlatforms,
  listPurposes,
  listRoles,
  listTechnologies,
  type PlatformRow,
  type PurposeRow,
  type RoleRow,
  type TechnologySummary,
} from "@/lib/supabase/technologies";
import { FilterSidebar, type FilterValue } from "./filter-sidebar";
import { Pagination } from "./pagination";
import { PurposeSection } from "./purpose-section";
import { RoleSection } from "./role-section";
import { SearchBar } from "./search-bar";
import { TechnologyGrid } from "./technology-grid";

export function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = parseTechSearchParams(searchParams);

  const [purposes, setPurposes] = useState<PurposeRow[] | null>(null);
  const [roles, setRoles] = useState<RoleRow[] | null>(null);
  const [platforms, setPlatforms] = useState<PlatformRow[] | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [rows, setRows] = useState<TechnologySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listPurposes(), listRoles(), listPlatforms()])
      .then(([p, r, pf]) => {
        setPurposes(p);
        setRoles(r);
        setPlatforms(pf);
      })
      .catch((err) => setMetaError(err instanceof Error ? err.message : "読み込みに失敗しました"));
  }, []);

  const hasPurposeAndRole = !!state.purposeSlug && !!state.roleSlug;
  const difficultyKey = state.difficulty.join(",");
  const costKey = state.cost.join(",");
  const learningPeriodKey = state.learningPeriod.join(",");
  const japaneseDocsKey = state.japaneseDocs.join(",");
  const popularityKey = state.popularity.join(",");
  const platformSlugsKey = state.platformSlugs.join(",");

  useEffect(() => {
    if (!hasPurposeAndRole) return;
    let cancelled = false;
    setLoading(true);
    setListError(null);
    listTechnologies({
      purposeSlug: state.purposeSlug,
      roleSlug: state.roleSlug,
      search: state.q,
      difficulty: state.difficulty,
      cost: state.cost,
      learningPeriod: state.learningPeriod,
      japaneseDocs: state.japaneseDocs,
      popularity: state.popularity,
      platformSlugs: state.platformSlugs,
      page: state.page,
      pageSize: TECH_PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) setListError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasPurposeAndRole,
    state.purposeSlug,
    state.roleSlug,
    state.q,
    difficultyKey,
    costKey,
    learningPeriodKey,
    japaneseDocsKey,
    popularityKey,
    platformSlugsKey,
    state.page,
  ]);

  function updateState(patch: Partial<TechSearchState>) {
    const next = withTechSearchPatch(state, patch);
    const query = serializeTechSearchParams(next);
    router.push(query ? `/tech?${query}` : "/tech");
  }

  if (metaError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込みに失敗しました</AlertTitle>
        <AlertDescription>{metaError}</AlertDescription>
      </Alert>
    );
  }

  if (!purposes || !roles || !platforms) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!state.purposeSlug) {
    return (
      <PurposeSection purposes={purposes} onSelect={(slug) => updateState({ purposeSlug: slug, roleSlug: null })} />
    );
  }

  const purpose = purposes.find((p) => p.slug === state.purposeSlug);

  if (!state.roleSlug) {
    return (
      <RoleSection
        roles={roles}
        purposeName={purpose?.name ?? ""}
        onSelect={(slug) => updateState({ roleSlug: slug })}
        onBack={() => updateState({ purposeSlug: null, roleSlug: null })}
      />
    );
  }

  const role = roles.find((r) => r.slug === state.roleSlug);
  const pageCount = Math.max(1, Math.ceil(total / TECH_PAGE_SIZE));

  const filterValue: FilterValue = {
    difficulty: state.difficulty,
    cost: state.cost,
    learningPeriod: state.learningPeriod,
    japaneseDocs: state.japaneseDocs,
    popularity: state.popularity,
    platformSlugs: state.platformSlugs,
  };

  function buildPageHref(page: number) {
    const query = serializeTechSearchParams(withTechSearchPatch(state, { page }));
    return query ? `/tech?${query}` : "/tech";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => updateState({ purposeSlug: null, roleSlug: null })}
        >
          {purpose?.name}
        </button>
        <span>/</span>
        <button type="button" className="underline underline-offset-4" onClick={() => updateState({ roleSlug: null })}>
          {role?.name}
        </button>
      </div>

      <SearchBar value={state.q} onChange={(q) => updateState({ q })} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <FilterSidebar
          value={filterValue}
          platforms={platforms}
          onChange={(patch) => updateState(patch as Partial<TechSearchState>)}
        />
        <div className="flex-1 space-y-6">
          <TechnologyGrid rows={rows} loading={loading} error={listError} />
          <Pagination page={state.page} pageCount={pageCount} buildHref={buildPageHref} />
        </div>
      </div>
    </div>
  );
}
