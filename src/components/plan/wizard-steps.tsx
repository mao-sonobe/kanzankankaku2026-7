"use client";

import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Ear, FileCode2, Lightbulb, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore, type PlanStep } from "@/lib/store/project-store";

// ①企画チャット ②カードクイズ ③配線パズル ④コード生成(/build) ⑤コード理解(/learn)
// この番号がアプリ全体で唯一の「現在地」表示。各ページの見出しには重複して番号を書かない。
const STEPS: {
  icon: typeof BookOpen;
  label: string;
  planStep?: PlanStep;
  href?: string;
}[] = [
  { icon: Ear, label: "企画チャット", planStep: 1 },
  { icon: BookOpen, label: "技術クイズ", planStep: 2 },
  { icon: Waypoints, label: "配線パズル", planStep: 3 },
  { icon: FileCode2, label: "コード生成", href: "/build" },
  { icon: Lightbulb, label: "コード理解", href: "/learn" },
];

/**
 * ヘッダー中央に置く進捗シェブロン。plan配下ではストアのplanStepで、
 * /build・/learnではpathnameで現在地を判定する。
 */
export function WizardSteps() {
  const router = useRouter();
  const pathname = usePathname();
  const planStep = useProjectStore((s) => s.planStep);
  const stackProposal = useProjectStore((s) => s.stackProposal);
  const generatedFiles = useProjectStore((s) => s.generatedFiles);

  const onPlan = pathname === "/plan";
  const maxPlanReached: PlanStep = stackProposal ? 3 : 1;
  const hasCode = generatedFiles.length > 0;

  function isActive(planStepOf?: PlanStep, href?: string): boolean {
    if (href) return pathname === href;
    if (!onPlan) return false;
    return planStepOf === planStep;
  }

  function isReachable(planStepOf?: PlanStep, href?: string): boolean {
    if (planStepOf !== undefined) return planStepOf <= maxPlanReached;
    if (href === "/build") return !!stackProposal;
    if (href === "/learn") return hasCode;
    return false;
  }

  return (
    <div className="flex">
      {STEPS.map(({ icon: Icon, label, planStep: ps, href }, i) => {
        const active = isActive(ps, href);
        const reachable = isReachable(ps, href);
        return (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            aria-current={active ? "step" : undefined}
            disabled={!reachable}
            onClick={() => {
              if (!reachable) return;
              if (ps !== undefined) {
                if (onPlan) useProjectStore.getState().setPlanStep(ps);
                else router.push("/plan");
              } else if (href) {
                router.push(href);
              }
            }}
            className={cn(
              "relative flex h-11 w-16 items-center justify-center border text-foreground transition-colors",
              i > 0 && "-ml-2",
              reachable ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-40",
              active ? "z-10 border-2" : "border-foreground/70 bg-background"
            )}
            style={{
              clipPath: "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%, 18% 50%)",
              borderColor: active ? "var(--brand-pink)" : undefined,
              background: active
                ? "linear-gradient(90deg, color-mix(in oklab, var(--brand-blue) 15%, white), color-mix(in oklab, var(--brand-pink) 15%, white))"
                : undefined,
            }}
          >
            <span
              className={cn(
                "absolute top-0.5 left-2 font-mono text-[10px] leading-none",
                active ? "font-semibold" : "opacity-60"
              )}
              style={active ? { color: "var(--brand-pink)" } : undefined}
            >
              {i + 1}
            </span>
            <Icon className="size-5" style={active ? { color: "var(--brand-pink)" } : undefined} />
          </button>
        );
      })}
    </div>
  );
}
