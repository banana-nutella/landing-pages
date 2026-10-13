"use client";
import { useEffect } from "react";
import { fastMode, track } from "@/lib/client";

/** Logs a page-view style event once. */
export function TrackView({ name }: { name: "landing_view" }) {
  useEffect(() => { fastMode(); track(name); }, [name]);
  return null;
}

/** Keeps ?src=... (and ?fast=...) when moving from the landing page into a path. */
export function KeepParamsLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={href} className={className}
      onClick={(e) => {
        const qs = location.search;
        if (qs) { e.preventDefault(); location.href = href + qs; }
      }}
    >
      {children}
    </a>
  );
}
