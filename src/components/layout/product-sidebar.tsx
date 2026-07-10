"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/lib/store/project-store";
import { useAuth } from "@/lib/supabase/use-auth";
import { getProduct, listProducts, type ProductSummary } from "@/lib/supabase/products";

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export function ProductSidebar() {
  const router = useRouter();
  const { user } = useAuth();
  const currentProductId = useProjectStore((s) => s.currentProductId);
  const startNewProduct = useProjectStore((s) => s.startNewProduct);
  const loadProduct = useProjectStore((s) => s.loadProduct);

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoadingList(true);
    try {
      const rows = await listProducts(user.id);
      setProducts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "履歴の取得に失敗しました");
    } finally {
      setIsLoadingList(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 保存(作成・更新)されるたびに一覧を更新できるよう、他コンポーネントからの合図を拾う。
  useEffect(() => {
    function handleSaved() {
      void refresh();
    }
    window.addEventListener("product-saved", handleSaved);
    return () => window.removeEventListener("product-saved", handleSaved);
  }, [refresh]);

  function handleNewProduct() {
    startNewProduct();
    router.push("/plan");
  }

  async function handleSelect(id: string) {
    if (id === currentProductId) return;
    setLoadingId(id);
    setError(null);
    try {
      const row = await getProduct(id);
      loadProduct({
        id: row.id,
        planStep: row.plan_step,
        planText: row.plan_text,
        projectTitle: row.project_title,
        hearingReady: row.hearing_ready,
        chatMessages: row.chat_messages,
        stackProposal: row.stack_proposal,
        stackQuiz: row.stack_quiz,
        stackQuizSkipped: row.stack_quiz_skipped,
        generatedFiles: row.generated_files,
        chunkedFiles: row.chunked_files,
        slotAnswers: row.slot_answers,
        featureMap: row.feature_map,
        featureFlows: row.feature_flows,
      });
      router.push(row.generated_files.length > 0 ? "/learn" : "/plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-[#eef1e2] dark:bg-[#2a2f22]">
      <div className="p-3">
        <button
          type="button"
          onClick={handleNewProduct}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-foreground/20 bg-background/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-background"
        >
          <Plus className="size-4" />
          新規プロダクト
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {isLoadingList && <p className="px-2 py-1 text-xs text-muted-foreground">読み込み中…</p>}
        {!isLoadingList && products.length === 0 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            まだプロダクトがありません。「新規プロダクト」から始めましょう。
          </p>
        )}
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => void handleSelect(p.id)}
            disabled={loadingId === p.id}
            className={cn(
              "w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors",
              p.id === currentProductId
                ? "bg-background font-medium"
                : "text-foreground/80 hover:bg-background/60"
            )}
          >
            <p className="truncate">{loadingId === p.id ? "読み込み中…" : p.title}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(p.updated_at)}</p>
          </button>
        ))}
        {error && <p className="px-2 py-1 text-xs text-destructive">{error}</p>}
      </div>
    </aside>
  );
}
