"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store/auth-store";
import { useProjectStore } from "@/lib/store/project-store";
import { deleteHearing, listHearings, renameHearing, type HearingRow } from "@/lib/supabase/hearings";

const PLAN_STEP_LABEL: Record<HearingRow["plan_step"], string> = {
  1: "企画チャット",
  2: "技術クイズ",
  3: "全体の技術フロー",
  4: "配線パズル",
};

function screenLabel(row: HearingRow): string {
  if (row.last_screen === "build") return "コード生成";
  if (row.last_screen === "learn") return "コード理解";
  return PLAN_STEP_LABEL[row.plan_step];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryWorkspace() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  const [rows, setRows] = useState<HearingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRows(null);
      return;
    }
    listHearings()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "履歴の取得に失敗しました"));
  }, [user]);

  function handleResume(row: HearingRow) {
    useProjectStore.getState().hydrateFromHearing(row);
    router.push(`/${row.last_screen}`);
  }

  function handleNewHearing() {
    useProjectStore.getState().resetProject();
    router.push("/plan");
  }

  function startRename(row: HearingRow) {
    setRenamingId(row.id);
    setRenameValue(row.title ?? "");
  }

  async function saveRename(id: string) {
    const title = renameValue.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }
    try {
      await renameHearing(id, title);
      setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, title } : r)) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "タイトルの更新に失敗しました");
    } finally {
      setRenamingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteHearing(id);
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? prev);
      if (useProjectStore.getState().currentHearingId === id) {
        useProjectStore.getState().setCurrentHearingId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setDeleteConfirmId(null);
    }
  }

  if (!initialized) {
    return null;
  }

  if (!user) {
    return (
      <Alert className="mt-6">
        <AlertTitle>ログインが必要です</AlertTitle>
        <AlertDescription>
          <Link href="/login" className="underline">
            ログイン
          </Link>
          すると、保存したヒアリング履歴がここに表示されます。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <Button onClick={handleNewHearing}>新しいヒアリングを始める</Button>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {rows === null && <p className="text-sm text-muted-foreground">読み込み中…</p>}

      {rows !== null && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">まだヒアリング履歴がありません。</p>
      )}

      {rows?.map((row) => (
        <Card key={row.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              {renamingId === row.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveRename(row.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                  />
                  <Button size="icon" variant="ghost" aria-label="保存" onClick={() => void saveRename(row.id)}>
                    <Check className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="キャンセル" onClick={() => setRenamingId(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleResume(row)}
                    className="flex-1 text-left"
                  >
                    <CardTitle>{row.title || "無題の企画"}</CardTitle>
                    <CardDescription>{formatDate(row.updated_at)}</CardDescription>
                  </button>
                  <Button size="icon" variant="ghost" aria-label="タイトルを編集" onClick={() => startRename(row)}>
                    <Pencil className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <Badge variant="outline">{screenLabel(row)}</Badge>

            {deleteConfirmId === row.id ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive">削除しますか?</span>
                <Button size="sm" variant="destructive" onClick={() => void handleDelete(row.id)}>
                  削除する
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(null)}>
                  キャンセル
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                aria-label="削除"
                onClick={() => setDeleteConfirmId(row.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
