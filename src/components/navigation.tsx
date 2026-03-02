'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-xl font-bold text-primary">
              Literature Finder
            </Link>
            {user && (
              <div className="flex space-x-4">
                <Link href="/search" className="text-sm hover:text-primary transition-colors">
                  学术搜索
                </Link>
                <Link href="/library" className="text-sm hover:text-primary transition-colors">
                  我的库
                </Link>
                <Link href="/notes" className="text-sm hover:text-primary transition-colors">
                  我的笔记
                </Link>
                <Link href="/reading-lists" className="text-sm hover:text-primary transition-colors">
                  阅读列表
                </Link>
                <Link href="/statistics" className="text-sm hover:text-primary transition-colors">
                  统计分析
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {user.name}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  登出
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    登录
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    注册
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
