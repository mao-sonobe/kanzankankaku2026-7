import { BuildWorkspace } from "@/components/build/build-workspace";

export default function BuildPage() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">④ コード生成 × ライブプレビュー</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        技術スタックに基づきAIがコードを生成し、WebContainers上でライブプレビューします。
      </p>
      <div className="mt-6">
        <BuildWorkspace />
      </div>
    </div>
  );
}
