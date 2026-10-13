# Spark

Catch someone at the moment they feel inspired, turn it into one tiny action, and follow up so they don't quit after one try.

## Pages

| Address | What it is |
|---|---|
| `/` | Landing page with two choices (no signup) |
| `/start` | Path A: "I just got inspired" (bring your own spark) |
| `/s` | Path B: "Give me a spark" (opens a random active spark) |
| `/s/[link]?src=tiktok-ad1` | Opens a specific spark. **Use this in ads.** `src` is the traffic source shown in the stats |
| `/p/[private link]` | A person's own plan page (the link in their emails) |
| `/me` | "Email me my link" for people who lost their plan link |
| `/admin` | Password-protected: funnel, sparks editor, test lab, sent emails |

## Editing sparks

Go to `/admin` → **Sparks**. Add, edit, hide or delete sparks there. No code changes needed. Each spark shows the exact link to use in an ad.
Video sparks take a normal YouTube, YouTube Shorts, Vimeo or TikTok link.

## The nag ladder

| When | Email |
|---|---|
| The time they picked | Reminder that quotes their own plan |
| 2 days later, if they haven't done it | "No big deal", plus a 1-minute version |
| 5 days later, if still not | Fresh-start offer for next Monday or the 1st of the month (whichever comes first) |
| 8 days later, if still not | "Pause, or keep going?", then emails stop |

When they do it, the ladder starts over with a reminder at the same time the next day. Never more than one email a day.
Every email has **I did it**, **Make it smaller**, **Pause** and **Unsubscribe**.

**Timing on the free Vercel plan:** cron jobs can only run once a day there, so the app uses 24 daily jobs, one per hour.
Reminders go out within about an hour of the chosen time. Upgrading to Vercel Pro makes them minute-accurate (you'd then change `vercel.json` to one job running every 5 minutes).

## Trying the whole ladder quickly (dev mode)

- `/admin` → **Test lab**: create a test plan with your email. One "day" is 2 minutes, and the page runs the email checker every 20 seconds while it's open. The whole ladder takes about 20 minutes.
- Or open the real app with `?fast=1` (for example `/?fast=1`). The timer becomes 10 seconds and a day becomes 2 minutes. `?fast=0` turns it off.
- `/admin` → **Test & demo data** → **+ Add demo data** fills the dashboard with fake people so you can see how it reads.
- Test and demo data never mixes with real stats, and **Delete all test data** removes it.

## Events logged

`landing_view`, `spark_viewed`, `spark_submitted`, `plan_set`, `timer_done`, `did_it_yes`, `nag_sent`, `nag_clicked`, `returned_after_nag`. Each event includes entry path, spark and source.

- `spark_viewed`: path B saw a spark; path A opened the "what inspired you?" screen.
- `spark_submitted`: path A submitted their own spark; path B accepted the spark by writing their tiny action.
- `returned_after_nag`: the first click from an email that brings them back (not counting pause or unsubscribe).

## For developers

Next.js 16 + Tailwind 4, Neon Postgres (tables are created automatically on first run), Resend, Vercel Cron.
Without `DATABASE_URL` the app uses an in-memory Postgres (PGlite) for demos and local work. See `.env.example`.

```
npm install
npm run dev            # http://localhost:3000
npm run test:ladder    # automated nag-ladder test
```
