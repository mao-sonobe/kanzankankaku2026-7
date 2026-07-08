import { LearnWorkspace } from "@/components/learn/learn-workspace";

export default function LearnPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">③ コード理解: データの流れを読んで、穴埋めで再入力</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        まず①で選んだ技術の間をデータがどこで受け渡されているかを読み、次にそのコア部分を穴埋めして定着させましょう。
      </p>
      <div className="mt-6">
        <LearnWorkspace />
      </div>
    </div>
  );
}
