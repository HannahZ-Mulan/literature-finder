/**
 * Unpaywall integration — look up legal open-access PDFs for a given DOI.
 *
 * Unpaywall (https://unpaywall.org) is a free, legal database of open-access
 * scholarly literature. Its API returns the best OA location for a work.
 * Requires an email contact (per their usage policy); configured via the
 * UNPAYWALL_EMAIL env var, falling back to a project default.
 */

const UNPAYWALL_API_BASE = 'https://api.unpaywall.org/v2';
// Unpaywall requires a real-format email contact (they reject example.com).
// Configure your own via UNPAYWALL_EMAIL; otherwise a project default is used.
const DEFAULT_EMAIL = process.env.UNPAYWALL_EMAIL || 'literature-finder-app@outlook.com';

interface UnpaywallLocation {
  url_for_pdf?: string;
  url?: string;
  host_type?: string;
  version?: string;
}

interface UnpaywallResponse {
  is_oa?: boolean;
  best_oa_location?: UnpaywallLocation | null;
  oa_locations?: UnpaywallLocation[];
}

/**
 * Get the best legal open-access PDF URL for a DOI.
 *
 * @param doi - The DOI to look up (e.g. "10.1234/abc")
 * @returns The best PDF URL if an OA copy exists, otherwise null.
 *          Returns null (not throws) on any error so callers can treat
 *          "no PDF available" and "lookup failed" the same way.
 */
export async function getUnpaywallPdf(doi: string): Promise<string | null> {
  const cleanDoi = doi.trim().toLowerCase().replace(/^https?:\/\/doi\.org\//i, '');
  if (!cleanDoi) return null;

  try {
    const url = `${UNPAYWALL_API_BASE}/${encodeURIComponent(cleanDoi)}?email=${encodeURIComponent(DEFAULT_EMAIL)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      // Don't let a slow Unpaywall hang the request indefinitely
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // 404 = DOI not in their DB (no OA copy); other errors are non-fatal
      return null;
    }

    const data: UnpaywallResponse = await response.json();

    if (!data.is_oa) return null;

    // Prefer the explicit PDF URL; fall back to the landing page URL
    const best = data.best_oa_location;
    if (best?.url_for_pdf) return best.url_for_pdf;
    if (best?.url) return best.url;

    // Otherwise scan all OA locations for one with a direct PDF link
    const pdfLoc = data.oa_locations?.find((loc) => loc.url_for_pdf);
    if (pdfLoc?.url_for_pdf) return pdfLoc.url_for_pdf;

    const anyLoc = data.oa_locations?.find((loc) => loc.url);
    return anyLoc?.url || null;
  } catch (error) {
    console.error('[Unpaywall] lookup failed:', cleanDoi, error instanceof Error ? error.message : error);
    return null;
  }
}
