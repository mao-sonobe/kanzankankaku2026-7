import { Suspense } from "react";
import { SearchPage } from "@/components/tech/search-page";

export default function TechPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">技術辞書</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        作りたいものから技術を探し、特徴を比較して、組み合わせを検討できます。
      </p>
      <div className="mt-6">
        <Suspense fallback={null}>
          <SearchPage />
        </Suspense>
      </div>
    </div>
  );
}
