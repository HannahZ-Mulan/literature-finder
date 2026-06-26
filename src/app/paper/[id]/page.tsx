'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Sparkles, MessageSquare, FileText, Languages, FileOutput, CheckCircle2, AlertCircle, ExternalLink, BookOpen, BookOpenCheck, RefreshCw, GraduationCap } from 'lucide-react';
import { formatPDFText } from '@/lib/text-formatter';
import { cleanMarkdown } from '@/lib/markdown-cleaner';
import { useToast } from '@/hooks/use-toast';
import { PDFViewer } from '@/components/pdf-viewer';

interface Paper {
  id: number;
  title: string;
  fileName: string;
  extractedText: string;
  summary?: string;
  createdAt: string;
  googleScholarUrl?: string;
}

interface ChineseSummary {
  one_sentence: string;
  research_question: string;
  method: string;
  key_findings: string;
  contribution: string;
  limitations: string;
}

interface CoreInsights {
  one_sentence_summary: string;
  one_sentence_summary_location: string;
  research_question: string;
  research_question_location: string;
  methods: string;
  methods_location: string;
  key_findings: Array<{
    finding: string;
    location: string;
  }>;
  contributions: Array<{
    contribution: string;
    location: string;
  }>;
  limitations: Array<{
    limitation: string;
    location: string;
  }>;
  applications: {
    researcher: string;
    clinician: string;
    policy_maker: string;
  };
  quality_assessment: {
    level: 'high' | 'medium' | 'low';
    reason: string;
    location: string;
  };
  text_coverage: string;
}

interface ImmersiveReading {
  chunkId: number;
  chunkType: string;
  chunkTypeLabel: string;
  chunkText: string;
  reading: string;
  error?: boolean;
}

export default function PaperReaderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [chineseSummary, setChineseSummary] = useState<ChineseSummary | null>(null);
  const [humanChineseSummary, setHumanChineseSummary] = useState<string | null>(null);
  const [coreInsights, setCoreInsights] = useState<CoreInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingHumanSummary, setIsGeneratingHumanSummary] = useState(false);
  const [isGeneratingCoreInsights, setIsGeneratingCoreInsights] = useState(false);

  // Chat states
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showRecommendedQuestions, setShowRecommendedQuestions] = useState(true);
  const [recommendedQuestions, setRecommendedQuestions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Translation states
  const [selectedText, setSelectedText] = useState('');
  const [translation, setTranslation] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // PPT generation states
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);

  // Full text expansion state
  const [isFullTextExpanded, setIsFullTextExpanded] = useState(false);

  // PDF/Text/Immersive view mode
  const [viewMode, setViewMode] = useState<'text' | 'pdf' | 'immersive'>('text');

  // Immersive Read states
  const [immersiveReadings, setImmersiveReadings] = useState<ImmersiveReading[] | null>(null);
  const [isGeneratingReadings, setIsGeneratingReadings] = useState(false);
  const [readingsProgress, setReadingsProgress] = useState({ total: 0, completed: 0, failed: 0 });

  useEffect(() => {
    fetchPaper();
    fetchChatHistory();
  }, [id]);

  const fetchPaper = async () => {
    try {
      const response = await fetch(`/api/papers/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load paper');
      }

      setPaper(data.paper);

      // Load existing summary if available
      if (data.paper.summary) {
        try {
          setChineseSummary(JSON.parse(data.paper.summary));
        } catch (e) {
          console.error('Failed to parse summary:', e);
        }
      }
    } catch (error) {
      console.error('Error loading paper:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`/api/papers/${id}/chats`);
      const data = await response.json();

      if (!response.ok) {
        // 如果是404或没有历史，忽略错误
        return;
      }

      setChatHistory(data.chats || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
      // 静默失败，不影响用户体验
    }
  };

  const saveChatMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      await fetch(`/api/papers/${id}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
      // 静默失败，不影响用户体验
    }
  };

  const clearChatHistory = async () => {
    try {
      const response = await fetch(`/api/papers/${id}/chats`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      setChatHistory([]);
      toast({
        title: "对话已清空",
        description: "所有对话历史已删除",
      });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast({
        variant: "destructive",
        title: "清空失败",
        description: error instanceof Error ? error.message : 'Failed to clear chat history',
      });
    }
  };

  const handleGenerateSummary = async (force = false) => {
    setIsGeneratingSummary(true);
    try {
      const url = force ? `/api/papers/${id}/summary?force=1` : `/api/papers/${id}/summary`;
      const response = await fetch(url, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.degraded) {
          toast({
            variant: "destructive",
            title: "摘要生成失败",
            description: data.message || 'AI 服务暂时不可用，请稍后重试',
          });
        } else {
          throw new Error(data.error || 'Failed to generate summary');
        }
        return;
      }

      setChineseSummary(data.summary);
      toast({
        title: "摘要生成成功",
        description: "AI摘要已生成完成",
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        variant: "destructive",
        title: "摘要生成失败",
        description: error instanceof Error ? error.message : 'Failed to generate summary',
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateHumanSummary = async () => {
    setIsGeneratingHumanSummary(true);
    try {
      const response = await fetch(`/api/papers/${id}/chinese-summary`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Chinese summary');
      }

      setHumanChineseSummary(data.summary);
      toast({
        title: "中文解读生成成功",
        description: "AI生成的中文摘要已完成",
      });
    } catch (error) {
      console.error('Error generating Chinese summary:', error);
      toast({
        variant: "destructive",
        title: "中文解读生成失败",
        description: error instanceof Error ? error.message : 'Failed to generate Chinese summary',
      });
    } finally {
      setIsGeneratingHumanSummary(false);
    }
  };

  const handleGenerateCoreInsights = async () => {
    setIsGeneratingCoreInsights(true);
    try {
      const response = await fetch(`/api/papers/${id}/core-insights`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        // Distinguish a true failure (degraded) from a validation error
        if (data.degraded) {
          toast({
            variant: "destructive",
            title: "AI 核心解读生成失败",
            description: data.message || 'AI 服务暂时不可用，请稍后重试',
          });
        } else {
          throw new Error(data.error || 'Failed to generate core insights');
        }
        return;
      }

      setCoreInsights(data.insights);
      toast({
        title: "核心解读生成成功",
        description: "AI分析已完成，包含研究发现、质量评估等",
      });
    } catch (error) {
      console.error('Error generating core insights:', error);
      toast({
        variant: "destructive",
        title: "核心解读生成失败",
        description: error instanceof Error ? error.message : 'Failed to generate core insights',
      });
    } finally {
      setIsGeneratingCoreInsights(false);
    }
  };

  const fetchRecommendedQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      const response = await fetch(`/api/papers/${id}/recommended-questions`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch questions');
      }

      setRecommendedQuestions(data.questions || []);
    } catch (error) {
      console.error('Error fetching recommended questions:', error);
      // 失败时使用默认问题
      setRecommendedQuestions([
        '这篇论文主要研究什么问题？',
        '研究方法有哪些创新之处？',
        '主要结论是什么？',
      ]);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setChatQuestion(question);
    setShowRecommendedQuestions(false); // 隐藏推荐问题，显示对话
    // 自动发送问题
    setTimeout(() => {
      handleChat();
    }, 100);
  };

  const handleChat = async () => {
    if (!chatQuestion.trim()) return;

    setIsChatting(true);
    const userMessage = { role: 'user' as const, content: chatQuestion };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);

    // 保存用户消息到数据库
    await saveChatMessage('user', chatQuestion);

    try {
      const response = await fetch(`/api/papers/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: chatQuestion,
          chat_history: chatHistory.map(h => ({ role: h.role, content: h.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to chat');
      }

      const assistantMessage = { role: 'assistant' as const, content: data.answer };
      setChatHistory([...newHistory, assistantMessage]);
      setChatQuestion('');

      // 保存AI回复到数据库
      await saveChatMessage('assistant', data.answer);
    } catch (error) {
      console.error('Error chatting:', error);
      toast({
        variant: "destructive",
        title: "AI对话失败",
        description: error instanceof Error ? error.message : 'Failed to chat',
      });
    } finally {
      setIsChatting(false);
    }
  };

  const handleTranslate = async () => {
    if (!selectedText.trim()) return;

    setIsTranslating(true);
    setTranslation('');
    setExplanation('');

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          target_language: 'zh',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.degraded) {
          // Translation service unavailable - show honest message, don't
          // display the original text as if it were a translation.
          setTranslation('');
          setExplanation('');
          toast({
            variant: "destructive",
            title: "翻译失败",
            description: data.message || '翻译服务暂时不可用，请稍后重试',
          });
        } else {
          throw new Error(data.error || 'Translation failed');
        }
        return;
      }

      setTranslation(data.translation);
      setExplanation(data.explanation || '');
      toast({
        title: "翻译完成",
        description: "文本已成功翻译为中文",
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        variant: "destructive",
        title: "翻译失败",
        description: error instanceof Error ? error.message : 'Translation failed',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGeneratePPT = async () => {
    // Navigate to PPT preview page
    router.push(`/paper/${id}/ppt`);
  };

  const handleGenerateReadings = async (force = false) => {
    setIsGeneratingReadings(true);
    setReadingsProgress({ total: 0, completed: 0, failed: 0 });

    try {
      const response = await fetch(`/api/papers/${id}/immersive-read`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.retry) {
          toast({
            title: '正在生成中',
            description: '请稍等片刻再试',
          });
        } else if (data.degraded) {
          toast({
            variant: 'destructive',
            title: '深读生成失败',
            description: data.message || 'AI 服务暂时不可用，请稍后重试',
          });
        } else {
          throw new Error(data.error || 'Failed to generate immersive readings');
        }
        return;
      }

      setImmersiveReadings(data.readings);
      setReadingsProgress({
        total: data.progress?.total || 0,
        completed: data.progress?.completed || 0,
        failed: data.progress?.failed || 0,
      });

      if (data.cached) {
        toast({
          title: '深读已加载',
          description: '使用上次生成的导读内容',
        });
      } else {
        toast({
          title: '深读生成完成',
          description: `已生成 ${data.progress?.completed || 0} 段导读${data.progress?.failed ? `，${data.progress.failed} 段失败` : ''}`,
        });
      }
    } catch (error) {
      console.error('Error generating immersive readings:', error);
      toast({
        variant: 'destructive',
        title: '深读生成失败',
        description: error instanceof Error ? error.message : 'Failed to generate immersive readings',
      });
    } finally {
      setIsGeneratingReadings(false);
    }
  };

  const handleRetryAllReadings = () => {
    handleGenerateReadings(true);
  };

  const handleLoadCachedReadings = async () => {
    try {
      const response = await fetch(`/api/papers/${id}/immersive-read`);
      const data = await response.json();

      if (response.ok && data.readings && data.readings.length > 0) {
        setImmersiveReadings(data.readings);
        setViewMode('immersive');
        return true;
      }
    } catch (error) {
      console.error('Error loading cached readings:', error);
    }
    return false;
  };

  const handleSwitchToImmersive = async () => {
    if (viewMode === 'immersive') return; // already in immersive mode
    setViewMode('immersive');
    // If no readings loaded yet and not already generating, try cache first
    if (!immersiveReadings && !isGeneratingReadings) {
      const hasCached = await handleLoadCachedReadings();
      if (!hasCached) {
        // Auto-generate
        handleGenerateReadings();
      }
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

  if (!paper) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Paper not found</p>
            <Button onClick={() => router.push('/upload')}>Back to Upload</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/upload')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回上传
        </Button>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex-1">{paper.title}</h1>
          <div className="flex items-center gap-2">
            {paper.googleScholarUrl && (
              <Button
                onClick={() => window.open(paper.googleScholarUrl, '_blank')}
                variant="outline"
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Google Scholar
              </Button>
            )}
            <Button
              onClick={handleSwitchToImmersive}
              disabled={isGeneratingReadings}
              variant={viewMode === 'immersive' ? 'default' : 'outline'}
              className={`gap-2 ${viewMode === 'immersive' ? 'bg-sage-600 hover:bg-sage-700 text-white' : ''}`}
            >
              {isGeneratingReadings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <BookOpenCheck className="w-4 h-4" />
                  沉浸式深读
                </>
              )}
            </Button>
            <Button
              onClick={handleGeneratePPT}
              disabled={isGeneratingPPT}
              variant="outline"
              className="gap-2"
            >
              {isGeneratingPPT ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileOutput className="w-4 h-4" />
                  生成PPT
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Two Column Grid Layout */}
      <div className={`grid gap-6 ${viewMode === 'immersive' ? 'grid-cols-1 max-w-5xl mx-auto' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Left Column: Full Text + Translation (Fixed) */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {viewMode === 'pdf' ? <BookOpen className="w-5 h-5" /> : viewMode === 'immersive' ? <GraduationCap className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  {viewMode === 'pdf' ? 'PDF预览' : viewMode === 'immersive' ? '沉浸式深读' : '论文全文'}
                </div>
                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <Button
                    variant={viewMode === 'text' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('text')}
                    className="text-xs"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    文本模式
                  </Button>
                  <Button
                    variant={viewMode === 'pdf' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('pdf')}
                    className="text-xs"
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    PDF预览
                  </Button>
                  <Button
                    variant={viewMode === 'immersive' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={handleSwitchToImmersive}
                    disabled={isGeneratingReadings}
                    className="text-xs"
                  >
                    <GraduationCap className="w-4 h-4 mr-1" />
                    沉浸式深读
                  </Button>
                  {(viewMode === 'text') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFullTextExpanded(!isFullTextExpanded)}
                      className="text-xs"
                    >
                      {isFullTextExpanded ? (
                        <>
                          <span>收起</span>
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </>
                      ) : (
                        <>
                          <span>展开全文</span>
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === 'immersive' ? (
                /* ===== Immersive Read View ===== */
                <div className="space-y-6">
                  {isGeneratingReadings && !immersiveReadings ? (
                    /* Loading state */
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                      <div className="relative">
                        <GraduationCap className="w-12 h-12 text-sage-500" />
                        <Loader2 className="w-6 h-6 text-sage-600 animate-spin absolute -bottom-1 -right-1" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-sm font-medium text-foreground">正在生成导师导读...</p>
                        <p className="text-xs text-muted-foreground">AI 正在逐段分析论文，生成中文讲解</p>
                      </div>
                    </div>
                  ) : immersiveReadings && immersiveReadings.length > 0 ? (
                    /* Render chunk cards with side-by-side layout */
                    immersiveReadings.map((item, idx) => (
                      <div key={item.chunkId} className="group">
                        {/* Section header */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-sage-100 text-sage-700 dark:bg-sage-900/50 dark:text-sage-400 border border-sage-200 dark:border-sage-800">
                            {item.chunkTypeLabel}
                          </span>
                          {item.error && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                              生成失败
                            </span>
                          )}
                        </div>

                        {/* Side-by-side: original text + AI guide */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Left: Original text */}
                          <div className="p-4 bg-muted/40 rounded-lg border border-border text-sm leading-relaxed whitespace-pre-wrap break-words max-h-[50vh] overflow-y-auto"
                            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                          >
                            {formatPDFText(item.chunkText)}
                          </div>

                          {/* Right: AI reading guide */}
                          <div className={`p-4 rounded-lg border text-sm leading-relaxed ${
                            item.error
                              ? 'bg-destructive/5 border-destructive/20 text-muted-foreground'
                              : 'bg-gradient-to-br from-sage-50 to-sage-100/50 dark:from-sage-900/30 dark:to-sage-900/10 border-sage-200 dark:border-sage-800'
                          }`}>
                            {item.error ? (
                              <div className="flex items-start gap-2 text-destructive">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>该段落导读生成失败</span>
                              </div>
                            ) : item.reading ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-sage-600 dark:text-sage-400 mb-2">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">导师导读</span>
                                </div>
                                <p className="text-foreground/90">{item.reading}</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>生成中...</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Divider between chunks */}
                        {idx < immersiveReadings.length - 1 && (
                          <div className="mt-6 border-t border-border/50" />
                        )}
                      </div>
                    ))
                  ) : (
                    /* Empty state: no readings yet */
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                      <GraduationCap className="w-12 h-12 text-muted-foreground/50" />
                      <div className="text-center space-y-2">
                        <p className="text-sm font-medium">尚未生成沉浸式深读</p>
                        <p className="text-xs text-muted-foreground">点击下方按钮，AI 将逐段为你生成中文导读</p>
                      </div>
                      <Button
                        onClick={() => handleGenerateReadings()}
                        disabled={isGeneratingReadings}
                        className="gap-2 bg-sage-600 hover:bg-sage-700 text-white"
                      >
                        {isGeneratingReadings ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            开始生成深读
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Actions bar when readings exist */}
                  {immersiveReadings && immersiveReadings.length > 0 && !isGeneratingReadings && (
                    <div className="flex items-center justify-center gap-3 pt-4 border-t border-border/50">
                      <Button
                        onClick={handleRetryAllReadings}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        重新生成全部
                      </Button>
                      {readingsProgress.failed > 0 && (
                        <span className="text-xs text-destructive">
                          {readingsProgress.failed} 段失败
                        </span>
                      )}
                      {readingsProgress.total > 0 && (
                        <span className="text-xs text-muted-foreground">
                          共 {readingsProgress.total} 段
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : viewMode === 'pdf' ? (
                <PDFViewer url={`/uploads/${paper.fileName}`} title={paper.title} />
              ) : (
                <>
                  <div
                    className={`prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed p-4 bg-muted/50 rounded-lg cursor-text select-text transition-all duration-300 whitespace-pre-wrap break-words ${
                      isFullTextExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-32 overflow-hidden relative'
                    }`}
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                    onMouseUp={() => {
                      const selection = window.getSelection();
                      const text = selection?.toString().trim();
                      if (text && text.length > 10) {
                        setSelectedText(text);
                      }
                    }}
                  >
                    {formatPDFText(paper.extractedText)}

                    {!isFullTextExpanded && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent pt-8 pb-2 px-4">
                        <p className="text-xs text-muted-foreground text-center">点击"展开全文"查看完整内容</p>
                      </div>
                    )}
                  </div>

                  {selectedText && (
                    <Card className="mt-4 border-accent/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Languages className="w-4 h-4 text-accent" />
                          段落翻译
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="p-3 bg-muted/50 rounded text-sm">
                          {selectedText.slice(0, 300)}
                          {selectedText.length > 300 && '...'}
                        </div>

                        <Button
                          onClick={handleTranslate}
                          disabled={isTranslating}
                          size="sm"
                          className="w-full"
                        >
                          {isTranslating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              翻译中...
                            </>
                          ) : (
                            <>
                              <Languages className="w-4 h-4 mr-2" />
                              翻译成中文
                            </>
                          )}
                        </Button>

                        {translation && (
                          <div className="p-3 bg-accent/10 rounded-lg border border-accent/30">
                            <p className="text-sm font-medium mb-2">中文翻译：</p>
                            <p className="text-sm text-muted-foreground">{translation}</p>
                          </div>
                        )}

                        {explanation && explanation !== '暂无解释' && (
                          <div className="p-3 bg-sage-50 dark:bg-sage-900/20 rounded-lg border border-sage-200 dark:border-sage-800">
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              💡 段落解释：
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: All AI Features (Scrollable with Sticky) — hidden in immersive mode */}
        {viewMode !== 'immersive' && (
        <div className="sticky top-4 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {/* AI Core Insights */}
          {!coreInsights ? (
            <Card className="bg-gradient-to-br from-sage-50 to-sage-100 dark:from-sage-900 dark:to-sage-900 border-sage-200 dark:border-sage-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif">
                  <Sparkles className="w-5 h-5 text-sage-500" />
                  生成AI核心解读
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  获取论文的核心洞察，包括一句话总结、关键发现和实际应用价值
                </p>
                <Button
                  onClick={handleGenerateCoreInsights}
                  disabled={isGeneratingCoreInsights}
                  className="w-full"
                  size="lg"
                >
                  {isGeneratingCoreInsights ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      开始解读
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* One Sentence Summary */}
              <Card className="bg-gradient-to-br from-sage-50 to-sage-100 dark:from-sage-900 dark:to-sage-900 border-sage-200 dark:border-sage-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-3xl">🧠</span>
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold text-sage-600 dark:text-sage-400 uppercase tracking-wide mb-2">
                        一句话总结
                      </h3>
                      <p className="text-base font-medium leading-relaxed text-foreground">
                        {coreInsights.one_sentence_summary}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        📍 来源: {coreInsights.one_sentence_summary_location}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Research Question */}
              {coreInsights.research_question && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">❓</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          研究问题
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {coreInsights.research_question}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          📍 来源: {coreInsights.research_question_location}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Methods */}
              {coreInsights.methods && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🔬</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          研究方法
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {coreInsights.methods}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          📍 来源: {coreInsights.methods_location}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Findings */}
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">🎯</span>
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        核心发现
                      </h3>
                      <div className="space-y-3">
                        {coreInsights.key_findings.map((item, idx) => (
                          <div key={idx} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sage-100 dark:bg-sage-900 text-sage-600 dark:text-sage-400 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.finding}
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                📍 来源: {item.location}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contributions */}
              {coreInsights.contributions && coreInsights.contributions.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🌟</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          主要贡献
                        </h3>
                        <div className="space-y-2">
                          {coreInsights.contributions.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="flex-shrink-0 text-sage-500">✓</span>
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {item.contribution}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                  📍 来源: {item.location}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Limitations */}
              {coreInsights.limitations && coreInsights.limitations.length > 0 && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          局限性
                        </h3>
                        <div className="space-y-2">
                          {coreInsights.limitations.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="flex-shrink-0 text-clay-500">!</span>
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {item.limitation}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                  📍 来源: {item.location}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quality Assessment */}
              {coreInsights.quality_assessment && (
                <Card className="bg-gradient-to-br from-clay-50 to-clay-100 dark:from-clay-900 dark:to-clay-900 border-clay-200 dark:border-clay-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚖️</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-clay-700 dark:text-clay-400 uppercase tracking-wide mb-2">
                          研究质量判断
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            coreInsights.quality_assessment.level === 'high'
                              ? 'bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-300'
                              : coreInsights.quality_assessment.level === 'medium'
                              ? 'bg-accent/20 text-accent'
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {coreInsights.quality_assessment.level === 'high' ? '高质量' :
                             coreInsights.quality_assessment.level === 'medium' ? '中等质量' : '低质量'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {coreInsights.quality_assessment.reason}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          📍 来源: {coreInsights.quality_assessment.location}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Text Coverage */}
              {coreInsights.text_coverage && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">📄</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          AI分析覆盖范围
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {coreInsights.text_coverage}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Practical Value */}
              <Card className="bg-gradient-to-br from-sage-50 to-sage-100 dark:from-sage-900 dark:to-sage-900 border-sage-200 dark:border-sage-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    这篇论文有什么用？
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* For Researchers */}
                  <div className="p-4 bg-card rounded-lg">
                    <h4 className="text-sm font-semibold text-sage-700 dark:text-sage-400 mb-2 flex items-center gap-2">
                      <span>🔬</span>
                      对研究人员
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {coreInsights.applications.researcher}
                    </p>
                  </div>

                  {/* For Clinicians */}
                  <div className="p-4 bg-card rounded-lg">
                    <h4 className="text-sm font-semibold text-sage-700 dark:text-sage-400 mb-2 flex items-center gap-2">
                      <span>🏥</span>
                      对临床医生
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {coreInsights.applications.clinician}
                    </p>
                  </div>

                  {/* For Policy Makers */}
                  <div className="p-4 bg-card rounded-lg">
                    <h4 className="text-sm font-semibold text-sage-700 dark:text-sage-400 mb-2 flex items-center gap-2">
                      <span>📋</span>
                      对政策制定者
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {coreInsights.applications.policy_maker}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AI Chat */}
          <Card className="bg-gradient-to-br from-sage-50 to-sage-100 dark:from-sage-900 dark:to-sage-900 border-sage-200 dark:border-sage-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-sage-500 dark:text-sage-400" />
                  AI 对话助手
                </div>
                <div className="flex items-center gap-2">
                  {showChat && chatHistory.length > 0 && !showRecommendedQuestions && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRecommendedQuestions(true)}
                      className="text-xs text-sage-500 hover:text-sage-700 hover:bg-sage-50 dark:text-sage-400 dark:hover:bg-sage-950"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      返回推荐问题
                    </Button>
                  )}
                  {showChat && chatHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearChatHistory}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      清空对话
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showChat ? (
                <div className="text-center py-6">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50 text-sage-500" />
                  <p className="text-sm text-muted-foreground mb-4">
                    向 AI 提问关于这篇论文的问题
                  </p>
                  <Button onClick={() => { setShowChat(true); fetchRecommendedQuestions(); }} variant="outline">
                    开始对话
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 提示信息：告知用户可以切换 */}
                  {chatHistory.length > 0 && !showRecommendedQuestions && (
                    <div className="bg-sage-100 dark:bg-sage-900/30 border border-sage-200 dark:border-sage-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-sage-700 dark:text-sage-400">
                        <Sparkles className="w-4 h-4" />
                        <span>点击右上角的"返回推荐问题"按钮查看其他问题</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-card rounded-lg border border-sage-200 dark:border-sage-800 p-4 max-h-80 overflow-y-auto space-y-3">
                    {showRecommendedQuestions || chatHistory.length === 0 ? (
                      <div className="space-y-3">
                        {isLoadingQuestions ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-sage-500 mr-2" />
                            <span className="text-sm text-muted-foreground">加载推荐问题...</span>
                          </div>
                        ) : recommendedQuestions.length > 0 ? (
                          <div className="space-y-2">
                            {chatHistory.length > 0 && (
                              <p className="text-xs text-muted-foreground mb-2 italic">
                                💡 点击问题继续提问，或点击右上角返回对话历史
                              </p>
                            )}
                            <p className="text-sm font-medium text-sage-700 dark:text-sage-400 mb-3 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              推荐问题（点击即可提问）
                            </p>
                            {recommendedQuestions.map((question, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleQuestionClick(question)}
                                className="w-full text-left p-3 rounded-lg border border-sage-200 dark:border-sage-800 hover:bg-sage-50 dark:hover:bg-sage-950 transition-colors text-sm"
                              >
                                <span className="font-medium text-sage-700 dark:text-sage-400 mr-2">{idx + 1}.</span>
                                {question}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            提问吧！例如："这篇论文的主要贡献是什么？"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                          <span className="text-xs font-medium text-muted-foreground/70">
                            对话历史
                          </span>
                          {chatHistory.length > 0 && (
                            <button
                              onClick={() => setShowRecommendedQuestions(true)}
                              className="text-xs text-sage-500 hover:text-sage-700 dark:text-sage-400 flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              查看推荐问题
                            </button>
                          )}
                        </div>
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === 'user'
                                ? 'bg-sage-600 text-white'
                                : 'bg-secondary text-secondary-foreground'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">
                                {msg.role === 'assistant' ? cleanMarkdown(msg.content) : msg.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isChatting && (
                      <div className="flex justify-start">
                        <div className="bg-secondary rounded-lg p-3">
                          <Loader2 className="w-4 h-4 animate-spin text-sage-500" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatQuestion}
                      onChange={(e) => setChatQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isChatting && handleChat()}
                      placeholder="输入你的问题..."
                      disabled={isChatting}
                      className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-sage-500"
                    />
                    <Button
                      onClick={handleChat}
                      disabled={isChatting || !chatQuestion.trim()}
                      size="sm"
                    >
                      {isChatting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : '发送'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full Text Summary (Collapsible) */}
          {coreInsights && (
            <details className="group">
              <summary className="cursor-pointer">
                <Card className="bg-muted/50 border-border hover:bg-secondary transition-colors">
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        查看完整AI解读
                      </div>
                      <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </summary>
              <Card className="mt-2 bg-card border-border">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Button
                      onClick={() => handleGenerateSummary(true)}
                      disabled={isGeneratingSummary}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isGeneratingSummary ? '生成中...' : (chineseSummary ? '重新生成摘要' : '生成结构化摘要')}
                    </Button>
                    <Button
                      onClick={handleGenerateHumanSummary}
                      disabled={isGeneratingHumanSummary}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isGeneratingHumanSummary ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成中...</>
                      ) : (
                        humanChineseSummary ? '重新生成人性化解读' : '生成人性化中文解读'
                      )}
                    </Button>
                    {humanChineseSummary && (
                      <div className="mt-4 p-4 bg-sage-50 dark:bg-sage-900/20 rounded-lg border border-sage-200 dark:border-sage-800">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <span>📖</span> 人性化中文解读
                        </h4>
                        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {humanChineseSummary}
                        </div>
                      </div>
                    )}
                    {chineseSummary && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2">📝 一句话总结</h4>
                          <p className="text-sm text-muted-foreground">{chineseSummary.one_sentence}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">❓ 研究问题</h4>
                          <p className="text-sm text-muted-foreground">{chineseSummary.research_question}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">⚙️ 方法</h4>
                          <p className="text-sm text-muted-foreground">{chineseSummary.method}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">🎯 关键发现</h4>
                          <p className="text-sm text-muted-foreground">{chineseSummary.key_findings}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">💡 贡献</h4>
                          <p className="text-sm text-muted-foreground">{chineseSummary.contribution}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">⚠️ 局限性</h4>
                          <p className="text-sm text-muted-foreground">{chineseSummary.limitations}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </details>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
