'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Sparkles, MessageSquare, FileText } from 'lucide-react';

interface Paper {
  id: number;
  title: string;
  fileName: string;
  extractedText: string;
  createdAt: string;
}

interface Summary {
  research_question: string;
  method: string;
  key_findings: string;
  contribution: string;
  limitations: string;
}

export default function DemoPaperPage() {
  const { id } = useParams();
  const router = useRouter();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Chat states
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchPaper();
  }, [id]);

  const fetchPaper = async () => {
    try {
      const response = await fetch(`/api/papers/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load paper');
      }

      setPaper(data.paper);
    } catch (error) {
      console.error('Error loading paper:', error);
    } finally {
      setIsLoading(false);
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

      setSummary(data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleChat = async () => {
    if (!chatQuestion.trim()) return;

    setIsChatting(true);
    const newHistory = [...chatHistory, { role: 'user' as const, content: chatQuestion }];
    setChatHistory(newHistory);

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

      setChatHistory([...newHistory, { role: 'assistant' as const, content: data.answer }]);
      setChatQuestion('');
    } catch (error) {
      console.error('Error chatting:', error);
      alert(error instanceof Error ? error.message : 'Failed to chat');
    } finally {
      setIsChatting(false);
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
            <Button onClick={() => router.push('/demo')}>Back to Upload</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/demo')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Upload
        </Button>
        <h1 className="text-2xl font-bold">{paper.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uploaded on {new Date(paper.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-6">
        {/* AI Summary Panel */}
        <Card className="bg-gradient-to-br from-sage-50 to-sage-100 dark:from-sage-900 dark:to-sage-900 border-sage-200 dark:border-sage-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sage-600 dark:text-sage-400" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!summary ? (
              <div className="text-center py-6">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50 text-sage-600" />
                <p className="text-sm text-muted-foreground mb-4">
                  Get an AI-powered summary of this paper
                </p>
                <Button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Summary
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2 text-sage-700 dark:text-sage-300">🔍 Research Question</h4>
                  <p className="text-sm text-muted-foreground">{summary.research_question}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2 text-sage-700 dark:text-sage-300">⚙️ Method</h4>
                  <p className="text-sm text-muted-foreground">{summary.method}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2 text-sage-700 dark:text-sage-300">🎯 Key Findings</h4>
                  <p className="text-sm text-muted-foreground">{summary.key_findings}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2 text-sage-700 dark:text-sage-300">💡 Contribution</h4>
                  <p className="text-sm text-muted-foreground">{summary.contribution}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2 text-sage-700 dark:text-sage-300">⚠️ Limitations</h4>
                  <p className="text-sm text-muted-foreground">{summary.limitations}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat with Paper Panel */}
        <Card className="bg-gradient-to-br from-sage-50 to-sage-100 dark:from-sage-900 dark:to-sage-900 border-sage-200 dark:border-sage-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sage-600 dark:text-sage-400" />
              Chat with Paper
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showChat ? (
              <div className="text-center py-6">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50 text-sage-600" />
                <p className="text-sm text-muted-foreground mb-4">
                  Ask questions about this paper
                </p>
                <Button onClick={() => setShowChat(true)} variant="outline">
                  Start Chatting
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-sage-200 dark:border-sage-800 p-4 max-h-96 overflow-y-auto space-y-3">
                  {chatHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Ask a question! For example: "What is the main contribution of this paper?"
                    </p>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin text-sage-600" />
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
                    placeholder="Ask a question about this paper..."
                    disabled={isChatting}
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <Button
                    onClick={handleChat}
                    disabled={isChatting || !chatQuestion.trim()}
                    size="sm"
                  >
                    {isChatting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : 'Send'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paper Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Paper Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Title:</span> {paper.title}</div>
              <div><span className="font-medium">File:</span> {paper.fileName}</div>
              <div><span className="font-medium">Extracted Text:</span> {paper.extractedText.length.toLocaleString()} characters</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
