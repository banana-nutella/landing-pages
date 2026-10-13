import { toEmbed } from "@/lib/embed";

export type Spark = { id: number; slug: string; title: string; type: string; content: string };

export function SparkCard({ spark }: { spark: Spark }) {
  if (spark.type === "video") {
    const { src, vertical } = toEmbed(spark.content);
    return (
      <div className="overflow-hidden rounded-2xl bg-black shadow-sm">
        <div className={`relative mx-auto w-full ${vertical ? "aspect-[9/16] max-h-[70dvh]" : "aspect-video"}`}>
          <iframe
            src={src}
            title={spark.title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <p className="bg-white px-4 py-3 font-semibold">{spark.title}</p>
      </div>
    );
  }
  return (
    <article className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white shadow-sm">
      <h1 className="text-2xl font-extrabold leading-tight">{spark.title}</h1>
      <div className="mt-4 space-y-3 text-[17px] leading-relaxed text-orange-50">
        {spark.content.split(/\n\s*\n/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
