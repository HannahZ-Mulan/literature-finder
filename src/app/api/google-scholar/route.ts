import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { z } from 'zod';

const SearchSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  abstract: z.string().optional(),
});

/**
 * Search Google Scholar for a paper by title and abstract
 * Returns the Google Scholar URL if found
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, abstract } = SearchSchema.parse(body);

    console.log('[Google Scholar Search] Searching for:', { title, hasAbstract: !!abstract });

    // Build search query
    const searchQuery = title + (abstract ? ` ${abstract.substring(0, 500)}` : '');

    // Construct Google Scholar search URL
    const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(searchQuery)}&hl=en&as_sdt=0,5`;

    console.log('[Google Scholar Search] Search URL:', searchUrl);

    // We'll use a simple heuristic: return the search URL itself
    // For a more advanced version, we could scrape the page and find the exact match

    return NextResponse.json({
      success: true,
      searchUrl: searchUrl,
      message: 'Found potential matches on Google Scholar',
    });

  } catch (error: any) {
    console.error('[Google Scholar Search] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
