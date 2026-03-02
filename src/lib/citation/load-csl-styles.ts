import { readFile } from 'fs/promises';
import { join } from 'path';

const CSL_STYLE_CACHE = new Map<string, any>();

/**
 * Load CSL style from local cache or fetch from network
 */
export async function loadCslStyle(styleName: string): Promise<string> {
  // Check cache first
  if (CSL_STYLE_CACHE.has(styleName)) {
    return CSL_STYLE_CACHE.get(styleName);
  }

  // Map our format names to CSL style URLs
  const styleUrls: Record<string, string> = {
    apa: 'https://raw.githubusercontent.com/citation-style-language/styles/master/apa.csl',
    mla: 'https://raw.githubusercontent.com/citation-style-language/styles/master/modern-language-association.csl',
    chicago: 'https://raw.githubusercontent.com/citation-style-language/styles/master/chicago-author-date.csl',
    harvard: 'https://raw.githubusercontent.com/citation-style-language/styles/master/harvard-cite-them-right.csl',
    vancouver: 'https://raw.githubusercontent.com/citation-style-language/styles/master/vancouver.csl',
  };

  const url = styleUrls[styleName];
  if (!url) {
    throw new Error(`Unknown style: ${styleName}`);
  }

  try {
    // Try to fetch from network
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch style: ${response.statusText}`);
    }
    const cslXml = await response.text();
    CSL_STYLE_CACHE.set(styleName, cslXml);
    return cslXml;
  } catch (error) {
    // If network fetch fails, throw error
    throw new Error(`Failed to load CSL style '${styleName}': ${error}`);
  }
}
