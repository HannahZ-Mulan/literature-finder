'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  X,
  Star,
  Heart,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Save,
  Plus,
  Trash2,
  Edit3,
  Check,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: number;
  content: string;
  quote: string | null;
  page_number: number | null;
  created_at: string;
}

interface LiteratureNoteSidebarProps {
  literatureId: number;
  literatureTitle: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function LiteratureNoteSidebar({
  literatureId,
  literatureTitle,
  isOpen,
  onToggle,
}: LiteratureNoteSidebarProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isToRead, setIsToRead] = useState(false);
  const [readingProgress, setReadingProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const isMounted = useRef(true);

  // Load data when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadNotes();
      loadMarks();
    }
    return () => {
      isMounted.current = false;
    };
  }, [isOpen]);

  async function loadNotes() {
    try {
      const response = await fetch(`/api/literature/${literatureId}/notes`);
      if (response.ok) {
        const data = await response.json();
        if (isMounted.current) {
          setNotes(data.notes || []);
        }
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }

  async function loadMarks() {
    try {
      const response = await fetch(`/api/notes?literatureId=${literatureId}`);
      if (response.ok) {
        const data = await response.json();
        if (isMounted.current) {
          setIsFavorite(data.is_favorite || false);
          setIsLiked(data.is_liked || false);
          setIsToRead(data.is_to_read || false);
          setReadingProgress(data.reading_progress?.toString() || '');
        }
      }
    } catch (error) {
      console.error('Failed to load marks:', error);
    }
  }

  async function handleSaveNote() {
    if (!newNote.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // 开发模式：即使没有token也发送请求（后端会使用test user）
      if (!token && process.env.NODE_ENV !== 'development') {
        console.error('No auth token found in production mode');
        toast({
          title: "保存失败",
          description: "请先登录",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 只有在有token时才添加Authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/literature/${literatureId}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: newNote,
          quote: null,
          page_number: null,
        }),
      });

      console.log('saving note...', {
        literatureId,
        hasToken: !!token,
        env: process.env.NODE_ENV,
      });
      console.log('response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        if (isMounted.current) {
          setNotes(prev => [data.note, ...prev]);
          setNewNote('');
          toast({
            title: "笔记已保存",
            description: "你的笔记已成功保存",
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: '保存失败' }));
        console.error('Save failed:', response.status, errorData);
        toast({
          title: "保存失败",
          description: errorData.error || "请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      toast({
        title: "保存失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  }

  async function handleUpdateNote(noteId: number) {
    if (!editContent.trim()) return;

    try {
      const token = localStorage.getItem('token');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/literature/${literatureId}/notes/${noteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content: editContent }),
      });

      console.log('updating note...', {
        literatureId,
        noteId,
        hasToken: !!token,
      });
      console.log('response status:', response.status);

      if (response.ok && isMounted.current) {
        const data = await response.json();
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: data.note.content } : n));
        setEditingId(null);
        setEditContent('');
        toast({
          title: "笔记已更新",
          description: "笔记更新成功",
        });
      } else if (!isMounted.current) {
        return;
      } else {
        const errorData = await response.json().catch(() => ({ error: '更新失败' }));
        console.error('Update failed:', response.status, errorData);
        toast({
          title: "更新失败",
          description: errorData.error || "请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to update note:', error);
      toast({
        title: "更新失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteNote(noteId: number) {
    try {
      const token = localStorage.getItem('token');

      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/literature/${literatureId}/notes/${noteId}`, {
        method: 'DELETE',
        headers,
      });

      console.log('deleting note...', {
        literatureId,
        noteId,
        hasToken: !!token,
      });
      console.log('response status:', response.status);

      if (response.ok && isMounted.current) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        toast({
          title: "笔记已删除",
          description: "笔记删除成功",
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: '删除失败' }));
        console.error('Delete failed:', response.status, errorData);
        toast({
          title: "删除失败",
          description: errorData.error || "请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast({
        title: "删除失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    }
  }

  async function handleSaveMarks() {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '1',
          literatureId,
          note: '',
          is_favorite: isFavorite,
          is_liked: isLiked,
          is_to_read: isToRead,
          reading_progress: readingProgress ? parseInt(readingProgress) : null,
        }),
      });

      if (response.ok && isMounted.current) {
        toast({
          title: "保存成功",
          description: "标记和进度已更新",
        });
      } else if (!isMounted.current) {
        return;
      } else {
        const error = await response.json();
        toast({
          title: "保存失败",
          description: error.error || "请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (isMounted.current) {
        toast({
          title: "保存失败",
          description: "请稍后重试",
          variant: "destructive",
        });
      }
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`
          fixed right-0 top-1/2 -translate-y-1/2 z-40
          ${isOpen ? 'right-96' : 'right-4'}
          bg-blue-600 hover:bg-blue-700 text-white
          p-3 rounded-l-lg shadow-lg
          transition-all duration-300
          group
        `}
      >
        {isOpen ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900
          border-l shadow-2xl z-30 overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              笔记面板
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Marks */}
          <div className="flex gap-2 mb-3">
            <Button
              variant={isFavorite ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsFavorite(!isFavorite)}
              className="flex-1"
            >
              <Star className={`w-4 h-4 mr-1 ${isFavorite ? 'fill-current' : ''}`} />
              收藏
            </Button>
            <Button
              variant={isLiked ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className="flex-1"
            >
              <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current text-red-500' : ''}`} />
              喜欢
            </Button>
            <Button
              variant={isToRead ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsToRead(!isToRead)}
              className="flex-1"
            >
              <Bookmark className={`w-4 h-4 mr-1 ${isToRead ? 'fill-current' : ''}`} />
              待细读
            </Button>
          </div>

          {/* Reading Progress */}
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-gray-500" />
            <Input
              type="number"
              value={readingProgress}
              onChange={(e) => setReadingProgress(e.target.value)}
              placeholder="页码"
              className="flex-1 h-9"
              onBlur={handleSaveMarks}
            />
          </div>

          <Button
            size="sm"
            onClick={handleSaveMarks}
            className="w-full"
            disabled={saving}
          >
            {saving ? '保存中...' : <><Check className="w-4 h-4 mr-1" /> 保存标记</>}
          </Button>
        </div>

        {/* Notes List */}
        <div className="p-4 space-y-4">
          {/* New Note */}
          <div className="space-y-2">
            <Textarea
              placeholder="在这里记录你的想法、笔记、灵感..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={saving || !newNote.trim()}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-1" />
                {saving ? '保存中...' : '添加笔记'}
              </Button>
            </div>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {notes.length} 条笔记
            </h3>

            {notes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                还没有笔记，开始记录你的想法吧！
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border group"
                >
                  {editingId === note.id ? (
                    <>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="resize-none mb-2"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={saving || !editContent.trim()}
                          className="flex-1"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditContent('');
                          }}
                        >
                          取消
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm whitespace-pre-wrap flex-1">
                          {note.content}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditContent(note.content);
                          }}
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                      {note.page_number && (
                        <Badge variant="secondary" className="text-xs">
                          第 {note.page_number} 页
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
