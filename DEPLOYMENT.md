# Deploying to Vercel

## Option A — Deploy with the CLI

```bash
npm install -g vercel
cd winco-lc-assignment-tool
vercel
```

For production:

```bash
vercel --prod
```

## Option B — Deploy from GitHub

1. Push this project to a GitHub repository.
2. In the [Vercel dashboard](https://vercel.com/new), **Add New → Project**
   and import the repository.
3. Framework preset: Vercel auto-detects **Next.js** — no changes needed.
4. Add the environment variables below, then **Deploy**.

## Required environment variables

| Name                          | Required?                          | Notes                                                        |
| ------------------------------ | ----------------------------------- | --------------------------------------------------------------- |
| `LC_MAPPING_SHEET_URL`         | Yes (or hard-code in `lib/config.ts`) | The LC Mapping sheet's share URL.                            |
| `COMPANY_DATABASE_SHEET_URL`   | Yes (or hard-code in `lib/config.ts`) | The Company sheet's share URL.                               |
| `GOOGLE_SERVICE_ACCOUNT_KEY`   | Only for write-back                 | Entire service-account JSON key, pasted as one line.         |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Alternative to the above            | Use instead of `GOOGLE_SERVICE_ACCOUNT_KEY` if you prefer two separate vars. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Alternative to the above      | Newlines escaped as literal `\n`.                             |
| `COMPANY_DATABASE_SHEET_TAB`   | Optional                            | Only needed if the data isn't on the spreadsheet's first tab. |

## Setting up Google Sheets write-back (service account)

This is the only part of the system that needs real credentials — everything
else (reading both sheets, matching, classification, exporting) works off
public CSV links with no Google Cloud project at all.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create
   a project (or use an existing one).
2. **APIs & Services → Library** → enable the **Google Sheets API**.
3. **APIs & Services → Credentials → Create Credentials → Service account**.
   Give it any name (e.g. `winco-lc-tool-writer`).
4. Open the new service account → **Keys → Add Key → Create new key → JSON**.
   This downloads a JSON file — keep it secret, never commit it to git.
5. Open the JSON file and copy the **entire contents** as one line.
6. In Vercel → your project → **Settings → Environment Variables**, add
   `GOOGLE_SERVICE_ACCOUNT_KEY` with that JSON as the value.
   (Alternatively, copy just `client_email` into
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` into
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, keeping the `\n` sequences literal.)
7. Open your Company Google Sheet → **Share** → paste the service account's
   email (the `client_email` value, looks like
   `xxxx@yyyy.iam.gserviceaccount.com`) → give it **Editor** access.
8. Redeploy. The dashboard's "no service account configured" notice should
   disappear, and Status/Notes edits will start persisting.

If writes start failing with a 403 after this, double-check step 7 — that's
almost always a sharing permission issue, not a code issue.

## Verifying the deployment

After deploying, open the live URL and confirm:

- The summary cards populate with real numbers (not all zeros).
- The Status Distribution chart and Sector Distribution card show data.
- Clicking **Refresh Data** updates the "Updated Xs ago" label.
- Changing a company's CRM status in the table shows a brief saving spinner
  and then settles — with no "not saved to sheet" note if write-back is
  configured.
- No red "Couldn't load sheet data" banner appears. If it does, the message
  tells you exactly which sheet failed and why — see the Troubleshooting
  table in `README.md`.

## Keeping the data fresh

Both sheets are cached in memory for 10 minutes; **Refresh Data** always
bypasses that cache. Editors can add/edit/remove rows in the Company sheet
at any time — the next refresh (automatic after 10 minutes, or manual) will
reflect those changes. A successful Status/Notes edit from the dashboard
updates the in-memory cache immediately, so it doesn't need to wait out the
10-minute window to show up on a reload.
