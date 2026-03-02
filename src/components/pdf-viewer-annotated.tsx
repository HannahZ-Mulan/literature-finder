'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ZoomIn, ZoomOut, Highlighter, StickyNote, X, Save, Trash2, Underline } from 'lucide-react';

interface AnnotationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
}

interface Annotation {
  id: number;
  page_number: number;
  annotation_type: 'highlight' | 'note' | 'underline';
  content: string;
  note?: string;
  position?: string; // JSON string of AnnotationPosition
  color: string;
}

interface PDFViewerAnnotatedProps {
  url: string;
  literatureId: number;
  title?: string;
}

export function PDFViewerAnnotated({ url, literatureId, title }: PDFViewerAnnotatedProps) {
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<AnnotationPosition | null>(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [selectedAnnotationType, setSelectedAnnotationType] = useState<'highlight' | 'note' | 'underline'>('highlight');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPDF();
    loadAnnotations();
    return () => {
      if (pdf) pdf.destroy();
    };
  }, [url, literatureId]);

  useEffect(() => {
    if (pdf) renderPage(currentPage);
  }, [pdf, currentPage, scale, annotations]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const pdfDocument = await pdfjsLib.getDocument(url).promise;
      setPdf(pdfDocument);
      setTotalPages(pdfDocument.numPages);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadAnnotations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/literature/${literatureId}/annotations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnnotations(data.annotations || []);
      }
    } catch (err) {
      console.error('Failed to load annotations:', err);
    }
  };

  const renderPage = async (pageNum: number) => {
    if (!pdf || !canvasRef.current) return;
    const page = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise();

    // Render text layer for selection
    const textContent = await page.getTextContent();
    if (textLayerRef.current) {
      textLayerRef.current.innerHTML = '';
      textLayerRef.current.style.height = `${viewport.height}px`;
      textLayerRef.current.style.width = `${viewport.width}px`;

      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';

      textContent.items.forEach((item: any) => {
        const textDiv = document.createElement('div');
        textDiv.textContent = item.str;
        textDiv.style.position = 'absolute';
        textDiv.style.left = `${item.transform[4]}px`;
        textDiv.style.top = `${viewport.height - item.transform[5] - item.height}px`;
        textDiv.style.fontSize = `${item.height}px`;
        textDiv.style.fontFamily = item.fontName || 'sans-serif';
        textDiv.style.color = 'transparent';
        textDiv.style.userSelect = 'text';
        textDiv.style.cursor = 'text';
        textLayerDiv.appendChild(textDiv);
      });

      textLayerRef.current.appendChild(textLayerDiv);

      // Add text selection listener
      textLayerDiv.addEventListener('mouseup', handleTextSelection);
    }

    // Render highlights for current page
    renderHighlights(pageNum);
  };

  const renderHighlights = (pageNum: number) => {
    if (!textLayerRef.current) return;
    const pageAnnotations = annotations.filter((a) => a.page_number === pageNum);

    // Remove old annotations
    const oldAnnotations = textLayerRef.current.querySelectorAll('.annotation-overlay');
    oldAnnotations.forEach((h) => h.remove());

    pageAnnotations.forEach((annotation) => {
      if (annotation.annotation_type === 'highlight' && annotation.position) {
        const pos = JSON.parse(annotation.position) as AnnotationPosition;

        // Render highlight using all rects for multi-line selections
        pos.rects.forEach((rect, index) => {
          const highlightDiv = document.createElement('div');
          highlightDiv.className = 'annotation-overlay annotation-highlight';
          highlightDiv.style.position = 'absolute';
          highlightDiv.style.left = `${rect.x}px`;
          highlightDiv.style.top = `${rect.y}px`;
          highlightDiv.style.width = `${rect.width}px`;
          highlightDiv.style.height = `${rect.height}px`;
          highlightDiv.style.backgroundColor = annotation.color;
          highlightDiv.style.opacity = '0.3';
          highlightDiv.style.pointerEvents = 'auto';
          highlightDiv.style.cursor = 'pointer';
          highlightDiv.dataset.annotationId = String(annotation.id);
          highlightDiv.title = annotation.note || annotation.content;

          // Click to view/edit annotation
          highlightDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            handleEditAnnotation(annotation);
          });

          textLayerRef.current!.appendChild(highlightDiv);
        });
      } else if (annotation.annotation_type === 'underline' && annotation.position) {
        const pos = JSON.parse(annotation.position) as AnnotationPosition;

        // Render underline for each rect
        pos.rects.forEach((rect) => {
          const underlineDiv = document.createElement('div');
          underlineDiv.className = 'annotation-overlay annotation-underline';
          underlineDiv.style.position = 'absolute';
          underlineDiv.style.left = `${rect.x}px`;
          underlineDiv.style.top = `${rect.y + rect.height - 2}px`;
          underlineDiv.style.width = `${rect.width}px`;
          underlineDiv.style.height = '2px';
          underlineDiv.style.backgroundColor = annotation.color;
          underlineDiv.style.pointerEvents = 'auto';
          underlineDiv.style.cursor = 'pointer';
          underlineDiv.dataset.annotationId = String(annotation.id);
          underlineDiv.title = annotation.content;

          textLayerRef.current!.appendChild(underlineDiv);
        });
      }
    });
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && selection?.rangeCount > 0 && containerRef.current) {
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      const containerRect = containerRef.current.getBoundingClientRect();

      if (rects.length > 0) {
        // Convert each rect to relative coordinates
        const relativeRects: Array<{ x: number; y: number; width: number; height: number }> = [];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          const x = rect.left - containerRect.left;
          const y = rect.top - containerRect.top;
          const width = rect.width;
          const height = rect.height;

          relativeRects.push({ x, y, width, height });

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + width);
          maxY = Math.max(maxY, y + height);
        }

        const position: AnnotationPosition = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          rects: relativeRects,
        };

        setSelectedText(text);
        setSelectedPosition(position);
        setShowNoteDialog(true);
      }
    }
  };

  const handleSaveAnnotation = async () => {
    if (!selectedText || !selectedPosition) return;

    try {
      const token = localStorage.getItem('token');
      const annotationData = {
        page_number: currentPage,
        annotation_type: selectedAnnotationType,
        content: selectedText,
        note: selectedAnnotationType === 'note' ? noteContent : null,
        position: JSON.stringify(selectedPosition),
        color: highlightColor,
      };

      const res = await fetch(`/api/literature/${literatureId}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(annotationData),
      });

      if (res.ok) {
        const data = await res.json();
        setAnnotations([...annotations, data.annotation]);
        setShowNoteDialog(false);
        setNoteContent('');
        setSelectedText('');
        setSelectedPosition(null);

        // Clear selection
        const selection = window.getSelection();
        selection?.removeAllRanges();
      }
    } catch (err) {
      console.error('Failed to save annotation:', err);
    }
  };

  const handleDeleteAnnotation = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/literature/${literatureId}/annotations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnotations(annotations.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  };

  const handleEditAnnotation = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setNoteContent(annotation.note || '');
    setHighlightColor(annotation.color);
    setShowEditDialog(true);
  };

  const handleUpdateAnnotation = async () => {
    if (!editingAnnotation) return;

    try {
      const token = localStorage.getItem('token');
      const annotationData = {
        note: noteContent,
        color: highlightColor,
      };

      const res = await fetch(`/api/literature/${literatureId}/annotations/${editingAnnotation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(annotationData),
      });

      if (res.ok) {
        const data = await res.json();
        setAnnotations(annotations.map((a) => (a.id === editingAnnotation.id ? data.annotation : a)));
        setShowEditDialog(false);
        setNoteContent('');
        setEditingAnnotation(null);
      }
    } catch (err) {
      console.error('Failed to update annotation:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  const currentPageAnnotations = annotations.filter((a) => a.page_number === currentPage);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setScale(Math.max(0.5, scale - 0.25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setScale(Math.min(3, scale + 0.25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} / {totalPages}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
        </div>
      </div>

      <div className="flex gap-4">
        {/* PDF Viewer */}
        <Card className="flex-1 p-4">
          <div className="relative overflow-auto" style={{ maxHeight: '70vh' }}>
            <div className="relative inline-block">
              <canvas ref={canvasRef} className="border" />
              <div
                ref={textLayerRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </Card>

        {/* Annotations Panel */}
        <Card className="w-80 p-4 max-h-[70vh] overflow-y-auto">
          <h3 className="font-semibold mb-4">Annotations ({currentPageAnnotations.length})</h3>
          <div className="space-y-3">
            {currentPageAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleEditAnnotation(annotation)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {annotation.annotation_type === 'note' ? (
                      <StickyNote className="w-4 h-4 text-yellow-500 mb-1" />
                    ) : annotation.annotation_type === 'underline' ? (
                      <Underline className="w-4 h-4 mb-1" style={{ color: annotation.color }} />
                    ) : (
                      <Highlighter className="w-4 h-4 mb-1" style={{ color: annotation.color }} />
                    )}
                    <p className="text-sm line-clamp-3">{annotation.content}</p>
                    {annotation.note && (
                      <p className="text-xs text-muted-foreground mt-2">{annotation.note}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnnotation(annotation.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {currentPageAnnotations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Select text to add annotations
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Annotation Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add Annotation</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNoteDialog(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              &quot;{selectedText}&quot;
            </p>

            {/* Annotation Type Selector */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Annotation Type</label>
              <div className="flex gap-2">
                <Button
                  variant={selectedAnnotationType === 'highlight' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAnnotationType('highlight')}
                  className="flex-1"
                >
                  <Highlighter className="w-4 h-4 mr-2" />
                  Highlight
                </Button>
                <Button
                  variant={selectedAnnotationType === 'underline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAnnotationType('underline')}
                  className="flex-1"
                >
                  <Underline className="w-4 h-4 mr-2" />
                  Underline
                </Button>
                <Button
                  variant={selectedAnnotationType === 'note' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAnnotationType('note')}
                  className="flex-1"
                >
                  <StickyNote className="w-4 h-4 mr-2" />
                  Note
                </Button>
              </div>
            </div>

            <Textarea
              placeholder="Add a note (optional)"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="mb-4"
            />

            <Button onClick={() => handleSaveAnnotation()} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Annotation
            </Button>
          </Card>
        </div>
      )}

      {/* Edit Annotation Dialog */}
      {showEditDialog && editingAnnotation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Edit Annotation</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              &quot;{editingAnnotation.content}&quot;
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Type: {editingAnnotation.annotation_type}
            </p>

            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => setHighlightColor(e.target.value)}
                  className="w-12 h-8 rounded cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{highlightColor}</span>
              </div>
            </div>

            <Textarea
              placeholder="Add a note (optional)"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="mb-4"
            />

            <div className="flex gap-2">
              <Button onClick={() => handleUpdateAnnotation()} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Update
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteAnnotation(editingAnnotation.id);
                  setShowEditDialog(false);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
