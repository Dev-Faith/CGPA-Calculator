export type InstitutionKey = "ECOTAMS" | "EIT";

export interface InstitutionInfo {
  key: InstitutionKey;
  /** First header line, e.g. "ELERINMOSA COLLEGE OF TECHNOLOGY" */
  nameLine1: string;
  /** Second header line (empty string if none) */
  nameLine2: string;
  /** Short diploma abbreviation: "ND" or "NID" */
  diplomaAbbr: string;
  /** Full diploma name: "National Diploma" or "National Innovation Diploma" */
  diplomaFull: string;
  /** Document reference prefix, e.g. "ECOTAMS/ACAD/" */
  refPrefix: string;
  /** Footer attribution text */
  footerText: string;
  /** Address line */
  address: string;
}

export const INSTITUTIONS: Record<InstitutionKey, InstitutionInfo> = {
  ECOTAMS: {
    key: "ECOTAMS",
    nameLine1: "ELERINMOSA COLLEGE OF TECHNOLOGY",
    nameLine2: "AND MANAGEMENT SCIENCES (ECOTAMS)",
    diplomaAbbr: "ND",
    diplomaFull: "National Diploma",
    refPrefix: "ECOTAMS/ACAD/",
    footerText:
      "Elerinmosa College of Technology and Management Sciences (ECOTAMS)",
    address: "EDE-ROAD, OKE-AWESIN, ERIN-OSUN, OSUN STATE, NIGERIA.",
  },
  EIT: {
    key: "EIT",
    nameLine1: "ELERINMOSA INSTITUTE OF TECHNOLOGY",
    nameLine2: "",
    diplomaAbbr: "NID",
    diplomaFull: "National Innovation Diploma",
    refPrefix: "EIT/ACAD/",
    footerText: "Elerinmosa Institute of Technology",
    address: "EDE-ROAD, OKE-AWESIN, ERIN-OSUN, OSUN STATE, NIGERIA.",
  },
};

/** Fall back to ECOTAMS (current) when institution cannot be detected. */
export const DEFAULT_INSTITUTION: InstitutionKey = "ECOTAMS";

/**
 * Detects institution from a single cell string value.
 *
 * - Cells containing "ECOTAMS" or "COLLEGE OF TECHNOLOGY … MANAGEMENT" → ECOTAMS
 * - Cells containing "ELERINMOSA INSTITUTE OF TECHNOLOGY" (no "COLLEGE OF") → EIT
 * - Otherwise → null (unknown)
 */
export function detectInstitutionFromCell(
  cellValue: string,
): InstitutionKey | null {
  const upper = cellValue.toUpperCase().trim();
  if (upper.includes("ECOTAMS")) return "ECOTAMS";
  if (
    upper.includes("COLLEGE OF TECHNOLOGY") &&
    upper.includes("MANAGEMENT")
  )
    return "ECOTAMS";
  if (
    upper.includes("ELERINMOSA INSTITUTE") ||
    upper.includes("INSTITUTE OF TECHNOLOGY") ||
    upper.includes("EIT") ||
    upper.includes("NID")
  )
    return "EIT";
  return null;
}

/**
 * Scans the first `scanRows` rows of a parsed sheet (2D array) and returns
 * the detected institution key, defaulting to ECOTAMS if nothing is found.
 */
export function detectInstitutionFromSheet(
  rows: (string | number | boolean | Date | null | undefined)[][],
  scanRows = 10,
): InstitutionKey {
  const limit = Math.min(rows.length, scanRows);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!row) continue;
    for (const cell of row) {
      if (!cell) continue;
      const str = String(cell).replace(/\s+/g, " ");
      const detected = detectInstitutionFromCell(str);
      if (detected) return detected;
    }
  }
  return DEFAULT_INSTITUTION;
}

/** Convenience wrapper: looks up institution info by key. */
export function getInstitution(
  key?: InstitutionKey | string | null,
): InstitutionInfo {
  if (key && key in INSTITUTIONS)
    return INSTITUTIONS[key as InstitutionKey];
  return INSTITUTIONS[DEFAULT_INSTITUTION];
}
 
