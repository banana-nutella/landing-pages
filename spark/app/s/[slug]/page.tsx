import { notFound } from "next/navigation";
import { Flow } from "@/components/Flow";
import { SparkCard, type Spark } from "@/components/SparkCard";
import { Shell } from "@/components/ui";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getSpark(slug: string) {
  return q1<Spark>(`select id, slug, title, type, content from sparks where slug=$1`, [slug]);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const spark = await getSpark((await params).slug);
  return { title: spark ? `${spark.title} · Spark` : "Spark" };
}

// Ads and videos link straight here: /s/[slug]?src=tiktok-ad1
export default async function SparkPage({ params }: { params: Promise<{ slug: string }> }) {
  const spark = await getSpark((await params).slug);
  if (!spark) notFound();
  return (
    <Shell>
      <Flow path="B" spark={{ id: spark.id }}>
        <SparkCard spark={spark} />
      </Flow>
    </Shell>
  );
}
