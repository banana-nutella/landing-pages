import Link from "next/link";

const LINKS = [
  ["/admin", "Dashboard"],
  ["/admin/sparks", "Sparks"],
  ["/admin/lab", "Test lab"],
  ["/admin/emails", "Emails"],
];

export function AdminNav({ active }: { active: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {LINKS.map(([href, label]) => (
        <Link
          key={href} href={href}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${active === href ? "bg-stone-900 text-white" : "bg-white ring-1 ring-stone-300"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
