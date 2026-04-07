'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Upload, Clock, Sparkles, ArrowRight } from 'lucide-react';

interface Paper {
  id: number;
  title: string;
  fileName: string;
  createdAt: string;
}

export default function HomePage() {
  const router = useRouter();
  const [recentPapers, setRecentPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentPapers();
  }, []);

  const fetchRecentPapers = async () => {
    try {
      const response = await fetch('/api/papers');
      const data = await response.json();

      if (response.ok) {
        setRecentPapers((data.papers || []).slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load recent papers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            AI Paper Reader
          </h1>
          <p className="text-xl text-muted-foreground">
            上传英文学术论文，AI 帮你快速理解
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
              onClick={() => router.push('/upload')}
            >
              <Upload className="w-5 h-5 mr-2" />
              上传论文
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/my-papers')}
            >
              <FileText className="w-5 h-5 mr-2" />
              我的论文
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 max-w-2xl mx-auto">
            <div className="text-center p-4">
              <div className="text-3xl mb-2">📝</div>
              <h3 className="font-medium mb-1">AI 中文解读</h3>
              <p className="text-sm text-muted-foreground">一键生成中文总结</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🌐</div>
              <h3 className="font-medium mb-1">段落翻译</h3>
              <p className="text-sm text-muted-foreground">选中即可翻译难句</p>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-medium mb-1">AI 助手</h3>
              <p className="text-sm text-muted-foreground">随时提问论文内容</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Papers */}
      <div className="container mx-auto px-4 pb-16">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>最近上传</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/my-papers')}
              >
                查看全部
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : recentPapers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="mb-4">还没有上传任何论文</p>
                <Button onClick={() => router.push('/upload')}>
                  <Upload className="w-4 h-4 mr-2" />
                  上传第一篇论文
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPapers.map((paper) => (
                  <div
                    key={paper.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/paper/${paper.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{paper.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="truncate">{paper.fileName}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(paper.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Sparkles className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
