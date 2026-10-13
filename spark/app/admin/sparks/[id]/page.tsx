import { notFound } from "next/navigation";
import { AdminNav } from "../../Nav";
import { deleteSpark } from "../../actions";
import { SparkForm } from "./SparkForm";
import { Shell } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit spark · Spark admin", robots: { index: false } };

export default async function EditSpark({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const spark = id === "new"
    ? { id: "", title: "", slug: "", type: "text", content: "", theme: "start the thing you've been putting off", active: true }
    : await q1<any>(`select * from sparks where id=$1`, [Number(id) || 0]);
  if (!spark) notFound();
  return (
    <Shell wide>
      <AdminNav active="/admin/sparks" />
      <h1 className="mb-4 text-2xl font-extrabold">{spark.id ? "Edit spark" : "New spark"}</h1>
      <SparkForm spark={{ ...spark, id: String(spark.id) }} />
      {spark.id && (
        <form action={deleteSpark} className="mt-10">
          <input type="hidden" name="id" value={spark.id} />
          <p className="text-sm text-stone-500">Tip: to stop showing a spark but keep its stats, untick &ldquo;Active&rdquo; instead of deleting.</p>
          <button className="mt-2 text-sm text-red-600 underline">Delete this spark</button>
        </form>
      )}
    </Shell>
  );
}
