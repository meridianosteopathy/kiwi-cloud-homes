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

The script reads both CSVs, filters to anything within 25 km of the home
(Halswell), and rewrites `src/lib/schools/data.ts`. It prints a summary like:

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

## Notes

- The home coordinates and search radius are at the top of
  `scripts/import-schools.mjs`. Adjust if the home moves or you want a
  smaller/larger radius.
- "In zone" status from MoE catchments is **not** in the dataset, so the
  script approximates from distance only (≤ 2 km = in-zone, ≤ 10 km = nearby,
  ≤ 20 km = further). For accuracy, edit specific entries by hand after
  import.
- Chinese names default to the English name. Add overrides per school by
  hand-editing the generated file's `name.zhCN` for the schools that have a
  well-known Chinese name (e.g. `基督城男子高中` for Christchurch Boys').
- Raw CSVs are gitignored — they're MoE's data, not ours to redistribute.
- MoE refreshes annually. Re-download + re-run when you want fresh data.
