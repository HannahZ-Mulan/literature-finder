'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Sparkles, MessageSquare, FileText, Languages, FileOutput, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatPDFText } from '@/lib/text-formatter';
import { cleanMarkdown } from '@/lib/markdown-cleaner';
import { useToast } from '@/hooks/use-toast';

interface Paper {
  id: number;
  title: string;
  fileName: string;
  extractedText: string;
  summary?: string;
  createdAt: string;
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
  research_question: string;
  methods: string;
  key_findings: string[];
  contributions: string[];
  limitations: string[];
  applications: {
    researcher: string;
    clinician: string;
    policy_maker: string;
  };
  quality_assessment: {
    level: 'high' | 'medium' | 'low';
    reason: string;
  };
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
  const [isTranslating, setIsTranslating] = useState(false);

  // PPT generation states
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);

  // Full text expansion state
  const [isFullTextExpanded, setIsFullTextExpanded] = useState(false);

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

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const response = await fetch(`/api/papers/${id}/summary`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
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
        throw new Error(data.error || 'Failed to generate core insights');
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
        throw new Error(data.error || 'Translation failed');
      }

      setTranslation(data.translation);
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
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{paper.title}</h1>
          <Button
            onClick={handleGeneratePPT}
            disabled={isGeneratingPPT}
            variant="outline"
            className="border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950"
          >
            {isGeneratingPPT ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <FileOutput className="w-4 h-4 mr-2" />
                生成 PPT
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
          ⚡ 实验性功能：AI 自动生成 5 页 PPT
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: PDF Text */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                论文全文
              </div>
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-text select-text transition-all duration-300 ${
                isFullTextExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-32 overflow-hidden relative'
              }`}
              onMouseUp={() => {
                const selection = window.getSelection();
                const text = selection?.toString().trim();
                if (text && text.length > 10) {
                  setSelectedText(text);
                }
              }}
            >
              {formatPDFText(paper.extractedText.slice(0, 15000))}
              {paper.extractedText.length > 15000 && '\n\n... (文本过长，已截断)'}

              {!isFullTextExpanded && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent pt-8 pb-2 px-4">
                  <p className="text-xs text-muted-foreground text-center">点击"展开全文"查看完整内容</p>
                </div>
              )}
            </div>

            {selectedText && (
              <Card className="mt-4 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Languages className="w-4 h-4 text-blue-600" />
                    段落翻译
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded text-sm">
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
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium mb-2">中文翻译：</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{translation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Right: Core Insights (NEW) */}
        <div className="space-y-6">
          {/* Generate Button if no insights yet */}
          {!coreInsights && (
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
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
          )}

          {/* Core Insights Display */}
          {coreInsights && (
            <>
              {/* One Sentence Summary - TOP PRIORITY */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-3xl">🧠</span>
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                        一句话总结
                      </h3>
                      <p className="text-base font-medium leading-relaxed text-gray-900 dark:text-gray-100">
                        {coreInsights.one_sentence_summary}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Research Question */}
              {coreInsights.research_question && (
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">❓</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                          研究问题
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {coreInsights.research_question}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Methods */}
              {coreInsights.methods && (
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🔬</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                          研究方法
                        </h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {coreInsights.methods}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Findings */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">🎯</span>
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                        核心发现
                      </h3>
                      <div className="space-y-3">
                        {coreInsights.key_findings.map((finding, idx) => (
                          <div key={idx} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {finding}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contributions */}
              {coreInsights.contributions && coreInsights.contributions.length > 0 && (
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🌟</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                          主要贡献
                        </h3>
                        <div className="space-y-2">
                          {coreInsights.contributions.map((contribution, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="flex-shrink-0 text-blue-500">✓</span>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {contribution}
                              </p>
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
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                          局限性
                        </h3>
                        <div className="space-y-2">
                          {coreInsights.limitations.map((limitation, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span className="flex-shrink-0 text-orange-500">!</span>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {limitation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quality Assessment - NEW */}
              {coreInsights.quality_assessment && (
                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 dark:border-purple-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚖️</span>
                      <div className="flex-1">
                        <h3 className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-2">
                          研究质量判断
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            coreInsights.quality_assessment.level === 'high'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : coreInsights.quality_assessment.level === 'medium'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {coreInsights.quality_assessment.level === 'high' ? '高质量' :
                             coreInsights.quality_assessment.level === 'medium' ? '中等质量' : '低质量'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {coreInsights.quality_assessment.reason}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Practical Value - THE KEY DIFFERENTIATOR */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    这篇论文有什么用？
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* For Researchers */}
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                      <span>🔬</span>
                      对研究人员
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {coreInsights.applications.researcher}
                    </p>
                  </div>

                  {/* For Clinicians */}
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                      <span>🏥</span>
                      对临床医生
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {coreInsights.applications.clinician}
                    </p>
                  </div>

                  {/* For Policy Makers */}
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                      <span>📋</span>
                      对政策制定者
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {coreInsights.applications.policy_maker}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Full Text Summary (Collapsible - below core insights) */}
          <details className="group">
            <summary className="cursor-pointer">
              <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
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
            <Card className="mt-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <CardContent className="pt-6">
                {/* Original structured summary option */}
                <div className="space-y-4">
                  <Button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {isGeneratingSummary ? '生成中...' : '生成结构化摘要'}
                  </Button>
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

          {/* Chat with Paper */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                  AI 对话助手
                </div>
                <div className="flex items-center gap-2">
                  {showChat && chatHistory.length > 0 && !showRecommendedQuestions && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRecommendedQuestions(true)}
                      className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
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
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-600" />
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
                    <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                        <Sparkles className="w-4 h-4" />
                        <span>点击右上角的"返回推荐问题"按钮查看其他问题</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800 p-4 max-h-80 overflow-y-auto space-y-3">
                    {showRecommendedQuestions || chatHistory.length === 0 ? (
                      <div className="space-y-3">
                        {isLoadingQuestions ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-green-600 mr-2" />
                            <span className="text-sm text-muted-foreground">加载推荐问题...</span>
                          </div>
                        ) : recommendedQuestions.length > 0 ? (
                          <div className="space-y-2">
                            {chatHistory.length > 0 && (
                              <p className="text-xs text-muted-foreground mb-2 italic">
                                💡 点击问题继续提问，或点击右上角返回对话历史
                              </p>
                            )}
                            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              推荐问题（点击即可提问）
                            </p>
                            {recommendedQuestions.map((question, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleQuestionClick(question)}
                                className="w-full text-left p-3 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950 transition-colors text-sm"
                              >
                                <span className="font-medium text-green-700 dark:text-green-400 mr-2">{idx + 1}.</span>
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
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            对话历史
                          </span>
                          {chatHistory.length > 0 && (
                            <button
                              onClick={() => setShowRecommendedQuestions(true)}
                              className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 flex items-center gap-1"
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
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
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
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
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
                      className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
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
        </div>
      </div>
    </div>
  );
}
