import { PlanWorkspace } from "@/components/plan/plan-workspace";

export default function PlanPage() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">① 企画書 × 技術選定</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        企画書を入力し、AIとの対話を通じて最適な技術スタックを提案してもらいましょう。
      </p>
      <div className="mt-6">
        <PlanWorkspace />
      </div>
    </div>
  );
}
