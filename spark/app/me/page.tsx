import { MagicLinkForm } from "@/components/MagicLinkForm";
import { Shell } from "@/components/ui";

export const metadata = { title: "Get your link · Spark" };

export default function Me() {
  return (
    <Shell>
      <h1 className="text-2xl font-extrabold">Get your link</h1>
      <p className="mt-1 text-stone-600">No passwords here. Enter your email and we&apos;ll send you a private link to your plans.</p>
      <MagicLinkForm />
    </Shell>
  );
}
