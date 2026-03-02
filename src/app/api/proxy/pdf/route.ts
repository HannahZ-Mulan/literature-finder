import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // 验证URL是否来自允许的域名（防止SSRF攻击）
    const allowedHosts = [
      'arxiv.org',
      'www.arxiv.org',
      'export.arxiv.org',
      'biorxiv.org',
      'www.biorxiv.org',
      'medrxiv.org',
      'www.medrxiv.org',
      'pnas.org',
      'www.pnas.org',
      'nature.com',
      'science.org',
      'sciencedirect.com',
      'ieee.org',
      'acm.org',
      'springer.com',
      'springerlink.com',
      'tandfonline.com',
      'wiley.com',
      'oxfordacademic.com',
      // 添加更多可信的学术来源
    ];

    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const isAllowed = allowedHosts.some(host => urlObj.hostname === host || urlObj.hostname.endsWith('.' + host));
    if (!isAllowed) {
      return NextResponse.json({ error: 'URL is not from an allowed source' }, { status: 403 });
    }

    console.log(`[PDF Proxy] Fetching PDF from: ${url}`);

    // 从原始URL获取PDF，使用更长的超时时间
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,*/*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[PDF Proxy] Failed to fetch: ${response.status} ${response.statusText}`);
        return NextResponse.json(
          { error: `Failed to fetch PDF: ${response.statusText}` },
          { status: response.status }
        );
      }

      // 获取PDF内容
      const pdfBuffer = await response.arrayBuffer();
      console.log(`[PDF Proxy] Successfully fetched PDF, size: ${pdfBuffer.byteLength} bytes`);

      // 返回PDF内容并设置正确的CORS头
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${encodeURIComponent(urlObj.pathname.split('/').pop() || 'paper.pdf')}"`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400', // 缓存24小时
          'Content-Length': pdfBuffer.byteLength.toString(),
        },
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[PDF Proxy] Request timeout');
        return NextResponse.json({ error: 'Request timeout - PDF file too large or server too slow' }, { status: 504 });
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[PDF Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to proxy PDF' },
      { status: 500 }
    );
  }
}

// 支持OPTIONS请求（CORS preflight）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Max-Age': '86400',
    },
  });
}
