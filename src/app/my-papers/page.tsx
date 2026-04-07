'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, ArrowLeft, Clock, Trash2 } from 'lucide-react';

interface Paper {
  id: number;
  title: string;
  fileName: string;
  createdAt: string;
}

export default function MyPapersPage() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const response = await fetch('/api/papers');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load papers');
      }

      setPapers(data.papers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/upload')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回上传
        </Button>
        <h1 className="text-2xl font-bold">我的论文</h1>
        <p className="text-muted-foreground mt-1">
          已上传 {papers.length} 篇论文
        </p>
      </div>

      {error && (
        <Card className="mb-4 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {papers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">还没有上传任何论文</p>
            <Button onClick={() => router.push('/upload')}>
              上传第一篇论文
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {papers.map((paper) => (
            <Card
              key={paper.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/paper/${paper.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium mb-2">{paper.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{paper.fileName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(paper.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/paper/${paper.id}`);
                    }}
                  >
                    查看
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
