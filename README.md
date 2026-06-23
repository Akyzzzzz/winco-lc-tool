# WINCO LC Assignment Tool

An LC routing engine, AI (rule-based) company classifier, CRM pipeline
tracker, and business-intelligence dashboard — built on top of two Google
Sheets. No traditional database: the Company sheet is both the system of
record and the CRM.

## What it does

1. **Routes companies to an AIESEC Local Committee** based on their city,
   deterministically — no fuzzy matching, no AI guessing on this part.
2. **Classifies each company into a sector** (Food, Beverage, Cosmetics,
   Textile, Pet, Tech, Logistics, Retail, Other) using a local, rule-based
   keyword classifier — no external API calls.
3. **Tracks a CRM outreach pipeline** per company (Empty → Mail to Send →
   Mail Sent → In Contact → Meeting Scheduled → Approved / Rejected / On
   Hold), editable right from the dashboard and saved back to the sheet.
4. **Scores match confidence** (0–100) and surfaces **business-intelligence
   analytics**: status distribution, sector distribution, hot leads,
   funnel conversion rates, and a pipeline health score per LC.

## 1. Google Sheets setup

### LC Mapping sheet (unchanged routing logic) — columns `City`, `Assignment`

The `City` column holds a region label followed by a parenthetical list of
districts it covers; `Assignment` is the LC name:

| City                                                                                                                  | Assignment    |
| ----------------------------------------------------------------------------------------------------------------------| ------------- |
| Istanbul-Anadolu (Adalar, Ataşehir, Beykoz, Çekmeköy, Kadıköy, Kartal, Maltepe, Pendik, Sancaktepe, Sultanbeyli, Şile, Tuzla, Ümraniye, Üsküdar) | Istanbul Asia |
| Istanbul-Avrupa (Bağcılar, Bahçelievler, Beşiktaş, Beyoğlu, Şişli, ...)                                                | Istanbul West |
| Sakarya                                                                                                                | Sakarya       |

A plain city name with no parentheses (like `Sakarya`) still works exactly
as before — it's matched directly as a city-level entry.

### Company sheet (new) — columns A–G, in this exact order

| Col | Name              | Notes                                                          |
| --- | ----------------- | --------------------------------------------------------------- |
| A   | Name              | Required.                                                      |
| B   | City              | e.g. `Istanbul Kadıköy` — city + district in one cell.         |
| C   | Sector            | Leave blank to let the AI classifier fill it in (not persisted back automatically — it's recomputed each load unless you type a valid value here yourself). |
| D   | Status            | CRM pipeline status — see below. Blank = `EMPTY`.              |
| E   | Last Updated      | Stamped automatically whenever Status/Notes are edited from the dashboard. |
| F   | Notes             | Free text, editable from the dashboard.                        |
| G   | Confidence Score  | 0–100. Leave blank to let the app compute it from match quality. |

Both sheets must be shared as **"Anyone with the link" → Viewer** at minimum
for reading. The Company sheet additionally needs to be shared as **Editor**
with your service account's email if you want Status/Notes edits to persist
(see section 3).

> Header names are matched case-insensitively with a few common aliases
> (`Company Name`/`Company` for Name, `Headquarters`/`HQ` for City, etc.) —
> see `getColumn()` in `lib/csv.ts`.

## 2. LC matching logic (unchanged)

For each company's `City` value:

1. **District first** — extract a district token (e.g. `"Istanbul Kadıköy"`
   → `"Kadıköy"`) and look it up in a district→LC map built once per refresh
   from every mapping row's parenthetical list.
   - 1 distinct LC → **Assigned**
   - 2+ distinct LCs (the same district listed under two regions) → **Manual Review Required**
2. **City fallback** — if no district token resolved, the value is treated
   as a city name and matched directly against city/region names.
   - 1 distinct LC → **Assigned**
   - 2+ distinct LCs, or 0 matches → **Manual Review Required**
3. **Empty City field** → **Unmatched** (nothing to even review).

Matching is case-insensitive and Turkish-character-aware (`İ/I/ı`, `Ş/ş`,
`Ğ/ğ`, `Ü/ü`, `Ö/ö`, `Ç/ç`), and ignores extra spaces/hyphens. The lookup
maps are built once per data refresh (`lib/matching.ts: buildLcLookupMaps`),
giving O(1) lookups per company regardless of dataset size.

### Confidence score (0–100)

| Score  | Meaning                                                                 |
| ------ | ------------------------------------------------------------------------ |
| 100    | The full City value, as one whole string, exactly equals a known district or city name. |
| 85–95  | A district was found, but only as one word inside a longer value (e.g. `"Istanbul Kadıköy"`) — 90 typically, 80 if matched via the city map's sub-token instead. |
| 60–80  | Manual Review Required — either multiple candidate LCs matched (75) or nothing was recognized at all (60). |
| 0      | City field was empty (Unmatched).                                       |

If the sheet's Confidence Score column already has a valid 0–100 number for
a row, that value is respected instead of being recomputed.

## 3. Sector classification (rule-based, no external API)

`lib/sectors.ts` checks the company name against curated Turkish + English
keyword lists, in priority order (Pet → Beverage → Food → Cosmetics →
Textile → Tech → Logistics → Retail), defaulting to **Other** if nothing
matches. If the sheet's Sector column already contains one of the 9 allowed
values, that's respected instead of re-classifying.

## 4. CRM status pipeline

Allowed values: `EMPTY`, `MAIL_TO_SEND`, `MAIL_SENT`, `IN_CONTACT`,
`MEETING_SCHEDULED`, `APPROVED`, `REJECTED`, `ON_HOLD`.

The dashboard enforces a controlled state machine (`lib/status.ts`) so a
company can't jump arbitrarily between stages — `REJECTED` and `ON_HOLD` are
reachable as safety valves from most active stages, and `ON_HOLD` can
resume back into any prior active stage. Adjust `TRANSITIONS` in
`lib/status.ts` if your team's flow differs.

Status colors: `EMPTY` gray · `MAIL_TO_SEND` yellow · `MAIL_SENT` blue ·
`IN_CONTACT` orange · `MEETING_SCHEDULED` teal · `APPROVED` green ·
`REJECTED` red · `ON_HOLD` purple. (Teal was added for `MEETING_SCHEDULED`,
which wasn't in the original 7-color spec covering 8 statuses.)

## 5. Persisting edits back to Google Sheets

Status and Notes edits made in the dashboard call `PATCH
/api/companies/[rowNumber]/status`, which writes Status (D), Last Updated
(E), and Notes (F) back into the real Company sheet via the Sheets API v4
— using a Google service account, **not** OAuth and not the public-CSV
read path (which is read-only by nature).

To enable this:

1. In Google Cloud Console, create a service account and download its JSON key.
2. Enable the **Google Sheets API** for that project.
3. Share the Company sheet with the service account's email (the
   `client_email` field in the JSON key) as **Editor**.
4. Set `GOOGLE_SERVICE_ACCOUNT_KEY` (the whole JSON, one line) — or
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   separately — as environment variables. See `.env.example` and
   `DEPLOYMENT.md`.

Without these, the app still works fully for reading, matching,
classification, and exporting — Status/Notes edits just won't be saved, and
the UI tells you so.

## 6. Caching

Both sheets are cached in memory for **10 minutes** (`CACHE_TTL_MS` in
`lib/config.ts`) to avoid refetching on every page load. **Refresh Data**
always bypasses the cache. If a refresh fails, the app falls back to the
last good cached copy with a warning rather than showing a hard error.

> Note: this is a per-instance, in-memory cache — fine for a low/moderate-
> traffic internal tool, but not a globally consistent cache across
> concurrent Vercel serverless instances.

## 7. Install and run locally

Requires Node.js 18.17+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 8. Build for production

```bash
npm run build
npm run start
```

See `DEPLOYMENT.md` for deploying to Vercel.

## Project structure

```
app/
  api/sheet-data/route.ts                Fetch + match + classify + analytics, with caching
  api/companies/[rowNumber]/status/route.ts   PATCH: validates + writes Status/Notes back to the sheet
  layout.tsx, page.tsx, globals.css
components/
  ui/                        Button, Card, Badge, Input, Select, Table, Skeleton
  dashboard/                 SummaryCards, StatusBadge, CrmStatusBadge, StatusDistributionChart,
                             SectorDistributionCard, AnalyticsPanel
  table/                     CompanyTable, TableToolbar, Pagination
  CrmStatusSelect.tsx, NotesCell.tsx        Inline-editable CRM fields
  Header.tsx, RefreshButton.tsx, ExportMenu.tsx, DuplicateBanner.tsx
lib/
  config.ts          Sheet URLs, service-account credentials, cache TTL
  csv.ts              Google Sheets → CSV fetch + parse (row-number-aware)
  matching.ts         District/region-list LC matching + confidence score + enrichment pipeline
  sectors.ts          Rule-based sector classifier
  status.ts           CRM status config, colors, state-machine transitions
  analytics.ts        Status/sector distribution, hot leads, conversion rates, LC health scores
  cache.ts             In-memory TTL cache
  sheetsAuth.ts        Google service-account JWT auth
  sheetsWrite.ts       Writes Status/Notes/Last Updated back to the Company sheet
  export.ts            CSV / XLSX export + LC and Sector breakdown reports
  utils.ts             cn() helper, Turkish-aware string normalization
hooks/
  useLcAssignmentData.ts   Client data-fetching hook (loading/refresh/optimistic updates)
types/
  index.ts             Shared TypeScript types
```

## Performance notes

- Sheet data is fetched server-side, cached for 10 minutes, with both
  sheets fetched in parallel.
- Filtering, sorting, search, and pagination run client-side over the
  already-fetched dataset — comfortably handles 5,000+ rows.
- District/city lookups use prebuilt hash maps (`buildLcLookupMaps`), O(1)
  per company regardless of dataset size.
- A successful Status/Notes PATCH patches the server's in-memory cache
  directly, so the next page load reflects it without waiting out the TTL.

## Troubleshooting

| Symptom                                      | Likely cause                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| "sheet is not public" error                    | Sheet sharing isn't set to "Anyone with the link can view"                         |
| Status edits show "not saved to sheet"          | No service account configured, or the Company sheet isn't shared with it as Editor |
| Everything shows "Manual Review Required"      | City values don't match any district/region in the LC Mapping sheet                |
| A company is unexpectedly "Manual Review"      | Its City value matched multiple districts/regions with different LC assignments    |
| Sector always comes out "Other"                | Company name doesn't match any keyword in `lib/sectors.ts` — add more keywords     |
| Turkish characters look wrong in CSV export    | Excel — re-open the exported file with UTF-8 encoding; a BOM is included           |
