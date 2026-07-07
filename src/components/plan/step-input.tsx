"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function StepInput({
  planText,
  onChangePlanText,
  onNext,
}: {
  planText: string;
  onChangePlanText: (text: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">作りたいものを教えてください</h2>
      <div className="relative">
        <Textarea
          value={planText}
          onChange={(e) => onChangePlanText(e.target.value)}
          placeholder='例: 大学の授業の空きコマを友人同士で共有し、「今から一緒に作業しない?」と誘い合えるマッチングアプリを作りたい…'
          rows={10}
          className="resize-none rounded-2xl border-2 p-5 text-base"
          style={{ borderColor: "var(--brand-blue)" }}
        />
        <Button
          size="lg"
          onClick={onNext}
          disabled={!planText.trim()}
          className="absolute -bottom-4 right-4 rounded-full text-white"
          style={{ background: "linear-gradient(90deg, var(--brand-blue), var(--brand-pink))" }}
        >
          AIヒアリングへ→
        </Button>
      </div>
    </div>
  );
}
