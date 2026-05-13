import type { City, District, Region, School } from "./types";

/**
 * Schools the property's mock guests (Chinese families) most often ask about.
 * Distances are straight-line km from the home at 16 Sunbeam Place, Halswell.
 *
 * Zone status:
 *   - in-zone: home is in the school's primary catchment (MoE zone), or for
 *     kindergartens/ECE, "right next door"
 *   - nearby: a short drive away; private/open-enrolment, or outside this
 *     home's zone
 *   - further: further afield, longer drive across Christchurch
 *
 * We only include schools within a reasonable radius of the home.
 */

export const RADIUS_KM = 25;

export const REGIONS: Region[] = [
  { id: "canterbury", name: { zhCN: "坎特伯雷大区", en: "Canterbury" } },
];

export const CITIES: City[] = [
  {
    id: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "基督城", en: "Christchurch" },
  },
];

export const DISTRICTS: District[] = [
  { id: "halswell", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Halswell 学区", en: "Halswell" } },
  { id: "aidanfield", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Aidanfield 学区", en: "Aidanfield" } },
  { id: "oaklands", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Oaklands 学区", en: "Oaklands" } },
  { id: "spreydon", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Spreydon 学区", en: "Spreydon" } },
  { id: "cashmere", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Cashmere 学区", en: "Cashmere" } },
  { id: "hoon-hay", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Hoon Hay 学区", en: "Hoon Hay" } },
  { id: "riccarton", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Riccarton 学区", en: "Riccarton" } },
  { id: "central", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "市中心 (CBD)", en: "Central City" } },
  { id: "merivale", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Merivale 学区", en: "Merivale" } },
  { id: "strowan", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Strowan 学区", en: "Strowan" } },
  { id: "burnside", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Burnside 学区", en: "Burnside" } },
  { id: "lincoln", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Lincoln 学区", en: "Lincoln" } },
];

export const SCHOOLS: School[] = [
  // Kindergartens / ECE near the home — most relevant for relocating families
  // with under-5s. NZ kindies don't run formal catchment zones, so "in-zone"
  // here means "walking distance".
  {
    id: "halswell-kindergarten",
    districtId: "halswell",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Halswell 幼儿园", en: "Halswell Kindergarten" },
    level: "kindergarten",
    distanceKm: 0.6,
    zone: "in-zone",
  },
  {
    id: "beststart-halswell",
    districtId: "halswell",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "BestStart Halswell 早教中心", en: "BestStart Halswell" },
    level: "kindergarten",
    distanceKm: 1.0,
    zone: "in-zone",
  },
  {
    id: "aidanfield-elc",
    districtId: "aidanfield",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Aidanfield 早教中心", en: "Aidanfield Early Learning Centre" },
    level: "kindergarten",
    distanceKm: 1.5,
    zone: "nearby",
  },
  {
    id: "pioneer-kindergarten",
    districtId: "hoon-hay",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Pioneer 幼儿园", en: "Pioneer Kindergarten" },
    level: "kindergarten",
    distanceKm: 1.9,
    zone: "nearby",
  },
  {
    id: "spreydon-kindergarten",
    districtId: "spreydon",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Spreydon 幼儿园", en: "Spreydon Kindergarten" },
    level: "kindergarten",
    distanceKm: 3.4,
    zone: "nearby",
  },
  {
    id: "cashmere-kindergarten",
    districtId: "cashmere",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Cashmere 幼儿园", en: "Cashmere Kindergarten" },
    level: "kindergarten",
    distanceKm: 5.5,
    zone: "nearby",
  },

  // Primary + secondary in zone
  {
    id: "halswell-school",
    districtId: "halswell",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Halswell 小学", en: "Halswell School" },
    level: "primary",
    distanceKm: 0.8,
    zone: "in-zone",
  },
  {
    id: "oaklands-school",
    districtId: "oaklands",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Oaklands 小学", en: "Oaklands School" },
    level: "primary",
    distanceKm: 2.5,
    zone: "in-zone",
  },
  {
    id: "cashmere-high",
    districtId: "cashmere",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Cashmere 高中", en: "Cashmere High School" },
    level: "secondary",
    distanceKm: 6.8,
    zone: "in-zone",
  },
  {
    id: "hillmorton-high",
    districtId: "spreydon",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Hillmorton 高中", en: "Hillmorton High School" },
    level: "secondary",
    distanceKm: 4.2,
    zone: "in-zone",
  },

  // Nearby — short drive, often private / open-enrolment or a neighbouring zone
  {
    id: "aidanfield-christian",
    districtId: "aidanfield",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Aidanfield 基督教学校", en: "Aidanfield Christian School" },
    level: "secondary",
    distanceKm: 1.7,
    zone: "nearby",
  },
  {
    id: "riccarton-high",
    districtId: "riccarton",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Riccarton 高中", en: "Riccarton High School" },
    level: "secondary",
    distanceKm: 7.5,
    zone: "nearby",
  },
  {
    id: "hagley",
    districtId: "central",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Hagley 社区学院", en: "Hagley Community College" },
    level: "secondary",
    distanceKm: 7.8,
    zone: "nearby",
  },
  {
    id: "christs-college",
    districtId: "central",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Christ's College (私立男校)", en: "Christ's College (private)" },
    level: "secondary",
    distanceKm: 8.1,
    zone: "nearby",
  },
  {
    id: "christchurch-boys",
    districtId: "riccarton",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "基督城男子高中", en: "Christchurch Boys' High School" },
    level: "secondary",
    distanceKm: 8.8,
    zone: "nearby",
  },
  {
    id: "christchurch-girls",
    districtId: "riccarton",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "基督城女子高中", en: "Christchurch Girls' High School" },
    level: "secondary",
    distanceKm: 8.9,
    zone: "nearby",
  },
  {
    id: "selwyn-house",
    districtId: "merivale",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Selwyn House (私立女校)", en: "Selwyn House School (private)" },
    level: "primary",
    distanceKm: 9.4,
    zone: "nearby",
  },
  {
    id: "st-margarets",
    districtId: "merivale",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "St Margaret's 学院 (私立女校)", en: "St Margaret's College (private)" },
    level: "secondary",
    distanceKm: 9.5,
    zone: "nearby",
  },
  {
    id: "rangi-ruru",
    districtId: "merivale",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Rangi Ruru 女校 (私立)", en: "Rangi Ruru Girls' School (private)" },
    level: "secondary",
    distanceKm: 9.8,
    zone: "nearby",
  },
  {
    id: "st-andrews",
    districtId: "strowan",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "St Andrew's 学院 (私立)", en: "St Andrew's College (private)" },
    level: "secondary",
    distanceKm: 10.2,
    zone: "nearby",
  },
  {
    id: "lincoln-high",
    districtId: "lincoln",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Lincoln 高中", en: "Lincoln High School" },
    level: "secondary",
    distanceKm: 10.5,
    zone: "nearby",
  },

  // Further — longer commute across town
  {
    id: "avonside-girls",
    districtId: "central",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Avonside 女子高中", en: "Avonside Girls' High School" },
    level: "secondary",
    distanceKm: 11.6,
    zone: "further",
  },
  {
    id: "burnside-high",
    districtId: "burnside",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Burnside 高中", en: "Burnside High School" },
    level: "secondary",
    distanceKm: 12.3,
    zone: "further",
  },
  {
    id: "shirley-boys",
    districtId: "central",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Shirley 男子高中", en: "Shirley Boys' High School" },
    level: "secondary",
    distanceKm: 14.5,
    zone: "further",
  },
];
