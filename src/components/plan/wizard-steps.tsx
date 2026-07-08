"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Ear, FileCode2, Lightbulb, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanStep } from "@/lib/store/project-store";

// ①企画チャット ②カードクイズ ③パイプライン学習 ④コード生成(/build) ⑤コード理解(/learn)
const STEPS: {
  icon: typeof BookOpen;
  label: string;
  planStep?: PlanStep;
  href?: string;
}[] = [
  { icon: Ear, label: "企画チャット", planStep: 1 },
  { icon: BookOpen, label: "技術クイズ", planStep: 2 },
  { icon: MessageCircleQuestion, label: "パイプライン学習", planStep: 3 },
  { icon: FileCode2, label: "コード生成", href: "/build" },
  { icon: Lightbulb, label: "コード理解", href: "/learn" },
];

export function WizardSteps({
  current,
  maxReached,
  onSelect,
}: {
  current: PlanStep;
  maxReached: PlanStep;
  onSelect: (step: PlanStep) => void;
}) {
  const router = useRouter();
  return (
    <div className="flex">
      {STEPS.map(({ icon: Icon, label, planStep, href }, i) => {
        const active = planStep !== undefined && planStep === current;
        const reachable = planStep !== undefined ? planStep <= maxReached : maxReached >= 3;
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
              if (planStep !== undefined) onSelect(planStep);
              else if (href) router.push(href);
            }}
            className={cn(
              "relative flex h-12 w-20 items-center justify-center border text-foreground transition-colors",
              i > 0 && "-ml-2.5",
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
            <Icon className="size-5" style={active ? { color: "var(--brand-pink)" } : undefined} />
          </button>
        );
      })}
    </div>
  );
}
