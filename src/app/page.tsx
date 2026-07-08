import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ②アウトプット(コード生成)は青、③インプット(コード理解)は赤紫でロゴの配色を踏襲する。
// ①は両者をつなぐ準備段階なのでアクセントなし。
const STEPS = [
  {
    number: "01",
    title: "企画書 × 技術選定",
    description:
      "作りたいものを自然文で入力すると、AIとの対話を通じて最適な技術スタックが提案されます。企画書のフレーズと技術要素の関係をグラフで可視化し、「なぜこの技術が必要か」が一目でわかります。",
    href: "/plan",
    accent: undefined,
  },
  {
    number: "02",
    title: "コード生成 × ライブプレビュー",
    description:
      "確定した技術スタックをもとに、AIが実際に動くNext.jsプロジェクト一式を生成。ブラウザ内(WebContainers)で即座に起動し、その場でプレビューできます。",
    href: "/build",
    accent: "var(--brand-blue)",
  },
  {
    number: "03",
    title: "ブロック穴埋めで理解する",
    description:
      "生成されたコードは意味のある単位の「ブロック」に分解されます。正しいブロックを選んで空欄を埋めるたびに、プレビューがその場で変化。手を動かしながらコードを理解できます。",
    href: "/learn",
    accent: "var(--brand-pink)",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <Image src="/logo-icon.png" alt="" width={72} height={72} priority />
        <p className="text-sm font-medium text-muted-foreground">
          アウトプットがインプットになる開発学習アプリ
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          作りたいものを作る過程が、
          <br />
          最高の学習教材になる。
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          AIに技術スタックを提案されても、それが何をしているか分からないまま——を終わりに。
          企画書からコード生成、そして手を動かす穴埋め学習まで、ひとつの流れで技術を理解します。
        </p>
        <div className="flex gap-3 pt-4">
          <Button size="lg" nativeButton={false} render={<Link href="/plan" />}>
            はじめる
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/settings" />}
          >
            AI設定を確認する
          </Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-3">
        {STEPS.map((step) => (
          <Link key={step.href} href={step.href} className="group">
            <Card
              className="h-full border-t-2 transition-colors group-hover:border-primary"
              style={{ borderTopColor: step.accent ?? "var(--border)" }}
            >
              <CardHeader>
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: step.accent ?? undefined }}
                >
                  {step.number}
                </span>
                <CardTitle>{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {step.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
