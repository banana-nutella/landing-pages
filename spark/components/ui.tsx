import Link from "next/link";

export function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-md"} px-4 pb-16 pt-5`}>
      <Link href="/" className="inline-flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-orange-600">
        <span aria-hidden>✦</span> Spark
      </Link>
      <div className="mt-5">{children}</div>
    </main>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-orange-100 ${className}`}>{children}</div>;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "green" };

export function Button({ variant = "primary", className = "", ...props }: BtnProps) {
  const styles = {
    primary: "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 shadow-sm",
    green: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
    secondary: "bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-50",
    ghost: "text-stone-600 hover:text-stone-900 underline underline-offset-4",
  }[variant];
  return (
    <button
      {...props}
      className={`w-full rounded-xl px-5 py-3.5 text-base font-semibold transition disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

export function Celebrate({ title = "You did it.", children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div className="text-center animate-rise">
      <div className="animate-pop text-6xl" aria-hidden>🎉</div>
      <h2 className="mt-3 text-2xl font-extrabold">{title}</h2>
      <div className="mt-2 text-stone-600">{children}</div>
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 text-sm text-red-600">{children}</p>;
}
