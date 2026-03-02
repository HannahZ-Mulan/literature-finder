'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, FileText, BookOpen, ExternalLink } from 'lucide-react';
import { PDFViewer } from '@/components/pdf-viewer';
import { NotesPanel } from '@/components/notes-panel';

export default function LiteratureReadPage() {
  const { id } = useParams();
  const router = useRouter();
  const [literature, setLiterature] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchLiterature();
    }
  }, [id]);

  const fetchLiterature = async () => {
    try {
      const res = await fetch(`/api/literature/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLiterature(data.literature);
      }
    } catch (err) {
      console.error('Failed to fetch literature:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="ml-4">加载中...</p>
        </div>
      </div>
    );
  }

  if (!literature) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">该文献没有PDF文件</p>
          <Button onClick={() => router.back()}>返回</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-row">
      {/* Left Side - PDF Viewer */}
      <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900 overflow-auto">
        <PDFViewer url={literature?.pdf_url || ''} title={literature?.title || 'PDF 预览'} />
      </div>

      {/* Right Side - Notes Panel */}
      <div className="w-96 border-l bg-background overflow-y-auto">
        <NotesPanel literatureId={literature ? parseInt(id as string) : 0} />
      </div>
    </div>
  );
}
