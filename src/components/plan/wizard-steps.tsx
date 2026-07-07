"use client";

import { BookOpen, Ear, Lightbulb, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanStep } from "@/lib/store/project-store";

const STEPS: { step: PlanStep; icon: typeof BookOpen; label: string }[] = [
  { step: 1, icon: BookOpen, label: "作りたいものを入力" },
  { step: 2, icon: Ear, label: "AIヒアリング" },
  { step: 3, icon: Lightbulb, label: "技術スタックの提案" },
  { step: 4, icon: MessageSquare, label: "技術スタックの解説" },
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
  return (
    <div className="flex">
      {STEPS.map(({ step, icon: Icon, label }, i) => {
        const active = step === current;
        const reachable = step <= maxReached;
        return (
          <button
            key={step}
            type="button"
            title={label}
            aria-label={label}
            aria-current={active ? "step" : undefined}
            disabled={!reachable}
            onClick={() => reachable && onSelect(step)}
            className={cn(
              "relative flex h-12 w-20 items-center justify-center border text-foreground transition-colors",
              i > 0 && "-ml-2.5",
              reachable ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-40",
              active ? "z-10 border-2" : "border-foreground/70 bg-background"
            )}
            style={{
              clipPath: "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%, 18% 50%)",
              borderColor: active ? "var(--brand-blue)" : undefined,
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
