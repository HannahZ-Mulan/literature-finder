'use client';

import { useState } from 'react';
import { Settings, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AVAILABLE_WIDGETS,
  getDefaultLayout,
  getVisibleWidgets,
  type WidgetLayout
} from '@/lib/dashboard-config';

interface DashboardControlsProps {
  layout: WidgetLayout[];
  onSave: () => void;
  onReset: () => void;
  onToggleWidget: (widgetId: string) => void;
}

export function DashboardControls({
  layout,
  onSave,
  onReset,
  onToggleWidget
}: DashboardControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const visibleWidgets = getVisibleWidgets(layout);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all"
        title="仪表板设置"
      >
        <Settings className="h-6 w-6" />
      </button>

      {/* Control Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  仪表板设置
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  ✕
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={onSave}
                  className="w-full flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  保存当前布局
                </Button>
                <Button
                  onClick={onReset}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  重置为默认布局
                </Button>
              </div>

              {/* Widget Toggles */}
              <div>
                <h3 className="font-semibold mb-3">显示/隐藏组件</h3>
                <div className="space-y-2">
                  {AVAILABLE_WIDGETS.map((widget) => {
                    const isVisible = visibleWidgets.includes(widget.id);
                    return (
                      <button
                        key={widget.id}
                        onClick={() => onToggleWidget(widget.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isVisible
                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                        }`}
                      >
                        <span className="text-sm font-medium">{widget.title}</span>
                        {isVisible ? (
                          <Eye className="h-4 w-4 text-blue-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instructions */}
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <p className="font-semibold mb-1">使用提示：</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>拖拽组件标题栏可以移动位置</li>
                  <li>拖拽组件边缘可以调整大小</li>
                  <li>点击上方按钮保存你的自定义布局</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
