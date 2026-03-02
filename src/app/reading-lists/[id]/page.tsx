'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, BookOpen, Calendar, Quote, CheckSquare, X, Download, Trash2, AlertTriangle, Clock, Edit2, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Literature {
  item_id: number;
  id: number;
  title: string;
  authors: string[];
  abstract: string;
  doi: string;
  publication_date: string;
  journal: string;
  citation_count: number;
  source: string;
  keywords: string[] | null;
  notes: string | null;
  reading_status: string;
  priority: string;
  due_date: Date | null;
  estimated_reading_time: number | null;
  actual_reading_time: number | null;
  added_at: string;
  is_overdue: boolean;
}

interface ReadingListDetail {
  reading_list: {
    id: number;
    name: string;
    description: string | null;
  };
  items: Literature[];
}

const priorityConfig = {
  urgent: { label: '紧急', color: 'bg-red-500 text-white' },
  high: { label: '高', color: 'bg-orange-500 text-white' },
  medium: { label: '中', color: 'bg-yellow-500 text-white' },
  low: { label: '低', color: 'bg-green-500 text-white' },
};

export default function ReadingListDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<ReadingListDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created' | 'title'>('due_date');

  // Batch operations state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isRemovingBatch, setIsRemovingBatch] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Batch edit state
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchPriority, setBatchPriority] = useState<'low' | 'medium' | 'high' | 'urgent' | ''>('');
  const [batchDueDate, setBatchDueDate] = useState('');
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // Editing due date state
  const [editingDueDate, setEditingDueDate] = useState<number | null>(null);
  const [tempDueDate, setTempDueDate] = useState('');

  useEffect(() => {
    fetchListDetail();
  }, [params.id, token, sortBy]);

  const fetchListDetail = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reading-lists/${params.id}/items?sort=${sortBy}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch reading list');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async (itemId: number, updates: any) => {
    try {
      const response = await fetch(`/api/reading-lists/${params.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update item');
      }

      fetchListDetail();
      toast({
        title: "更新成功",
        description: "文献信息已更新",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "更新失败",
        description: err.message,
      });
    }
  };

  const handleRemoveFromList = async (itemId: number) => {
    try {
      const response = await fetch(`/api/reading-lists/${params.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove from list');
      }

      fetchListDetail();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "移除失败",
        description: err.message,
      });
    }
  };

  const handleSaveDueDate = async (itemId: number) => {
    try {
      const response = await fetch(`/api/reading-lists/${params.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ due_date: tempDueDate || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update due date');
      }

      setEditingDueDate(null);
      setTempDueDate('');
      fetchListDetail();
      toast({
        title: "更新成功",
        description: "截止日期已更新",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "更新失败",
        description: err.message,
      });
    }
  };

  const handleCancelEditDueDate = () => {
    setEditingDueDate(null);
    setTempDueDate('');
  };

  const handleStartEditDueDate = (itemId: number, currentDueDate: Date | null) => {
    setEditingDueDate(itemId);
    if (currentDueDate) {
      const date = new Date(currentDueDate);
      // Format to YYYY-MM-DD for date input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setTempDueDate(`${year}-${month}-${day}`);
    } else {
      setTempDueDate('');
    }
  };

  // Batch update function
  const handleBatchUpdate = async () => {
    if (selectedIds.size === 0) return;

    setIsBatchUpdating(true);
    setError('');
    setSuccessMessage('');

    try {
      let successCount = 0;
      const updates: any = {};

      if (batchPriority) {
        updates.priority = batchPriority;
      }

      if (batchDueDate) {
        updates.due_date = batchDueDate;
      }

      // Update each selected item
      for (const itemId of selectedIds) {
        const response = await fetch(`/api/reading-lists/${params.id}/items/${itemId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });

        if (response.ok) {
          successCount++;
        }
      }

      setSuccessMessage(`成功更新 ${successCount} 篇文献`);
      setSelectedIds(new Set());
      setShowBatchEdit(false);
      setBatchPriority('');
      setBatchDueDate('');

      setTimeout(() => setSuccessMessage(''), 3000);
      fetchListDetail();
    } catch (err: any) {
      setError('批量更新失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all
  const selectAll = () => {
    const allIds = data?.items?.map(lit => lit.id) || [];
    setSelectedIds(new Set(allIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch export citations
  const handleBatchExport = async (format: string) => {
    if (selectedIds.size === 0) return;

    setIsExporting(true);
    setError('');
    setSuccessMessage('');
    try {
      const citations = await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const response = await fetch(`/api/literature/${id}/export?format=${format}`);
          if (!response.ok) throw new Error(`Failed to export item ${id}`);
          return await response.text();
        })
      );

      const combinedCitations = citations.join('\n\n');
      await navigator.clipboard.writeText(combinedCitations);

      setSuccessMessage(`已复制 ${selectedIds.size} 条${format.toUpperCase()} 引用到剪贴板`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError('批量导出失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  // Batch remove from reading list
  const handleBatchRemove = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`确定要从列表中移除选中的 ${selectedIds.size} 篇文献吗？`)) {
      return;
    }

    setIsRemovingBatch(true);
    setError('');
    setSuccessMessage('');
    try {
      let successCount = 0;

      for (const id of selectedIds) {
        const response = await fetch(`/api/reading-lists/${params.id}/items/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          successCount++;
        }
      }

      setSuccessMessage(`成功从列表中移除 ${successCount} 篇文献`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchListDetail();
    } catch (err: any) {
      setError('批量移除失败: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsRemovingBatch(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <Badge variant="outline">未读</Badge>;
      case 'reading':
        return <Badge className="bg-blue-500 text-white">阅读中</Badge>;
      case 'read':
        return <Badge className="bg-green-500 text-white">已读</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | null | string) => {
    if (!date) return '未设置';
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const isOverdue = (dueDate: Date | null | string, status: string) => {
    if (!dueDate || status === 'read') return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto border-destructive">
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium mb-2">加载失败</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/reading-lists')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">排序:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {sortBy === 'due_date' && '截止日期'}
                  {sortBy === 'priority' && '优先级'}
                  {sortBy === 'created' && '添加时间'}
                  {sortBy === 'title' && '标题'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('due_date')}>截止日期</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('priority')}>优先级</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('created')}>添加时间</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('title')}>标题</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold">{data.reading_list.name}</h1>
          {data.reading_list.description && (
            <p className="text-muted-foreground mt-1">{data.reading_list.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            共 {data.items.length} 篇文献
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Batch Operations Toolbar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <span className="font-medium">
                  已选择 <span className="text-blue-600">{selectedIds.size}</span> 篇文献
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="h-8 px-2"
                >
                  全选
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-8 px-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  取消选择
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
              {/* Batch Export */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm" disabled={isExporting}>
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        导出中...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        批量导出
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => handleBatchExport('apa')}>
                    APA 格式
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchExport('mla')}>
                    MLA 格式
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchExport('chicago')}>
                    Chicago 格式
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBatchExport('harvard')}>
                    Harvard 格式
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBatchExport('vancouver')}>
                    Vancouver 格式
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Batch Remove */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchRemove}
                disabled={isRemovingBatch}
                className="text-destructive hover:text-destructive border-destructive hover:bg-destructive/10"
              >
                {isRemovingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    移除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    从列表移除
                  </>
                )}
              </Button>

              {/* Batch Edit */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBatchEdit(true)}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                批量设置
              </Button>
            </div>

            {/* Batch Edit Panel */}
            {showBatchEdit && (
              <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <h4 className="font-medium mb-3">批量设置 ({selectedIds.size} 篇文献)</h4>
                <div className="space-y-4">
                  {/* Priority */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium w-20">优先级:</label>
                    <div className="flex gap-2">
                      {['low', 'medium', 'high', 'urgent'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setBatchPriority(batchPriority === p ? '' : p as any)}
                          className={`px-3 py-1 rounded text-sm border transition-colors ${
                            batchPriority === p
                              ? 'bg-purple-500 text-white border-purple-500'
                              : 'hover:bg-purple-50'
                          }`}
                        >
                          {priorityConfig[p].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium w-20">截止日期:</label>
                    <Input
                      type="date"
                      value={batchDueDate}
                      onChange={(e) => setBatchDueDate(e.target.value)}
                      className="w-40 h-9"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={handleBatchUpdate}
                      disabled={isBatchUpdating || (!batchPriority && !batchDueDate)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isBatchUpdating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          更新中...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          应用
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowBatchEdit(false);
                        setBatchPriority('');
                        setBatchDueDate('');
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        {data.items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">这个阅读列表还没有文献</p>
              <p className="text-sm text-muted-foreground mt-2">
                从文献库添加文献到此列表
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {data.items.map((literature) => (
              <Card
                key={literature.item_id}
                className={`hover:shadow-md transition-shadow ${selectedIds.has(literature.id) ? 'ring-2 ring-primary' : ''} ${literature.is_overdue ? 'border-red-300 dark:border-red-800' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <Checkbox
                      checked={selectedIds.has(literature.id)}
                      onCheckedChange={() => toggleSelection(literature.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl line-clamp-2">{literature.title}</CardTitle>
                        {literature.is_overdue && (
                          <Badge variant="destructive" className="shrink-0">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            已逾期
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {literature.authors.join(', ')}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {literature.source}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {literature.abstract}
                  </p>

                  <div className="flex flex-wrap gap-2 text-sm">
                    {literature.journal && (
                      <div className="flex items-center text-muted-foreground">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {literature.journal}
                      </div>
                    )}
                    {literature.publication_date && (
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(literature.publication_date).getFullYear()}
                      </div>
                    )}
                    {literature.citation_count > 0 && (
                      <div className="flex items-center text-muted-foreground">
                        <Quote className="w-4 h-4 mr-1" />
                        {literature.citation_count} 引用
                      </div>
                    )}
                  </div>

                  {/* Priority and Due Date */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">优先级:</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <span className={`w-2 h-2 rounded-full mr-2 ${priorityConfig[literature.priority as keyof typeof priorityConfig].color.split(' ')[0]}`} />
                            {priorityConfig[literature.priority as keyof typeof priorityConfig].label}
                            <Edit2 className="w-3 h-3 ml-1 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {(Object.keys(priorityConfig) as Array<keyof typeof priorityConfig>).map((key) => (
                            <DropdownMenuItem
                              key={key}
                              onClick={() => handleUpdateItem(literature.item_id, { priority: key })}
                            >
                              <span className={`w-2 h-2 rounded-full mr-2 ${priorityConfig[key].color.split(' ')[0]}`} />
                              {priorityConfig[key].label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">截止日期:</span>
                      {editingDueDate === literature.item_id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={tempDueDate}
                            onChange={(e) => setTempDueDate(e.target.value)}
                            className="h-7 w-36 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleSaveDueDate(literature.item_id)}
                          >
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={handleCancelEditDueDate}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-sm cursor-pointer hover:underline ${isOverdue(literature.due_date, literature.reading_status) ? 'text-red-600 font-medium' : ''}`}
                            onClick={() => handleStartEditDueDate(literature.item_id, literature.due_date as Date | null)}
                          >
                            {formatDate(literature.due_date)}
                          </span>
                          <Edit2
                            className="w-3 h-3 text-muted-foreground opacity-50 hover:opacity-100 cursor-pointer"
                            onClick={() => handleStartEditDueDate(literature.item_id, literature.due_date as Date | null)}
                          />
                        </div>
                      )}
                    </div>

                    {literature.estimated_reading_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          预计 {literature.estimated_reading_time} 分钟
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(literature.reading_status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <Edit2 className="w-3 h-3 mr-1 opacity-50" />
                            状态
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleUpdateItem(literature.item_id, { reading_status: 'unread' })}>
                            未读
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateItem(literature.item_id, { reading_status: 'reading' })}>
                            阅读中
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateItem(literature.item_id, { reading_status: 'read' })}>
                            已读
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/literature/${literature.id}`)}
                      >
                        查看详情
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromList(literature.item_id)}
                      >
                        移除
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
