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
              router.push(`/my-papers`);
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
        setTimeout(() => router.push(`/my-papers`), 2000);
      }
    }, 5 * 60 * 1000);
  }, [router, isParsing]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            上传研究论文
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            上传PDF或粘贴文本，AI将自动提取和分析论文内容
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
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
                  className="border-2 border-dashed rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
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
                      <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">点击上传PDF文件</p>
                        <p className="text-sm text-muted-foreground">或拖拽文件到此处</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
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
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">上传失败</p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">正在上传...</span>
                  </div>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Parsing Progress */}
            {isParsing && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  <div className="flex-1">
                    <p className="font-medium text-purple-900 dark:text-purple-100">正在提取文本...</p>
                    {status && <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">{status}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {!isParsing && !isUploading && status && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100 text-green-700 dark:text-green-300">{status}</p>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={(!file && !text) || isUploading || isParsing}
              className="w-full h-14 text-lg font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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
