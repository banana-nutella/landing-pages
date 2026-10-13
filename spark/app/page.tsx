import Link from "next/link";
import { KeepParamsLink, TrackView } from "@/components/Track";
import { Shell } from "@/components/ui";

export default function Landing() {
  return (
    <Shell>
      <TrackView name="landing_view" />
      <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-tight">
        Feeling inspired? <span className="text-orange-600">Use it before it fades.</span>
      </h1>
      <p className="mt-3 text-lg text-stone-600">
        Turn that spark into one tiny action, do it in the next 10 minutes, and get a gentle nudge so it sticks.
      </p>

      <div className="mt-7 grid gap-4">
        <KeepParamsLink
          href="/start"
          className="block rounded-2xl bg-orange-600 p-5 text-white shadow-sm transition hover:bg-orange-700 active:scale-[.99]"
        >
          <span className="text-xl font-extrabold">✦ I just got inspired</span>
          <span className="mt-1 block text-orange-100">Bring your own spark: a link, a video, a thought.</span>
        </KeepParamsLink>
        <KeepParamsLink
          href="/s"
          className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-orange-200 transition hover:bg-orange-50 active:scale-[.99]"
        >
          <span className="text-xl font-extrabold">⚡ Give me a spark</span>
          <span className="mt-1 block text-stone-600">A 30-second nudge, then one tiny step.</span>
        </KeepParamsLink>
      </div>

      <p className="mt-6 text-center text-sm text-stone-500">No signup. Takes about two minutes.</p>
      <p className="mt-10 text-center text-sm text-stone-500">
        Already made a plan? <Link href="/me" className="underline underline-offset-4">Get your link</Link>
      </p>
    </Shell>
  );
}
