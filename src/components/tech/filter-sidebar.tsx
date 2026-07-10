"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  COST_LABEL,
  COST_VALUES,
  type Cost,
  DIFFICULTY_LABEL,
  DIFFICULTY_VALUES,
  type Difficulty,
  JAPANESE_DOCS_LABEL,
  JAPANESE_DOCS_VALUES,
  type JapaneseDocs,
  LEARNING_PERIOD_LABEL,
  LEARNING_PERIOD_VALUES,
  type LearningPeriod,
  POPULARITY_LABEL,
  POPULARITY_VALUES,
  type Popularity,
} from "@/lib/domain/technology-labels";
import type { PlatformRow } from "@/lib/supabase/technologies";

export interface FilterValue {
  difficulty: Difficulty[];
  cost: Cost[];
  learningPeriod: LearningPeriod[];
  japaneseDocs: JapaneseDocs[];
  popularity: Popularity[];
  platformSlugs: string[];
}

const EMPTY_FILTERS: FilterValue = {
  difficulty: [],
  cost: [],
  learningPeriod: [],
  japaneseDocs: [],
  popularity: [],
  platformSlugs: [],
};

function CheckboxGroup<T extends string>({
  title,
  values,
  labels,
  selected,
  onToggle,
}: {
  title: string;
  values: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onToggle: (value: T, checked: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="space-y-1.5">
        {values.map((v) => (
          <label key={v} className="flex items-center gap-2 text-sm">
            <Checkbox checked={selected.includes(v)} onCheckedChange={(checked) => onToggle(v, checked)} />
            {labels[v]}
          </label>
        ))}
      </div>
    </div>
  );
}

function FilterGroups({
  value,
  platforms,
  onChange,
}: {
  value: FilterValue;
  platforms: PlatformRow[];
  onChange: (patch: Partial<FilterValue>) => void;
}) {
  function toggle<K extends keyof FilterValue>(key: K, item: string, checked: boolean) {
    const current = value[key] as string[];
    const next = checked ? [...current, item] : current.filter((v) => v !== item);
    onChange({ [key]: next } as Partial<FilterValue>);
  }

  return (
    <div className="space-y-6">
      <CheckboxGroup
        title="難易度"
        values={DIFFICULTY_VALUES}
        labels={DIFFICULTY_LABEL}
        selected={value.difficulty}
        onToggle={(v, c) => toggle("difficulty", v, c)}
      />
      <CheckboxGroup
        title="費用"
        values={COST_VALUES}
        labels={COST_LABEL}
        selected={value.cost}
        onToggle={(v, c) => toggle("cost", v, c)}
      />
      <CheckboxGroup
        title="学習期間"
        values={LEARNING_PERIOD_VALUES}
        labels={LEARNING_PERIOD_LABEL}
        selected={value.learningPeriod}
        onToggle={(v, c) => toggle("learningPeriod", v, c)}
      />
      <CheckboxGroup
        title="日本語情報量"
        values={JAPANESE_DOCS_VALUES}
        labels={JAPANESE_DOCS_LABEL}
        selected={value.japaneseDocs}
        onToggle={(v, c) => toggle("japaneseDocs", v, c)}
      />
      <CheckboxGroup
        title="人気度"
        values={POPULARITY_VALUES}
        labels={POPULARITY_LABEL}
        selected={value.popularity}
        onToggle={(v, c) => toggle("popularity", v, c)}
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">対応環境</p>
        <div className="space-y-1.5">
          {platforms.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.platformSlugs.includes(p.slug)}
                onCheckedChange={(checked) => toggle("platformSlugs", p.slug, checked)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FilterSidebar({
  value,
  platforms,
  onChange,
}: {
  value: FilterValue;
  platforms: PlatformRow[];
  onChange: (patch: Partial<FilterValue>) => void;
}) {
  const activeCount = Object.values(value).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <>
      <aside className="hidden w-56 flex-none lg:block">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">絞り込み</p>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
              クリア
            </Button>
          )}
        </div>
        <div className="mt-4">
          <FilterGroups value={value} platforms={platforms} onChange={onChange} />
        </div>
      </aside>

      <div className="lg:hidden">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <SlidersHorizontal className="size-4" />
            絞り込み{activeCount > 0 ? `(${activeCount})` : ""}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>絞り込み</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <FilterGroups value={value} platforms={platforms} onChange={onChange} />
            </div>
            {activeCount > 0 && (
              <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
                クリア
              </Button>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
