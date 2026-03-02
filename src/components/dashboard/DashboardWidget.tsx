'use client';

import { ReactNode } from 'react';
import { X, GripVertical } from 'lucide-react';

interface DashboardWidgetProps {
  children: ReactNode;
  title: string;
  onRemove?: () => void;
  isDraggable?: boolean;
}

export function DashboardWidget({
  children,
  title,
  onRemove,
  isDraggable = true
}: DashboardWidgetProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border h-full overflow-hidden flex flex-col">
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center gap-2">
          {isDraggable && (
            <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
          )}
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="隐藏此组件"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>
      {/* Widget Content */}
      <div className="flex-1 p-4 overflow-auto">
        {children}
      </div>
    </div>
  );
}
