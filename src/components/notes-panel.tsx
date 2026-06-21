'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, StickyNote, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: number;
  content: string;
  page_number?: number;
  quote?: string; // 引用的文本
  created_at: string;
}

interface NotesPanelProps {
  literatureId: number;
}

export function NotesPanel({ literatureId }: NotesPanelProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [quoteText, setQuoteText] = useState('');

  useEffect(() => {
    loadNotes();
  }, [literatureId]);

  const loadNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/literature/${literatureId}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!noteContent.trim()) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      const res = await fetch(`/api/literature/${literatureId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: noteContent,
          quote: quoteText || undefined,
        }),
      });

      console.log('creating note...', {
        literatureId,
        token: token?.slice?.(0, 10)
      });
      console.log('response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        setNotes(prev => [data.note, ...prev]);
        setNoteContent('');
        setQuoteText('');
        setIsEditing(false);
      } else {
        console.error('Save failed:', res.status);
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !noteContent.trim()) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      const res = await fetch(`/api/literature/${literatureId}/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: noteContent }),
      });

      console.log('updating note...', {
        literatureId,
        noteId: editingNote.id,
        token: token?.slice?.(0, 10)
      });
      console.log('response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        setNotes(prev => prev.map((n) => (n.id === editingNote.id ? data.note : n)));
        setEditingNote(null);
        setNoteContent('');
      } else {
        console.error('Update failed:', res.status);
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      const res = await fetch(`/api/literature/${literatureId}/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('deleting note...', {
        literatureId,
        noteId: id,
        token: token?.slice?.(0, 10)
      });
      console.log('response status:', res.status);

      if (res.ok) {
        setNotes(prev => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setNoteContent('');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            阅读笔记
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <X className="w-4 h-4" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                新建
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Create/Edit Note Form */}
        {(isEditing || editingNote) && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
            {quoteText && !editingNote && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                <p className="text-xs text-muted-foreground mb-1">引用:</p>
                <p className="italic">"{quoteText}"</p>
              </div>
            )}

            <Textarea
              placeholder="写下你的想法..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={editingNote ? handleUpdateNote : handleCreateNote}
                disabled={!noteContent.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    保存
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (editingNote) {
                    cancelEdit();
                  } else {
                    setIsEditing(false);
                    setNoteContent('');
                    setQuoteText('');
                  }
                }}
                disabled={isSaving}
              >
                取消
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 border rounded-lg hover:shadow-sm transition-shadow group"
            >
              {note.quote && (
                <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-500 rounded-r">
                  <p className="text-xs text-muted-foreground mb-1">引用:</p>
                  <p className="text-sm italic line-clamp-2">"{note.quote}"</p>
                </div>
              )}

              <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleString('zh-CN')}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(note)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {notes.length === 0 && !isEditing && (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">还没有笔记</p>
              <p className="text-xs mt-1">点击上方"新建"按钮开始记录</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
