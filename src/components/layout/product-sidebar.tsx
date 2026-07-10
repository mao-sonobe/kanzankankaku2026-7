"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/lib/store/project-store";
import { useAuth } from "@/lib/supabase/use-auth";
import {
  deleteProduct,
  getProduct,
  listProducts,
  renameProduct,
  type ProductSummary,
} from "@/lib/supabase/products";

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
  const setTitleIsCustom = useProjectStore((s) => s.setTitleIsCustom);

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

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
        titleIsCustom: row.title_is_custom,
      });
      router.push(row.generated_files.length > 0 ? "/learn" : "/plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoadingId(null);
    }
  }

  function handleRenameStart(p: ProductSummary) {
    setDeleteConfirmId(null);
    setRenamingId(p.id);
    setRenameValue(p.title);
    // メニューを閉じた直後にinputへフォーカスするため、次のtickで実行する。
    requestAnimationFrame(() => renameInputRef.current?.focus());
  }

  async function handleRenameConfirm(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, title } : p)));
    try {
      await renameProduct(id, title);
      if (id === currentProductId) setTitleIsCustom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "名前の変更に失敗しました");
      void refresh();
    }
  }

  async function handleDelete(id: string) {
    setDeleteConfirmId(null);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteProduct(id);
      if (id === currentProductId) {
        startNewProduct();
        router.push("/plan");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
      void refresh();
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
          <div key={p.id} className="group relative">
            {renamingId === p.id ? (
              <div className="rounded-md bg-background px-2.5 py-2">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleRenameConfirm(p.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={() => void handleRenameConfirm(p.id)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            ) : deleteConfirmId === p.id ? (
              <div className="space-y-1.5 rounded-md bg-background px-2.5 py-2">
                <p className="text-xs text-destructive">削除しますか?元に戻せません。</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleDelete(p.id)}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    削除する
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleSelect(p.id)}
                disabled={loadingId === p.id}
                className={cn(
                  "w-full rounded-md py-2 pr-8 pl-2.5 text-left text-sm transition-colors",
                  p.id === currentProductId
                    ? "bg-background font-medium"
                    : "text-foreground/80 hover:bg-background/60"
                )}
              >
                <p className="truncate">{loadingId === p.id ? "読み込み中…" : p.title}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(p.updated_at)}</p>
              </button>
            )}

            {renamingId !== p.id && deleteConfirmId !== p.id && (
              <Menu.Root>
                <Menu.Trigger
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/10 group-hover:opacity-100"
                >
                  <MoreVertical className="size-4" />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner side="bottom" align="end" sideOffset={4}>
                    <Menu.Popup className="min-w-32 rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
                      <Menu.Item
                        onClick={() => handleRenameStart(p)}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none data-[highlighted]:bg-muted"
                      >
                        <Pencil className="size-3.5" />
                        名前を変更
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-destructive outline-none data-[highlighted]:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                        削除
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            )}
          </div>
        ))}
        {error && <p className="px-2 py-1 text-xs text-destructive">{error}</p>}
      </div>
    </aside>
  );
}
