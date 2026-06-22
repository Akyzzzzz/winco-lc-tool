# WINCO LC Assignment Tool

Automatically determines which AIESEC Local Committee (LC) owns a company,
based on the company's headquarters — sourced live from two Google Sheets.
No database, no AI guessing: every assignment is a deterministic, explainable
lookup.

## How it works

1. **LC Mapping sheet** (static source of truth) — `City | District | LC`
2. **Company Database sheet** (dynamic, edited by your team) — `Company Name | Headquarters`
3. On load (and on every **Refresh Data** click), the app fetches both sheets
   as CSV, then matches each company's `Headquarters` value against the
   mapping sheet:
   - First it looks for an exact match on **District**.
   - If there's no District match, it falls back to **City**.
   - **0 matches → `Unmatched`**
   - **1 distinct LC → `Assigned`**
   - **2+ distinct LCs → `Manual Review Required`** (e.g. headquarters is a
     city split across multiple LCs, like Istanbul)

The matching is intentionally simple and exact — no fuzzy matching, no AI,
no guessing. If a value isn't an exact (case/locale-insensitive) match, it
won't be auto-assigned.

Company names are also checked for likely duplicates (e.g. `Ülker` /
`ÜLKER` / `Ülker A.Ş.`) by normalizing case, punctuation, and common legal
suffixes. Duplicates are flagged with a badge — **records are never merged
automatically.**

## 1. Set up your Google Sheets

Both sheets must be shared as **"Anyone with the link" → Viewer**.

**LC Mapping sheet** — first row must contain headers `City`, `District`, `LC`:

| City     | District | LC            |
| -------- | -------- | ------------- |
| Istanbul | Kadıköy  | Istanbul Asia |
| Istanbul | Beşiktaş | Istanbul West |
| Sakarya  | Serdivan | Sakarya       |

**Company Database sheet** — first row must contain headers `Company Name`, `Headquarters`:

| Company Name | Headquarters    |
| ------------- | --------------- |
| Ülker         | Kadıköy         |
| Eti           | Eskişehir       |
| Alpedo        | Kahramanmaraş   |

> Header names are matched case-insensitively, so `headquarters`, `HQ`, and
> `Headquarters ` all work. See `getColumn()` in `lib/csv.ts` if you need to
> add more accepted aliases.

## 2. Paste your sheet URLs

Open `lib/config.ts` and paste your two sheet URLs:

```ts
export const LC_MAPPING_SHEET_URL = "https://docs.google.com/spreadsheets/d/XXXXXXXX/edit";
export const COMPANY_DATABASE_SHEET_URL = "https://docs.google.com/spreadsheets/d/YYYYYYYY/edit";
```

You can paste a normal share link, a link with `#gid=`, or a direct CSV
export link — `lib/csv.ts` normalizes whichever shape you paste.

Alternatively (recommended for production), leave these blank and set
`LC_MAPPING_SHEET_URL` / `COMPANY_DATABASE_SHEET_URL` as environment
variables — see `.env.example`. Env vars take precedence when set.

## 3. Install and run locally

Requires Node.js 18.17+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 4. Build for production

```bash
npm run build
npm run start
```

See `DEPLOYMENT.md` for deploying to Vercel.

## Project structure

```
app/
  api/sheet-data/route.ts   Server route: fetches both sheets, runs matching, returns JSON
  layout.tsx                Root layout, fonts
  page.tsx                  Main dashboard page
  globals.css                Design tokens + base styles
components/
  ui/                        Button, Card, Badge, Input, Select, Table, Skeleton
  dashboard/                 SummaryCards, StatusBadge
  table/                     CompanyTable, TableToolbar, Pagination
  Header.tsx, RefreshButton.tsx, ExportMenu.tsx, DuplicateBanner.tsx
lib/
  config.ts                  Sheet URL configuration
  csv.ts                      Google Sheets → CSV fetch + parse
  matching.ts                Deterministic matching + duplicate detection engine
  export.ts                  CSV / XLSX export (client-side)
  utils.ts                    cn() helper, Turkish-aware string normalization
hooks/
  useLcAssignmentData.ts      Client data-fetching hook (loading/refresh/error state)
types/
  index.ts                    Shared TypeScript types
```

## Performance notes

- Sheet data is fetched server-side (`app/api/sheet-data/route.ts`), so
  CORS and sheet-visibility issues are handled in one place.
- Filtering, sorting, search, and pagination all run client-side over the
  already-fetched dataset (no network round-trip per keystroke), which
  comfortably handles 5,000+ rows.
- The table virtualizes via pagination (default 50 rows/page, adjustable up
  to 200) rather than rendering every row at once.

## Troubleshooting

| Symptom                                   | Likely cause                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| "sheet is not public" error                | Sheet sharing isn't set to "Anyone with the link can view"                   |
| Everything shows "Unmatched"               | Header names in your sheet don't match `City`/`District`/`LC`/`Headquarters` |
| A company is "Manual Review" unexpectedly  | Its Headquarters value matches multiple districts/cities with different LCs  |
| Turkish characters look wrong in CSV export | Excel — re-open the exported file with UTF-8 encoding; a BOM is included     |
