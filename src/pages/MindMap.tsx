import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Plus, Trash2, Download, Save, RefreshCw, 
  ZoomIn, ZoomOut, Move, ChevronRight, Loader,
  FileText, FileSpreadsheet, Presentation
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  collapsed: boolean;
  color: string;
}

const defaultMindMap: MindMapNode = {
  id: 'root',
  text: '中心主题',
  children: [
    { id: 'c1', text: '分支主题1', children: [], collapsed: false, color: '#3b82f6' },
    { id: 'c2', text: '分支主题2', children: [], collapsed: false, color: '#22c55e' },
    { id: 'c3', text: '分支主题3', children: [], collapsed: false, color: '#eab308' },
  ],
  collapsed: false,
  color: '#8b5cf6'
};

const MindMap: React.FC = () => {
  useTheme();
  const [root, setRoot] = useState<MindMapNode>(defaultMindMap);
  const [selectedNode, setSelectedNode] = useState<string | null>('root');
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodeColors = [
    '#3b82f6', '#22c55e', '#eab308', '#ef4444', 
    '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'
  ];

  const addChildNode = (parentId: string) => {
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      text: '新主题',
      children: [],
      collapsed: false,
      color: nodeColors[Math.floor(Math.random() * nodeColors.length)]
    };

    const addToParent = (node: MindMapNode): MindMapNode => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode] };
      }
      return {
        ...node,
        children: node.children.map(addToParent)
      };
    };

    setRoot(addToParent(root));
  };

  const updateNodeText = (nodeId: string, text: string) => {
    const updateTextInNode = (node: MindMapNode): MindMapNode => {
      if (node.id === nodeId) {
        return { ...node, text };
      }
      return {
        ...node,
        children: node.children.map(updateTextInNode)
      };
    };
    setRoot(updateTextInNode(root));
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === 'root') return;
    
    const deleteFromTree = (node: MindMapNode): MindMapNode => {
      return {
        ...node,
        children: node.children
          .filter(c => c.id !== nodeId)
          .map(deleteFromTree)
      };
    };
    setRoot(deleteFromTree(root));
  };

  const toggleCollapse = (nodeId: string) => {
    const toggleInNode = (node: MindMapNode): MindMapNode => {
      if (node.id === nodeId) {
        return { ...node, collapsed: !node.collapsed };
      }
      return {
        ...node,
        children: node.children.map(toggleInNode)
      };
    };
    setRoot(toggleInNode(root));
  };

  const handleExport = async (format: 'png' | 'json' | 'xmind') => {
    setIsExporting(true);
    try {
      if (format === 'json') {
        const data = JSON.stringify(root, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.json';
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'xmind') {
        alert('XMind导出需要安装 xmind 库，当前仅支持JSON格式');
      } else {
        alert('图片导出需要 html2canvas 库');
      }
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderNode = (node: MindMapNode, level: number = 0, index: number = 0): React.ReactNode => {
    const isSelected = selectedNode === node.id;
    const isEditing = editingNode === node.id;
    const childCount = node.children.length;
    const childNodes = node.collapsed ? null : node.children.map((child, idx) => 
      renderNode(child, level + 1, idx)
    );

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center"
      >
        <div 
          className={`
            relative px-4 py-2 rounded-lg cursor-pointer transition-all
            ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
          `}
          style={{ 
            backgroundColor: node.color,
            transform: `scale(${1 + level * 0.05})`
          }}
          onClick={() => setSelectedNode(node.id)}
        >
          {isEditing ? (
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => {
                updateNodeText(node.id, editText);
                setEditingNode(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && updateNodeText(node.id, editText)}
              autoFocus
              className="bg-transparent border-none outline-none text-white text-center font-medium w-24"
            />
          ) : (
            <span 
              className="text-white font-medium"
              onDoubleClick={() => {
                setEditingNode(node.id);
                setEditText(node.text);
              }}
            >
              {node.text}
            </span>
          )}
          
          {level > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
              className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            >
              <Trash2 size={10} />
            </button>
          )}

          {childCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full text-gray-600 flex items-center justify-center text-xs"
            >
              {node.collapsed ? '+' : '-'}
            </button>
          )}
        </div>

        {childNodes && (
          <div className="flex items-start gap-4 mt-4">
            {childNodes}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-500" />
          思维导图
        </h2>

        <div className="space-y-3">
          <button
            onClick={() => selectedNode && addChildNode(selectedNode)}
            disabled={!selectedNode}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>添加分支</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleExport('png')}
              disabled={isExporting}
              className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
            >
              <Download className="w-4 h-4" />
              <span>导出PNG</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
            >
              <Save className="w-4 h-4" />
              <span>保存JSON</span>
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2 text-gray-500">缩放</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2 text-gray-500">操作说明</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 单击选择节点</li>
            <li>• 双击编辑文字</li>
            <li>• 点击+添加分支</li>
            <li>• 点击-折叠/展开</li>
          </ul>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <div 
          ref={containerRef}
          className="min-h-full flex items-center justify-center"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          {renderNode(root)}
        </div>
      </main>
    </div>
  );
};

export default MindMap;