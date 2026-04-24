import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Plus, Trash2, Download, Save, RefreshCw, 
  ZoomIn, ZoomOut, ChevronRight, Loader, Link2, X,
  FolderOpen, FileText, Network
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const API_BASE = 'http://localhost:8000';

interface KnowledgeCard {
  id: number;
  title: string;
  content: string;
  type: string;
  category?: string;
}

interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  collapsed: boolean;
  color: string;
  cardIds?: number[];
}

interface MindMap {
  id: number;
  name: string;
  description?: string;
  root_node: MindMapNode;
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

const typeColors: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e', 
  yellow: '#eab308',
  red: '#ef4444'
};

const typeLabels: Record<string, string> = {
  blue: '事实',
  green: '解释',
  yellow: '风险',
  red: '行动'
};

const MindMap: React.FC = () => {
  useTheme();
  const [root, setRoot] = useState<MindMapNode>(defaultMindMap);
  const [selectedNode, setSelectedNode] = useState<string | null>('root');
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [mindmaps, setMindmaps] = useState<MindMap[]>([]);
  const [currentMindmapId, setCurrentMindmapId] = useState<number | null>(null);
  const [mindmapName, setMindmapName] = useState('新思维导图');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [nodeCards, setNodeCards] = useState<Record<string, KnowledgeCard[]>>({});
  const [showNetworkPanel, setShowNetworkPanel] = useState(false);
  const [networkTopic, setNetworkTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodeColors = [
    '#3b82f6', '#22c55e', '#eab308', '#ef4444', 
    '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'
  ];

  useEffect(() => {
    loadMindmaps();
    loadCards();
  }, []);

  const loadMindmaps = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mindmap/`);
      const data = await res.json();
      setMindmaps(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('加载思维导图失败:', e);
    }
  };

  const generateFromKnowledgeNetwork = async () => {
    if (!networkTopic.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/network/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: networkTopic,
          card_ids: null,
          auto_generate: true,
          target_type: 'mindmap'
        })
      });
      const data = await res.json();
      if (data.mindmap_id) {
        const res2 = await fetch(`${API_BASE}/api/mindmap/${data.mindmap_id}`);
        const mindmapData = await res2.json();
        if (mindmapData?.root_node) {
          setRoot(mindmapData.root_node);
          setCurrentMindmapId(data.mindmap_id);
          setMindmapName(mindmapData.name || `知识网络-${networkTopic}`);
        }
      }
      setShowNetworkPanel(false);
      loadMindmaps();
    } catch (e) {
      console.error('生成失败:', e);
    } finally {
      setGenerating(false);
    }
  };

  const loadCards = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/cards?limit=100`);
      const data = await res.json();
      // 后端返回格式可能是 {cards: [...], total: n} 或直接是数组
      if (data.cards && Array.isArray(data.cards)) {
        setCards(data.cards);
      } else if (Array.isArray(data)) {
        setCards(data);
      } else {
        console.warn('卡片数据格式异常:', data);
        setCards([]);
      }
    } catch (e) {
      console.error('加载卡片失败:', e);
      setCards([]);
    }
  };

  const loadNodeCards = async (mindmapId: number, nodeId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/mindmap/${mindmapId}/cards?node_id=${nodeId}`);
      const data = await res.json();
      setNodeCards(prev => ({ ...prev, [nodeId]: data }));
    } catch (e) {
      console.error('加载节点卡片失败:', e);
    }
  };

  const saveMindmap = async () => {
    try {
      if (currentMindmapId) {
        await fetch(`${API_BASE}/api/mindmap/${currentMindmapId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: mindmapName, root_node: root })
        });
      } else {
        const res = await fetch('/api/mindmap/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: mindmapName, root_node: root })
        });
        const data = await res.json();
        setCurrentMindmapId(data.id);
      }
      loadMindmaps();
      setShowSaveModal(false);
    } catch (e) {
      console.error('保存失败:', e);
    }
  };

  const loadMindmap = async (mindmap: MindMap) => {
    setRoot(mindmap.root_node);
    setMindmapName(mindmap.name);
    setCurrentMindmapId(mindmap.id);
    setShowLoadModal(false);
    
    const cardsMap: Record<string, KnowledgeCard[]> = {};
    const collectNodeIds = (node: MindMapNode) => {
      cardsMap[node.id] = [];
      node.children.forEach(collectNodeIds);
    };
    collectNodeIds(mindmap.root_node);
    setNodeCards(cardsMap);
  };

  const deleteMindmap = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除?')) return;
    try {
      await fetch(`${API_BASE}/api/mindmap/${id}`, { method: 'DELETE' });
      if (currentMindmapId === id) {
        setCurrentMindmapId(null);
        setRoot(defaultMindMap);
      }
      loadMindmaps();
    } catch (e) {
      console.error('删除失败:', e);
    }
  };

  const openCardSelector = () => {
    if (!selectedNode) return;
    const nodeId = selectedNode;
    if (currentMindmapId) {
      loadNodeCards(currentMindmapId, nodeId);
    }
    setShowCardModal(true);
  };

  const linkCard = async (cardId: number) => {
    if (!currentMindmapId || !selectedNode) return;
    try {
      await fetch(`${API_BASE}/api/mindmap/${currentMindmapId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, node_id: selectedNode })
      });
      loadNodeCards(currentMindmapId, selectedNode);
    } catch (e) {
      console.error('关联失败:', e);
    }
  };

  const unlinkCard = async (cardId: number) => {
    if (!currentMindmapId || !selectedNode) return;
    try {
      await fetch(`${API_BASE}/api/mindmap/${currentMindmapId}/link`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, node_id: selectedNode })
      });
      loadNodeCards(currentMindmapId, selectedNode);
    } catch (e) {
      console.error('取消关联失败:', e);
    }
  };

  const addChildNode = (parentId: string) => {
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      text: '新主题',
      children: [],
      collapsed: false,
      color: nodeColors[Math.floor(Math.random() * nodeColors.length)],
      cardIds: []
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
        a.download = `${mindmapName}.json`;
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

  const getNodeCardCount = (nodeId: string): number => {
    return nodeCards[nodeId]?.length || 0;
  };

  const renderNode = (node: MindMapNode, level: number = 0, index: number = 0): React.ReactNode => {
    const isSelected = selectedNode === node.id;
    const isEditing = editingNode === node.id;
    const childCount = node.children.length;
    const cardCount = getNodeCardCount(node.id);
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
          
          {cardCount > 0 && (
            <span className="absolute -top-2 -left-2 w-5 h-5 bg-yellow-400 rounded-full text-xs flex items-center justify-center text-gray-800 font-bold">
              {cardCount}
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
      <aside className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-500" />
          思维导图
        </h2>

        <div className="space-y-2 mb-4">
          <button
            onClick={() => setShowSaveModal(true)}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>
          
          <button
            onClick={() => setShowLoadModal(true)}
            className="w-full flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-700 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <FolderOpen className="w-4 h-4" />
            <span>加载</span>
          </button>
          
          <button
            onClick={() => setShowNetworkPanel(true)}
            className="w-full flex items-center justify-center space-x-2 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600"
          >
            <Network className="w-4 h-4" />
            <span>从知识网络生成</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
          >
            <Download className="w-4 h-4" />
            <span>导出</span>
          </button>
          <button
            onClick={openCardSelector}
            disabled={!selectedNode}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            <span>关联</span>
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => selectedNode && addChildNode(selectedNode)}
            disabled={!selectedNode}
            className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>添加分支</span>
          </button>
        </div>

        <div className="mt-4">
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

        <div className="mt-4 flex-1 overflow-auto">
          <h3 className="text-sm font-medium mb-2 text-gray-500">操作说明</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 单击选择节点</li>
            <li>• 双击编辑文字</li>
            <li>• 点击+添加分支</li>
            <li>• 点击-折叠/展开</li>
            <li>• 关联按钮链接卡片</li>
          </ul>
          
          {currentMindmapId && selectedNode && nodeCards[selectedNode] && nodeCards[selectedNode].length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2 text-gray-500">当前节点卡片</h3>
              <div className="space-y-2">
                {nodeCards[selectedNode].map(card => (
                  <div
                    key={card.id}
                    className="p-2 rounded text-xs cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: typeColors[card.type] || '#888' }}
                    onClick={() => window.open(`/knowledge-graph?card=${card.id}`, '_blank')}
                  >
                    <div className="font-medium truncate">{card.title}</div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="opacity-75">{typeLabels[card.type] || card.type}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); unlinkCard(card.id); }}
                        className="p-1 hover:bg-white/20 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-80">
            <h3 className="text-lg font-semibold mb-4">保存思维导图</h3>
            <input
              type="text"
              value={mindmapName}
              onChange={(e) => setMindmapName(e.target.value)}
              className="w-full p-2 border rounded mb-4 dark:bg-gray-700"
              placeholder="输入名称"
            />
            <div className="flex gap-2">
              <button
                onClick={saveMindmap}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                保存
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 py-2 rounded hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">加载思维导图</h3>
            {mindmaps.length === 0 ? (
              <p className="text-gray-500">暂无保存的思维导图</p>
            ) : (
              <div className="space-y-2">
                {mindmaps.map(m => (
                  <div
                    key={m.id}
                    onClick={() => loadMindmap(m)}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
                  >
                    <span className="font-medium">{m.name}</span>
                    <button
                      onClick={(e) => deleteMindmap(m.id, e)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowLoadModal(false)}
              className="w-full mt-4 bg-gray-200 dark:bg-gray-700 py-2 rounded hover:bg-gray-300"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {showCardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[600px] max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Link2 className="w-5 h-5 mr-2" />
              关联知识卡片
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {cards.map(card => {
                const isLinked = nodeCards[selectedNode || '']?.some(c => c.id === card.id);
                return (
                  <div
                    key={card.id}
                    className={`
                      p-3 rounded cursor-pointer border-2 transition-all
                      ${isLinked ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-transparent hover:border-gray-300'}
                    `}
                    onClick={() => isLinked ? unlinkCard(card.id) : linkCard(card.id)}
                  >
                    <div className="font-medium truncate flex items-center gap-2">
                      {isLinked && <span className="text-green-500">✓</span>}
                      {card.title}
                    </div>
                    <div className="text-xs mt-1 flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: typeColors[card.type] || '#888' }}
                      >
                        {typeLabels[card.type] || card.type}
                      </span>
                      <span className="text-gray-500 truncate">
                        {card.content?.substring(0, 30)}...
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowCardModal(false)}
              className="w-full mt-4 bg-gray-200 dark:bg-gray-700 py-2 rounded hover:bg-gray-300"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {showNetworkPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[500px]">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Network className="w-5 h-5 mr-2 text-purple-500" />
              从知识网络生成思维导图
            </h3>
            <input
              type="text"
              value={networkTopic}
              onChange={(e) => setNetworkTopic(e.target.value)}
              placeholder="输入主题（如：Q2季度汇报）"
              className="w-full px-4 py-2 border rounded-lg mb-4"
              onKeyDown={(e) => e.key === 'Enter' && generateFromKnowledgeNetwork()}
            />
            <div className="flex space-x-2">
              <button
                onClick={generateFromKnowledgeNetwork}
                disabled={generating || !networkTopic.trim()}
                className="flex-1 flex items-center justify-center space-x-2 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {generating ? <Loader className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />}
                <span>{generating ? '生成中...' : '生成导图'}</span>
              </button>
              <button
                onClick={() => setShowNetworkPanel(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindMap;