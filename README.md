# Landing page A/B test

Four versions of one landing page. Each tests a different pitch for the same app, and every visitor sees one of them. Each signup and unique visitor is saved to a Google Sheet, and `/stats` shows which pitch converts best.

| URL | What it does |
|---|---|
| `/` | Randomly sends each new visitor to A, B, C or D, and keeps them on it (cookie) |
| `/?v=b` | Forces variant B (works for a, b, c, d) |
| `/a` `/b` `/c` `/d` | The four variants directly |
| `/stats` | Password-protected results |

**Always share the root URL (`/`) in your posts and ads**, with UTM tags (see below). Only use `/a`, `/b`, etc. to preview a page.

---

## How to see signups

Open your Google Sheet (the one you connected during setup). It has two tabs:

- **Signups**: one row per signup, with email, variant, what they want help with, the two checkboxes, UTM tags, referrer, and timestamp.
- **Visits**: one row per unique visitor per variant. This is the raw data behind `/stats`.

You can sort, filter or download it like any sheet. Don't rename the tabs or reorder the columns, because the site writes to them by position. Deleting test rows is fine.

## How to see stats

Go to `https://YOUR-SITE/stats` and enter the stats password. You'll see:

- **By variant**: visitors, signups, conversion rate, and % of signups who'd invite friends.
- **By traffic source**: the same numbers split by `utm_source` (reddit, discord, ...).

Hit **Refresh** to update. Rule of thumb: don't pick a winner until every variant has 100+ visitors and roughly 15+ signups.

**Don't pollute your own stats:** open `https://YOUR-SITE/?notrack=1` once on each phone or laptop you use. That browser's visits stop being counted. (`?notrack=0` turns counting back on.) Test signups do get saved, so delete those rows from the sheet.

## How to tag traffic sources (UTM links)

Add `utm_source` (and optionally `utm_campaign`) to the link you post:

```
https://YOUR-SITE/?utm_source=reddit&utm_campaign=r-malementalhealth
https://YOUR-SITE/?utm_source=discord&utm_campaign=server-name
https://YOUR-SITE/?utm_source=tiktok
```

Use lowercase and no spaces. Stats are grouped by `utm_source`, and the full UTMs are saved on each signup row.

## How to change the headline copy

All the words on the site live in one file: **`copy.js`**.

1. On GitHub, open the repo → click `copy.js` → click the **pencil icon** (Edit) at the top right.
2. Change the text **between the quotes**. Keep the quotes and commas.
3. Click **Commit changes…** → **Commit changes**.
4. Vercel redeploys automatically. The change is live in about a minute.

Changing copy mid-test resets what you're measuring for that variant. To do it cleanly, write down the current numbers, then clear that variant's rows in both tabs of the sheet.

## How to add a custom domain

1. Buy a domain anywhere (Namecheap, Cloudflare, Google/Squarespace Domains, or in Vercel itself).
2. In Vercel: open the **landing-pages** project → **Settings** → **Domains** → type your domain (e.g. `trythething.com`) → **Add**. Accept the suggestion to also add `www`.
3. Vercel shows 1–2 DNS records (usually an **A** record `76.76.21.21` and a **CNAME** for `www` → `cname.vercel-dns.com`). In your domain registrar's **DNS settings**, add exactly those records.
4. Wait a few minutes (up to an hour). Vercel shows a green check and sets up HTTPS on its own.

Nothing in the code needs to change.

---

## Setup reference (one-time, already done if it's working)

### Google Sheet
1. Create a new Google Sheet (name it anything).
2. **Extensions → Apps Script**. Delete everything in the editor, then paste in all of [`google-sheet/Code.gs`](google-sheet/Code.gs).
3. On the line `const SECRET = 'PASTE_SECRET_HERE';`, replace `PASTE_SECRET_HERE` with the secret (it must match `SHEET_SECRET` in Vercel). Click the **save** icon.
4. **Deploy → New deployment** → click the gear ⚙ → **Web app**. Set **Execute as: Me** and **Who has access: Anyone** → **Deploy**.
5. Click **Authorize access**, pick your Google account. If you see "Google hasn't verified this app", click **Advanced → Go to (project name) (unsafe)** → **Allow**. This warning appears because it's your own script; it's normal.
6. Copy the **Web app URL** (ends in `/exec`). That's `SHEET_URL`.

If you edit `Code.gs` later, you must use **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**, or the change won't take effect.

### Vercel environment variables
Project → **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `SHEET_URL` | The Apps Script Web app URL |
| `SHEET_SECRET` | Same secret you pasted into `Code.gs` |
| `STATS_PASSWORD` | Password for `/stats` |

After changing any of them: **Deployments** tab → **⋯** on the top deployment → **Redeploy**.

### How it works (for whoever touches this next)
- Plain HTML, no framework. `node build.js` turns `src/page.html` + `copy.js` into `public/a.html` … `d.html`. Vercel runs it on every push.
- `src/index.html` assigns the variant (cookie `variant`) and redirects, keeping the query string.
- Each variant page logs one visit per visitor per variant (cookie `vid` + `seen_X`) to `/api/visit`. Signups go to `/api/signup`. Both forward to the Apps Script, which appends rows.
- `/api/stats` checks `STATS_PASSWORD` and asks the Apps Script to compute counts from the sheet.
- Visits are counted by JavaScript, so most bots aren't counted. Ad blockers rarely block same-site requests like these.
