import React, { useState } from 'react';
import { FileText, Folder, ChevronRight, Search } from 'lucide-react';

/**
 * 文件浏览器面板占位组件
 *
 * 说明：项目原 @/components/FileBrowserPanel 文件缺失，此处提供最小可用实现，
 * 保证 KnowledgeGraphView 等依赖方可正常导入与渲染。
 *
 * Props 与原组件保持兼容：
 *   - onNavigateToCard(cardId)
 *   - onNavigateToGraph(cardId)
 *   - onFileSelect(fileInfo)
 */
type FileInfo = {
  id: string;
  name: string;
  type: string;
  path?: string;
};

type FileBrowserPanelProps = {
  onNavigateToCard?: (cardId: string) => void;
  onNavigateToGraph?: (cardId: string) => void;
  onFileSelect?: (info: FileInfo) => void;
};

const DEMO_FILES: FileInfo[] = [
  { id: 'f1', name: '研究笔记.md', type: 'markdown' },
  { id: 'f2', name: '投资框架.docx', type: 'doc' },
  { id: 'f3', name: '行业数据.xlsx', type: 'sheet' },
  { id: 'f4', name: '路演材料.pdf', type: 'pdf' },
];

const FileBrowserPanel: React.FC<FileBrowserPanelProps> = ({ onFileSelect }) => {
  const [keyword, setKeyword] = useState('');
  const filtered = DEMO_FILES.filter((f) => f.name.toLowerCase().includes(keyword.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索文件..."
            className="w-full pl-8 pr-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-transparent outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Folder className="w-3.5 h-3.5" />
          我的文件
        </div>
        {filtered.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-8">无匹配文件</div>
        ) : (
          filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFileSelect?.(f)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1 truncate text-gray-700 dark:text-gray-200">{f.name}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default FileBrowserPanel;
