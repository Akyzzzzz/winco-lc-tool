# Deploying to Vercel

## Option A — Deploy with the CLI

```bash
npm install -g vercel
cd winco-lc-assignment-tool
vercel
```

Follow the prompts (link or create a project). For production:

```bash
vercel --prod
```

## Option B — Deploy from GitHub

1. Push this project to a GitHub repository.
2. In the [Vercel dashboard](https://vercel.com/new), click **Add New →
   Project** and import the repository.
3. Framework preset: Vercel auto-detects **Next.js** — no changes needed.
4. Click **Deploy**.

## Configuring the sheet URLs in production

You have two options:

**Option 1 — hard-code in `lib/config.ts`** (simplest): paste the URLs
directly, commit, and deploy. Fine for an internal tool where the sheet
links aren't sensitive.

**Option 2 — environment variables** (recommended): in your Vercel project
settings, go to **Settings → Environment Variables** and add:

| Name                          | Value                                              |
| ------------------------------ | --------------------------------------------------- |
| `LC_MAPPING_SHEET_URL`         | Your LC Mapping sheet URL                          |
| `COMPANY_DATABASE_SHEET_URL`   | Your Company Database sheet URL                    |

Leave the constants in `lib/config.ts` blank (`""`) — the env vars will be
picked up automatically (`lib/config.ts` prefers env vars when set; see
`RESOLVED_LC_MAPPING_SHEET_URL`). Redeploy after adding/changing env vars.

## Verifying the deployment

After deploying, open the live URL and confirm:

- The summary cards populate with real numbers (not all zeros).
- Clicking **Refresh Data** updates the "Updated Xs ago" label.
- No red "Couldn't load sheet data" banner appears. If it does, the error
  message tells you exactly which sheet failed and why (not public, wrong
  URL, etc.) — see the Troubleshooting table in `README.md`.

## Keeping the data fresh

The app fetches both sheets on every page load and on every **Refresh
Data** click — there's no build-time caching to invalidate. Editors can
add/edit/remove rows in the Company Database sheet at any time; the next
refresh in the app will reflect those changes immediately.
