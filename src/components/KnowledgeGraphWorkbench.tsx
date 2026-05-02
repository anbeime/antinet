// src/components/KnowledgeGraphWorkbench.tsx
// 知识图谱工作台 - 四位一体：图谱导航、列表管理、双栏编辑、多格式输出
// 核心目标：让知识管理过程本身成为激发思考和创造价值的动态体验

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as echarts from 'echarts';
import {
  Search, Filter, List, Network, Edit3, Eye, Copy, Download,
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Link2, ChevronRight,
  ChevronDown, X, Plus, Trash2, ExternalLink, FileText,
  Calendar, SortAsc, SortDesc, Copy as CopyIcon, FileDown, Image,
  Presentation
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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

type ViewMode = 'graph' | 'list';
type EditorSide = 'edit' | 'preview' | 'split';
type SortField = 'created_at' | 'updated_at' | 'title' | 'card_type';
type SortOrder = 'asc' | 'desc';

const KnowledgeGraphWorkbench: React.FC = () => {
  // ============ 状态定义 ============
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  // 视图状态
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [editorSide, setEditorSide] = useState<EditorSide>('split');
  
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
  
  // 编辑器状态
  const [markdownContent, setMarkdownContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // 搜索/筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterColor, setFilterColor] = useState<CardColor | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // 列表展开状态
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  // ============ 数据加载 ============
  const loadGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/graph?limit=500`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setGraphData(data);
      toast.success('知识图谱加载成功');
    } catch (error) {
      console.error('加载知识图谱失败:', error);
      toast.error('加载知识图谱失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/cards?limit=1000`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setCards(data.cards || []);
      setFilteredCards(data.cards || []);
    } catch (error) {
      console.error('加载卡片列表失败:', error);
      toast.error('加载卡片列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载单个卡片详情
  const loadCardDetail = useCallback(async (cardId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/cards/${cardId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const card = await response.json();
      setSelectedCard(card);
      // 转换为Markdown格式
      setMarkdownContent(`# ${card.title || '无标题'}\n\n${card.content || ''}`);
    } catch (error) {
      console.error('加载卡片详情失败:', error);
      toast.error('加载卡片详情失败');
    }
  }, []);

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
      result = result.filter(card => 
        card.title?.toLowerCase().includes(query) ||
        card.content?.toLowerCase().includes(query) ||
        card.tags?.some(tag => tag.toLowerCase().includes(query))
      );
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
    
    // 双击事件 - 直接打开编辑
    const handleDoubleClick = (params: any) => {
      if (params.dataType === 'node') {
        const cardId = parseInt(params.data.id);
        if (!isNaN(cardId)) {
          loadCardDetail(cardId);
          setIsEditing(true);
          setEditorSide('edit');
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
      loadCards(); // 刷新列表
      loadGraphData(); // 刷新图谱
    } catch (error) {
      console.error('保存卡片失败:', error);
      toast.error('保存卡片失败');
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
      const markdownContent = `# ${selectedCard.title || '知识卡片'}\n\n**类型**: ${selectedCard.card_type}\n\n---\n\n${selectedCard.content || ''}\n\n---\n\n**标签**: ${selectedCard.tags?.join(', ') || '无'}\n`;
      
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
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 左侧边栏 - 卡片列表 */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Network className="w-5 h-5" />
            知识图谱工作台
          </h2>
          
          {/* 视图切换 */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === 'graph' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('graph')}
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
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {card.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
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
          
          {filteredCards.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无卡片</p>
            </div>
          )}
        </div>
        
        {/* 统计信息 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-blue-500">{cards.filter(c => c.card_type === 'blue').length}</div>
              <div className="text-xs text-gray-500">事实</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-500">{cards.filter(c => c.card_type === 'green').length}</div>
              <div className="text-xs text-gray-500">解释</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-500">{cards.filter(c => c.card_type === 'yellow').length}</div>
              <div className="text-xs text-gray-500">风险</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-500">{cards.filter(c => c.card_type === 'red').length}</div>
              <div className="text-xs text-gray-500">行动</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 主工作区 */}
      <div className="flex-1 flex flex-col">
        {viewMode === 'graph' ? (
          /* 知识图谱视图 */
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-10">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            )}
            <div ref={chartRef} className="w-full h-full" />
            
            {/* 图谱控制栏 */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={loadGraphData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => chartInstance.current?.dispatchAction({ type: 'graphRoam', zoom: 1.2 })}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => chartInstance.current?.dispatchAction({ type: 'graphRoam', zoom: 0.8 })}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => chartInstance.current?.dispatchAction({ type: 'restore' })}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* 双栏编辑/预览视图 */
          <div className="flex-1 flex flex-col">
            {/* 编辑器工具栏 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">
                  {selectedCard ? selectedCard.title || '无标题' : '选择一张卡片'}
                </h3>
                {selectedCard && (
                  <span 
                    className="text-xs px-2 py-1 rounded text-white"
                    style={{ backgroundColor: CARD_COLOR_CSS[selectedCard.card_type as CardColor] }}
                  >
                    {CARD_COLOR_MAP[selectedCard.card_type as CardColor]}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* 编辑器视图切换 */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 mr-4">
                  <button
                    onClick={() => setEditorSide('edit')}
                    className={`px-3 py-1 text-sm rounded ${editorSide === 'edit' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    <Edit3 className="w-4 h-4 inline mr-1" />
                    编辑
                  </button>
                  <button
                    onClick={() => setEditorSide('split')}
                    className={`px-3 py-1 text-sm rounded ${editorSide === 'split' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    <Edit3 className="w-4 h-4 inline mr-1" />
                    <Eye className="w-4 h-4 inline mr-1" />
                    分栏
                  </button>
                  <button
                    onClick={() => setEditorSide('preview')}
                    className={`px-3 py-1 text-sm rounded ${editorSide === 'preview' ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    预览
                  </button>
                </div>
                
                {/* 导出按钮 */}
                {selectedCard && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCopyMarkdown} title="复制Markdown">
                      <CopyIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyRichText} title="复制富文本">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportHTML} title="导出HTML">
                      <FileDown className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPNG} title="导出PNG">
                      <Image className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPPT} title="导出PPT">
                      <Presentation className="w-4 h-4" />
                    </Button>
                  </>
                )}
                
                {isEditing && (
                  <Button variant="default" size="sm" onClick={handleSaveCard}>
                    保存
                  </Button>
                )}
              </div>
            </div>
            
            {/* 编辑器内容区 */}
            <div className="flex-1 flex overflow-hidden">
              {/* 左侧编辑区 */}
              {(editorSide === 'edit' || editorSide === 'split') && (
                <div className={`${editorSide === 'split' ? 'w-1/2' : 'w-full'} border-r border-gray-200 dark:border-gray-700`}>
                  <textarea
                    value={markdownContent}
                    onChange={(e) => {
                      setMarkdownContent(e.target.value);
                      setIsEditing(true);
                    }}
                    className="w-full h-full p-4 resize-none focus:outline-none font-mono text-sm bg-white dark:bg-gray-900"
                    placeholder="使用 Markdown 编写内容...

支持的功能:
- 标题: # ## ###
- 列表: - 1.
- 代码: `inline` 或 ```block```
- 链接: [[卡片标题]] 或 [text](url)
- 引用: > quote
- 表格: | header | row |"
                    disabled={!selectedCard}
                  />
                </div>
              )}
              
              {/* 右侧预览区 */}
              {(editorSide === 'preview' || editorSide === 'split') && (
                <div className={`${editorSide === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto bg-gray-50 dark:bg-gray-900`}>
                  {selectedCard ? (
                    <div className="p-6">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* 卡片头部 */}
                        <div 
                          className="px-6 py-4 flex items-center gap-3"
                          style={{ backgroundColor: CARD_COLOR_CSS[selectedCard.card_type as CardColor] }}
                        >
                          <span className="text-2xl">
                            {selectedCard.card_type === 'blue' ? '📘' : 
                             selectedCard.card_type === 'green' ? '📗' :
                             selectedCard.card_type === 'yellow' ? '📙' : '📕'}
                          </span>
                          <div className="flex-1">
                            <h2 className="text-white font-bold text-lg">
                              {selectedCard.title || '无标题'}
                            </h2>
                            <span className="text-white/80 text-sm">
                              {CARD_COLOR_MAP[selectedCard.card_type as CardColor]}
                            </span>
                          </div>
                          {selectedCard.address && (
                            <span className="text-white/60 text-sm">
                              {selectedCard.address}
                            </span>
                          )}
                        </div>
                        
                        {/* 卡片内容 */}
                        <div className="p-6">
                          <ReactMarkdown
                          >
                            {markdownContent}
                          </ReactMarkdown>
                        </div>
                        
                        {/* 卡片底部 */}
                        {selectedCard.tags && selectedCard.tags.length > 0 && (
                          <div className="px-6 pb-4">
                            <div className="flex gap-2 flex-wrap">
                              {selectedCard.tags.map((tag, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>从左侧列表选择一张卡片开始编辑</p>
                        <p className="text-sm mt-2">或双击图谱中的节点</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraphWorkbench;