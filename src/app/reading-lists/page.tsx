'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, BookOpen, Trash2 } from 'lucide-react';

interface ReadingList {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
}

export default function ReadingListsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchReadingLists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reading-lists', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reading lists');
      }

      setLists(data.reading_lists || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingLists(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReadingLists();
    }
  }, [user]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newListName.trim()) {
      setError('请输入列表名称');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reading-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reading list');
      }

      setNewListName('');
      setNewListDescription('');
      setShowCreateForm(false);
      fetchReadingLists();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteList = async (listId: number) => {
    if (!confirm('确定要删除这个阅读列表吗？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reading-lists/${listId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete reading list');
      }

      fetchReadingLists();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
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
            <p className="text-muted-foreground mb-4">请先登录以使用阅读列表功能</p>
            <Button onClick={() => router.push('/login')}>前往登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">阅读列表</h1>
            <p className="text-muted-foreground">
              创建和管理您的阅读计划
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建列表
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>创建新阅读列表</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateList} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">列表名称</label>
                  <Input
                    placeholder="例如：本周阅读计划"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">描述（可选）</label>
                  <Input
                    placeholder="简要描述这个列表的用途"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? '创建中...' : '创建'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewListName('');
                      setNewListDescription('');
                      setError('');
                    }}
                    disabled={isCreating}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoadingLists ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <p className="mt-4">加载阅读列表...</p>
            </CardContent>
          </Card>
        ) : lists.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                还没有阅读列表，创建一个开始管理您的阅读计划吧！
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建第一个列表
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <Card key={list.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{list.name}</CardTitle>
                  {list.description && (
                    <CardDescription>{list.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {new Date(list.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/reading-lists/${list.id}`)}
                      >
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteList(list.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
