import { createClient } from "@/lib/supabase/client";
import { TECH_PAGE_SIZE } from "@/lib/domain/tech-search-params";
import type {
  Cost,
  Difficulty,
  JapaneseDocs,
  LearningPeriod,
  Popularity,
  RelationType,
} from "@/lib/domain/technology-labels";

export interface PurposeRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface RoleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface PlatformRow {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export interface TagRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface TechnologyRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  official_url: string | null;
  difficulty: Difficulty;
  cost: Cost;
  learning_period: LearningPeriod;
  japanese_docs: JapaneseDocs;
  popularity: Popularity;
  recommendation_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface LearningResourceRow {
  id: string;
  technology_id: string;
  title: string;
  url: string;
  resource_type: "official_doc" | "tutorial" | "video" | "book" | "article" | "course";
  is_japanese: boolean;
  sort_order: number;
}

/** 一覧カード用の軽量な関連技術サマリ(自分発の関連のみ。双方向のマージは詳細ページで行う)。 */
export interface RelatedTechnologySummary {
  slug: string;
  name: string;
}

export interface TechnologySummary extends TechnologyRow {
  platforms: Pick<PlatformRow, "slug" | "name">[];
  relatedTechnologies: RelatedTechnologySummary[];
}

export interface RelatedTechnology {
  relation_type: RelationType;
  note: string | null;
  technology: Pick<TechnologyRow, "id" | "slug" | "name" | "logo_url" | "difficulty">;
}

export interface TechnologyDetail extends TechnologyRow {
  purposes: PurposeRow[];
  roles: RoleRow[];
  platforms: PlatformRow[];
  tags: TagRow[];
  relations: RelatedTechnology[];
  learningResources: LearningResourceRow[];
}

export async function listPurposes(): Promise<PurposeRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("purposes").select("*").order("sort_order");
  if (error) throw error;
  return data as PurposeRow[];
}

export async function listRoles(): Promise<RoleRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("roles").select("*").order("sort_order");
  if (error) throw error;
  return data as RoleRow[];
}

export async function listPlatforms(): Promise<PlatformRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("platforms").select("*").order("sort_order");
  if (error) throw error;
  return data as PlatformRow[];
}

export async function listTags(): Promise<TagRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) throw error;
  return data as TagRow[];
}

export interface ListTechnologiesParams {
  purposeSlug?: string | null;
  roleSlug?: string | null;
  search?: string;
  difficulty?: Difficulty[];
  cost?: Cost[];
  learningPeriod?: LearningPeriod[];
  japaneseDocs?: JapaneseDocs[];
  popularity?: Popularity[];
  platformSlugs?: string[];
  page?: number;
  pageSize?: number;
}

export interface ListTechnologiesResult {
  rows: TechnologySummary[];
  total: number;
}

function sanitizeSearchTerm(term: string): string {
  // PostgRESTの.or()はカンマ区切り構文のため、構文を壊しうる文字は空白に置き換える。
  return term.replace(/[%,()]/g, " ").trim();
}

/**
 * ジャンクションテーブル経由の絞り込み(目的/役割/対応環境)は、
 * `!inner`埋め込みだと親行が重複するため、先にidの集合だけを取得してJS側で積集合を取る。
 */
async function technologyIdsMatching(
  junctionTable: "technology_purposes" | "technology_roles" | "technology_platforms",
  fkColumn: "purpose_id" | "role_id" | "platform_id",
  lookupTable: "purposes" | "roles" | "platforms",
  slugs: string[]
): Promise<string[]> {
  const supabase = createClient();
  const { data: lookupRows, error: lookupError } = await supabase
    .from(lookupTable)
    .select("id")
    .in("slug", slugs);
  if (lookupError) throw lookupError;
  const lookupIds = (lookupRows ?? []).map((r) => r.id as string);
  if (!lookupIds.length) return [];

  const { data: junctionRows, error: junctionError } = await supabase
    .from(junctionTable)
    .select("technology_id")
    .in(fkColumn, lookupIds);
  if (junctionError) throw junctionError;
  return [...new Set((junctionRows ?? []).map((r) => r.technology_id as string))];
}

/** null=絞り込みなし。空配列=絞り込みの結果0件(短絡させるため)。 */
function intersectIdSets(sets: string[][]): string[] | null {
  if (!sets.length) return null;
  return sets.reduce((acc, cur) => acc.filter((id) => cur.includes(id)));
}

export async function listTechnologies(
  params: ListTechnologiesParams = {}
): Promise<ListTechnologiesResult> {
  const {
    purposeSlug,
    roleSlug,
    search,
    difficulty = [],
    cost = [],
    learningPeriod = [],
    japaneseDocs = [],
    popularity = [],
    platformSlugs = [],
    page = 1,
    pageSize = TECH_PAGE_SIZE,
  } = params;

  const idSets: string[][] = [];
  if (purposeSlug) {
    idSets.push(await technologyIdsMatching("technology_purposes", "purpose_id", "purposes", [purposeSlug]));
  }
  if (roleSlug) {
    idSets.push(await technologyIdsMatching("technology_roles", "role_id", "roles", [roleSlug]));
  }
  if (platformSlugs.length) {
    idSets.push(
      await technologyIdsMatching("technology_platforms", "platform_id", "platforms", platformSlugs)
    );
  }
  const intersectedIds = intersectIdSets(idSets);
  if (intersectedIds !== null && intersectedIds.length === 0) {
    return { rows: [], total: 0 };
  }

  const supabase = createClient();
  let query = supabase
    .from("technologies")
    .select(
      `*,
      technology_platforms(platforms(slug, name)),
      technology_relations!technology_relations_technology_id_fkey(
        related:technologies!technology_relations_related_technology_id_fkey(slug, name)
      )`,
      { count: "exact" }
    );

  if (intersectedIds !== null) query = query.in("id", intersectedIds);
  if (search?.trim()) {
    const term = sanitizeSearchTerm(search);
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (difficulty.length) query = query.in("difficulty", difficulty);
  if (cost.length) query = query.in("cost", cost);
  if (learningPeriod.length) query = query.in("learning_period", learningPeriod);
  if (japaneseDocs.length) query = query.in("japanese_docs", japaneseDocs);
  if (popularity.length) query = query.in("popularity", popularity);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query
    .order("recommendation_score", { ascending: false, nullsFirst: false })
    .order("name")
    .range(from, to);
  if (error) throw error;

  type RawRow = TechnologyRow & {
    technology_platforms: { platforms: Pick<PlatformRow, "slug" | "name"> | null }[] | null;
    technology_relations: { related: RelatedTechnologySummary | null }[] | null;
  };

  const rows: TechnologySummary[] = ((data ?? []) as unknown as RawRow[]).map((row) => ({
    ...row,
    platforms: (row.technology_platforms ?? []).map((r) => r.platforms).filter((p): p is Pick<PlatformRow, "slug" | "name"> => !!p),
    relatedTechnologies: (row.technology_relations ?? [])
      .map((r) => r.related)
      .filter((t): t is RelatedTechnologySummary => !!t),
  }));

  return { rows, total: count ?? 0 };
}

export async function getTechnologyBySlug(slug: string): Promise<TechnologyDetail | null> {
  const supabase = createClient();
  const { data: tech, error } = await supabase
    .from("technologies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!tech) return null;

  const technologyId = (tech as TechnologyRow).id;

  const [purposesRes, rolesRes, platformsRes, tagsRes, outgoingRes, incomingRes, resourcesRes] =
    await Promise.all([
      supabase.from("technology_purposes").select("purposes(*)").eq("technology_id", technologyId),
      supabase.from("technology_roles").select("roles(*)").eq("technology_id", technologyId),
      supabase.from("technology_platforms").select("platforms(*)").eq("technology_id", technologyId),
      supabase.from("technology_tags").select("tags(*)").eq("technology_id", technologyId),
      supabase
        .from("technology_relations")
        .select(
          "relation_type, note, technology:technologies!technology_relations_related_technology_id_fkey(id, slug, name, logo_url, difficulty)"
        )
        .eq("technology_id", technologyId),
      supabase
        .from("technology_relations")
        .select(
          "relation_type, note, technology:technologies!technology_relations_technology_id_fkey(id, slug, name, logo_url, difficulty)"
        )
        .eq("related_technology_id", technologyId),
      supabase
        .from("learning_resources")
        .select("*")
        .eq("technology_id", technologyId)
        .order("sort_order"),
    ]);

  for (const res of [purposesRes, rolesRes, platformsRes, tagsRes, outgoingRes, incomingRes, resourcesRes]) {
    if (res.error) throw res.error;
  }

  type RelationJoinRow = {
    relation_type: RelationType;
    note: string | null;
    technology: RelatedTechnology["technology"] | null;
  };

  const relationsMap = new Map<string, RelatedTechnology>();
  for (const r of [
    ...((outgoingRes.data ?? []) as unknown as RelationJoinRow[]),
    ...((incomingRes.data ?? []) as unknown as RelationJoinRow[]),
  ]) {
    if (!r.technology) continue;
    relationsMap.set(r.technology.id, {
      relation_type: r.relation_type,
      note: r.note,
      technology: r.technology,
    });
  }

  return {
    ...(tech as TechnologyRow),
    purposes: ((purposesRes.data ?? []) as unknown as { purposes: PurposeRow | null }[])
      .map((r) => r.purposes)
      .filter((p): p is PurposeRow => !!p),
    roles: ((rolesRes.data ?? []) as unknown as { roles: RoleRow | null }[])
      .map((r) => r.roles)
      .filter((r): r is RoleRow => !!r),
    platforms: ((platformsRes.data ?? []) as unknown as { platforms: PlatformRow | null }[])
      .map((r) => r.platforms)
      .filter((p): p is PlatformRow => !!p),
    tags: ((tagsRes.data ?? []) as unknown as { tags: TagRow | null }[])
      .map((r) => r.tags)
      .filter((t): t is TagRow => !!t),
    relations: [...relationsMap.values()],
    learningResources: (resourcesRes.data ?? []) as LearningResourceRow[],
  };
}
