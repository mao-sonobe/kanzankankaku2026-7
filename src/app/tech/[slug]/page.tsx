import { TechnologyDetail } from "@/components/tech/technology-detail";

export default async function TechDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <TechnologyDetail slug={slug} />
    </div>
  );
}
