'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Upload,
  FileText,
  FileIcon,
  CheckCircle2,
  AlertCircle,
  FileText as FileTextIcon,
  FolderOpen,
  ArrowRight
} from 'lucide-react';

interface Paper {
  id: number;
  title: string;
  fileName: string;
  extractedText: string;
  isComplete: boolean;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [paperId, setPaperId] = useState<number | null>(null);
  const [useManualText, setUseManualText] = useState(false);

  // 进度信息
  const [paper, setPaper] = useState<Paper | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.pdf')) {
        setError('Please upload a PDF file');
        return;
      }
      setFile(selectedFile);
      setTitle(selectedFile.name.replace('.pdf', ''));
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file && !text) {
      setError('Please select a file or enter text');
      return;
    }

    setIsUploading(true);
    setError('');
    setStatus('');
    setPaper(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('title', title);
      if (text) {
        formData.append('text', text);
      }

      // 模拟上传进度
      let progress = 0;
      const uploadInterval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress > 90) {
          clearInterval(uploadInterval);
        }
        setUploadProgress(Math.min(progress, 90));
      }, 200);

      const response = await fetch('/api/papers/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(uploadInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (data.success && data.paperId) {
        setPaperId(data.paperId);
        setStatus('File uploaded! Extracting text...');
        setIsParsing(true);
        setIsUploading(false);

        // 开始轮询进度
        pollResult(data.paperId);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const pollResult = useCallback(async (id: number) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/papers/${id}`);
        const data = await res.json();

        if (data.paper) {
          setPaper(data.paper);

          // 检查提取的文本
          if (data.paper.extractedText && data.paper.extractedText.length > 0) {
            setStatus(`Text extracted (${data.paper.extractedText.length} characters)...`);
          }

          // 完成解析
          if (data.paper.isComplete) {
            clearInterval(interval);
            setIsParsing(false);
            setStatus('Text extraction complete! Redirecting...');

            setTimeout(() => {
              router.push(`/paper/${id}`);
            }, 1500);
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
        clearInterval(interval);
        setIsParsing(false);
        setError('Failed to check extraction status');
      }
    }, 1500); // 每 1.5 秒轮询一次

    // 5 分钟后超时
    setTimeout(() => {
      clearInterval(interval);
      if (isParsing) {
        setIsParsing(false);
        setError('Extraction timeout. You can still view the paper.');
        setTimeout(() => router.push(`/paper/${id}`), 2000);
      }
    }, 5 * 60 * 1000);
  }, [router, isParsing]);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage:
          'radial-gradient(900px 500px at 50% -10%, hsl(45 80% 85% / 0.45) 0%, transparent 55%)',
      }}
    >
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background:
                'linear-gradient(135deg, hsl(40 76% 40%), hsl(28 52% 42%))',
            }}
          >
            <Upload className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-4xl font-medium mb-3">
            上传研究论文
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            上传PDF或粘贴文本，AI将自动提取和分析论文内容
          </p>
        </div>

        <Card className="border shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-serif">
                <FileText className="w-5 h-5 text-accent" />
                上传论文
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/my-papers')}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <FolderOpen className="w-4 h-4" />
                我的论文
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-8">
            {/* Upload Method Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border p-1 bg-muted/50">
                <Button
                  type="button"
                  variant={!useManualText ? 'default' : 'ghost'}
                  onClick={() => setUseManualText(false)}
                  size="sm"
                  className="rounded-md"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  PDF上传
                </Button>
                <Button
                  type="button"
                  variant={useManualText ? 'default' : 'ghost'}
                  onClick={() => setUseManualText(true)}
                  size="sm"
                  className="rounded-md"
                >
                  <FileIcon className="w-4 h-4 mr-2" />
                  文本粘贴
                </Button>
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">论文标题 <span className="text-muted-foreground">（可选）</span></label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="留空则使用文件名"
                disabled={isUploading || isParsing}
                className="h-12"
              />
            </div>

            {/* File or Text Input */}
            {!useManualText ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium">PDF文件</label>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer"
                  onClick={() => document.querySelector('input[type="file"]')?.click()}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={isUploading || isParsing}
                    className="hidden"
                  />
                  {!file ? (
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">点击上传PDF文件</p>
                        <p className="text-sm text-muted-foreground">或拖拽文件到此处</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-accent" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        移除
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  💡 系统将自动提取PDF中的文本内容
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium">论文文本</label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="在此粘贴论文全文..."
                  className="min-h-[250px] font-mono text-sm resize-none"
                  disabled={isUploading || isParsing}
                />
                <p className="text-xs text-muted-foreground">
                  💡 粘贴完整的论文文本以获得最佳AI分析效果
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">上传失败</p>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="font-medium text-primary">正在上传...</span>
                  </div>
                  <span className="text-sm font-medium text-primary/80">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Parsing Progress */}
            {isParsing && (
              <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  <div className="flex-1">
                    <p className="font-medium text-accent">正在提取文本...</p>
                    {status && <p className="text-sm text-accent/80 mt-1">{status}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {!isParsing && !isUploading && status && (
              <div className="p-4 bg-sage-50 border border-sage-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-sage-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sage-700">{status}</p>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={(!file && !text) || isUploading || isParsing}
              className="w-full h-14 text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  开始上传
                </>
              )}
            </Button>

            {/* Help Text */}
            <div className="pt-4 border-t">
              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">支持的格式</p>
                  <p>• PDF文件（推荐）- 系统会自动提取文本内容</p>
                  <p>• 纯文本 - 直接粘贴论文全文</p>
                  <p className="mt-2 text-xs">⚠️ 扫描的PDF可能无法正确提取文本</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
