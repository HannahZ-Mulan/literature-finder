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
  FileText as FileTextIcon
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
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Upload Research Paper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Upload Paper or Paste Text</h3>
            <p className="text-sm text-muted-foreground">
              Upload a PDF file or paste the text directly for AI analysis.
            </p>
          </div>

          {/* Toggle buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={!useManualText ? 'default' : 'outline'}
              onClick={() => setUseManualText(false)}
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </Button>
            <Button
              type="button"
              variant={useManualText ? 'default' : 'outline'}
              onClick={() => setUseManualText(true)}
              size="sm"
            >
              <FileIcon className="w-4 h-4 mr-2" />
              Paste Text
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Paper Title (Optional)</label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Will use filename if empty"
                disabled={isUploading || isParsing}
              />
            </div>

            {!useManualText ? (
              <div>
                <label className="block text-sm font-medium mb-2">PDF File</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={isUploading || isParsing}
                    className="flex-1"
                  />
                  {file && (
                    <span className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF text extraction happens automatically after upload
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">Paper Text</label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your research paper text here..."
                  className="min-h-[300px] font-mono text-sm"
                  disabled={isUploading || isParsing}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Paste the full text of your paper here for AI analysis.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* 上传进度条 */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 解析进度 */}
            {isParsing && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">{status}</p>
                </div>
              </div>
            )}

            {!isParsing && !isUploading && status && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">{status}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={(!file && !text) || isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Paper
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> PDF text extraction uses pdf-parse library. For best results,
              use text-based PDFs rather than scanned documents.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
