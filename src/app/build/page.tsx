import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BuildPage() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">② コード生成 × ライブプレビュー</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        技術スタックに基づきAIがコードを生成し、WebContainers上でライブプレビューします。（Phase
        2で実装予定）
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>準備中</CardTitle>
          <CardDescription>このページはPhase 2で実装します。</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
