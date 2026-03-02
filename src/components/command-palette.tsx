'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, FileText, BookOpen, Clock, BarChart3, Home, Library } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    { icon: Home, label: '前往首页', action: () => router.push('/') },
    { icon: Search, label: '搜索文献', action: () => router.push('/search') },
    { icon: Library, label: '查看文献库', action: () => router.push('/library') },
    { icon: BookOpen, label: '阅读列表', action: () => router.push('/reading-lists') },
    { icon: BarChart3, label: '统计分析', action: () => router.push('/statistics') },
  ];

  const filteredCommands = query
    ? commands.filter(cmd => cmd.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          filteredCommands[selectedIndex]?.action();
          onOpenChange(false);
          setQuery('');
          break;
        case 'Escape':
          onOpenChange(false);
          setQuery('');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, query, selectedIndex, filteredCommands]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            快速跳转
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="搜索命令..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="h-12"
          />

          <div className="space-y-1">
            {filteredCommands.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">没有找到匹配的命令</p>
            ) : (
              filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      cmd.action();
                      onOpenChange(false);
                      setQuery('');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{cmd.label}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            使用 ↑↓ 选择，Enter 确认，Esc 关闭
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Global hook for command palette
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}
