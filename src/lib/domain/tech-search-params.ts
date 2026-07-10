import {
  type Cost,
  COST_VALUES,
  type Difficulty,
  DIFFICULTY_VALUES,
  type JapaneseDocs,
  JAPANESE_DOCS_VALUES,
  type LearningPeriod,
  LEARNING_PERIOD_VALUES,
  type Popularity,
  POPULARITY_VALUES,
} from "./technology-labels";

export const TECH_PAGE_SIZE = 12;

export interface TechSearchState {
  purposeSlug: string | null;
  roleSlug: string | null;
  q: string;
  difficulty: Difficulty[];
  cost: Cost[];
  learningPeriod: LearningPeriod[];
  japaneseDocs: JapaneseDocs[];
  popularity: Popularity[];
  platformSlugs: string[];
  page: number;
}

export const EMPTY_TECH_SEARCH_STATE: TechSearchState = {
  purposeSlug: null,
  roleSlug: null,
  q: "",
  difficulty: [],
  cost: [],
  learningPeriod: [],
  japaneseDocs: [],
  popularity: [],
  platformSlugs: [],
  page: 1,
};

function parseEnumList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  const allowedSet = new Set<string>(allowed);
  return raw.split(",").filter((v): v is T => allowedSet.has(v));
}

/** URLSearchParamsから検索状態を復元する(不正な値は無視して安全側に倒す)。 */
export function parseTechSearchParams(params: URLSearchParams): TechSearchState {
  return {
    purposeSlug: params.get("purpose"),
    roleSlug: params.get("role"),
    q: params.get("q") ?? "",
    difficulty: parseEnumList(params.get("difficulty"), DIFFICULTY_VALUES),
    cost: parseEnumList(params.get("cost"), COST_VALUES),
    learningPeriod: parseEnumList(params.get("period"), LEARNING_PERIOD_VALUES),
    japaneseDocs: parseEnumList(params.get("docs"), JAPANESE_DOCS_VALUES),
    popularity: parseEnumList(params.get("popularity"), POPULARITY_VALUES),
    platformSlugs: params.get("platforms")?.split(",").filter(Boolean) ?? [],
    page: Math.max(1, Math.trunc(Number(params.get("page"))) || 1),
  };
}

/** 検索状態をURLクエリ文字列(先頭`?`なし)に変換する。デフォルト値は省略する。 */
export function serializeTechSearchParams(state: TechSearchState): string {
  const params = new URLSearchParams();
  if (state.purposeSlug) params.set("purpose", state.purposeSlug);
  if (state.roleSlug) params.set("role", state.roleSlug);
  if (state.q) params.set("q", state.q);
  if (state.difficulty.length) params.set("difficulty", state.difficulty.join(","));
  if (state.cost.length) params.set("cost", state.cost.join(","));
  if (state.learningPeriod.length) params.set("period", state.learningPeriod.join(","));
  if (state.japaneseDocs.length) params.set("docs", state.japaneseDocs.join(","));
  if (state.popularity.length) params.set("popularity", state.popularity.join(","));
  if (state.platformSlugs.length) params.set("platforms", state.platformSlugs.join(","));
  if (state.page > 1) params.set("page", String(state.page));
  return params.toString();
}

/**
 * 現在の検索状態にpatchを重ねた新しい状態を返す。
 * page自体の変更以外(目的・役割・検索語・フィルター変更)は1ページ目に戻す。
 */
export function withTechSearchPatch(
  state: TechSearchState,
  patch: Partial<TechSearchState>
): TechSearchState {
  const next = { ...state, ...patch };
  if (!("page" in patch)) next.page = 1;
  return next;
}
