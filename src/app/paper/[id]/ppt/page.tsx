'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';

interface SlideContent {
  title: string;
  bullets: string[];
}

interface PPTData {
  title: string;
  slides: {
    slide1: SlideContent;
    slide2: SlideContent;
    slide3: SlideContent;
    slide4: SlideContent;
    slide5: SlideContent;
  };
  markdown: string;
}

export default function PPTPreviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [pptData, setPptData] = useState<PPTData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    generatePPT();
  }, [id]);

  const generatePPT = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/papers/${id}/ppt`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate PPT');
      }

      setPptData(data);
    } catch (error) {
      console.error('Generate PPT error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate PPT');
      router.back();
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!pptData) return;

    const blob = new Blob([pptData.markdown], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pptData.title}-slides.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const slides = pptData ? Object.values(pptData.slides) : [];

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h1 className="text-xl font-bold flex-1">AI 生成的演示文稿</h1>
            <Button
              onClick={handleDownloadMarkdown}
              variant="outline"
              className="border-orange-200 dark:border-orange-800"
            >
              <Download className="w-4 h-4 mr-2" />
              下载 Markdown
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-orange-600" />
            <p className="text-lg text-muted-foreground">AI 正在生成演示文稿...</p>
            <p className="text-sm text-muted-foreground mt-2">这可能需要 10-20 秒</p>
          </div>
        ) : pptData && slides.length > 0 ? (
          <div className="max-w-5xl mx-auto">
            {/* Slide counter */}
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mb-2">
                幻灯片 {currentSlide + 1} / {slides.length}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                  disabled={currentSlide === slides.length - 1}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Slide */}
            <Card className="aspect-video bg-white dark:bg-gray-800 shadow-2xl">
              <div className="h-full flex flex-col items-center justify-center p-12">
                {/* Slide number */}
                <div className="absolute top-4 right-6 text-sm text-gray-400">
                  {currentSlide + 1}
                </div>

                {/* Slide content */}
                <div className="text-center max-w-3xl">
                  <h2 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
                    {slides[currentSlide].title}
                  </h2>
                  <ul className="space-y-4 text-left">
                    {slides[currentSlide].bullets.map((bullet, index) => (
                      <li
                        key={index}
                        className="text-xl text-gray-700 dark:text-gray-300 flex items-start gap-3"
                      >
                        <span className="text-orange-600 dark:text-orange-400 mt-1">●</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Slide dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide
                      ? 'bg-orange-600'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            {/* Title slide */}
            {currentSlide === 0 && (
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground">
                  提示：使用键盘左右方向键也可以切换幻灯片
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>无法生成演示文稿</p>
          </div>
        )}
      </div>
    </div>
  );
}
