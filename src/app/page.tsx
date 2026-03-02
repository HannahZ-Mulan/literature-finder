'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecommendationsPanel } from '@/components/recommendations-panel';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>加载中...</p>
      </div>
    );
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Search academic databases instead of just library
      router.push(`/search?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Literature Finder
            </h1>
            <p className="text-xl text-muted-foreground">
              智能文献查找助手
            </p>
            <p className="text-muted-foreground">
              集成多个学术数据库，提供AI驱动的文献摘要、智能推荐和引用管理功能
            </p>
          </div>

          {!user ? (
            <Card>
              <CardHeader>
                <CardTitle>开始使用</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  注册或登录以管理您的文献库
                </p>
                <div className="flex space-x-4">
                  <Button onClick={() => router.push('/login')}>登录</Button>
                  <Button variant="outline" onClick={() => router.push('/register')}>注册</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>搜索文献</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="输入关键词搜索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch}>搜索</Button>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer text-center" onClick={() => router.push('/library')}>
                    <p className="font-medium text-sm">我的库</p>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer text-center" onClick={() => router.push('/notes')}>
                    <p className="font-medium text-sm">我的笔记</p>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer text-center" onClick={() => router.push('/reading-lists')}>
                    <p className="font-medium text-sm">阅读列表</p>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer text-center" onClick={() => router.push('/search')}>
                    <p className="font-medium text-sm">搜索</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Recommendations */}
        <div className="space-y-6">
          {user && <RecommendationsPanel limit={5} />}
        </div>
      </div>
    </div>
  );
}
