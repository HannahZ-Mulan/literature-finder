import { NextRequest, NextResponse } from 'next/server';
import { getUnpaywallPdf } from '@/lib/api/unpaywall';

/**
 * GET /api/literature/pdf?doi=10.1234/abc
 *
 * Look up a legal open-access PDF URL for a DOI via Unpaywall.
 * Used by the search results "找PDF" button on demand (one lookup per click),
 * so we don't fan out N requests during every search.
 */
export async function GET(request: NextRequest) {
  try {
    const doi = request.nextUrl.searchParams.get('doi')?.trim();

    if (!doi) {
      return NextResponse.json(
        { error: 'Missing doi parameter' },
        { status: 400 }
      );
    }

    const pdfUrl = await getUnpaywallPdf(doi);

    if (!pdfUrl) {
      // No OA copy found — this is a normal outcome, not an error.
      return NextResponse.json({
        found: false,
        message: '未找到合法开放获取的 PDF。该论文可能需要通过机构订阅访问。',
      });
    }

    return NextResponse.json({ found: true, pdfUrl });
  } catch (error) {
    console.error('PDF lookup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to look up PDF' },
      { status: 500 }
    );
  }
}
