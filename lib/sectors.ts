import { SECTOR_VALUES, SectorValue } from "@/types";
import { normalizeForMatch } from "./utils";

// ============================================================================
// SECTOR AI CLASSIFICATION ENGINE
// ============================================================================
// Fully local, rule-based classifier — no external API calls. Two passes:
//   1. Keyword detection against the company name (Turkish + English terms).
//   2. A rule-based fallback classifier using broader heuristics
//      (common name suffixes/patterns) before defaulting to "Other".
//
// This is intentionally deterministic and explainable: the same company
// name always produces the same sector, and `classifySector` exposes which
// keyword triggered the match for transparency/debugging.
// ============================================================================

interface SectorRule {
  sector: SectorValue;
  keywords: string[];
}

/**
 * Keyword lists are deliberately broad (Turkish + English, common brand
 * roots) and checked in this priority order. Order matters when a name
 * could plausibly match more than one list (e.g. "Pet Shop Market" should
 * resolve to Pet before Retail).
 */
const SECTOR_RULES: SectorRule[] = [
  {
    sector: "Pet",
    keywords: [
      "pet",
      "petshop",
      "mama",
      "evcil hayvan",
      "veteriner",
      "kedi",
      "köpek",
      "petcare",
    ],
  },
  {
    sector: "Beverage",
    keywords: [
      "içecek",
      "icecek",
      "meşrubat",
      "mesrubat",
      "su ",
      "maden suyu",
      "kola",
      "gazoz",
      "kahve",
      "çay",
      "cay",
      "bira",
      "şarap",
      "sarap",
      "beverage",
      "drink",
      "juice",
      "meyve suyu",
    ],
  },
  {
    sector: "Food",
    keywords: [
      "gıda",
      "gida",
      "bisküvi",
      "biskuvi",
      "çikolata",
      "cikolata",
      "şeker",
      "seker",
      "un ",
      "unlu mamul",
      "süt",
      "sut",
      "peynir",
      "et ",
      "kasap",
      "yağ",
      "yag",
      "bakliyat",
      "tarım",
      "tarim",
      "çiftlik",
      "ciftlik",
      "gourmet",
      "food",
      "snack",
      "bakery",
      "fırın",
      "firin",
    ],
  },
  {
    sector: "Cosmetics",
    keywords: [
      "kozmetik",
      "cosmetic",
      "parfüm",
      "parfum",
      "cilt",
      "makyaj",
      "güzellik",
      "guzellik",
      "kişisel bakım",
      "kisisel bakim",
      "saç bakım",
      "sac bakim",
      "beauty",
      "skincare",
    ],
  },
  {
    sector: "Textile",
    keywords: [
      "tekstil",
      "textile",
      "giyim",
      "konfeksiyon",
      "kumaş",
      "kumas",
      "iplik",
      "dokuma",
      "moda",
      "fashion",
      "apparel",
      "tekstiil",
    ],
  },
  {
    sector: "Tech",
    keywords: [
      "teknoloji",
      "technology",
      "yazılım",
      "yazilim",
      "software",
      "bilişim",
      "bilisim",
      "elektronik",
      "electronics",
      "tech",
      "digital",
      "dijital",
      "yapay zeka",
      "robotik",
      "ai ",
    ],
  },
  {
    sector: "Logistics",
    keywords: [
      "lojistik",
      "logistics",
      "kargo",
      "nakliyat",
      "nakliye",
      "taşımacılık",
      "tasimacilik",
      "depo",
      "supply chain",
      "freight",
      "shipping",
      "express",
    ],
  },
  {
    sector: "Retail",
    keywords: [
      "market",
      "mağaza",
      "magaza",
      "perakende",
      "retail",
      "alışveriş",
      "alisveris",
      "store",
      "süpermarket",
      "supermarket",
      "mall",
      "avm",
    ],
  },
];

export interface SectorClassification {
  sector: SectorValue;
  matchedKeyword: string | null;
}

/**
 * Classifies a company by name using local keyword + rule-based heuristics
 * only. No network calls. Always returns a sector — "Other" is the
 * guaranteed fallback when nothing matches.
 */
export function classifySector(companyName: string): SectorClassification {
  const name = ` ${normalizeForMatch(companyName)} `;

  // Pass 1 — direct keyword detection, in priority order.
  for (const rule of SECTOR_RULES) {
    for (const keyword of rule.keywords) {
      if (name.includes(keyword)) {
        return { sector: rule.sector, matchedKeyword: keyword.trim() };
      }
    }
  }

  // Pass 2 — rule-based fallback: a bare legal-entity suffix (A.Ş., Ltd.,
  // Şti.) with nothing else recognizable still doesn't tell us a sector, so
  // we deliberately fall through to "Other" rather than guess.
  return { sector: "Other", matchedKeyword: null };
}

/**
 * Resolves the sector for a company row: respects an existing value already
 * present in the sheet (so manual corrections aren't overwritten), otherwise
 * runs the local classifier.
 */
export function resolveSector(
  companyName: string,
  sectorRaw: string
): { sector: SectorValue; source: "sheet" | "ai" } {
  const trimmed = sectorRaw.trim();
  const validSheetValue = SECTOR_VALUES.find(
    (v) => v.toLowerCase() === trimmed.toLowerCase()
  );

  if (validSheetValue) {
    return { sector: validSheetValue, source: "sheet" };
  }

  const { sector } = classifySector(companyName);
  return { sector, source: "ai" };
}
