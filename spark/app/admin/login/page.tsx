import { LoginForm } from "./LoginForm";
import { Shell } from "@/components/ui";
import { adminConfigured } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Spark", robots: { index: false } };

export default function Login() {
  return (
    <Shell>
      <h1 className="text-2xl font-extrabold">Admin</h1>
      {adminConfigured() ? (
        <LoginForm />
      ) : (
        <p className="mt-3 rounded-xl bg-amber-50 p-4 text-amber-900">
          Admin is locked until an <code>ADMIN_PASSWORD</code> environment variable is set in Vercel.
        </p>
      )}
    </Shell>
  );
}
