'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ZoomIn, ZoomOut, RotateCw, Download, Maximize2, Minimize2, FileText, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  title?: string;
}

export function PDFViewer({ url, title }: PDFViewerProps) {
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // 确保只在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      loadPDF();
    }
    return () => {
      if (pdf) {
        pdf.destroy();
      }
    };
  }, [url, isClient]);

  useEffect(() => {
    if (pdf) {
      renderPage(currentPage);
    }
  }, [pdf, currentPage, scale, rotation]);

  // 重置位置当页面或缩放改变时
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
  }, [currentPage, scale, rotation]);

  // 添加原生滚轮事件监听器（需要 passive: false 才能阻止默认行为）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
      }
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, []);

  // 鼠标拖动处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // 只响应左键
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // 动态导入 PDF.js
      const pdfjsLib = await import('pdfjs-dist');

      // 配置 worker - 使用CDN（更可靠）
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      // 使用代理URL来避免CORS问题
      const proxyUrl = `/api/proxy/pdf?url=${encodeURIComponent(url)}`;

      // 加载 PDF
      const loadingTask = pdfjsLib.getDocument({
        url: proxyUrl,
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      });

      const pdfDocument = await loadingTask.promise;
      setPdf(pdfDocument);
      setTotalPages(pdfDocument.numPages);
      setCurrentPage(1);
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      // 提供更详细的错误信息
      if (err.name === 'PasswordException') {
        setError('PDF 文件需要密码');
      } else if (err.name === 'InvalidPDFException') {
        setError('无效的 PDF 文件');
      } else if (err.message?.includes('CORS')) {
        setError('无法加载外部 PDF（CORS 限制），请尝试下载后查看');
      } else if (err.message?.includes('Network')) {
        setError('网络错误，无法加载 PDF');
      } else {
        setError(err.message || 'PDF 加载失败');
      }
      setLoading(false);
    }
  };

  const renderPage = async (pageNum: number) => {
    if (!pdf || !canvasRef.current) return;

    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // 获取基础viewport（scale=1）
      const baseViewport = page.getViewport({ scale: 1, rotation: rotation as any });

      // 设置 canvas 尺寸
      const containerWidth = containerRef.current?.clientWidth || 800;

      // 计算适合容器的基础缩放比例
      const baseScaleToFit = (containerWidth - 40) / baseViewport.width;

      // 最终缩放比例 = 基础适配比例 × 用户缩放比例
      const finalScale = baseScaleToFit * scale;

      // 使用最终缩放比例获取viewport
      const viewport = page.getViewport({
        scale: finalScale,
        rotation: rotation as any,
      });

      // 设置canvas尺寸
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 清除canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // 渲染页面
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(scale * 1.2);
  };

  const handleZoomOut = () => {
    setScale(scale / 1.2);
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const handleDownload = () => {
    window.open(url, '_blank');
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 服务端渲染时显示加载状态
  if (!isClient) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">正在加载 PDF...</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">正在加载 PDF...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <FileText className="w-12 h-12 text-muted-foreground" />
          <p className="text-destructive">PDF 加载失败</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            下载 PDF
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* 工具栏 */}
      <div className="border-b p-4 flex items-center justify-between bg-muted/30">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            {title || 'PDF 预览'}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentPage} / {totalPages} 页
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={handleZoomOut} title="缩小 (或 Ctrl+滚轮)">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-16 text-center" title="Ctrl+滚轮可缩放，拖动可移动">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn} title="放大 (或 Ctrl+滚轮)">
            <ZoomIn className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Button variant="ghost" size="sm" onClick={handleRotate} title="旋转">
            <RotateCw className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleFullscreen} title="全屏">
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleDownload} title="下载">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF 画布容器 */}
      <div
        ref={containerRef}
        className="relative bg-gray-100 dark:bg-gray-900 overflow-hidden"
        style={{ height: '60vh', touchAction: 'none' }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {/* 可拖动的canvas包装器 */}
        <div
          ref={canvasWrapperRef}
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
        >
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white block"
          />
        </div>
      </div>

      {/* 页面导航 */}
      <div className="flex items-center justify-between w-full p-4 bg-muted/30">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
        >
          上一页
        </Button>

        <div className="flex items-center space-x-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) {
                setCurrentPage(page);
              }
            }}
            className="w-16 h-8 px-2 text-center border rounded"
          />
          <span className="text-sm text-muted-foreground">/ {totalPages}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
        >
          下一页
        </Button>
      </div>
    </Card>
  );
}
