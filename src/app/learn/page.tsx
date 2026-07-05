import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LearnPage() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">③ ブロック穴埋めでコード理解</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        生成されたコードをブロック単位で穴埋めしながら理解します。（Phase 3で実装予定）
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>準備中</CardTitle>
          <CardDescription>このページはPhase 3で実装します。</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
