import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlanPage() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">① 企画書 × 技術選定</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        企画書を入力すると、AIとの対話を通じて技術スタックが提案されます。（Phase 1で実装予定）
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>準備中</CardTitle>
          <CardDescription>このページはPhase 1で実装します。</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
