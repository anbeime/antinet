// src/components/KnowledgeGraphWorkbench.tsx
// 知识图谱工作台 - 四位一体：图谱导航、列表管理、双栏编辑、多格式输出
// 核心目标：让知识管理过程本身成为激发思考和创造价值的动态体验

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as echarts from 'echarts';
import {
  Search, Filter, List, Network, Edit3, Eye, Download,
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Link2, ChevronRight,
  ChevronDown, X, Plus, Trash2, ExternalLink, FileText,
  Calendar, SortAsc, SortDesc, Copy as CopyIcon, FileDown, Image,
  Presentation, Menu, Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';
import { 
  KnowledgeCard, 
  CardColor, 
  CARD_COLOR_MAP, 
  CARD_COLOR_CSS,
  LinkType,
  LINK_TYPE_LABELS
} from '@/types/card';
import { API_BASE_URL } from '@/config/api';

interface GraphNode {
  id: string;
  name: string;
  title?: string;
  type: CardColor;
  category?: string;
  size: number;
  importance: number;
  project_id?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: LinkType;
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics?: {
    total_nodes: number;
    total_edges: number;
    node_types: Record<string, number>;
    edge_types: Record<string, number>;
  };
}

// 颜色映射 - 四色卡片
const colorStyles: Record<CardColor, { bg: string; border: string; text: string; light: string }> = {
  blue: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-900', light: 'bg-blue-50 dark:bg-blue-900/20' },
  green: { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-900', light: 'bg-green-50 dark:bg-green-900/20' },
  yellow: { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-900', light: 'bg-yellow-50 dark:bg-yellow-900/20' },
  red: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-900', light: 'bg-red-50 dark:bg-red-900/20' },
};

// 链接类型颜色
const LINK_TYPE_COLORS: Record<string, string> = {
  supports: '#22c55e',
  contradicts: '#ef4444',
  examples: '#3b82f6',
  background: '#a855f7',
  same_project: '#6366f1',
  manual: '#64748b',
  backlink: '#9333EA',
  forwardlink: '#6366F1',
};

// ============ 样本数据（后端不可用时的回退） ============
const SAMPLE_GRAPH_DATA: GraphData = {
  nodes: [
    { id: '1', name: '人工智能', title: '人工智能', type: 'blue', size: 60, importance: 5 },
    { id: '2', name: '机器学习', title: '机器学习', type: 'blue', size: 45, importance: 4 },
    { id: '3', name: '深度学习', title: '深度学习', type: 'blue', size: 40, importance: 4 },
    { id: '4', name: '神经网络', title: '神经网络', type: 'green', size: 35, importance: 3 },
    { id: '5', name: '自然语言处理', title: '自然语言处理', type: 'blue', size: 35, importance: 4 },
    { id: '6', name: '计算机视觉', title: '计算机视觉', type: 'blue', size: 35, importance: 3 },
    { id: '7', name: 'Transformer', title: 'Transformer', type: 'green', size: 28, importance: 4 },
    { id: '8', name: 'CNN', title: 'CNN', type: 'green', size: 22, importance: 2 },
    { id: '9', name: 'RNN', title: 'RNN', type: 'green', size: 22, importance: 2 },
    { id: '10', name: 'GPT', title: 'GPT', type: 'yellow', size: 25, importance: 4 },
    { id: '11', name: '数据质量检查', title: '数据质量检查', type: 'red', size: 30, importance: 3 },
    { id: '12', name: '模型评估', title: '模型评估', type: 'red', size: 28, importance: 3 },
  ],
  edges: [
    { id: 'e1', source: '1', target: '2', label: '包含', type: 'supports', weight: 1 },
    { id: 'e2', source: '1', target: '3', label: '包含', type: 'supports', weight: 1 },
    { id: 'e3', source: '1', target: '5', label: '包含', type: 'supports', weight: 1 },
    { id: 'e4', source: '1', target: '6', label: '包含', type: 'supports', weight: 1 },
    { id: 'e5', source: '2', target: '4', label: '使用', type: 'background', weight: 1 },
    { id: 'e6', source: '3', target: '4', label: '基于', type: 'background', weight: 1 },
    { id: 'e7', source: '5', target: '7', label: '使用', type: 'examples', weight: 1 },
    { id: 'e8', source: '6', target: '8', label: '使用', type: 'examples', weight: 1 },
    { id: 'e9', source: '4', target: '9', label: '类型', type: 'background', weight: 1 },
    { id: 'e10', source: '7', target: '10', label: '应用', type: 'examples', weight: 1 },
    { id: 'e11', source: '10', target: '11', label: '关注', type: 'contradicts', weight: 1 },
    { id: 'e12', source: '2', target: '12', label: '需要', type: 'same_project', weight: 1 },
  ],
  statistics: {
    total_nodes: 12,
    total_edges: 12,
    node_types: { blue: 5, green: 4, yellow: 1, red: 2 },
    edge_types: { supports: 4, background: 3, examples: 3, contradicts: 1, same_project: 1 },
  },
};

const SAMPLE_CARDS: KnowledgeCard[] = [
  { id: 1, title: '人工智能', content: '人工智能是计算机科学的一个分支，旨在创建能够模拟人类智能的系统。', card_type: 'blue', tags: ['AI', '基础概念'], created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, title: '机器学习', content: '机器学习是AI的子领域，使系统能够从数据中自动学习和改进。', card_type: 'blue', tags: ['ML', '算法'], created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
  { id: 3, title: '深度学习', content: '深度学习使用多层神经网络来学习数据的分层表示。', card_type: 'blue', tags: ['DL', '神经网络'], created_at: '2025-01-03T00:00:00Z', updated_at: '2025-01-03T00:00:00Z' },
  { id: 4, title: '神经网络', content: '神经网络由相互连接的节点（神经元）组成，模仿人脑结构。', card_type: 'green', tags: ['架构'], created_at: '2025-01-04T00:00:00Z', updated_at: '2025-01-04T00:00:00Z' },
  { id: 5, title: '自然语言处理', content: 'NLP让计算机理解、解释和生成人类语言。', card_type: 'blue', tags: ['NLP', '文本'], created_at: '2025-01-05T00:00:00Z', updated_at: '2025-01-05T00:00:00Z' },
  { id: 6, title: 'GPT-4o安全风险', content: 'GPT-4o模型在特定场景下可能生成不当内容，需要人工审核。', card_type: 'yellow', tags: ['风险', '安全'], created_at: '2025-01-06T00:00:00Z', updated_at: '2025-01-06T00:00:00Z' },
  { id: 7, title: '数据质量检查', content: '定期检查训练数据的质量和偏差，确保模型输出可靠性。', card_type: 'red', tags: ['行动', '质量'], created_at: '2025-01-07T00:00:00Z', updated_at: '2025-01-07T00:00:00Z' },
  { id: 8, title: 'Transformer架构', content: 'Transformer基于自注意力机制，是当前NLP任务的主流架构。', card_type: 'green', tags: ['架构', '创新'], created_at: '2025-01-08T00:00:00Z', updated_at: '2025-01-08T00:00:00Z' },
];

type ViewMode = 'graph' | 'list';
type EditorSide = 'edit' | 'preview' | 'split';
type SortField = 'created_at' | 'updated_at' | 'title' | 'card_type';
type SortOrder = 'asc' | 'desc';

interface KnowledgeGraphWorkbenchProps {
  initialColorFilter?: string;
  projectId?: number;
}

const KnowledgeGraphWorkbench: React.FC<KnowledgeGraphWorkbenchProps> = ({ initialColorFilter, projectId }) => {
  // ============ 状态定义 ============
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  // 视图状态
const [viewMode, setViewMode] = useState<ViewMode>('graph');
const [editorSide, setEditorSide] = useState<EditorSide>('split');
const [sidebarOpen, setSidebarOpen] = useState(true);

useEffect(() => {
  const onResize = () => { if (window.innerWidth >= 768) setSidebarOpen(true); };
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);
  
  // 数据状态
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<KnowledgeCard[]>([]);
  const [loading, setLoading] = useState(false);
  
// 选中状态
  const [selectedCard, setSelectedCard] = useState<KnowledgeCard | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 卡片知识网络状态
  const [cardNetwork, setCardNetwork] = useState<{nodes: any[], links: any[]}>({nodes: [], links: []});
  
  // 编辑器状态
  const [markdownContent, setMarkdownContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // 搜索/筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterColor, setFilterColor] = useState<CardColor | 'all'>(initialColorFilter as CardColor || 'all');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // 列表展开状态
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  // 新建卡片
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardType, setNewCardType] = useState<CardColor>('blue');
  
  // 删除确认
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<number | null>(null);
  
  // 关联卡片
  const [showRelatedModal, setShowRelatedModal] = useState(false);
  const [relatedCardId, setRelatedCardId] = useState<string>('');
  
  // 是否使用样本数据（后端不可用时的降级）
  const [isSampleData, setIsSampleData] = useState(false);

  // 导出菜单显示状态
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ============ 带超时的 fetch ============
  const fetchWithTimeout = useCallback(async (url: string, options?: RequestInit, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  // ============ 数据加载 ============
  const loadGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/knowledge/graph?limit=500`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setGraphData(data);
      setIsSampleData(false);
      toast.success('知识图谱加载成功');
    } catch (error) {
      console.error('加载知识图谱失败，使用样本数据:', error);
      setGraphData(SAMPLE_GRAPH_DATA);
      setIsSampleData(true);
      // 只有 AbortError 才是超时，避免网络错误时也弹出烦人提示
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.info('后端响应超时，显示样本数据');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchWithTimeout]);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/knowledge/cards?limit=1000`;
      if (projectId) {
        url += `&project_id=${projectId}`;
      }
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setCards(data.cards || []);
      setFilteredCards(data.cards || []);
      setIsSampleData(false);
    } catch (error) {
      console.error('加载卡片列表失败，使用样本数据:', error);
      setCards(SAMPLE_CARDS);
      setFilteredCards(SAMPLE_CARDS);
      setIsSampleData(true);
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.info('后端响应超时，显示样本数据');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchWithTimeout]);

  // 加载单个卡片详情
  const loadCardDetail = useCallback(async (cardId: number) => {
    try {
      // 并行请求卡片详情和知识网络，不互相阻塞
      const cardPromise = fetchWithTimeout(`${API_BASE_URL}/api/knowledge/cards/${cardId}`)
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        });
      
      const networkPromise = fetchWithTimeout(`${API_BASE_URL}/api/backlinks/card/${cardId}/graph?max_depth=1`)
        .then(async (networkResponse) => {
          if (networkResponse.ok) {
            return networkResponse.json();
          }
          throw new Error('Network response not ok');
        })
        .catch((networkError) => {
          console.error('加载卡片知识网络失败:', networkError);
          return { nodes: [], links: [] };
        });

      const [card, networkData] = await Promise.all([cardPromise, networkPromise]);

      setSelectedCard(card);
      // 转换为Markdown格式
      setMarkdownContent(`# ${card.title || '无标题'}\n\n${card.content || ''}`);
      setCardNetwork({
        nodes: networkData.nodes || [],
        links: networkData.links || []
      });
    } catch (error) {
      console.error('加载卡片详情失败:', error);
      toast.error('加载卡片详情失败');
    }
  }, [fetchWithTimeout]);

  // ============ 搜索和筛选 ============
  useEffect(() => {
    let result = [...cards];
    
    // 颜色筛选
    if (filterColor !== 'all') {
      result = result.filter(card => card.card_type === filterColor);
    }
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
result = result.filter(card => {
        const tagArr = Array.isArray(card.tags) ? card.tags : (typeof card.tags === 'string' && card.tags ? JSON.parse(card.tags) : []);
        return card.title?.toLowerCase().includes(query) ||
          card.content?.toLowerCase().includes(query) ||
          tagArr.some((tag: string) => tag.toLowerCase().includes(query));
      });
    }
    
    // 排序
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      if (sortField === 'title') {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    setFilteredCards(result);
  }, [cards, searchQuery, filterColor, sortField, sortOrder]);

  // ============ 图表渲染 ============
  useEffect(() => {
    if (viewMode !== 'graph' || !chartRef.current) return;
    
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    
    if (graphData) {
      renderGraph();
    }
    
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [viewMode, graphData, highlightedNodes]);

  // 节点点击事件
  useEffect(() => {
    if (!chartInstance.current) return;
    
    const handleClick = (params: any) => {
      if (params.dataType === 'node') {
        const nodeId = params.data.id;
        setSelectedNodeId(nodeId);
        const cardId = parseInt(nodeId);
        if (!isNaN(cardId)) {
          loadCardDetail(cardId);
          setViewMode('list'); // 切换到列表视图显示详情
        }
      }
    };
    
// 双击事件 - 打开详情预览（显示知识网络）
    const handleDoubleClick = (params: any) => {
      if (params.dataType === 'node') {
        const cardId = parseInt(params.data.id);
        if (!isNaN(cardId)) {
          loadCardDetail(cardId);
          setIsEditing(false);
          setEditorSide('preview'); // 默认显示预览模式，可以看到知识网络
        }
      }
    };
    
    chartInstance.current.on('click', handleClick);
    chartInstance.current.on('dblclick', handleDoubleClick);
    
    return () => {
      chartInstance.current?.off('click', handleClick);
      chartInstance.current?.off('dblclick', handleDoubleClick);
    };
  }, [loadCardDetail]);

  // 选中卡片时滚动到列表中的对应项
  useEffect(() => {
    if (selectedCard && listRef.current) {
      const cardElement = listRef.current.querySelector(`[data-card-id="${selectedCard.id}"]`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedCard]);

  const renderGraph = () => {
    if (!chartInstance.current || !graphData) return;
    
    const nodes = graphData.nodes.map(node => ({
      id: String(node.id),
      name: node.title || node.name || `卡片${node.id}`,
      symbolSize: node.size || 30,
      category: node.type,
      itemStyle: {
        color: CARD_COLOR_CSS[node.type as CardColor] || '#999',
        opacity: highlightedNodes.size === 0 || highlightedNodes.has(String(node.id)) ? 1 : 0.3,
      },
      label: {
        show: true,
        fontSize: 11,
        color: highlightedNodes.size === 0 || highlightedNodes.has(String(node.id)) ? '#333' : '#ccc',
      }
    }));
    
    const links = graphData.edges.map(edge => ({
      source: String(edge.source),
      target: String(edge.target),
      label: {
        show: true,
        formatter: LINK_TYPE_LABELS[edge.type as LinkType] || edge.label || '关联',
        fontSize: 9
      },
      lineStyle: {
        color: LINK_TYPE_COLORS[edge.type] || '#999',
        width: edge.weight * 2 || 1,
        curveness: 0.2,
      }
    }));
    
    const option: echarts.EChartsOption = {
      title: {
        text: '知识图谱',
        subtext: `${graphData.nodes.length} 个节点, ${graphData.edges.length} 条边`,
        left: 'center',
        top: 10
      },
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `<strong>${params.data.name}</strong><br/>类型: ${CARD_COLOR_MAP[params.data.category as CardColor] || params.data.category}<br/><span style="color:#3b82f6">双击打开编辑</span>`;
          }
          return params.data.label?.formatter || '';
        }
      },
      legend: [
        {
          data: ['blue', 'green', 'yellow', 'red'],
          orient: 'vertical',
          left: 10,
          top: 50,
          formatter: (name: string) => {
            const labels: Record<string, string> = { 
              blue: '[蓝] 事实', 
              green: '[绿] 解释', 
              yellow: '[黄] 风险', 
              red: '[红] 行动' 
            };
            return labels[name] || name;
          }
        }
      ],
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: links,
        categories: [
          { name: 'blue' }, { name: 'green' }, { name: 'yellow' }, { name: 'red' }
        ],
        roam: true,
        draggable: true,
        label: { show: true, position: 'right', formatter: '{b}' },
        labelLayout: { hideOverlap: true },
        scaleLimit: { min: 0.2, max: 3 },
        lineStyle: { color: 'source', curveness: 0.3 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
        force: {
          repulsion: 800,
          gravity: 0.02,
          edgeLength: [150, 300],
          layoutAnimation: true
        }
      }]
    };
    
    chartInstance.current.setOption(option, true);
  };

  // ============ 图谱与内容联动 ============
  // 高亮节点及其连接节点
  const highlightNodeAndConnections = useCallback((nodeId: string) => {
    if (!graphData) return;
    
    const connectedNodes = new Set<string>();
    connectedNodes.add(nodeId);
    
    // 找到所有连接的节点
    graphData.edges.forEach(edge => {
      if (String(edge.source) === nodeId) {
        connectedNodes.add(String(edge.target));
      }
      if (String(edge.target) === nodeId) {
        connectedNodes.add(String(edge.source));
      }
    });
    
    setHighlightedNodes(connectedNodes);
    
    // 在图谱中聚焦该节点
    if (chartInstance.current) {
      chartInstance.current.dispatchAction({
        type: 'focusNodeAdjacency',
        dataIndex: graphData.nodes.findIndex(n => String(n.id) === nodeId)
      });
    }
  }, [graphData]);

  // 清除高亮
  const clearHighlight = useCallback(() => {
    setHighlightedNodes(new Set());
  }, []);

  // ============ 卡片操作 ============
  const handleCardClick = (card: KnowledgeCard) => {
    setSelectedCard(card);
    setMarkdownContent(`# ${card.title || '无标题'}\n\n${card.content || ''}`);
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        next.add(card.id);
      }
      return next;
    });
    
    // 联动图谱：高亮对应节点及其连接
    highlightNodeAndConnections(String(card.id));
    
    // 如果当前是图谱视图，切换到列表视图以便编辑
    if (viewMode === 'graph') {
      setViewMode('list');
    }
  };

  // 卡片悬停 - 实时高亮图谱节点
  const handleCardHover = (card: KnowledgeCard | null) => {
    setHoveredCardId(card?.id || null);
    if (card) {
      highlightNodeAndConnections(String(card.id));
    } else {
      clearHighlight();
    }
  };

  // 卡片双击 - 打开编辑
  const handleCardDoubleClick = (card: KnowledgeCard) => {
    setSelectedCard(card);
    setMarkdownContent(`# ${card.title || '无标题'}\n\n${card.content || ''}`);
    setIsEditing(true);
    setEditorSide('edit');
    highlightNodeAndConnections(String(card.id));
  };

  // ============ Markdown编辑和保存 ============
  const handleSaveCard = async () => {
    if (!selectedCard) return;
    
    try {
      // 解析Markdown提取标题和内容
      const lines = markdownContent.split('\n');
      const title = lines[0]?.replace(/^#+\s*/, '') || '无标题';
      const content = lines.slice(1).join('\n').trim();
      
      const response = await fetch(`${API_BASE_URL}/api/knowledge/cards/${selectedCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedCard.card_type,
          title: title,
          content: content,
          category: selectedCard.category,
          project_id: selectedCard.project_id,
          related_cards: selectedCard.related_cards || []
        })
      });
      
      if (!response.ok) throw new Error('保存失败');
      
      toast.success('卡片保存成功');
      setIsEditing(false);
      loadCards();
      loadGraphData();
    } catch (error) {
      console.error('保存卡片失败:', error);
      toast.error('保存卡片失败');
    }
  };

  // ============ 新建卡片 ============
  const handleCreateCard = async () => {
    if (!newCardTitle.trim()) {
      toast.error('请输入标题');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newCardType,
          title: newCardTitle.trim(),
          content: ''
        })
      });
      
      if (!response.ok) throw new Error('创建失败');
      
      const newCard = await response.json();
      toast.success('卡片创建成功');
      setShowNewCardModal(false);
      setNewCardTitle('');
      setNewCardType('blue');
      loadCards();
      loadGraphData();
      loadCardDetail(newCard.id);
    } catch (error) {
      console.error('创建卡片失败:', error);
      toast.error('创建卡片失败');
    }
  };

  // ============ 删除卡片 ============
  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/cards/${cardToDelete}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('删除失败');
      
      toast.success('卡片已删除');
      setShowDeleteConfirm(false);
      setCardToDelete(null);
      if (selectedCard?.id === cardToDelete) {
        setSelectedCard(null);
        setMarkdownContent('');
      }
      loadCards();
      loadGraphData();
    } catch (error) {
      console.error('删除卡片失败:', error);
      toast.error('删除卡片失败');
    }
  };

  // ============ 关联卡片 ============
  const handleAddRelatedCard = async () => {
    if (!selectedCard || !relatedCardId.trim()) return;
    
    const targetId = parseInt(relatedCardId);
    if (isNaN(targetId)) {
      toast.error('请输入有效的卡片ID');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/backlinks/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_card_id: selectedCard.id,
          target_card_id: targetId
        })
      });
      
      if (!response.ok) throw new Error('关联失败');
      
      toast.success('卡片关联成功');
      setShowRelatedModal(false);
      setRelatedCardId('');
      loadCardDetail(selectedCard.id);
      loadCards();
      loadGraphData();
    } catch (error) {
      console.error('关联卡片失败:', error);
      toast.error('关联卡片失败');
    }
  };

  const handleRemoveRelatedCard = async (targetId: number) => {
    if (!selectedCard) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/backlinks/remove?source_card_id=${selectedCard.id}&target_card_id=${targetId}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) throw new Error('取消关联失败');
      
      toast.success('已取消关联');
      loadCardDetail(selectedCard.id);
      loadCards();
      loadGraphData();
    } catch (error) {
      console.error('取消关联失败:', error);
      toast.error('取消关联失败');
    }
  };

  // ============ 导出功能 ============
  const handleCopyRichText = () => {
    if (!selectedCard) return;
    
    // 创建富文本内容
    const title = selectedCard.title || '无标题';
    const content = selectedCard.content || '';
    const colorLabel = CARD_COLOR_MAP[selectedCard.card_type as CardColor] || '事实';
    
    const htmlContent = `
      <div style="padding: 16px; border-left: 4px solid ${CARD_COLOR_CSS[selectedCard.card_type as CardColor]}; background: #f9f9f9;">
        <div style="font-size: 12px; color: ${CARD_COLOR_CSS[selectedCard.card_type as CardColor]}; margin-bottom: 8px;">
          [${colorLabel}]
        </div>
        <h2 style="margin: 0 0 12px 0; font-size: 18px;">${title}</h2>
        <div style="white-space: pre-wrap;">${content}</div>
      </div>
    `;
    
    // 使用剪贴板API
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({ 'text/html': blob });
    navigator.clipboard.write([clipboardItem]);
    
    toast.success('已复制富文本到剪贴板');
  };

  const handleCopyMarkdown = () => {
    if (!selectedCard) return;
    navigator.clipboard.writeText(markdownContent);
    toast.success('已复制Markdown到剪贴板');
  };

  const handleExportHTML = () => {
    if (!selectedCard) return;
    
    const title = selectedCard.title || '无标题';
    const content = selectedCard.content || '';
    const colorLabel = CARD_COLOR_MAP[selectedCard.card_type as CardColor] || '事实';
    
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .card { padding: 20px; border-left: 4px solid ${CARD_COLOR_CSS[selectedCard.card_type as CardColor]}; background: #f9f9f9; border-radius: 8px; }
    .card-type { font-size: 12px; color: ${CARD_COLOR_CSS[selectedCard.card_type as CardColor]}; margin-bottom: 8px; }
    h1 { margin: 0 0 16px 0; font-size: 24px; }
    .content { white-space: pre-wrap; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-type">[${colorLabel}]</div>
    <h1>${title}</h1>
    <div class="content">${content}</div>
  </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('已导出HTML文件');
  };

  const handleExportPNG = async () => {
    if (!selectedCard) return;
    
    // 创建临时canvas来渲染卡片
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 绘制背景
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制左边框
    ctx.fillStyle = CARD_COLOR_CSS[selectedCard.card_type as CardColor];
    ctx.fillRect(0, 0, 8, canvas.height);
    
    // 绘制标题
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(selectedCard.title || '无标题', 30, 50);
    
    // 绘制内容
    ctx.font = '16px sans-serif';
    const content = selectedCard.content || '';
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line.substring(0, 60), 30, 100 + i * 24);
    });
    
    // 导出
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCard.title || 'card'}.png`;
    a.click();
    
    toast.success('已导出PNG图片');
  };

  const handleExportPPT = async () => {
    if (!selectedCard) return;
    
    try {
      // 将卡片内容转换为 Markdown
      const selTags = Array.isArray(selectedCard.tags) ? selectedCard.tags : (typeof selectedCard.tags === 'string' && selectedCard.tags ? JSON.parse(selectedCard.tags) : []);
      const markdownContent = `# ${selectedCard.title || '知识卡片'}\n\n**类型**: ${selectedCard.card_type}\n\n---\n\n${selectedCard.content || ''}\n\n---\n\n**标签**: ${selTags.join(', ') || '无'}\n`;
      
      // 创建 FormData
      const formData = new FormData();
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      formData.append('file', blob, 'card.md');
      
      // 调用后端 API 转换为 PPTX
      const response = await fetch('/api/markdown-converter/to-pptx', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'PPT导出失败');
      }
      
      // 下载文件
      const pptxBlob = await response.blob();
      const url = URL.createObjectURL(pptxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedCard.title || 'card'}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('已导出PPT文件');
    } catch (err: any) {
      toast.error(err.message || 'PPT导出失败');
    }
  };

  // ============ 初始化 ============
  useEffect(() => {
    loadGraphData();
    loadCards();
  }, [loadGraphData, loadCards]);

  // ============ 渲染 ============
  const mainContent = (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* 左侧边栏 - 卡片列表 */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:static md:translate-x-0 z-40 md:z-auto w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out h-full md:h-auto`}>
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Network className="w-5 h-5" />
            知识图谱工作台
            {isSampleData && (
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-normal ml-auto">
                样本
              </span>
            )}
          </h2>

          {/* 快捷操作栏 */}
          <div className="flex gap-1 mb-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewCardModal(true)}
              title="新建卡片"
              className="flex-1 min-w-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedCard) {
                  setCardToDelete(selectedCard.id);
                  setShowDeleteConfirm(true);
                } else {
                  toast.info('请先选中一张卡片');
                }
              }}
              title="删除选中卡片"
              className="flex-1 min-w-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sorted = [...cards].sort((a, b) => {
                  const ad = new Date(a.created_at || 0).getTime();
                  const bd = new Date(b.created_at || 0).getTime();
                  return bd - ad;
                });
                toast.info(`最新卡片: ${sorted[0]?.title || '无'}`);
              }}
              title="最新卡片"
              className="flex-1 min-w-0"
            >
              <Calendar className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info(`共 ${cards.length} 张卡片`)}
              title="筛选统计"
              className="flex-1 min-w-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {loading && (
            <div className="text-xs text-blue-500 dark:text-blue-400 mb-2 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              正在加载数据...
            </div>
          )}

          {selectedNodeId && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              已选中节点: {selectedNodeId}
              <button
                onClick={() => setSelectedNodeId(null)}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          
          {/* 视图切换 */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = selectedCard
                  ? `/knowledge-graph?card=${selectedCard.id}`
                  : '/knowledge-graph';
                window.open(url, '_blank');
              }}
              className="flex-1"
            >
              <Network className="w-4 h-4 mr-1" />
              图谱
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex-1"
            >
              <List className="w-4 h-4 mr-1" />
              列表
            </Button>
          </div>
          
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索卡片..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"
            />
          </div>
        </div>
        
        {/* 筛选和排序 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* 颜色筛选 */}
          <div className="flex gap-1">
            <button
              onClick={() => setFilterColor('all')}
              className={`flex-1 px-2 py-1 text-xs rounded ${filterColor === 'all' ? 'bg-gray-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              全部
            </button>
            {(['blue', 'green', 'yellow', 'red'] as CardColor[]).map(color => (
              <button
                key={color}
                onClick={() => setFilterColor(color)}
                className="flex-1 text-xs rounded py-1"
                style={{ 
                  backgroundColor: filterColor === color ? CARD_COLOR_CSS[color] : 'transparent',
                  border: `1px solid ${CARD_COLOR_CSS[color]}`,
                  color: filterColor === color ? 'white' : CARD_COLOR_CSS[color]
                }}
              >
                {CARD_COLOR_MAP[color].charAt(0)}
              </button>
            ))}
          </div>
          
          {/* 排序 */}
          <div className="flex gap-2">
            <select
              value={sortField}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortField(e.target.value as SortField)}
              className="flex-1 text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="updated_at">修改时间</option>
              <option value="created_at">创建时间</option>
              <option value="title">标题</option>
              <option value="card_type">类型</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        {/* 卡片列表 */}
        <div className="flex-1 overflow-y-auto" ref={listRef}>
          {filteredCards.map(card => {
            const colors = colorStyles[card.card_type as CardColor] || colorStyles.blue;
            const isExpanded = expandedCards.has(card.id);
            const isSelected = selectedCard?.id === card.id;
            
            return (
              <motion.div
                key={card.id}
                data-card-id={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-b border-gray-100 dark:border-gray-700 ${isSelected ? colors.light : ''}`}
              >
                <div
                  className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${isSelected ? 'border-l-4' : ''} ${hoveredCardId === card.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  style={{ borderLeftColor: isSelected ? CARD_COLOR_CSS[card.card_type as CardColor] : 'transparent' }}
                  onClick={() => handleCardClick(card)}
                  onDoubleClick={() => handleCardDoubleClick(card)}
                  onMouseEnter={() => handleCardHover(card)}
                  onMouseLeave={() => handleCardHover(null)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${colors.bg} text-white`}>
                      {CARD_COLOR_MAP[card.card_type as CardColor] || '事实'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {card.address || `#${card.id}`}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm truncate mb-1">
                    {card.title || '无标题'}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {card.content?.substring(0, 80) || '无内容'}...
                  </p>
{(() => {
                    const cardTagArr = Array.isArray(card.tags) ? card.tags : (typeof card.tags === 'string' && card.tags ? JSON.parse(card.tags) : []);
                    return cardTagArr.length > 0 ? (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {cardTagArr.slice(0, 3).map((tag: string, i: number) => (
                          <span key={i} className="text-xs px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
                
{/* 展开详情 */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3 pb-3"
                    >
                      <div className={`p-2 rounded ${colors.light} text-xs`}>
                        <div className="text-gray-500 mb-1">
                          创建: {card.created_at ? new Date(card.created_at).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-gray-500">
修改: {card.updated_at ? new Date(card.updated_at).toLocaleDateString() : '-'}
                        </div>
                      </div>
                    </motion.div>
)}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
</div>

      {/* 右侧详情面板 */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
        {selectedCard ? (
          <>
          {/* 面板头部 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button className="md:hidden mr-1 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <span
                className="text-xs px-2 py-1 rounded text-white font-medium shrink-0"
                style={{ backgroundColor: CARD_COLOR_CSS[selectedCard.card_type as CardColor] }}
              >
                {CARD_COLOR_MAP[selectedCard.card_type as CardColor] || '事实'}
              </span>
              <h2 className="font-semibold text-lg truncate">
                {selectedCard.title || '无标题'}
              </h2>
              {isEditing && (
                <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 shrink-0">
                  <Edit3 className="w-3 h-3 inline mr-1" />
                  编辑中
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* 编辑模式切换 */}
              <div className="hidden sm:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['edit', 'preview', 'split'] as EditorSide[]).map(side => (
                  <button
                    key={side}
                    onClick={() => setEditorSide(side)}
                    className={`px-3 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${
                      editorSide === side
                        ? 'bg-white dark:bg-gray-600 shadow-sm font-medium'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {side === 'edit' && <Edit3 className="w-3 h-3" />}
                    {side === 'preview' && <Eye className="w-3 h-3" />}
                    {side === 'split' && <span className="text-[10px]">双</span>}
                    {side === 'edit' ? '编辑' : side === 'preview' ? '预览' : '分屏'}
                  </button>
                ))}
              </div>
              {/* 跳转到知识网络 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`/knowledge-graph?card=${selectedCard.id}`, '_blank');
                }}
                title="在知识网络中查看"
              >
                <Network className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedCard(null)}>
                <X className="w-4 h-4" />
              </Button>

              {/* 导出菜单 */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  title="导出选项"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1"
                    >
                      <button
                        onClick={() => { handleCopyRichText(); setShowExportMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <CopyIcon className="w-4 h-4" />
                        复制富文本
                      </button>
                      <button
                        onClick={() => { handleCopyMarkdown(); setShowExportMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        复制 Markdown
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      <button
                        onClick={() => { handleExportHTML(); setShowExportMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FileDown className="w-4 h-4" />
                        导出 HTML
                      </button>
                      <button
                        onClick={() => { handleExportPNG(); setShowExportMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Image className="w-4 h-4" />
                        导出 PNG
                      </button>
                      <button
                        onClick={() => { handleExportPPT(); setShowExportMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Presentation className="w-4 h-4" />
                        导出 PPT
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      <button
                        onClick={() => {
                          if (selectedCard) {
                            const url = `${window.location.origin}/knowledge-graph?card=${selectedCard.id}`;
                            navigator.clipboard.writeText(url);
                            toast.success('链接已复制');
                          }
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Link2 className="w-4 h-4" />
                        复制链接
                      </button>
                      <button
                        onClick={() => {
                          if (selectedCard) {
                            window.open(`/knowledge-graph?card=${selectedCard.id}`, '_blank');
                          }
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        在新窗口打开
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 编辑区 */}
          <div className="flex-shrink-0 h-[calc(100%-180px)] overflow-hidden flex border-t border-gray-200 dark:border-gray-700">
            {(editorSide === 'edit' || editorSide === 'split') && (
              <div className={`flex flex-col ${editorSide === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'flex-1'}`}>
                <textarea
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  className="flex-1 p-4 resize-none bg-white dark:bg-gray-900 text-sm font-mono outline-none"
                  placeholder="输入内容，支持 Markdown 格式..."
                />
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditorSide('preview');
                      setIsEditing(false);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={async () => {
                      await handleSaveCard();
                      setEditorSide('preview');
                      setIsEditing(false);
                      toast.success('保存成功');
                    }}
                  >
                    保存
                  </Button>
                </div>
              </div>
            )}

            {(editorSide === 'preview' || editorSide === 'split') && (
              <div className={`flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 ${editorSide === 'split' ? 'w-1/2' : ''}`}>
                {markdownContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{markdownContent}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">无内容</p>
                )}
              </div>
            )}
          </div>

          {/* 知识网络区域 */}
          {selectedCard && cardNetwork.nodes && cardNetwork.nodes.length > 1 && (
            <div className="flex-shrink-0 h-[180px] border-t border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">知识网络</span>
                  <span className="text-xs text-gray-500">({cardNetwork.nodes.length} 个节点, {cardNetwork.links.length} 条连接)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditorSide('preview')}
                    className="text-xs px-2 py-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                  >
                    返回预览
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* 反向链接（链接到当前卡片） */}
                  {cardNetwork.links.filter(l => String(l.target) === String(selectedCard.id) || l.target === selectedCard.id).length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                        <ChevronDown className="w-3 h-3" />
                        被引用 ({cardNetwork.links.filter(l => String(l.target) === String(selectedCard.id) || l.target === selectedCard.id).length})
                      </div>
                      <div className="space-y-1">
                        {cardNetwork.links
                          .filter(l => String(l.target) === String(selectedCard.id) || l.target === selectedCard.id)
                          .slice(0, 5)
                          .map((link, idx) => {
                            const sourceNode = cardNetwork.nodes.find(n => String(n.id) === String(link.source) || n.id === link.source);
                            if (!sourceNode) return null;
                            return (
                              <div
                                key={idx}
                                className="text-xs p-1.5 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-1"
                                onClick={() => {
                                  const nid = parseInt(String(link.source));
                                  if (!isNaN(nid)) {
                                    loadCardDetail(nid);
                                  }
                                }}
                              >
                                <span className={`w-2 h-2 rounded-full ${sourceNode.type === 'blue' ? 'bg-blue-500' : sourceNode.type === 'green' ? 'bg-green-500' : sourceNode.type === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                <span className="truncate flex-1">{sourceNode.title || '未命名'}</span>
                                <span className="text-gray-400 text-[10px]">{link.type === 'backlink' ? '↩' : '↪'}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                  {/* 正向链接（当前卡片引用） */}
                  {cardNetwork.links.filter(l => String(l.source) === String(selectedCard.id) || l.source === selectedCard.id).length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" />
                        引用了 ({cardNetwork.links.filter(l => String(l.source) === String(selectedCard.id) || l.source === selectedCard.id).length})
                      </div>
                      <div className="space-y-1">
                        {cardNetwork.links
                          .filter(l => String(l.source) === String(selectedCard.id) || l.source === selectedCard.id)
                          .slice(0, 5)
                          .map((link, idx) => {
                            const targetNode = cardNetwork.nodes.find(n => String(n.id) === String(link.target) || n.id === link.target);
                            if (!targetNode) return null;
                            return (
                              <div
                                key={idx}
                                className="text-xs p-1.5 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-1"
                                onClick={() => {
                                  const nid = parseInt(String(link.target));
                                  if (!isNaN(nid)) {
                                    loadCardDetail(nid);
                                  }
                                }}
                              >
                                <span className={`w-2 h-2 rounded-full ${targetNode.type === 'blue' ? 'bg-blue-500' : targetNode.type === 'green' ? 'bg-green-500' : targetNode.type === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                <span className="truncate flex-1">{targetNode.title || '未命名'}</span>
                                <span className="text-gray-400 text-[10px]">↪</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
                {/* 如果没有关联 */}
                {cardNetwork.nodes.length <= 1 && (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    <span>该卡片暂无关联</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {/* 图谱工具栏 */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">知识图谱视图</span>
              {graphData && (
                <span className="text-xs text-gray-500">
                  ({graphData.nodes.length} 节点 / {graphData.edges.length} 边)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => chartInstance.current?.dispatchAction({ type: 'graphRoam', zoom: 1.2 })}
                title="放大"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => chartInstance.current?.dispatchAction({ type: 'graphRoam', zoom: 0.8 })}
                title="缩小"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadGraphData();
                  loadCards();
                }}
                title="刷新"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (chartRef.current) {
                    if (chartRef.current.requestFullscreen) {
                      chartRef.current.requestFullscreen();
                    }
                  }
                }}
                title="全屏"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* 图谱容器 */}
          <div
            ref={chartRef}
            className="flex-1 min-h-[400px] bg-white dark:bg-gray-900"
          />
        </div>
      )}
      </div>
    </div>
  );

  // Render modals at the end using helper function
  const renderModals = () => {
    if (!showNewCardModal && !showDeleteConfirm && !showRelatedModal) return null;
    return (
      <>
        {showNewCardModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">新建卡片</h3>
                <button onClick={() => setShowNewCardModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm block mb-1">标题</label>
                  <input type="text" value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} placeholder="输入卡片标题" className="w-full px-3 py-2 border rounded-lg" autoFocus />
                </div>
                <div>
                  <label className="text-sm block mb-1">类型</label>
                  <div className="flex gap-2">
                    {(Object.keys(CARD_COLOR_MAP) as CardColor[]).map(color => (
                      <button key={color} onClick={() => setNewCardType(color)} className={`flex-1 py-2 rounded-lg text-white text-sm ${newCardType === color ? '' : 'opacity-50'}`} style={{ backgroundColor: CARD_COLOR_CSS[color] }}>
                        {CARD_COLOR_MAP[color]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowNewCardModal(false)}>取消</Button>
                <Button variant="default" onClick={handleCreateCard}>创建</Button>
              </div>
            </div>
          </div>
        )}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-semibold mb-2">确认删除</h3>
              <p className="text-gray-600 mb-4">确定要删除这张卡片吗？此操作无法撤销。</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>取消</Button>
                <Button variant="default" onClick={handleDeleteCard} className="bg-red-500">删除</Button>
              </div>
            </div>
          </div>
        )}
        {showRelatedModal && selectedCard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">管理关联卡片</h3>
                <button onClick={() => setShowRelatedModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">当前关联</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedCard.related_cards?.map((relId: number) => {
                    const relCard = cards.find(c => c.id === relId);
                    return relCard ? (
                      <div key={relId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm truncate">{relCard.title}</span>
                        <button onClick={() => handleRemoveRelatedCard(relId)} className="text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">添加关联</h4>
                <div className="flex gap-2">
                  <input type="number" value={relatedCardId} onChange={e => setRelatedCardId(e.target.value)} placeholder="输入卡片ID" className="flex-1 px-3 py-2 border rounded-lg" />
                  <Button variant="default" onClick={handleAddRelatedCard}>添加</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

return <>{mainContent}{renderModals()}</>;
};

export default KnowledgeGraphWorkbench;