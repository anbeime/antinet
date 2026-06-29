import React from 'react';

/**
 * 轻量看板占位组件
 *
 * 说明：项目原 KanbanBoard 组件文件缺失，此处提供最小可用实现，
 * 保证 ResearchProjectManager 等依赖方可正常导入与渲染。
 * 后续如需完整看板（拖拽/列定制），可替换为基于 dnd-kit 的实现。
 *
 * Props 与原组件保持兼容：
 *   - tasks: 任务列表
 *   - projectId: 当前项目 ID
 *   - onTasksChange: 任务变更回调
 *   - onTaskStatusUpdate: 任务状态更新回调
 */
type KanbanBoardProps = {
  tasks: any[];
  projectId: string | number;
  onTasksChange?: () => void;
  onTaskStatusUpdate?: (taskId: string | number, newStatus: string) => void;
};

// 看板列定义（与 GtdTask.kanban_status 对齐）
const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'todo', label: '待办', color: 'border-slate-300' },
  { key: 'in_progress', label: '进行中', color: 'border-blue-400' },
  { key: 'done', label: '已完成', color: 'border-green-400' },
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskStatusUpdate }) => {
  return (
    <div className="flex gap-4 h-full overflow-x-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => (t.kanban_status || 'todo') === col.key);
        return (
          <div key={col.key} className={`flex-1 min-w-[220px] flex flex-col rounded-lg border-t-4 ${col.color} bg-white dark:bg-gray-800 shadow-sm`}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{col.label}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {colTasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {colTasks.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-8">暂无任务</div>
              ) : (
                colTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow"
                  >
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-2">
                      {t.title || t.name || `任务 #${t.id}`}
                    </div>
                    {t.description && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {t.description}
                      </div>
                    )}
                    {/* 状态切换：点击即更新到下一列 */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!onTaskStatusUpdate) return;
                        const idx = COLUMNS.findIndex((c) => c.key === (t.kanban_status || 'todo'));
                        const next = COLUMNS[(idx + 1) % COLUMNS.length].key;
                        onTaskStatusUpdate(t.id, next);
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      移至下一阶段 →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
