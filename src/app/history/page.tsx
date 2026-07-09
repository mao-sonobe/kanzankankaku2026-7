import { HistoryWorkspace } from "@/components/history/history-workspace";

export default function HistoryPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">ヒアリング履歴</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        過去に行ったヒアリングの内容をいつでも見返せます。
      </p>
      <HistoryWorkspace />
    </div>
  );
}
