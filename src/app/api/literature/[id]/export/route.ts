import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { literature } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  toBibTeX,
  toEndNote,
  toRIS,
  toPlainText,
  getFileExtension,
  getMimeType,
} from '@/lib/citation-formats';

interface CitationData {
  title: string;
  authors: Array<{ name: string }>;
  publication_date: string | null;
  journal: string | null;
  doi: string | null;
  url: string | null;
  abstract?: string | null;
  keywords?: string[];
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  source?: string;
  type?: string;
}

/**
 * Format authors for citation
 */
function formatAuthors(authors: Array<{ name: string }>, format: 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver'): string {
  if (!authors || authors.length === 0) return 'Unknown Author';

  switch (format) {
    case 'apa':
      if (authors.length === 1) {
        return formatSingleAuthor(authors[0].name, 'apa');
      } else if (authors.length === 2) {
        return `${formatSingleAuthor(authors[0].name, 'apa')} & ${formatSingleAuthor(authors[1].name, 'apa')}`;
      } else if (authors.length <= 20) {
        const formatted = authors.slice(0, -1).map(a => formatSingleAuthor(a.name, 'apa')).join(', ');
        return `${formatted}, & ${formatSingleAuthor(authors[authors.length - 1].name, 'apa')}`;
      } else {
        // More than 20 authors: list first 19, then ... then last author
        const first19 = authors.slice(0, 19).map(a => formatSingleAuthor(a.name, 'apa')).join(', ');
        return `${first19}, ... ${formatSingleAuthor(authors[authors.length - 1].name, 'apa')}`;
      }

    case 'mla':
      if (authors.length === 1) {
        return formatSingleAuthor(authors[0].name, 'mla');
      } else if (authors.length === 2) {
        return `${formatSingleAuthor(authors[0].name, 'mla')}, and ${formatSingleAuthor(authors[1].name, 'mla')}`;
      } else if (authors.length <= 3) {
        const formatted = authors.slice(0, -1).map(a => formatSingleAuthor(a.name, 'mla')).join(', ');
        return `${formatted}, and ${formatSingleAuthor(authors[authors.length - 1].name, 'mla')}`;
      } else {
        // More than 3 authors: use et al.
        return `${formatSingleAuthor(authors[0].name, 'mla')}, et al.`;
      }

    case 'chicago':
      if (authors.length === 1) {
        return formatSingleAuthor(authors[0].name, 'chicago');
      } else if (authors.length === 2) {
        return `${formatSingleAuthor(authors[0].name, 'chicago')} and ${formatSingleAuthor(authors[1].name, 'chicago')}`;
      } else if (authors.length === 3) {
        return `${formatSingleAuthor(authors[0].name, 'chicago')}, ${formatSingleAuthor(authors[1].name, 'chicago')}, and ${formatSingleAuthor(authors[2].name, 'chicago')}`;
      } else if (authors.length <= 10) {
        const formatted = authors.slice(0, -1).map(a => formatSingleAuthor(a.name, 'chicago')).join(', ');
        return `${formatted}, and ${formatSingleAuthor(authors[authors.length - 1].name, 'chicago')}`;
      } else {
        // More than 10 authors: use et al.
        return `${formatSingleAuthor(authors[0].name, 'chicago')} et al.`;
      }

    case 'harvard':
      if (authors.length === 1) {
        return formatSingleAuthor(authors[0].name, 'harvard');
      } else if (authors.length === 2) {
        return `${formatSingleAuthor(authors[0].name, 'harvard')} and ${formatSingleAuthor(authors[1].name, 'harvard')}`;
      } else if (authors.length === 3) {
        return `${formatSingleAuthor(authors[0].name, 'harvard')}, ${formatSingleAuthor(authors[1].name, 'harvard')} and ${formatSingleAuthor(authors[2].name, 'harvard')}`;
      } else {
        // More than 3 authors: use et al.
        return `${formatSingleAuthor(authors[0].name, 'harvard')} et al.`;
      }

    case 'vancouver':
      return authors.map(a => formatSingleAuthor(a.name, 'vancouver')).join(', ');

    default:
      return authors.map(a => a.name).join(', ');
  }
}

/**
 * Format single author name for different citation styles
 */
function formatSingleAuthor(name: string, format: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'Unknown';

  const lastName = parts[parts.length - 1];
  const firstNames = parts.slice(0, -1);

  switch (format) {
    case 'apa':
      return `${lastName}, ${firstNames.map(n => n[0]).join('. ')}${firstNames.length > 0 ? '.' : ''}`;

    case 'mla':
      return `${lastName}, ${firstNames.join(' ')}`;

    case 'chicago':
      return `${lastName}, ${firstNames.join(' ')}`;

    case 'harvard':
      return `${lastName}, ${firstNames.map(n => n[0]).join('. ')}${firstNames.length > 0 ? '.' : ''}`;

    case 'vancouver':
      return `${lastName} ${firstNames.map(n => n[0]).join('')}`;

    default:
      return name;
  }
}

/**
 * Convert title to sentence case (only first word and proper nouns capitalized)
 */
function toSentenceCase(title: string): string {
  // For now, just lowercase everything except first word
  const words = title.trim().split(/\s+/);
  if (words.length === 0) return '';
  return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase() +
    words.slice(1).join(' ').toLowerCase();
}

/**
 * Generate APA citation (7th edition)
 * Format: Author, A. A., & Author, B. B. (Year). Title of article. Journal Name, Volume(Issue), pages.
 */
function generateAPA(data: CitationData): string {
  const authors = formatAuthors(data.authors, 'apa');
  const year = data.publication_date ? new Date(data.publication_date).getFullYear() : 'n.d.';
  const title = toSentenceCase(data.title);
  const journal = data.journal || '';
  const volume = data.volume || '';
  const issue = data.issue || '';
  const pages = data.pages || '';

  let citation = `${authors} (${year}). ${title}.`;

  if (journal) {
    citation += ` ${journal}`;
    if (volume) {
      citation += `, ${volume}`;
      if (issue) {
        citation += `(${issue})`;
      }
      if (pages) {
        citation += `, ${pages}`;
      }
    }
  }

  if (data.doi) {
    citation += `. https://doi.org/${data.doi}`;
  }

  return citation;
}

/**
 * Generate MLA citation (9th edition)
 * Format: Author Last, First, et al. "Article title." Journal Name Volume.Issue (Year): pages.
 */
function generateMLA(data: CitationData): string {
  const authors = formatAuthors(data.authors, 'mla');
  const year = data.publication_date ? new Date(data.publication_date).getFullYear() : '';
  const title = `"${toSentenceCase(data.title)}"`;
  const journal = data.journal || '';
  const volume = data.volume || '';
  const issue = data.issue || '';
  const pages = data.pages || '';

  let citation = `${authors}. ${title}`;

  if (journal) {
    citation += ` ${journal}`;
    if (volume) {
      citation += ` ${volume}`;
      if (issue) {
        citation += `.${issue}`;
      }
      if (year) {
        citation += ` (${year})`;
      }
      if (pages) {
        citation += `: ${pages}`;
      }
    }
  }

  return citation + '.';
}

/**
 * Generate Chicago citation (author-date style)
 * Format: Author Last Name, First Name, and Author Next Name. Year. "Article title." Journal Name Volume, no. Issue (Year): pages.
 */
function generateChicago(data: CitationData): string {
  const authors = formatAuthors(data.authors, 'chicago');
  const year = data.publication_date ? new Date(data.publication_date).getFullYear() : '';
  const title = `"${toSentenceCase(data.title)}"`;
  const journal = data.journal || '';
  const volume = data.volume || '';
  const issue = data.issue || '';
  const pages = data.pages || '';

  let citation = `${authors}. ${year}. ${title}`;

  if (journal) {
    citation += ` ${journal}`;
    if (volume) {
      citation += ` ${volume}`;
      if (issue) {
        citation += `, no. ${issue}`;
      }
      if (year) {
        citation += ` (${year})`;
      }
      if (pages) {
        citation += `: ${pages}`;
      }
    }
  }

  return citation + '.';
}

/**
 * Generate Harvard citation
 * Format: Author, A., Author, B., and Author, C. (Year) 'Article title', Journal Name, Volume(Issue), pp.pages.
 */
function generateHarvard(data: CitationData): string {
  const authors = formatAuthors(data.authors, 'harvard');
  const year = data.publication_date ? new Date(data.publication_date).getFullYear() : '';
  const title = `'${toSentenceCase(data.title)}'`;
  const journal = data.journal || '';
  const volume = data.volume || '';
  const issue = data.issue || '';
  const pages = data.pages || '';

  let citation = `${authors} (${year}) ${title}`;

  if (journal) {
    citation += `, ${journal}`;
    if (volume) {
      citation += `, ${volume}`;
      if (issue) {
        citation += `(${issue})`;
      }
      if (pages) {
        citation += `, pp.${pages}`;
      }
    }
  }

  return citation + '.';
}

/**
 * Generate Vancouver citation
 * Format: Author(s). Article title. Journal Name. Year Month;Volume(Issue):Page range.
 */
function generateVancouver(data: CitationData): string {
  const authors = formatAuthors(data.authors, 'vancouver');
  const pubDate = data.publication_date ? new Date(data.publication_date) : null;
  const year = pubDate ? pubDate.getFullYear() : '';
  const month = pubDate ? pubDate.toLocaleString('en-US', { month: 'short' }).replace('.', '') : '';
  const title = toSentenceCase(data.title);
  const journal = data.journal || '';
  const volume = data.volume || '';
  const issue = data.issue || '';
  const pages = data.pages || '';

  let citation = `${authors}. ${title}`;

  if (journal && year) {
    citation += `. ${journal}`;
    if (volume) {
      const dateStr = month ? `${year} ${month}` : `${year}`;
      citation += `. ${dateStr}`;
      citation += `;${volume}`;
      if (issue) {
        citation += `(${issue})`;
      }
      if (pages) {
        // Convert page range like "339-343" to "339-43"
        const simplifiedPages = pages.replace(/^(\d+)-(\d+)$/, (match, p1, p2) => {
          const end = p2.startsWith('0') ? p2.slice(0, -1) : p2;
          return `${p1}-${end}`;
        });
        citation += `:${simplifiedPages}`;
      }
    }
  }

  return citation + '.';
}

/**
 * Generate BibTeX citation
 */
function generateBibTeX(data: CitationData, id: string): string {
  const authors = data.authors.map(a => {
    const parts = a.name.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];
    const firstNames = parts.slice(0, -1).join(' ');
    return `${lastName}, ${firstNames}`;
  }).join(' and ');

  const year = data.publication_date ? new Date(data.publication_date).getFullYear() : 'n.d.';
  const title = data.title;
  const journal = data.journal || '';

  let bibtex = `@article{citation${id},\n`;
  bibtex += `  author = {${authors}},\n`;
  bibtex += `  title = {${title}},\n`;

  if (journal) {
    bibtex += `  journal = {${journal}},\n`;
  }

  if (year) {
    bibtex += `  year = {${year}},\n`;
  }

  if (data.doi) {
    bibtex += `  doi = {${data.doi}},\n`;
  }

  if (data.url) {
    bibtex += `  url = {${data.url}},\n`;
  }

  bibtex = bibtex.slice(0, -2) + '\n}';

  return bibtex;
}

/**
 * GET /api/literature/[id]/export - Export citation in various formats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const literatureId = parseInt(params.id);
    if (isNaN(literatureId)) {
      return NextResponse.json({ error: 'Invalid literature ID' }, { status: 400 });
    }

    const format = (request.nextUrl.searchParams.get('format') || 'bibtex') as
      'bibtex' | 'endnote' | 'ris' | 'plain' | 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver';

    // Fetch literature data
    const items = await db
      .select()
      .from(literature)
      .where(eq(literature.id, literatureId))
      .limit(1);

    if (items.length === 0) {
      return NextResponse.json({ error: 'Literature not found' }, { status: 404 });
    }

    const item = items[0];

    // Parse authors and keywords
    let authors: Array<{ name: string }> = [];
    try {
      authors = JSON.parse(item.authors || '[]');
    } catch {
      authors = [];
    }

    let keywords: string[] = [];
    try {
      keywords = item.keywords ? JSON.parse(item.keywords) : [];
    } catch {
      keywords = [];
    }

    // Prepare data for citation formatter
    const data = {
      id: item.id,
      title: item.title || 'Untitled',
      authors,
      abstract: item.abstract,
      doi: item.doi,
      publication_date: item.publication_date,
      journal: item.journal,
      volume: item.volume,
      issue: item.issue,
      pages: item.pages,
      source: item.source,
      type: item.source === 'arxiv' ? 'preprint' : 'journal-article',
      keywords,
      url: item.pdf_url,
    };

    // Generate citation in requested format
    let citation: string;
    switch (format) {
      case 'bibtex':
        citation = toBibTeX(data);
        break;
      case 'endnote':
        citation = toEndNote(data);
        break;
      case 'ris':
        citation = toRIS(data);
        break;
      case 'plain':
        citation = toPlainText(data);
        break;
      case 'apa':
        citation = generateAPA(data);
        break;
      case 'mla':
        citation = generateMLA(data);
        break;
      case 'chicago':
        citation = generateChicago(data);
        break;
      case 'harvard':
        citation = generateHarvard(data);
        break;
      case 'vancouver':
        citation = generateVancouver(data);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    // Return as downloadable file
    const filename = `citation_${literatureId}${getFileExtension(format)}`;

    return new NextResponse(citation, {
      status: 200,
      headers: {
        'Content-Type': getMimeType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error('Export citation error:', errorMsg);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
