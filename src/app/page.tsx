'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Upload, Clock, Sparkles, ArrowRight, Search } from 'lucide-react';

interface Paper {
  id: number;
  title: string;
  fileName: string;
  createdAt: string;
}

const roman = ['i', 'ii', 'iii', 'iv', 'v'];

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
    <div
      className="min-h-screen"
      style={{
        backgroundImage:
          'radial-gradient(1200px 600px at 80% -10%, hsl(45 80% 82% / 0.5) 0%, transparent 60%), radial-gradient(900px 500px at -10% 30%, hsl(42 40% 90%) 0%, transparent 55%)',
      }}
    >
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-accent">
            AI-Powered Reading · for Researchers
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-medium leading-[1.04] tracking-tight">
            让每一篇英文论文,
            <br />
            都获得一次
            <em className="italic font-normal text-accent"> 中文深读</em>
          </h1>
          <p className="text-xl text-muted-foreground mx-auto max-w-xl pt-1">
            上传 PDF,AI 自动生成中文摘要、段落翻译与可追问的智能笔记——为科研节奏而生的阅读工作台。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
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
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/search')}
            >
              <Search className="w-5 h-5 mr-2" />
              搜索论文
            </Button>
          </div>

          {/* Feature highlights — 衬线卡片替换 emoji */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12 max-w-2xl mx-auto">
            {[
              { ico: '✎', title: 'AI 中文解读', desc: '一键生成中文总结' },
              { ico: '⇄', title: '段落翻译', desc: '选中即可翻译难句' },
              { ico: '✦', title: 'AI 助手', desc: '随时提问论文内容' },
            ].map((f, i) => (
              <div key={f.title} className="text-center p-4">
                <div
                  className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl text-xl text-accent"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(45 70% 88%), hsl(40 60% 80%))',
                  }}
                >
                  {f.ico}
                </div>
                <h3 className="font-serif font-medium text-lg mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
                <span className="font-serif italic text-xs text-muted-foreground/60">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Papers */}
      <div className="container mx-auto px-4 pb-20">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-2xl font-medium">
                最近阅读{' '}
                <span className="italic text-base text-muted-foreground/70">
                  Recent
                </span>
              </CardTitle>
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
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
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
              <div className="space-y-1">
                {recentPapers.map((paper, idx) => (
                  <div
                    key={paper.id}
                    className="group flex items-center justify-between p-3 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors"
                    onClick={() => router.push(`/paper/${paper.id}`)}
                  >
                    <div className="flex items-baseline gap-3 flex-1 min-w-0">
                      <span className="font-serif italic text-lg text-accent/70 shrink-0 w-8">
                        {roman[idx] || `${idx + 1}.`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-medium truncate text-[15px]">
                          {paper.title}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                          <span className="truncate">{paper.fileName}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(paper.createdAt).toLocaleDateString(
                                'zh-CN'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground/60 group-hover:text-accent transition-colors"
                    >
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
