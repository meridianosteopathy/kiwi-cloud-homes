#!/usr/bin/env node
/**
 * One-shot importer: turns MoE Schools + ECE directory CSVs into a fully
 * typed src/lib/schools/data.ts, filtered to schools within RADIUS_KM of
 * the home property.
 *
 * USAGE (from the repo root, on your laptop where the internet works):
 *
 *   1. Download the two CSVs from data.govt.nz and put them in data/raw/:
 *
 *        data/raw/schools.csv   <- MoE "Directory of Educational Institutions"
 *                                  (https://catalogue.data.govt.nz/dataset/
 *                                   directory-of-educational-institutions)
 *        data/raw/ece.csv       <- MoE "Early Childhood Services Directory"
 *                                  (search "ECE Services Directory" on
 *                                   data.govt.nz)
 *
 *      If the downloads are .xlsx, open in Excel and "Save As CSV (UTF-8)".
 *
 *   2. Confirm HOME_LAT / HOME_LNG below are correct for your property.
 *      Default is approximate Halswell coords.
 *
 *   3. Run:
 *        node scripts/import-schools.mjs
 *
 *   4. Inspect the diff on src/lib/schools/data.ts; commit when happy.
 *
 * The script is intentionally forgiving about column naming. MoE has
 * renamed/restructured the directory more than once over the years; we
 * probe a handful of likely column names and surface a clear error if
 * none match.
 */

import { parse } from "csv-parse/sync";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ---- Configuration -------------------------------------------------------

/** Home property — approximate lat/lng for 16 Sunbeam Place, Halswell. */
const HOME_LAT = -43.5788;
const HOME_LNG = 172.5620;

/** Schools beyond this distance are excluded from the snapshot. */
const RADIUS_KM = 25;

const SCHOOLS_CSV = path.join(REPO_ROOT, "data/raw/schools.csv");
const ECE_CSV = path.join(REPO_ROOT, "data/raw/ece.csv");
const OUT_PATH = path.join(REPO_ROOT, "src/lib/schools/data.ts");

// ---- Column probes -------------------------------------------------------
// MoE CSVs vary by year. We try a list of column names for each field and
// use the first one present.

const SCHOOL_COLUMNS = {
  id: ["School Number", "Institution Number", "Org_Code", "School_Id"],
  name: ["School Name", "Org_Name", "Institution Name"],
  type: ["Org Type", "School Type", "Institution Type", "Type"],
  lat: ["Latitude", "Lat"],
  lng: ["Longitude", "Lng", "Long"],
  city: ["Town / City", "Town/City", "City", "Suburb"],
};

const ECE_COLUMNS = {
  id: ["Service Number", "Service_Id", "ECE Service Number"],
  name: ["Service Name", "Org_Name", "ECE Service Name"],
  type: ["Service Type", "Type", "Service Type Name"],
  lat: ["Latitude", "Lat"],
  lng: ["Longitude", "Lng", "Long"],
  city: ["Town / City", "Town/City", "City", "Suburb"],
};

// ---- Helpers -------------------------------------------------------------

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Number((2 * R * Math.asin(Math.sqrt(a))).toFixed(1));
}

function pickColumn(row, candidates) {
  for (const c of candidates) {
    if (c in row) return c;
  }
  return null;
}

function classifySchoolLevel(typeText) {
  const t = typeText.toLowerCase();
  if (t.includes("intermediate")) return "intermediate";
  if (t.includes("secondary") || t.includes("high") || t.includes("college"))
    return "secondary";
  if (
    t.includes("primary") ||
    t.includes("contributing") ||
    t.includes("full")
  )
    return "primary";
  // Composite / area / special / unit — composites span Y1–15. Bias to
  // secondary since families care most about the senior years; the host
  // can manually relabel after import if needed.
  if (t.includes("composite") || t.includes("area")) return "secondary";
  return null;
}

function classifyZone(distanceKm) {
  if (distanceKm <= 2) return "in-zone";
  if (distanceKm <= 10) return "nearby";
  if (distanceKm <= 20) return "further";
  return "out-of-region";
}

function slugify(name, id) {
  const base = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${id}`;
}

function suburbToDistrictId(suburb) {
  return (suburb || "unknown")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    return { rows: [], missing: true };
  }
  const buf = fs.readFileSync(filePath);
  let text = buf.toString("utf8").replace(/^﻿/, ""); // strip BOM

  // MoE CSVs often start with a title row ("New Zealand Schools Directory")
  // and a few blank rows before the real header. Skip ahead until we find a
  // line whose first column looks like one of our known ID columns.
  const knownIds = [...SCHOOL_COLUMNS.id, ...ECE_COLUMNS.id]
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const headerRegex = new RegExp(`^"?(${knownIds})"?[,\\s]`, "i");
  const lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex((line) => headerRegex.test(line));
  if (headerIdx > 0) {
    text = lines.slice(headerIdx).join("\n");
  }

  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    // MoE adds/removes trailing columns each year — accept rows that don't
    // exactly match the header width.
    relax_column_count: true,
    trim: true,
  });
  return { rows, missing: false };
}

function processCsv(rows, columnsMap, isECE) {
  if (rows.length === 0) return [];
  const sample = rows[0];

  const idCol = pickColumn(sample, columnsMap.id);
  const nameCol = pickColumn(sample, columnsMap.name);
  const typeCol = pickColumn(sample, columnsMap.type);
  const latCol = pickColumn(sample, columnsMap.lat);
  const lngCol = pickColumn(sample, columnsMap.lng);
  const cityCol = pickColumn(sample, columnsMap.city);

  const missing = Object.entries({ idCol, nameCol, latCol, lngCol }).filter(
    ([, v]) => !v,
  );
  if (missing.length > 0) {
    throw new Error(
      `Could not find these required columns in CSV. Sample columns: [${Object.keys(
        sample,
      ).join(", ")}].\nMissing roles: ${missing.map(([k]) => k).join(", ")}\n` +
        `Edit SCHOOL_COLUMNS / ECE_COLUMNS in this script to map them.`,
    );
  }

  const out = [];
  for (const row of rows) {
    const lat = Number(row[latCol]);
    const lng = Number(row[lngCol]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const distance = haversineKm(HOME_LAT, HOME_LNG, lat, lng);
    if (distance > RADIUS_KM) continue;

    const typeText = typeCol ? String(row[typeCol] ?? "") : "";
    const level = isECE ? "kindergarten" : classifySchoolLevel(typeText);
    if (!level) continue;

    const id = String(row[idCol]).trim();
    const name = String(row[nameCol] ?? "").trim();
    if (!id || !name) continue;

    const districtId = suburbToDistrictId(
      cityCol ? row[cityCol] : "christchurch",
    );

    out.push({
      id: slugify(name, id),
      districtId,
      cityId: "christchurch",
      regionId: "canterbury",
      name: { zhCN: name, en: name },
      level,
      distanceKm: distance,
      zone: classifyZone(distance),
    });
  }
  return out;
}

function emitDataTs(schools) {
  // Stable order: closest first.
  schools.sort((a, b) => a.distanceKm - b.distanceKm);

  // Derive unique districts so the file references real ones.
  const districtIds = new Set(schools.map((s) => s.districtId));

  const districts = [...districtIds].sort().map((id) => {
    const label =
      id === "unknown"
        ? "Unknown"
        : id
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    return {
      id,
      cityId: "christchurch",
      regionId: "canterbury",
      name: { zhCN: `${label} 学区`, en: label },
    };
  });

  const header = `// AUTO-GENERATED by scripts/import-schools.mjs — do not edit by hand.
// Source: MoE Directory of Educational Institutions + ECE Services Directory.
// Re-run \`node scripts/import-schools.mjs\` to refresh.

import type { City, District, Region, School } from "./types";

export const RADIUS_KM = ${RADIUS_KM};

export const REGIONS: Region[] = [
  { id: "canterbury", name: { zhCN: "坎特伯雷大区", en: "Canterbury" } },
];

export const CITIES: City[] = [
  { id: "christchurch", regionId: "canterbury", name: { zhCN: "基督城", en: "Christchurch" } },
];

export const DISTRICTS: District[] = ${JSON.stringify(districts, null, 2)};

export const SCHOOLS: School[] = ${JSON.stringify(schools, null, 2)};
`;

  fs.writeFileSync(OUT_PATH, header, "utf8");
}

// ---- Main ----------------------------------------------------------------

function main() {
  const schoolsResult = readCsv(SCHOOLS_CSV);
  const eceResult = readCsv(ECE_CSV);

  if (schoolsResult.missing && eceResult.missing) {
    console.error(
      `ERROR: neither CSV found. Drop the MoE files into:\n  ${SCHOOLS_CSV}\n  ${ECE_CSV}\nSee the comment at the top of this script for download links.`,
    );
    process.exit(1);
  }

  const schools = schoolsResult.missing
    ? []
    : processCsv(schoolsResult.rows, SCHOOL_COLUMNS, false);
  const ece = eceResult.missing
    ? []
    : processCsv(eceResult.rows, ECE_COLUMNS, true);

  const combined = [...ece, ...schools];
  if (combined.length === 0) {
    console.error("ERROR: 0 rows survived filtering — check HOME_LAT/LNG.");
    process.exit(1);
  }

  emitDataTs(combined);

  const counts = combined.reduce(
    (acc, s) => ((acc[s.level] = (acc[s.level] ?? 0) + 1), acc),
    {},
  );

  console.log(`Wrote ${combined.length} entries to ${OUT_PATH}`);
  console.log(`  Kindergarten: ${counts.kindergarten ?? 0}`);
  console.log(`  Primary:      ${counts.primary ?? 0}`);
  console.log(`  Intermediate: ${counts.intermediate ?? 0}`);
  console.log(`  Secondary:    ${counts.secondary ?? 0}`);
}

main();
