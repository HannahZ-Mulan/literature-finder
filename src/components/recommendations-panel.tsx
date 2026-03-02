'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, BookOpen, Calendar, Quote, Loader2, Save, Check, ExternalLink, FileText } from 'lucide-react';

interface RecommendedLiterature {
  id: number;
  title: string;
  authors: Array<{ name: string }>;
  abstract: string;
  publication_date: string;
  journal: string;
  citation_count: number;
  source: string;
  keywords: string[] | null;
  reason: string;
  score: number;
  pdf_url?: string;
}

interface RecommendationsPanelProps {
  limit?: number;
}

export function RecommendationsPanel({ limit = 5 }: RecommendationsPanelProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendedLiterature[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    fetchRecommendations();
    fetchSavedStatus();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`/api/recommendations?limit=${limit}`);

      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      } else {
        console.error('Failed to fetch recommendations:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedStatus = async () => {
    try {
      // 获取已保存的文献ID列表
      const res = await fetch('/api/literature/library?limit=1000');
      if (res.ok) {
        const data = await res.json();
        const ids = new Set(data.literature.map((lit: any) => lit.id));
        setSavedIds(ids);
      }
    } catch (err) {
      console.error('Failed to fetch saved status:', err);
    }
  };

  const handleSave = async (lit: RecommendedLiterature) => {
    try {
      setSavingId(lit.id);

      const res = await fetch('/api/literature/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: lit.title,
          authors: lit.authors,
          abstract: lit.abstract,
          publication_date: lit.publication_date,
          journal: lit.journal,
          source: lit.source,
          keywords: lit.keywords,
          pdf_url: lit.pdf_url || null,
          citation_count: lit.citation_count,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // 添加到已保存列表
        setSavedIds(prev => new Set(prev).add(data.literature.id));

        // 可选：显示成功消息
        setTimeout(() => setSavingId(null), 2000);
      } else {
        const error = await res.json();
        alert(`保存失败: ${error.error || '未知错误'}`);
        setSavingId(null);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('保存失败，请重试');
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            为您推荐
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            推荐文献
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            多阅读文献以获得个性化推荐
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          为您推荐
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.map((lit) => {
          const isSaved = savedIds.has(lit.id);
          const isSaving = savingId === lit.id;

          return (
            <div
              key={lit.id}
              className="border rounded-lg hover:shadow-md transition-shadow mb-4"
            >
              {/* 标题栏 */}
              <div className="flex items-start justify-between gap-3 p-4 pb-2">
                <h4
                  className="font-medium text-lg cursor-pointer flex-1"
                  onClick={() => router.push(`/literature/${lit.id}`)}
                >
                  {lit.title}
                </h4>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary">
                    {lit.source}
                  </Badge>
                  {isSaved ? (
                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                      <Check className="w-3 h-3 mr-1" />
                      已保存
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(lit);
                      }}
                      disabled={isSaving}
                      className="h-7"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3 mr-1" />
                          保存
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* 推荐理由 */}
              <div className="px-4 pb-2">
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  {lit.reason}
                </Badge>
              </div>

              {/* 作者 */}
              <div className="px-4 pb-2 text-sm text-muted-foreground">
                {lit.authors.map((a) => a.name).join(', ')}
              </div>

              {/* 摘要 */}
              <div className="px-4 pb-3">
                <p
                  className="text-sm leading-relaxed"
                  onClick={() => router.push(`/literature/${lit.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {lit.abstract}
                </p>
              </div>

              {/* 底部信息栏 */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {lit.publication_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(lit.publication_date).getFullYear()}
                    </span>
                  )}
                  {lit.journal && (
                    <span>{lit.journal}</span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/literature/${lit.id}`)}
                  className="h-8"
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  查看详情
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
