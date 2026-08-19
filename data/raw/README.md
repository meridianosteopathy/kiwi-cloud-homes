# MoE source CSVs — drop them here

The school list on `/school` is generated from two **NZ Ministry of Education**
datasets. Both are free, public, and re-published each year.

## What to download

### 1. Schools (Y1–13)

- Dataset: **Directory of Educational Institutions**
- Find it: https://catalogue.data.govt.nz/dataset/directory-of-educational-institutions
  (or search "Directory of Educational Institutions" on data.govt.nz)
- Click the CSV resource → **Download**
- Save as **`data/raw/schools.csv`** in this folder

### 2. Early-childhood centres (kindergartens)

- Dataset: **ECE Services Directory** (also called "Early Childhood Service
  Directory" on some pages)
- Find it: search "ECE Services Directory" on data.govt.nz
- Click the CSV resource → **Download**
- Save as **`data/raw/ece.csv`** in this folder

If the download is `.xlsx` instead of `.csv`: open it in Excel, **File → Save
As → CSV UTF-8 (.csv)**.

## After downloading

From the repo root (in VS Code's terminal):

```
node scripts/import-schools.mjs
```

The script reads both CSVs, filters to anything within 25 km of the snapshot
centre (Halswell), and rewrites `src/lib/schools/data.ts`. It prints a summary
like:

```
Wrote 312 entries to .../src/lib/schools/data.ts
  Kindergarten: 138
  Primary:      94
  Intermediate: 8
  Secondary:    72
```

Inspect the diff, then commit:

```
git add src/lib/schools/data.ts
git commit -m "Refresh schools from MoE snapshot"
git push
```

## School distances when there's more than one house

The `/school` page shows how far each school is **from each of our houses**,
side by side. That works off two things:

1. **Each school's map position**, written into `src/lib/schools/data.ts` by
   this importer.
2. **Each house's map position**, in `src/content/homes.ts` — you fill this in
   by hand (Google Maps → right-click the house → click the numbers to copy
   them → paste as `lat` then `lng`).

A house with no coordinates in `homes.ts` simply shows "School distances for
this home aren't available yet" — it's still fully bookable, and no other
house's numbers are shown in its place.

**Snapshots taken before this feature existed don't carry school positions.**
If a house has coordinates but still shows no distances, the fix is to re-run
the importer once (steps above) — the refreshed `data.ts` includes each
school's `lat`/`lng`, and every house lights up. After that, adding a third
house needs only its coordinates in `homes.ts`, never another import.

## Notes

- `HOME_LAT` / `HOME_LNG` at the top of `scripts/import-schools.mjs` are the
  point the snapshot is **centred** on, not "the" house: schools further than
  `RADIUS_KM` from it are left out of the file entirely. With several houses,
  centre it on whichever is most central, and widen `RADIUS_KM` if they're far
  apart, so every house's neighbourhood is covered.
- "In zone" status from MoE catchments is **not** in the dataset, so the
  script approximates from distance only (≤ 2 km = in-zone, ≤ 10 km = nearby,
  ≤ 20 km = further). For accuracy, edit specific entries by hand after
  import.
- Chinese names default to the English name. Add overrides per school by
  hand-editing the generated file's `name.zhCN` for the schools that have a
  well-known Chinese name (e.g. `基督城男子高中` for Christchurch Boys').
- Raw CSVs are gitignored — they're MoE's data, not ours to redistribute.
- MoE refreshes annually. Re-download + re-run when you want fresh data.
