import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  Brain, Plus, Trash2, Download, Save, RefreshCw,
  ZoomIn, ZoomOut, ChevronRight, Loader, Link2, X,
  FolderOpen, FileText, Network
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const API_BASE = getApiBaseUrl()

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
  description?: string;  // 节点详细描述/备注
  icon?: string;        // 节点图标 emoji
  priority?: 'high' | 'medium' | 'low';  // 优先级
  progress?: number;    // 进度 0-100
}

interface MindMap {
  id: number;
  name: string;
  description?: string;
  root_node: MindMapNode;
}

// 项目启动阶段默认模板
const projectLaunchTemplate: MindMapNode = {
  id: 'root',
  text: '项目启动阶段',
  icon: '🚀',
  children: [
    {
      id: 'c1',
      text: '项目总目标',
      icon: '🎯',
      children: [
        { id: 'c1-1', text: '明确App核心价值', description: '解决用户痛点，提供独特价值主张', children: [], collapsed: false, color: '#3b82f6' },
        { id: 'c1-2', text: '用户需求分析', description: '用户画像、需求调研、优先级排序', children: [], collapsed: false, color: '#3b82f6' },
      ],
      collapsed: false,
      color: '#3b82f6'
    },
    {
      id: 'c2',
      text: '核心团队成员',
      icon: '👥',
      children: [
        { id: 'c2-1', text: '关键岗位与职责', description: '产品经理、设计师、开发团队', children: [], collapsed: false, color: '#22c55e' },
        { id: 'c2-2', text: '协作机制', description: '每日站会、周会、迭代评审', children: [], collapsed: false, color: '#22c55e' },
      ],
      collapsed: false,
      color: '#22c55e'
    },
    {
      id: 'c3',
      text: '初步项目计划',
      icon: '📋',
      children: [
        { id: 'c3-1', text: '时间规划', description: '需求分析阶段（2-4周）、设计阶段、开发阶段', children: [], collapsed: false, color: '#eab308' },
        { id: 'c3-2', text: '关键里程碑', description: '需求规格说明书签署、UI评审、测试验收', children: [], collapsed: false, color: '#eab308' },
        { id: 'c3-3', text: '初步预算', description: '人力成本、工具成本、第三方服务', children: [], collapsed: false, color: '#eab308' },
      ],
      collapsed: false,
      color: '#eab308'
    },
    {
      id: 'c4',
      text: '潜在风险',
      icon: '⚠️',
      children: [
        { id: 'c4-1', text: '技术风险', description: '新技术的学习成本、技术选型风险', children: [], collapsed: false, color: '#ef4444' },
        { id: 'c4-2', text: '市场风险', description: '用户需求验证偏差、竞品压力', children: [], collapsed: false, color: '#ef4444' },
        { id: 'c4-3', text: '团队协作风险', description: '需求变更频繁导致返工、沟通不畅', children: [], collapsed: false, color: '#ef4444' },
      ],
      collapsed: false,
      color: '#ef4444'
    },
  ],
  collapsed: false,
  color: '#8b5cf6'
};

// 简单默认模板
const simpleDefaultTemplate: MindMapNode = {
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

const defaultMindMap = projectLaunchTemplate;

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

interface MindMapProps {
  initialRoot?: MindMapNode;
  initialCards?: KnowledgeCard[];
  /** 嵌入模式：隐藏顶部侧边栏（保存/加载/从知识网络生成等），只保留节点操作 */
  embedded?: boolean;
}

const MindMap: React.FC<MindMapProps> = ({ initialRoot, initialCards, embedded }) => {
  useTheme();
  const [root, setRoot] = useState<MindMapNode>(initialRoot || defaultMindMap);
  const [selectedNode, setSelectedNode] = useState<string | null>('root');
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [mindmaps, setMindmaps] = useState<MindMap[]>([]);
  const [currentMindmapId, setCurrentMindmapId] = useState<number | null>(null);
  const [mindmapName, setMindmapName] = useState('移动App项目启动阶段');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showNodeDetailModal, setShowNodeDetailModal] = useState(false);
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [nodeCards, setNodeCards] = useState<Record<string, KnowledgeCard[]>>({});
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [cardFilter, setCardFilter] = useState('');
  const [showNetworkPanel, setShowNetworkPanel] = useState(false);
  const [networkTopic, setNetworkTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragNodeStart, setDragNodeStart] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(true);  // 小地图开关
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  const nodeColors = [
    '#3b82f6', '#22c55e', '#eab308', '#ef4444', 
    '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'
  ];

  useEffect(() => {
    if (initialRoot) {
      setRoot(initialRoot);
    }
    if (initialCards && initialCards.length > 0) {
      setCards(initialCards);
    } else if (!embedded) {
      loadCards();
    }
    if (!embedded) {
      loadMindmaps();
    }
}, []);

  // 窗口宽度变化时自动更新侧边栏状态
  useEffect(() => {
    const onResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 嵌入模式：图谱侧切换到不同主题时，同步更新导图树
  useEffect(() => {
    if (embedded && initialRoot) {
      setRoot(initialRoot);
    }
  }, [initialRoot, embedded]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const loadMindmaps = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mindmap/`);
      const data = await res.json();
      setMindmaps(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('加载思维导图失败:', e);
    }
  };

  // 拖拽处理函数
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 5));
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

  // 切换卡片选择
  const toggleCardSelect = (cardId: number) => {
    setSelectedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  // 批量关联选中的卡片
  const linkSelectedCards = async () => {
    if (!selectedNode || selectedCards.size === 0) return;
    for (const cardId of selectedCards) {
      await linkCard(cardId);
    }
    setSelectedCards(new Set());
    setShowCardModal(false);
    // 刷新节点关联的卡片
    if (currentMindmapId) {
      loadNodeCards(currentMindmapId, selectedNode);
    }
  };

  // 全选/取消全选
  const selectAllCards = () => {
    if (filteredCards.length === selectedCards.size) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(filteredCards.map(c => c.id)));
    }
  };

  // 过滤卡片
  const filteredCards = cards.filter(c => 
    !cardFilter || c.title?.includes(cardFilter) || c.content?.includes(cardFilter)
  );

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
      cardIds: [],
      description: '',
      icon: '📌',
      priority: 'medium'
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

  // 更新节点完整信息
  const updateNodeDetails = (nodeId: string, updates: Partial<MindMapNode>) => {
    const updateInNode = (node: MindMapNode): MindMapNode => {
      if (node.id === nodeId) {
        return { ...node, ...updates };
      }
      return {
        ...node,
        children: node.children.map(updateInNode)
      };
    };
    setRoot(updateInNode(root));
  };

  // 切换模板
  const switchTemplate = (template: 'project' | 'simple') => {
    if (confirm('切换模板将清空当前内容，确定继续？')) {
      setRoot(template === 'project' ? JSON.parse(JSON.stringify(projectLaunchTemplate)) : JSON.parse(JSON.stringify(simpleDefaultTemplate)));
      setMindmapName(template === 'project' ? '移动App项目启动阶段' : '新思维导图');
      setCurrentMindmapId(null);
      setShowTemplateModal(false);
    }
  };

  // 重置导图
  const resetMindmap = () => {
    if (confirm('确定重置为默认模板？')) {
      setRoot(JSON.parse(JSON.stringify(projectLaunchTemplate)));
      setMindmapName('移动App项目启动阶段');
      setCurrentMindmapId(null);
    }
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

  // 更新描述
  const updateNodeDescription = (nodeId: string, description: string) => {
    const updateInNode = (node: MindMapNode): MindMapNode => {
      if (node.id === nodeId) {
        return { ...node, description };
      }
      return {
        ...node,
        children: node.children.map(updateInNode)
      };
    };
    setRoot(updateInNode(root));
  };

  // 更新优先级
  const updateNodePriority = (nodeId: string, priority: 'high' | 'medium' | 'low') => {
    updateNodeDetails(nodeId, { priority });
  };

  // 更新进度
  const updateNodeProgress = (nodeId: string, progress: number) => {
    updateNodeDetails(nodeId, { progress: Math.min(100, Math.max(0, progress)) });
  };

  // 更新图标
  const updateNodeIcon = (nodeId: string, icon: string) => {
    updateNodeDetails(nodeId, { icon });
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

  const handleExport = async (format: 'png' | 'json' | 'xmind' | 'markdown') => {
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
      } else if (format === 'markdown') {
        // 导出为 Markdown 格式
        const exportToMarkdown = (node: MindMapNode, level: number = 0): string => {
          const indent = '  '.repeat(level);
          const icon = node.icon ? `${node.icon} ` : '';
          const desc = node.description ? `\n${indent}  > ${node.description}` : '';
          const progress = node.progress !== undefined ? ` [${node.progress}%]` : '';
          const priority = node.priority ? ` *${node.priority}*` : '';
          let md = `${indent}- ${icon}${node.text}${progress}${priority}${desc}\n`;
          if (!node.collapsed) {
            node.children.forEach(child => {
              md += exportToMarkdown(child, level + 1);
            });
          }
          return md;
        };
        const md = `# ${mindmapName}\n\n${exportToMarkdown(root)}`;
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mindmapName}.md`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'xmind') {
        alert('XMind导出需要安装 xmind 库，当前仅支持JSON和Markdown格式');
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

  const getPriorityColor = (priority?: 'high' | 'medium' | 'low'): string => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return 'transparent';
    }
  };

  const renderNode = (node: MindMapNode, level: number = 0, index: number = 0): React.ReactNode => {
    const isSelected = selectedNode === node.id;
    const isEditing = editingNode === node.id;
    const childCount = node.children.length;
    const cardCount = getNodeCardCount(node.id);
    const childNodes = node.collapsed ? null : node.children.map((child, idx) =>
      renderNode(child, level + 1, idx)
    );
    const priorityColor = getPriorityColor(node.priority);
    const hasDetails = node.description || node.progress !== undefined || node.priority;

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
            ${hasDetails && !isSelected ? 'ring-1 ring-white/50' : ''}
          `}
          style={{
            backgroundColor: node.color,
            transform: `scale(${1 + level * 0.05})`
          }}
          onClick={() => setSelectedNode(node.id)}
          onDoubleClick={() => setShowNodeDetailModal(true)}
        >
          {/* 节点图标和文字 */}
          <div className="flex items-center gap-2">
            {node.icon && <span className="text-lg">{node.icon}</span>}
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
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingNode(node.id);
                  setEditText(node.text);
                }}
              >
                {node.text}
              </span>
            )}
          </div>
          
          {/* 优先级指示器 */}
          {node.priority && (
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: priorityColor }}
              title={`优先级: ${node.priority}`}
            />
          )}
          
          {/* 进度条 */}
          {node.progress !== undefined && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all"
                style={{ width: `${node.progress}%` }}
              />
            </div>
          )}
          
          {/* 卡片数量 */}
          {cardCount > 0 && (
            <span className="absolute -top-2 -left-2 w-5 h-5 bg-yellow-400 rounded-full text-xs flex items-center justify-center text-gray-800 font-bold">
              {cardCount}
            </span>
          )}
          
          {/* 删除按钮 */}
          {level > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
              className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            >
              <Trash2 size={10} />
            </button>
          )}

          {/* 折叠/展开按钮 */}
          {childCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full text-gray-600 flex items-center justify-center text-xs hover:bg-gray-100"
            >
              {node.collapsed ? '+' : '-'}
            </button>
          )}
        </div>

        {/* 描述预览 */}
        {node.description && isSelected && (
          <div className="mt-1 px-2 py-1 bg-gray-800/80 text-white text-xs rounded max-w-48 text-center">
            {node.description.length > 50 ? node.description.substring(0, 50) + '...' : node.description}
          </div>
        )}

        {childNodes && (
          <div className="flex items-start gap-4 mt-4">
            {childNodes}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={`flex flex-col md:flex-row ${embedded ? 'h-full' : 'h-screen'} bg-gray-100 dark:bg-gray-900`}>
      {!embedded && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
        </button>
      )}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static z-40 md:z-auto top-0 left-0 h-full md:h-auto w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col overflow-hidden transition-transform duration-200`}>
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-500" />
          思维导图
          <button
            onClick={() => setShowTemplateModal(true)}
            className="ml-auto text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-200"
          >
            模板
          </button>
        </h2>

        {/* 当前导图名称 */}
        <div className="mb-3 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm truncate">
          📄 {mindmapName}
        </div>

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
            <span>JSON</span>
          </button>
          <button
            onClick={() => handleExport('markdown')}
            disabled={isExporting}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
          >
            <FileText className="w-4 h-4" />
            <span>MD</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={openCardSelector}
            disabled={!selectedNode}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            <span>关联</span>
          </button>
          <button
            onClick={resetMindmap}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300"
          >
            <RefreshCw className="w-4 h-4" />
            <span>重置</span>
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
              onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 节点详情快捷操作 */}
        {selectedNode && selectedNode !== 'root' && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium mb-2 text-gray-500">节点属性</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">优先级:</span>
                <button
                  onClick={() => updateNodePriority(selectedNode, 'high')}
                  className={`px-2 py-0.5 text-xs rounded ${getNodePriority(selectedNode, root) === 'high' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'}`}
                >
                  高
                </button>
                <button
                  onClick={() => updateNodePriority(selectedNode, 'medium')}
                  className={`px-2 py-0.5 text-xs rounded ${getNodePriority(selectedNode, root) === 'medium' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-600'}`}
                >
                  中
                </button>
                <button
                  onClick={() => updateNodePriority(selectedNode, 'low')}
                  className={`px-2 py-0.5 text-xs rounded ${getNodePriority(selectedNode, root) === 'low' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'}`}
                >
                  低
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">进度:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={getNodeProgress(selectedNode, root)}
                  onChange={(e) => updateNodeProgress(selectedNode, parseInt(e.target.value))}
                  className="flex-1 h-1"
                />
                <span className="text-xs min-w-[2rem]">{getNodeProgress(selectedNode, root)}%</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex-1 overflow-auto">
          <h3 className="text-sm font-medium mb-2 text-gray-500">操作说明</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 单击选择节点</li>
            <li>• 双击编辑文字</li>
            <li>• 双击节点打开详情</li>
            <li>• 点击+添加分支</li>
            <li>• 点击-折叠/展开</li>
            <li>• 关联按钮链接卡片</li>
            <li>• 侧边栏调整优先级/进度</li>
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

      <main 
        className="flex-1 overflow-hidden p-4 md:p-8 pt-12 md:pt-8 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          className="mindmap-container min-h-full flex items-center justify-center"
          style={{ 
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
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

      {/* 模板选择弹窗 */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[450px]">
            <h3 className="text-lg font-semibold mb-4">选择模板</h3>
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => switchTemplate('project')}
                className="p-4 border-2 border-purple-200 dark:border-purple-700 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
              >
                <div className="text-3xl mb-2">🚀</div>
                <div className="font-medium">项目启动模板</div>
                <div className="text-xs text-gray-500 mt-1">包含目标、团队、计划、风险四大模块</div>
              </div>
              <div
                onClick={() => switchTemplate('simple')}
                className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-all"
              >
                <div className="text-3xl mb-2">📝</div>
                <div className="font-medium">空白模板</div>
                <div className="text-xs text-gray-500 mt-1">从零开始的简单思维导图</div>
              </div>
            </div>
            <button
              onClick={() => setShowTemplateModal(false)}
              className="w-full mt-4 bg-gray-200 dark:bg-gray-700 py-2 rounded hover:bg-gray-300"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 节点详情弹窗 */}
      {showNodeDetailModal && selectedNode && (
        <NodeDetailModal
          node={getNodeById(root, selectedNode)}
          onClose={() => setShowNodeDetailModal(false)}
          onUpdate={(updates) => updateNodeDetails(selectedNode, updates)}
        />
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
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[700px] max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Link2 className="w-5 h-5 mr-2" />
              关联知识卡片 - {selectedNode || '根节点'}
            </h3>
            
            {/* 搜索和操作栏 */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="搜索卡片..."
                value={cardFilter}
                onChange={(e) => setCardFilter(e.target.value)}
                className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <button
                onClick={selectAllCards}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {filteredCards.length === selectedCards.size ? '取消全选' : '全选'}
              </button>
              <button
                onClick={linkSelectedCards}
                disabled={selectedCards.size === 0}
                className={`px-4 py-2 rounded font-medium ${
                  selectedCards.size > 0 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                确认关联 ({selectedCards.size})
              </button>
            </div>

            {/* 卡片列表 */}
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-auto">
              {filteredCards.map(card => {
                const isLinked = nodeCards[selectedNode || '']?.some(c => c.id === card.id);
                const isSelected = selectedCards.has(card.id);
                return (
                  <div
                    key={card.id}
                    className={`
                      p-3 rounded cursor-pointer border-2 transition-all
                      ${isLinked || isSelected 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-transparent hover:border-gray-300'}
                    `}
                    onClick={() => toggleCardSelect(card.id)}
                  >
                    <div className="font-medium truncate flex items-center gap-2">
                      {(isLinked || isSelected) && <span className="text-green-500">✓</span>}
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
            
            <div className="flex justify-between mt-4 pt-4 border-t">
              <span className="text-gray-500">
                共 {filteredCards.length} 张卡片，已选择 {selectedCards.size} 张
              </span>
              <button
                onClick={() => { setShowCardModal(false); setSelectedCards(new Set()); setCardFilter(''); }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              >
                关闭
              </button>
            </div>
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

// 辅助函数：获取节点
const getNodeById = (node: MindMapNode, id: string): MindMapNode | null => {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = getNodeById(child, id);
    if (found) return found;
  }
  return null;
};

// 辅助函数：获取优先级
const getNodePriority = (nodeId: string, rootNode: MindMapNode): 'high' | 'medium' | 'low' => {
  const node = getNodeById(rootNode, nodeId);
  return node?.priority || 'medium';
};

// 辅助函数：获取进度
const getNodeProgress = (nodeId: string, rootNode: MindMapNode): number => {
  const node = getNodeById(rootNode, nodeId);
  return node?.progress || 0;
};

// 节点详情弹窗组件
interface NodeDetailModalProps {
  node: MindMapNode | null;
  onClose: () => void;
  onUpdate: (updates: Partial<MindMapNode>) => void;
}

const NodeDetailModal: React.FC<NodeDetailModalProps> = ({ node, onClose, onUpdate }) => {
  const [localText, setLocalText] = useState(node?.text || '');
  const [localDescription, setLocalDescription] = useState(node?.description || '');
  const [localIcon, setLocalIcon] = useState(node?.icon || '📌');
  const [localPriority, setLocalPriority] = useState<'high' | 'medium' | 'low'>(node?.priority || 'medium');
  const [localProgress, setLocalProgress] = useState(node?.progress || 0);

  const icons = ['📌', '🎯', '📋', '👥', '🚀', '⚠️', '💡', '📊', '🔧', '✅', '❌', '🔥', '⭐', '🎨', '📱', '🌐'];

  useEffect(() => {
    if (node) {
      setLocalText(node.text);
      setLocalDescription(node.description || '');
      setLocalIcon(node.icon || '📌');
      setLocalPriority(node.priority || 'medium');
      setLocalProgress(node.progress || 0);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    onUpdate({
      text: localText,
      description: localDescription,
      icon: localIcon,
      priority: localPriority,
      progress: localProgress
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[500px] max-h-[80vh] overflow-auto">
        <h3 className="text-lg font-semibold mb-4">节点详情</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">标题</label>
            <input
              type="text"
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">图标</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setLocalIcon(icon)}
                  className={`w-8 h-8 text-lg rounded ${localIcon === icon ? 'bg-purple-100 dark:bg-purple-900 ring-2 ring-purple-500' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">描述/备注</label>
            <textarea
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 h-24"
              placeholder="输入详细描述..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">优先级</label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setLocalPriority(p)}
                  className={`px-4 py-2 rounded ${
                    localPriority === p
                      ? p === 'high' ? 'bg-red-500 text-white'
                        : p === 'medium' ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {p === 'high' ? '🔴 高' : p === 'medium' ? '🟡 中' : '🟢 低'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">进度: {localProgress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={localProgress}
              onChange={(e) => setLocalProgress(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            保存
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 dark:bg-gray-700 py-2 rounded hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default MindMap;