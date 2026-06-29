'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchResultsSkeleton } from '@/components/search-result-skeleton';
import { Loader2, ChevronLeft, ChevronRight, Filter, X, History, Check, FileText, Search } from 'lucide-react';
import { QuickNoteDialog } from '@/components/notes/QuickNoteDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type SortOption = 'relevance' | 'date' | 'date_asc' | 'citations';
type FieldOption = 'all' | 'title' | 'abstract' | 'author' | 'doi' | 'keywords';
type SourceOption = 'arxiv' | 'pubmed' | 'semantic-scholar' | 'openalex' | 'all';

interface SearchResult {
  source: string;
  papers: Paper[];
  totalCount: number;
  offset: number;
}

interface Paper {
  id: string;
  title: string;
  authors: Array<{ name: string; affiliation?: string }>;
  abstract: string;
  publishedDate: string;
  journal?: string;
  doi?: string;
  citationCount?: number;
  keywords?: string[];
  pdfUrl?: string;
}

export default function AcademicSearchPage() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isMountedRef = useRef(true);

  // Search state
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<SourceOption>('openalex');
  const [field, setField] = useState<FieldOption>('all');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [maxResults, setMaxResults] = useState(50);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [offset, setOffset] = useState(0);

  // Results state
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // UI state
  const [savingId, setSavingId] = useState<string | number>('');
  const [savedLiteratureIds, setSavedLiteratureIds] = useState<Record<string, number>>({});
  const [exportFormat, setExportFormat] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Chinese query translation suggestion state
  const [translatedTerms, setTranslatedTerms] = useState<string[]>([]);
  const [isTranslatingQuery, setIsTranslatingQuery] = useState(false);

  // Quick note dialog state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedLiteratureId, setSelectedLiteratureId] = useState<number | null>(null);

  // Search history state
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; source: string; created_at: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Restore search state from URL params and sessionStorage on mount
  useEffect(() => {
    if (user) {
      loadSearchHistory();
    }

    // Get URL params
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    const urlSource = params.get('source') as SourceOption || 'all';
    const urlField = params.get('field') as FieldOption || 'all';
    const urlSortBy = params.get('sortBy') as SortOption || 'relevance';
    const urlYearStart = params.get('yearStart');
    const urlYearEnd = params.get('yearEnd');

    if (urlQuery) {
      setQuery(urlQuery);
      setSource(urlSource);
      if (urlField !== 'all') setField(urlField);
      setSortBy(urlSortBy);
      if (urlYearStart) setYearStart(urlYearStart);
      if (urlYearEnd) setYearEnd(urlYearEnd);

      // Auto-execute search if coming from details page
      const shouldSearch = sessionStorage.getItem('shouldSearchOnReturn');
      if (shouldSearch === 'true') {
        sessionStorage.removeItem('shouldSearchOnReturn');
        // Small delay to ensure state is set
        setTimeout(() => {
          handleSearch(0, {
            query: urlQuery,
            source: urlSource,
            field: urlField,
            sortBy: urlSortBy,
            yearStart: urlYearStart || undefined,
            yearEnd: urlYearEnd || undefined,
          });
        }, 100);
      } else {
        // Just restore state, don't search
        const savedResults = sessionStorage.getItem('searchResults');
        if (savedResults) {
          setResults(JSON.parse(savedResults));
        }
      }
    } else {
      // Restore from sessionStorage if no URL params
      const savedSearch = sessionStorage.getItem('searchState');
      if (savedSearch) {
        const state = JSON.parse(savedSearch);
        setQuery(state.query || '');
        setSource(state.source || 'all');
        setField(state.field || 'all');
        setResults(state.results || []);
        setOffset(state.offset || 0);
      }
    }
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe toast wrapper to avoid calling after unmount
  const safeToast = (props: Parameters<typeof toast>[0]) => {
    if (isMountedRef.current) {
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          toast(props);
        }
      });
    }
  };

  const loadSearchHistory = async () => {
    try {
      const response = await fetch('/api/search-history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.search_history || []);
      }
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  };

  // Translate Chinese query to English terms (async, does not block search)
  const translateQuerySuggestion = async (q: string) => {
    if (!/[\u4e00-\u9fa5]/.test(q)) {
      setTranslatedTerms([]);
      return;
    }
    setIsTranslatingQuery(true);
    try {
      const response = await fetch('/api/translate-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await response.json();
      if (response.ok && data.terms?.length > 0) {
        setTranslatedTerms(data.terms);
      } else {
        setTranslatedTerms([]);
      }
    } catch (err) {
      console.error('Translate query failed:', err);
      setTranslatedTerms([]);
    } finally {
      setIsTranslatingQuery(false);
    }
  };

  // Apply a suggested English term: fill the box and re-search
  const handleUseEnglishTerm = (term: string) => {
    setQuery(term);
    setTranslatedTerms([]);
    handleSearch(0, { query: term });
  };

  const handleSearch = async (newOffset = 0, overrideParams?: any) => {
    const searchQuery = overrideParams?.query || query;
    if (!searchQuery.trim()) {
      setError('请输入搜索关键词');
      return;
    }

    setIsSearching(true);
    setError('');

    // Fire Chinese→English translation suggestion (does not block the search)
    translateQuerySuggestion(searchQuery);

    // Update URL with search params
    const params = new URLSearchParams();
    params.set('q', searchQuery);
    params.set('source', overrideParams?.source || source);
    if ((overrideParams?.field || field) !== 'all') {
      params.set('field', overrideParams?.field || field);
    }
    params.set('sortBy', overrideParams?.sortBy || sortBy);
    if (overrideParams?.yearStart || yearStart) {
      params.set('yearStart', overrideParams?.yearStart || yearStart);
    }
    if (overrideParams?.yearEnd || yearEnd) {
      params.set('yearEnd', overrideParams?.yearEnd || yearEnd);
    }

    // Update URL without reloading
    window.history.replaceState(null, '', `/search?${params.toString()}`);

    try {
      const requestBody: any = {
        query: searchQuery.trim(),
        source: overrideParams?.source || source,
        maxResults,
        field: overrideParams?.field || field,
        sortBy: overrideParams?.sortBy || sortBy,
        offset: newOffset,
      };

      // Add year filters if provided
      if (overrideParams?.yearStart || yearStart) {
        requestBody.yearStart = parseInt(overrideParams?.yearStart || yearStart);
      }
      if (overrideParams?.yearEnd || yearEnd) {
        requestBody.yearEnd = parseInt(overrideParams?.yearEnd || yearEnd);
      }

      const response = await fetch('/api/literature/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      const newResults = data.results || [];
      setResults(newOffset === 0 ? newResults : [...results, ...newResults]);
      setTotalCount(data.summary?.total || 0);
      setHasMore(data.pagination?.hasMore || false);
      setOffset(newOffset);

      // Save results to sessionStorage
      sessionStorage.setItem('searchResults', JSON.stringify(newOffset === 0 ? newResults : [...results, ...newResults]));

      // Reload search history to include this search
      loadSearchHistory();
    } catch (err: any) {
      setError(err.message || '搜索失败，请重试');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = () => {
    handleSearch(offset + maxResults);
  };

  const handleSave = async (paper: Paper, result: SearchResult, index: number) => {
    setSavingId(paper.id || index);

    const literatureData = {
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      doi: paper.doi,
      publication_date: paper.publishedDate,
      journal: paper.journal,
      citation_count: paper.citationCount,
      source: result.source,
      keywords: paper.keywords,
      pdf_url: paper.pdfUrl,
    };

    try {
      const response = await fetch('/api/literature/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(literatureData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Save failed');
      }

      // Store the literature ID for later use
      const paperKey = paper.id || `${result.source}-${index}`;
      setSavedLiteratureIds(prev => ({
        ...prev,
        [paperKey]: data.literature.id
      }));

      // Handle duplicate detection
      if (data.message === 'duplicate') {
        if (data.duplicateType === 'doi') {
          safeToast({
            title: "文献已存在",
            description: "这篇文献（相同DOI）已经在您的文献库中了",
          });
        } else if (data.duplicateType === 'title') {
          safeToast({
            title: "发现相似文献",
            description: `文献库中已有相似文献: "${data.similarTitle?.substring(0, 50)}..."`,
          });
        }
      } else if (data.message === 'added_from_existing') {
        if (data.duplicateType === 'doi') {
          safeToast({
            title: "已添加到文献库",
            description: "从现有文献添加（相同DOI）",
          });
        } else if (data.duplicateType === 'title') {
          safeToast({
            title: "已添加到文献库",
            description: "从现有相似文献添加",
          });
        }
      } else {
        safeToast({
          title: "保存成功",
          description: "文献已添加到您的文献库",
        });
      }

      return data.literature.id;
    } catch (err: any) {
      safeToast({
        variant: "destructive",
        title: "保存失败",
        description: err.message,
      });
      return null;
    } finally {
      setSavingId('');
    }
  };

  const handleViewDetails = (paper: Paper, result: SearchResult, index: number) => {
    const paperKey = paper.id || `${result.source}-${index}`;
    const literatureId = savedLiteratureIds[paperKey];

    // 如果已保存，跳转到详情页
    if (literatureId) {
      router.push(`/literature/${literatureId}`);
      return;
    }

    // Mark that we should search when returning
    sessionStorage.setItem('shouldSearchOnReturn', 'true');

    // Encode literature data and store to sessionStorage
    const previewData = {
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      doi: paper.doi,
      publication_date: paper.publishedDate,
      journal: paper.journal,
      citation_count: paper.citationCount,
      source: result.source,
      keywords: paper.keywords,
      pdf_url: paper.pdfUrl,
      id: paper.id,
    };

    // Store to sessionStorage
    sessionStorage.setItem('previewLiterature', JSON.stringify(previewData));

    // Navigate to preview page
    router.push('/literature/preview');
  };

  const handleExport = async (paper: Paper, result: SearchResult, index: number, format: string) => {
    const paperKey = paper.id || `${result.source}-${index}`;

    // Check if already saved
    let literatureId = savedLiteratureIds[paperKey];

    if (!literatureId) {
      // Save first
      const litId = await handleSave(paper, result, index);
      literatureId = litId;
    }

    if (!literatureId) {
      safeToast({
        variant: "destructive",
        title: "无法导出",
        description: "请先保存文献",
      });
      return;
    }

    try {
      const response = await fetch(`/api/literature/${literatureId}/export?format=${format}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get citation text directly
      const citationText = await response.text();

      // Copy to clipboard
      await navigator.clipboard.writeText(citationText);

      // Show success message
      safeToast({
        title: "导出成功",
        description: `${format.toUpperCase()}引用已复制到剪贴板！`,
      });
    } catch (err: any) {
      safeToast({
        variant: "destructive",
        title: "导出失败",
        description: err.message,
      });
    }
  };

  const handleQuickNote = async (paper: Paper, result: SearchResult, index: number) => {
    const paperKey = paper.id || `${result.source}-${index}`;

    // Check if already saved
    let literatureId = savedLiteratureIds[paperKey];

    if (!literatureId) {
      // Save first
      const litId = await handleSave(paper, result, index);
      literatureId = litId;
    }

    if (!literatureId) {
      safeToast({
        variant: "destructive",
        title: "无法添加笔记",
        description: "请先保存文献",
      });
      return;
    }

    setSelectedPaper(paper);
    setSelectedLiteratureId(literatureId);
    setNoteDialogOpen(true);
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setOffset(0);
    setHasMore(false);
    sessionStorage.removeItem('searchState');
  };

  const handleHistoryClick = (historyQuery: string, historySource: string) => {
    setQuery(historyQuery);
    setSource(historySource as SourceOption);
    setShowHistory(false);
    handleSearch(0);
  };

  const paperCount = results.reduce((acc, r) => acc + (r.papers?.length || 0), 0);
  const showResults = results.length > 0 && paperCount > 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="ml-4">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">请先登录以使用学术搜索功能</p>
            <Button onClick={() => router.push('/login')}>前往登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">学术文献搜索</h1>
            <p className="text-muted-foreground">
              搜索 OpenAlex、arXiv、PubMed、Semantic Scholar 等学术数据库（2.5亿+论文）
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
            className="relative"
          >
            <History className="w-4 h-4 mr-2" />
            搜索历史
            {searchHistory.length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {searchHistory.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Search History Dropdown */}
        {showHistory && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">搜索历史</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {searchHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无搜索历史</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchHistory.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => handleHistoryClick(item.query, item.source)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.query}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.source} · {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle>搜索学术文献</CardTitle>
            <CardDescription>
              支持arXiv、PubMed、Semantic Scholar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(0); }}>
              <div className="space-y-4">
                {/* Search Input */}
                <div>
                  <Label htmlFor="search-input">搜索关键词</Label>
                  <Input
                    id="search-input"
                    placeholder="例如: machine learning, deep learning..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isSearching}
                    className="mt-1.5"
                  />
                </div>

                {/* Database & Results per page */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="source">数据库</Label>
                    <Select value={source} onValueChange={(value: string) => setSource(value as SourceOption)} disabled={isSearching}>
                      <SelectTrigger id="source" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openalex">OpenAlex（推荐，最快）</SelectItem>
                        <SelectItem value="all">全部数据库（较慢）</SelectItem>
                        <SelectItem value="arxiv">arXiv（物理/计算机/数学）</SelectItem>
                        <SelectItem value="pubmed">PubMed（生物医学）</SelectItem>
                        <SelectItem value="semantic-scholar">Semantic Scholar（全学科）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maxResults">每页结果数</Label>
                    <Select value={maxResults.toString()} onValueChange={(value: string) => setMaxResults(parseInt(value))} disabled={isSearching}>
                      <SelectTrigger id="maxResults" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20 篇</SelectItem>
                        <SelectItem value="50">50 篇（推荐）</SelectItem>
                        <SelectItem value="100">100 篇</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sortBy">排序方式</Label>
                    <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as SortOption)} disabled={isSearching}>
                      <SelectTrigger id="sortBy" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">相关性</SelectItem>
                        <SelectItem value="date">发表时间（新→旧）</SelectItem>
                        <SelectItem value="date_asc">发表时间（旧→新）</SelectItem>
                        <SelectItem value="citations">引用数</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Advanced Filters Toggle */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  高级筛选
                  {showFilters ? <ChevronLeft className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="field">搜索字段</Label>
                        <Select value={field} onValueChange={(value: string) => setField(value as FieldOption)} disabled={isSearching}>
                          <SelectTrigger id="field" className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部字段</SelectItem>
                            <SelectItem value="title">标题</SelectItem>
                            <SelectItem value="author">作者</SelectItem>
                            <SelectItem value="abstract">摘要</SelectItem>
                            <SelectItem value="doi">DOI</SelectItem>
                            <SelectItem value="keywords">关键词</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="yearStart">起始年份</Label>
                          <Input
                            id="yearStart"
                            type="number"
                            placeholder="例如: 2020"
                            value={yearStart}
                            onChange={(e) => setYearStart(e.target.value)}
                            disabled={isSearching}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="yearEnd">结束年份</Label>
                          <Input
                            id="yearEnd"
                            type="number"
                            placeholder="例如: 2024"
                            value={yearEnd}
                            onChange={(e) => setYearEnd(e.target.value)}
                            disabled={isSearching}
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={isSearching || !query.trim()} className="w-full">
                  {isSearching ? '搜索中...' : '搜索'}
                </Button>
              </div>

              <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground mt-4">
                <p className="font-medium mb-1">搜索建议：</p>
                <ul className="space-y-1">
                  <li>• 使用英文关键词效果更好：machine learning, CNN, Transformer</li>
                  <li>• 尝试具体技术术语</li>
                  <li>• 使用高级筛选可以精确搜索特定字段或时间范围</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Chinese Query Translation Suggestion */}
        {isTranslatingQuery && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
            <CardContent className="py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">正在将中文查询翻译为英文术语建议...</p>
            </CardContent>
          </Card>
        )}
        {!isTranslatingQuery && translatedTerms.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
            <CardContent className="py-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                💡 检测到中文查询，英文学术数据库用以下英文术语检索效果更好，点击一键使用：
              </p>
              <div className="flex flex-wrap gap-2">
                {translatedTerms.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleUseEnglishTerm(term)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    <Search className="w-3 h-3" />
                    {term}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Searching Indicator with Skeleton */}
        {isSearching && (
          <>
            {query && <SearchResultsSkeleton count={3} />}
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">正在搜索学术数据库...</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Search Results */}
        {showResults && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>搜索结果 ({totalCount} 篇)</CardTitle>
                  <CardDescription>
                    {source === 'all' ? '全部数据库' : source} · 查询: &ldquo;{query}&rdquo;
                  </CardDescription>
                </div>
                {offset > 0 && (
                  <Button variant="outline" onClick={handleClearSearch}>
                    <X className="w-4 h-4 mr-2" />
                    清除搜索
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {results.map((result) => (
                <div key={result.source} className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant={result.source === 'arxiv' ? 'default' : 'secondary'}>
                      {result.source.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.papers.length} 篇文献
                    </span>
                  </div>

                  {result.papers.map((paper, index) => {
                    const paperKey = paper.id || `${result.source}-${index}`;
                    const isSaved = !!savedLiteratureIds[paperKey];

                    return (
                    <Card key={paper.id || `${result.source}-${index}`} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-5 space-y-4">
                        {/* Title and Save Button */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 cursor-pointer" onClick={() => handleViewDetails(paper, result, index)}>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors">
                                {paper.title}
                              </h3>
                              {isSaved && (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white shrink-0">
                                  <Check className="w-3 h-3 mr-1" />
                                  已保存
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">{paper.authors?.slice(0, 3).map((a) => a.name).join(', ')}</span>
                              {paper.authors && paper.authors.length > 3 && ' 等'}
                              {paper.journal && <span className="ml-2">· {paper.journal}</span>}
                              {paper.publishedDate && <span className="ml-2">· {paper.publishedDate.substring(0, 4)}</span>}
                            </div>
                          </div>
                          <Button
                            variant={isSaved ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleSave(paper, result, index)}
                            disabled={savingId === (paper.id || index)}
                          >
                            {savingId === (paper.id || index) ? '保存中...' : isSaved ? '已保存' : '保存'}
                          </Button>
                        </div>

                        {/* Abstract - More Prominent */}
                        {paper.abstract ? (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm leading-relaxed line-clamp-4">
                              {paper.abstract}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-muted/30 rounded-lg p-3 text-center text-sm text-muted-foreground">
                            暂无摘要
                          </div>
                        )}

                        {/* Metadata and Actions */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-4 text-sm">
                            {paper.citationCount !== undefined && paper.citationCount !== null ? (
                              <Badge variant="outline" className="font-normal">
                                📚 {paper.citationCount.toLocaleString()} 引用
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">引用数未知</span>
                            )}
                            {paper.keywords && paper.keywords.length > 0 && (
                              <span className="text-muted-foreground text-sm">
                                🔑 {paper.keywords.slice(0, 3).join(', ')}
                                {paper.keywords.length > 3 && '...'}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(paper, result, index)}
                            >
                              查看详情
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuickNote(paper, result, index)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              笔记
                            </Button>
                            <div className="flex gap-1 items-center">
                              <select
                                className="h-8 px-2 text-xs border rounded-md bg-background"
                                value={exportFormat[`${result.source}-${index}`] || 'apa'}
                                onChange={(e) => setExportFormat({
                                  ...exportFormat,
                                  [`${result.source}-${index}`]: e.target.value
                                })}
                              >
                                <option value="apa">APA</option>
                                <option value="mla">MLA</option>
                                <option value="chicago">Chicago</option>
                                <option value="harvard">Harvard</option>
                                <option value="vancouver">Vancouver</option>
                              </select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExport(paper, result, index, exportFormat[`${result.source}-${index}`] || 'apa')}
                              >
                                导出
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex flex-col items-center gap-3 pt-4">
                  <div className="text-sm text-muted-foreground text-center">
                    💡 提示：加载更多会重新搜索数据库，可能需要几秒钟
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isSearching}
                    className="min-w-[150px]"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        加载中...
                      </>
                    ) : (
                      '加载更多结果'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {!isSearching && !showResults && query && (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">
                未找到与 "{query}" 相关的文献
              </p>
              <Button
                variant="outline"
                onClick={handleClearSearch}
                className="mt-4"
              >
                清除搜索
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Note Dialog */}
      {selectedPaper && selectedLiteratureId && (
        <QuickNoteDialog
          open={noteDialogOpen}
          onOpenChange={setNoteDialogOpen}
          literatureId={selectedLiteratureId}
          literatureTitle={selectedPaper.title}
        />
      )}
    </div>
  );
}
