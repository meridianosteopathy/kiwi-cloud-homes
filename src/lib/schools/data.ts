import type { City, District, Region, School } from "./types";

export const REGIONS: Region[] = [
  { id: "auckland", name: { zhCN: "奥克兰大区", en: "Auckland" } },
  { id: "wellington", name: { zhCN: "惠灵顿大区", en: "Wellington" } },
  { id: "canterbury", name: { zhCN: "坎特伯雷大区", en: "Canterbury" } },
  { id: "otago", name: { zhCN: "奥塔哥大区", en: "Otago" } },
];

export const CITIES: City[] = [
  { id: "auckland-city", regionId: "auckland", name: { zhCN: "奥克兰市中心", en: "Auckland City" } },
  { id: "north-shore", regionId: "auckland", name: { zhCN: "北岸", en: "North Shore" } },
  { id: "east-auckland", regionId: "auckland", name: { zhCN: "东区", en: "East Auckland" } },
  { id: "wellington-city", regionId: "wellington", name: { zhCN: "惠灵顿市", en: "Wellington City" } },
  { id: "christchurch", regionId: "canterbury", name: { zhCN: "基督城", en: "Christchurch" } },
  { id: "dunedin", regionId: "otago", name: { zhCN: "但尼丁", en: "Dunedin" } },
];

export const DISTRICTS: District[] = [
  { id: "epsom", cityId: "auckland-city", regionId: "auckland", name: { zhCN: "Epsom 学区", en: "Epsom" } },
  { id: "mt-eden", cityId: "auckland-city", regionId: "auckland", name: { zhCN: "Mt Eden 学区", en: "Mt Eden" } },
  { id: "remuera", cityId: "auckland-city", regionId: "auckland", name: { zhCN: "Remuera 学区", en: "Remuera" } },
  { id: "takapuna", cityId: "north-shore", regionId: "auckland", name: { zhCN: "Takapuna 学区", en: "Takapuna" } },
  { id: "east-coast-bays", cityId: "north-shore", regionId: "auckland", name: { zhCN: "East Coast Bays 学区", en: "East Coast Bays" } },
  { id: "howick", cityId: "east-auckland", regionId: "auckland", name: { zhCN: "Howick 学区", en: "Howick" } },
  { id: "kelburn", cityId: "wellington-city", regionId: "wellington", name: { zhCN: "Kelburn 学区", en: "Kelburn" } },
  { id: "karori", cityId: "wellington-city", regionId: "wellington", name: { zhCN: "Karori 学区", en: "Karori" } },
  { id: "riccarton", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Riccarton 学区", en: "Riccarton" } },
  { id: "fendalton", cityId: "christchurch", regionId: "canterbury", name: { zhCN: "Fendalton 学区", en: "Fendalton" } },
  { id: "maori-hill", cityId: "dunedin", regionId: "otago", name: { zhCN: "Maori Hill 学区", en: "Maori Hill" } },
];

/**
 * Schools the property's mock guests (Chinese families) most often ask about.
 * Distances and zone status are anchored to the mock listing in Epsom, Auckland.
 */
export const SCHOOLS: School[] = [
  // Epsom — the property is in zone
  {
    id: "auckland-grammar",
    districtId: "epsom",
    cityId: "auckland-city",
    regionId: "auckland",
    name: { zhCN: "奥克兰文法学校", en: "Auckland Grammar School" },
    distanceKm: 1.2,
    zone: "in-zone",
  },
  {
    id: "epsom-girls-grammar",
    districtId: "epsom",
    cityId: "auckland-city",
    regionId: "auckland",
    name: { zhCN: "Epsom 女子文法学校", en: "Epsom Girls Grammar School" },
    distanceKm: 1.5,
    zone: "in-zone",
  },
  // Mt Eden — nearby
  {
    id: "mags",
    districtId: "mt-eden",
    cityId: "auckland-city",
    regionId: "auckland",
    name: { zhCN: "Mount Albert 文法学校 (MAGS)", en: "Mount Albert Grammar School" },
    distanceKm: 4.2,
    zone: "nearby",
  },
  // Remuera — nearby
  {
    id: "kings-college",
    districtId: "remuera",
    cityId: "auckland-city",
    regionId: "auckland",
    name: { zhCN: "Kings College", en: "Kings College" },
    distanceKm: 5.8,
    zone: "nearby",
  },
  {
    id: "saint-cuthberts",
    districtId: "remuera",
    cityId: "auckland-city",
    regionId: "auckland",
    name: { zhCN: "圣库斯伯特学院", en: "Saint Cuthbert's College" },
    distanceKm: 3.6,
    zone: "nearby",
  },
  {
    id: "diocesan",
    districtId: "remuera",
    cityId: "auckland-city",
    regionId: "auckland",
    name: { zhCN: "迪欧森女子学校", en: "Diocesan School for Girls" },
    distanceKm: 4.4,
    zone: "nearby",
  },
  // North Shore — further
  {
    id: "takapuna-grammar",
    districtId: "takapuna",
    cityId: "north-shore",
    regionId: "auckland",
    name: { zhCN: "Takapuna 文法学校", en: "Takapuna Grammar School" },
    distanceKm: 14.8,
    zone: "further",
  },
  {
    id: "westlake-boys",
    districtId: "takapuna",
    cityId: "north-shore",
    regionId: "auckland",
    name: { zhCN: "西湖男子高中", en: "Westlake Boys' High School" },
    distanceKm: 16.1,
    zone: "further",
  },
  {
    id: "westlake-girls",
    districtId: "takapuna",
    cityId: "north-shore",
    regionId: "auckland",
    name: { zhCN: "西湖女子高中", en: "Westlake Girls' High School" },
    distanceKm: 16.0,
    zone: "further",
  },
  {
    id: "rangitoto",
    districtId: "east-coast-bays",
    cityId: "north-shore",
    regionId: "auckland",
    name: { zhCN: "Rangitoto 学院", en: "Rangitoto College" },
    distanceKm: 19.5,
    zone: "further",
  },
  // East Auckland — further
  {
    id: "macleans",
    districtId: "howick",
    cityId: "east-auckland",
    regionId: "auckland",
    name: { zhCN: "Macleans 学院", en: "Macleans College" },
    distanceKm: 22.7,
    zone: "further",
  },
  {
    id: "pakuranga",
    districtId: "howick",
    cityId: "east-auckland",
    regionId: "auckland",
    name: { zhCN: "Pakuranga 学院", en: "Pakuranga College" },
    distanceKm: 20.4,
    zone: "further",
  },
  // Wellington — out of region
  {
    id: "wellington-college",
    districtId: "kelburn",
    cityId: "wellington-city",
    regionId: "wellington",
    name: { zhCN: "惠灵顿男子学院", en: "Wellington College" },
    distanceKm: 495,
    zone: "out-of-region",
  },
  {
    id: "wellington-girls",
    districtId: "kelburn",
    cityId: "wellington-city",
    regionId: "wellington",
    name: { zhCN: "惠灵顿女子学院", en: "Wellington Girls' College" },
    distanceKm: 495,
    zone: "out-of-region",
  },
  {
    id: "onslow",
    districtId: "karori",
    cityId: "wellington-city",
    regionId: "wellington",
    name: { zhCN: "Onslow 学院", en: "Onslow College" },
    distanceKm: 497,
    zone: "out-of-region",
  },
  // Christchurch — out of region
  {
    id: "christchurch-boys",
    districtId: "riccarton",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "基督城男子高中", en: "Christchurch Boys' High School" },
    distanceKm: 765,
    zone: "out-of-region",
  },
  {
    id: "christchurch-girls",
    districtId: "riccarton",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "基督城女子高中", en: "Christchurch Girls' High School" },
    distanceKm: 765,
    zone: "out-of-region",
  },
  {
    id: "burnside",
    districtId: "fendalton",
    cityId: "christchurch",
    regionId: "canterbury",
    name: { zhCN: "Burnside 高中", en: "Burnside High School" },
    distanceKm: 766,
    zone: "out-of-region",
  },
  // Dunedin — out of region
  {
    id: "otago-boys",
    districtId: "maori-hill",
    cityId: "dunedin",
    regionId: "otago",
    name: { zhCN: "奥塔哥男子高中", en: "Otago Boys' High School" },
    distanceKm: 1085,
    zone: "out-of-region",
  },
  {
    id: "otago-girls",
    districtId: "maori-hill",
    cityId: "dunedin",
    regionId: "otago",
    name: { zhCN: "奥塔哥女子高中", en: "Otago Girls' High School" },
    distanceKm: 1085,
    zone: "out-of-region",
  },
];
