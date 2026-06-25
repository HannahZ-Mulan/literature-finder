export interface Keyword {
  word: string;
  frequency: number;
  score: number;
  positions: number[]; // Character positions in text
}

export interface ChunkWithKeywords {
  chunkId: number;
  paperId: number;
  chunkType: string;
  chunkText: string;
  keywords: Keyword[];
}

export interface SearchQuery {
  query: string;
  paperId?: number; // Optional: search within specific paper
  chunkTypes?: string[]; // Optional: filter by chunk types
  limit?: number; // Optional: max results
}

export interface SearchResult {
  chunkId: number;
  paperId: number;
  chunkType: string;
  chunkText: string;
  relevanceScore: number;
  matchedKeywords: string[];
  highlight: string; // Text snippet with highlighted matches
}

/**
 * Extract keywords from text using TF-IDF-like scoring
 * @param text - Text to extract keywords from
 * @param topN - Number of top keywords to return
 * @returns Array of keywords with scores
 */
export function extractKeywords(text: string, topN: number = 10): Keyword[] {
  if (!text || text.length < 10) {
    return [];
  }

  // Tokenize and clean
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3); // Minimum 3 characters

  // Count frequencies and track positions
  const wordMap = new Map<string, { frequency: number; positions: number[] }>();
  let position = 0;

  for (const word of words) {
    const existing = wordMap.get(word);
    if (existing) {
      existing.frequency++;
      existing.positions.push(position);
    } else {
      wordMap.set(word, { frequency: 1, positions: [position] });
    }
    position++;
  }

  // Calculate scores (frequency + length bonus)
  const keywords: Keyword[] = Array.from(wordMap.entries()).map(([word, data]) => {
    // Score: frequency * (1 + log(word_length))
    const score = data.frequency * (1 + Math.log(word.length));
    return {
      word,
      frequency: data.frequency,
      score,
      positions: data.positions
    };
  });

  // Sort by score descending and return top N
  return keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Calculate relevance score for chunk based on query
 * @param chunkText - Chunk text to search in
 * @param query - Search query
 * @param chunkType - Type of chunk (for weighting)
 * @returns Relevance score (0-1)
 */
export function calculateRelevanceScore(
  chunkText: string,
  query: string,
  chunkType: string
): number {
  if (!chunkText || !query) {
    return 0;
  }

  const chunkLower = chunkText.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);

  if (queryTerms.length === 0) {
    return 0;
  }

  let score = 0;
  let matchedTerms = 0;

  for (const term of queryTerms) {
    // Exact match bonus
    if (chunkLower.includes(term)) {
      const termFrequency = (chunkLower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
      score += termFrequency * 0.3;
      matchedTerms++;
    }

    // Word boundary match bonus
    const wordBoundaryRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const wordBoundaryMatches = (chunkText.match(wordBoundaryRegex) || []).length;
    if (wordBoundaryMatches > 0) {
      score += wordBoundaryMatches * 0.5;
      matchedTerms++;
    }
  }

  // Chunk type weighting (abstract/introduction get higher weight)
  const typeWeight = getTypeWeight(chunkType);
  score *= typeWeight;

  // Normalize by query terms (prefer chunks that match more terms)
  const matchRatio = matchedTerms / queryTerms.length;
  score *= matchRatio;

  // Normalize to 0-1 range (using sigmoid-like function)
  return Math.min(score / (1 + score), 1);
}

/**
 * Get weight multiplier for chunk type
 * @param chunkType - Type of chunk
 * @returns Weight multiplier
 */
function getTypeWeight(chunkType: string): number {
  const weights: Record<string, number> = {
    abstract: 1.5,
    introduction: 1.3,
    literature_review: 1.2,
    methods: 1.0,
    results: 1.2,
    discussion: 1.1,
    conclusion: 1.4,
    references: 0.5,
    appendix: 0.7,
    unknown: 1.0
  };

  return weights[chunkType] || 1.0;
}

/**
 * Generate highlight snippet around matched terms
 * @param text - Full text
 * @param query - Search query
 * @param contextChars - Number of characters before/after match
 * @returns Highlight snippet with matches emphasized
 */
export function generateHighlight(
  text: string,
  query: string,
  contextChars: number = 100
): string {
  if (!text || !query) {
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  const textLower = text.toLowerCase();

  // Find first match position
  let firstMatchPos = -1;
  let matchedTerm = '';

  for (const term of queryTerms) {
    const pos = textLower.indexOf(term);
    if (pos !== -1 && (firstMatchPos === -1 || pos < firstMatchPos)) {
      firstMatchPos = pos;
      matchedTerm = term;
    }
  }

  // If no match, return beginning
  if (firstMatchPos === -1) {
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }

  // Calculate snippet bounds
  const start = Math.max(0, firstMatchPos - contextChars);
  const end = Math.min(text.length, firstMatchPos + matchedTerm.length + contextChars);

  let snippet = text.substring(start, end);

  // Add ellipsis if needed
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Normalize query by removing stopwords and stemming
 * @param query - Raw search query
 * @returns Normalized query terms
 */
export function normalizeQuery(query: string): string[] {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'it', 'its', 'we', 'you', 'he', 'she', 'they'
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !stopwords.has(word));
}
