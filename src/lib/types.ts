// Core literature data structure that unifies all database sources
export interface Literature {
  id: string;
  title: string;
  authors: Author[];
  abstract: string;
  publishedDate: string;
  journal?: string;
  conference?: string;
  doi?: string;
  citationCount?: number;
  keywords?: string[];
  source: LiteratureSource;
  sourceUrl?: string;
  pdfUrl?: string;
  categories?: string[];
}

export interface Author {
  name: string;
  affiliation?: string;
}

export type LiteratureSource = 'arxiv' | 'pubmed' | 'semantic-scholar' | 'openalex' | 'doi';

// Search parameters
export interface SearchParams {
  query: string;
  source?: LiteratureSource;
  field?: SearchField;
  yearStart?: number;
  yearEnd?: number;
  maxResults?: number;
  offset?: number;
}

export type SearchField = 'all' | 'title' | 'author' | 'abstract' | 'doi' | 'keywords';

// Search results
export interface SearchResults {
  papers: Literature[];
  totalCount: number;
  offset: number;
  source: LiteratureSource;
}

// API error handling
export interface ApiError {
  code: string;
  message: string;
  source: LiteratureSource;
  retryable: boolean;
}

// Rate limiting info
export interface RateLimitInfo {
  remaining: number;
  resetAt?: Date;
}

// arXiv specific types
export interface ArXivRawEntry {
  id: string;
  updated: string;
  published: string;
  title: string;
  summary: string;
  authors: Array<{ name: string; affiliation?: string }>;
  doi?: string;
  comment?: string;
  journal_ref?: string;
  primary_category: { term: string };
  categories: Array<{ term: string }>;
  links: Array<{ rel: string; href: string; type?: string }>;
}

// PubMed specific types
export interface PubMedRawEntry {
  uid: string;
  title: string;
  abstract?: string;
  authors?: Array<{ name: string; affiliation?: string }>;
  journal?: { name: string; date: string };
  publicationDate?: string;
  doi?: string;
  citationCount?: number;
  keywords?: Array<{ name: string }>;
}

// Semantic Scholar specific types
export interface SemanticScholarRawEntry {
  paperId: string;
  title: string;
  abstract?: string;
  authors?: Array<{ name: string; affiliation?: string }>;
  year?: number;
  journal?: { name: string };
  venue?: string;
  publicationDate?: string;
  citationCount?: number;
  doi?: string;
  openAccessPdf?: { url: string };
  externalIds?: {
    ArXiv?: string;
    PubMed?: string;
    DOI?: string;
  };
}

// OpenAlex specific types
export interface OpenAlexRawEntry {
  id: string;
  title: string;
  abstract?: string;
  indexed_abstract?: string;
  publication_date?: string;
  publication_year?: number;
  cited_by_count?: number;
  doi?: string;
  ids?: {
    doi?: string;
    pmid?: string;
    pmcid?: string;
    arxiv?: string;
  };
  type?: string;
  authorships?: Array<{
    author?: {
      display_name: string;
      id?: string;
      orcid?: string;
    };
    institutions?: Array<{
      display_name: string;
      id?: string;
      type?: string;
    }>;
    raw_author_name?: string;
  }>;
  primary_location?: {
    source?: {
      display_name: string;
      id?: string;
      type?: string;
    };
    pdf_url?: string;
    landing_page_url?: string;
  };
  best_oa_location?: {
    pdf_url?: string;
    landing_page_url?: string;
    source?: {
      display_name: string;
    };
  };
  host_venue?: {
    display_name: string;
    type?: string;
  };
  concepts?: Array<{
    display_name: string;
    id?: string;
    wikidata?: string;
    level?: number;
    score?: number;
  }>;
  referenced_works?: string[];
  related_works?: string[];
}

// Unified search response for internal use
export interface UnifiedSearchParams {
  query: string;
  sources?: LiteratureSource[];
  field?: SearchField;
  yearStart?: number;
  yearEnd?: number;
  maxResults?: number;
  offset?: number;
}
