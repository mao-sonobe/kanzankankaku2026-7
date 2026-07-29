import { MapWorkspace } from "@/components/map/map-workspace";

export default function MapPage() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">習得マップ</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        開発を通して学んだ技術が、Web開発の全体像のどこに位置するか。あなたが「得た」場所が残ります。
      </p>
      <div className="mt-6">
        <MapWorkspace />
      </div>
    </div>
  );
}
