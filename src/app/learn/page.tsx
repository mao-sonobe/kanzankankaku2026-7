import { LearnWorkspace } from "@/components/learn/learn-workspace";

export default function LearnPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">③ ブロック穴埋めでコード理解</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        生成されたコードをブロック単位で穴埋めしながら、動きを確かめつつ理解しましょう。
      </p>
      <div className="mt-6">
        <LearnWorkspace />
      </div>
    </div>
  );
}
