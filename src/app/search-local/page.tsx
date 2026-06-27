'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search,
  Sparkles,
  Loader2,
  ArrowRight,
  FileText,
  Lightbulb,
  CornerDownLeft,
} from 'lucide-react';

interface SearchResultItem {
  chunkId: number;
  paperId: number;
  chunkType: string;
  chunkText: string;
  relevanceScore: number;
  matchedKeywords: string[];
  highlight?: { preview?: string } | string;
  matchChannels?: ('keyword' | 'semantic')[];
  rrfScore?: number;
  semanticOnly?: boolean;
}

interface SearchResponse {
  results: SearchResultItem[];
  totalResults: number;
  query: string;
  queryTerms: string[];
  matchType?: 'hybrid' | 'keyword-only' | 'semantic-only' | 'none';
  error?: string;
}

// Suggested natural-language queries to demonstrate semantic capability.
const SUGGESTIONS = [
  '做善事会不会让人更快乐',
  '研究方法用了什么统计技术',
  'what are the limitations of this study',
  '如何分析定性数据',
];

// Map chunk types to readable labels (handles the 'unknown' majority gracefully).
const CHUNK_TYPE_LABEL: Record<string, string> = {
  abstract: '摘要',
  introduction: '引言',
  methods: '方法',
  results: '结果',
  discussion: '讨论',
  conclusion: '结论',
  references: '参考文献',
  literature_review: '文献综述',
  unknown: '正文',
};

function formatHighlight(h: SearchResultItem['highlight']): string {
  if (!h) return '';
  if (typeof h === 'string') return h;
  return h.preview || '';
}

export default function SearchLocalPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [matchType, setMatchType] = useState<SearchResponse['matchType']>();
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSuggestion(text: string) {
    setQuery(text);
    // Run search directly with the suggested text (don't rely on `query` state,
    // which updates asynchronously and can't be read synchronously here).
    void runSearchWith(text);
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError('请输入至少 2 个字符');
      return;
    }
    setError('');
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch('/api/search/chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 15 }),
      });
      const data: SearchResponse = await res.json();
      if (!res.ok) throw new Error(data.error || '搜索失败');
      setResults(data.results || []);
      setTotalResults(data.totalResults || 0);
      setMatchType(data.matchType);
    } catch (err: any) {
      setError(err.message || '搜索失败,请重试');
      setResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  }

  async function runSearchWith(q: string) {
    if (q.trim().length < 2) return;
    setError('');
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch('/api/search/chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 15 }),
      });
      const data: SearchResponse = await res.json();
      if (!res.ok) throw new Error(data.error || '搜索失败');
      setResults(data.results || []);
      setTotalResults(data.totalResults || 0);
      setMatchType(data.matchType);
    } catch (err: any) {
      setError(err.message || '搜索失败,请重试');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  const matchTypeLabel: Record<string, { text: string; color: string }> = {
    hybrid: { text: '混合匹配 · 关键词 + 语义', color: 'text-sage-600' },
    'keyword-only': { text: '关键词匹配', color: 'text-muted-foreground' },
    'semantic-only': { text: '语义匹配', color: 'text-accent' },
    none: { text: '无匹配', color: 'text-muted-foreground' },
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage:
          'radial-gradient(900px 500px at 50% -10%, hsl(45 80% 85% / 0.4) 0%, transparent 55%)',
      }}
    >
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            语义搜索 · Semantic Search
          </div>
          <h1 className="font-serif text-4xl font-medium mb-3">
            在我的论文库里,用<em className="italic text-accent">自己的话</em>找文献
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            不必记论文的精确措辞。用自然语言描述你想找的内容——AI 会理解语义,
            在你上传的论文全文里匹配相关段落。
          </p>
        </div>

        {/* Search box — flex layout to avoid overlay stacking issues */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="用自然语言描述你想找的内容… 例如:做善事会不会让人更快乐"
              className="pl-12 h-14 text-base rounded-xl border-border shadow-sm focus-visible:ring-accent"
              disabled={isSearching}
            />
          </div>
          <Button
            type="submit"
            disabled={isSearching || query.trim().length < 2}
            className="h-14 px-6 rounded-xl shrink-0"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                搜索 <CornerDownLeft className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </form>

        {/* Suggestions (before first search) */}
        {!hasSearched && !isSearching && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="w-4 h-4 text-accent" />
              试试这些自然语言提问:
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:border-accent hover:text-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5 mt-4">
            <CardContent className="py-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Results header */}
        {hasSearched && !error && (
          <div className="flex items-center justify-between mb-4 mt-6">
            <p className="text-sm text-muted-foreground">
              {isSearching ? '搜索中…' : `找到 ${totalResults} 条结果`}
            </p>
            {matchType && matchTypeLabel[matchType] && (
              <span className={`text-xs font-medium ${matchTypeLabel[matchType].color}`}>
                {matchTypeLabel[matchType].text}
              </span>
            )}
          </div>
        )}

        {/* Results */}
        {hasSearched && !isSearching && results.length > 0 && (
          <div className="space-y-3">
            {results.map((r) => {
              const preview = formatHighlight(r.highlight) || r.chunkText;
              const isSemantic = r.semanticOnly;
              return (
                <Card
                  key={r.chunkId}
                  className="group cursor-pointer hover:border-accent/50 hover:shadow-md transition-all"
                  onClick={() => router.push(`/paper/${r.paperId}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                          {CHUNK_TYPE_LABEL[r.chunkType] || r.chunkType}
                        </span>
                        {isSemantic && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-accent/15 text-accent">
                            <Sparkles className="w-3 h-3" />
                            语义命中
                          </span>
                        )}
                        {r.matchChannels?.includes('keyword') && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-sage-100 text-sage-700">
                            关键词命中
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {(r.rrfScore ?? r.relevanceScore).toFixed(3)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90 line-clamp-3">
                      {preview.slice(0, 240)}
                      {preview.length > 240 ? '…' : ''}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        论文 #{r.paperId}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground group-hover:text-accent h-7"
                      >
                        阅读全文 <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {hasSearched && !isSearching && results.length === 0 && !error && (
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground mb-1">没有找到相关段落</p>
              <p className="text-sm text-muted-foreground/70">
                试试换个说法,或用更具体的研究概念描述
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
