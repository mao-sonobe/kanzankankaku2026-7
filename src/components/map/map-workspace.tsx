"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechIcon } from "@/components/ui/tech-icon";
import { useProjectStore } from "@/lib/store/project-store";
import { CATEGORY_COLORS } from "@/lib/domain/stack-colors";
import {
  deriveSkillMap,
  SKILL_LEVEL_LABEL,
  type AcquiredSkill,
} from "@/lib/domain/skill-map";
import { cn } from "@/lib/utils";

/** 習得段階の見た目(Duolingo的な段階表示)。 */
function AcquiredChip({ skill, categoryDot }: { skill: AcquiredSkill; categoryDot: string }) {
  const mastered = skill.level === "mastered";
  const attempted = skill.level === "attempted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        mastered
          ? "border-transparent bg-pink-500 text-white shadow-sm"
          : attempted
            ? "border-pink-300 bg-pink-50 text-pink-900"
            : "border-slate-200 bg-white text-slate-600"
      )}
      title={`${skill.label}: ${SKILL_LEVEL_LABEL[skill.level]}`}
    >
      {mastered ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : (
        <span className={cn("size-1.5 rounded-full", categoryDot)} />
      )}
      <TechIcon name={skill.label} size={13} />
      {skill.label}
    </span>
  );
}

export function MapWorkspace() {
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const stackQuiz = useProjectStore((s) => s.stackQuiz);
  const hasHydrated = useProjectStore((s) => s.hasHydrated);

  const map = useMemo(
    () => deriveSkillMap(stackProposal, stackQuiz),
    [stackProposal, stackQuiz]
  );

  if (!hasHydrated) return null;

  if (!stackProposal || map.encounteredCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>まだ地図に印がありません</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            企画から技術クイズまで進めると、学んだ技術がこの全体像に配置され、
            「どこを得たか」が残ります。
          </p>
          <Button nativeButton={false} render={<Link href="/plan" />}>
            企画をはじめる
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 全体の到達度 */}
      <div className="rounded-2xl border-2 p-5" style={{ borderColor: "var(--brand-pink)" }}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">あなたが得た技術の全体像</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              習得 {map.masteredCount} / 出会った {map.encounteredCount} 技術
            </p>
          </div>
          <span
            className="text-3xl font-bold"
            style={{ color: "var(--brand-pink)" }}
          >
            {map.progress}%
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${map.progress}%`,
              background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))",
            }}
          />
        </div>
      </div>

      {/* カテゴリごとの地図 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {map.categories.map((cat) => {
          const c = CATEGORY_COLORS[cat.category];
          return (
            <Card key={cat.category} className={cn("border-l-4", c.border)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={cn("size-2.5 rounded-full", c.dot)} />
                  {cat.label}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    習得 {cat.masteredCount}/{cat.total}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cat.acquired.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {cat.acquired.map((s) => (
                      <AcquiredChip key={s.id} skill={s} categoryDot={c.dot} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">この分野はまだ未踏です。</p>
                )}

                {cat.canonical.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold text-slate-400">
                      全体像の目安（これから）
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {cat.canonical.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-dashed border-slate-200 px-2 py-0.5 text-[11px] text-slate-400"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-pink-500 text-white">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          習得（クイズ正解）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-full border border-pink-300 bg-pink-50 px-2 py-0.5 text-pink-900">
            もう一歩
          </span>
          誤答した
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
            出会った
          </span>
          未回答/開示
        </span>
      </div>
    </div>
  );
}
