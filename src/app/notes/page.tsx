'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Heart, Bookmark, BookOpen, Search, FileText, ArrowLeft } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface Author {
  name?: string;
}

interface Note {
  id: number;
  literature_id: number;
  title: string;
  authors: string | Author[];
  abstract: string;
  notes: string | null;
  is_favorite: boolean;
  is_liked: boolean;
  is_to_read: boolean;
  reading_progress: number | null;
  journal: string | null;
  publication_date: string | null;
  source: string;
  created_at: string;
}

function formatAuthors(authors: string | Author[] | null | undefined): string {
  if (!authors) return 'Unknown';
  if (typeof authors === 'string') return authors;
  if (Array.isArray(authors)) {
    return authors.map((a: Author) => a.name || 'Unknown').join(', ');
  }
  return 'Unknown';
}

type FilterType = 'all' | 'favorite' | 'liked' | 'to-read' | 'with-notes';

export default function NotesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterType>('all');

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchQuery, activeTab]);

  async function loadNotes() {
    setIsLoading(true);
    try {
      // API has max limit of 100, so we fetch in batches if needed
      const response = await fetch('/api/literature/library?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only show items with notes or marks
        const itemsWithNotes = data.literature.filter((item: any) =>
          item.notes || item.is_favorite || item.is_liked || item.is_to_read
        );
        setNotes(itemsWithNotes);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function filterNotes() {
    let filtered = [...notes];

    // Apply tab filter
    switch (activeTab) {
      case 'favorite':
        filtered = filtered.filter(n => n.is_favorite);
        break;
      case 'liked':
        filtered = filtered.filter(n => n.is_liked);
        break;
      case 'to-read':
        filtered = filtered.filter(n => n.is_to_read);
        break;
      case 'with-notes':
        filtered = filtered.filter(n => n.notes && n.notes.trim());
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title?.toLowerCase().includes(query) ||
        formatAuthors(n.authors).toLowerCase().includes(query) ||
        n.notes?.toLowerCase().includes(query)
      );
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    setFilteredNotes(filtered);
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="ml-4">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">请先登录以查看笔记</p>
            <Button onClick={() => router.push('/login')}>前往登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getMarkBadges = (note: Note) => {
    const badges = [];
    if (note.is_favorite) {
      badges.push(<Badge key="fav" className="bg-yellow-500 hover:bg-yellow-600"><Star className="w-3 h-3 mr-1 fill-current" />收藏</Badge>);
    }
    if (note.is_liked) {
      badges.push(<Badge key="liked" className="bg-red-500 hover:bg-red-600 text-white"><Heart className="w-3 h-3 mr-1 fill-current" />喜欢</Badge>);
    }
    if (note.is_to_read) {
      badges.push(<Badge key="toread" className="bg-blue-500 hover:bg-blue-600 text-white"><Bookmark className="w-3 h-3 mr-1 fill-current" />待读</Badge>);
    }
    return badges;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">我的笔记</h1>
              <Button variant="outline" size="sm" onClick={() => router.push('/search')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回搜索
              </Button>
            </div>
            <p className="text-muted-foreground mt-2">
              查看所有标记和笔记的文献
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            共 {filteredNotes.length} 篇文献
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索标题、作者或笔记内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterType)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              全部 ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="favorite">
              <Star className="w-4 h-4 mr-1" />
              收藏 ({notes.filter(n => n.is_favorite).length})
            </TabsTrigger>
            <TabsTrigger value="liked">
              <Heart className="w-4 h-4 mr-1" />
              喜欢 ({notes.filter(n => n.is_liked).length})
            </TabsTrigger>
            <TabsTrigger value="to-read">
              <Bookmark className="w-4 h-4 mr-1" />
              待读 ({notes.filter(n => n.is_to_read).length})
            </TabsTrigger>
            <TabsTrigger value="with-notes">
              <FileText className="w-4 h-4 mr-1" />
              有笔记 ({notes.filter(n => n.notes?.trim()).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredNotes.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>没有找到相关笔记</p>
                  <p className="text-sm mt-2">
                    {activeTab === 'all' ? '开始添加笔记和标记文献吧！' : '试试切换到其他标签'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredNotes.map((note) => (
                  <Card key={note.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 cursor-pointer" onClick={() => router.push(`/literature/${note.literature_id}`)}>
                          {/* Title and Marks */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                              {note.title}
                            </h3>
                            {getMarkBadges(note)}
                          </div>

                          {/* Authors */}
                          <div className="text-sm text-muted-foreground mb-2">
                            {formatAuthors(note.authors)}
                          </div>

                          {/* Journal and Date */}
                          <div className="text-sm text-muted-foreground mb-3">
                            {note.journal && <span>{note.journal}</span>}
                            {note.publication_date && <span className="ml-2">· {note.publication_date.substring(0, 4)}</span>}
                            {note.reading_progress && (
                              <span className="ml-2">
                                <BookOpen className="w-3 h-3 inline mr-1" />
                                读至第 {note.reading_progress} 页
                              </span>
                            )}
                          </div>

                          {/* Notes */}
                          {note.notes && (
                            <div className="bg-muted/50 rounded-lg p-3 mt-3">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {note.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/literature/${note.literature_id}`)}
                        >
                          查看详情
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
