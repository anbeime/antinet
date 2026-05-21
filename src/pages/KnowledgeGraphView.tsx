import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as echarts from 'echarts';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  Share2, Plus, Trash2, Download, Search, RefreshCw,
  ZoomIn, ZoomOut, Move, Loader, Eye, Settings,
  Database, GitBranch, Network, X, ExternalLink, Edit3
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const API_BASE = getApiBaseUrl()

interface Props {
  onNavigate?: (tab: string) => void;
}

interface GraphNode {
  id: string;
  name: string;
  category: string;
  symbolSize: number;
}

interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

interface GraphCategory {
  name: string;
  icon: string;
}

const sampleData = {
  nodes: [
    { id: '1', name: '人工智能', category: 0, symbolSize: 60 },
    { id: '2', name: '机器学习', category: 1, symbolSize: 40 },
    { id: '3', name: '深度学习', category: 1, symbolSize: 35 },
    { id: '4', name: '神经网络', category: 2, symbolSize: 30 },
    { id: '5', name: '自然语言处理', category: 1, symbolSize: 30 },
    { id: '6', name: '计算机视觉', category: 1, symbolSize: 30 },
    { id: '7', name: 'Transformer', category: 2, symbolSize: 25 },
    { id: '8', name: 'CNN', category: 2, symbolSize: 20 },
    { id: '9', name: 'RNN', category: 2, symbolSize: 20 },
    { id: '10', name: 'GPT', category: 3, symbolSize: 25 },
  ] as GraphNode[],
  links: [
    { source: '1', target: '2', label: '包含' },
    { source: '1', target: '3', label: '包含' },
    { source: '1', target: '5', label: '包含' },
    { source: '1', target: '6', label: '包含' },
    { source: '2', target: '4', label: '使用' },
    { source: '3', target: '4', label: '基于' },
    { source: '5', target: '7', label: '使用' },
    { source: '6', target: '8', label: '使用' },
    { source: '4', target: '9', label: '类型' },
    { source: '7', target: '10', label: '应用' },
  ] as GraphLink[],
  categories: [
    { name: '核心领域' },
    { name: '分支领域' },
    { name: '技术方法' },
    { name: '应用产品' },
  ] as GraphCategory[]
};

const categoryColors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc9052', '#e06c8b'];

const KnowledgeGraphView: React.FC<Props> = ({ onNavigate }) => {
  useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const mountedRef = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{nodes: GraphNode[], links: GraphLink[], categories: GraphCategory[]}>(sampleData);
  const [apiData, setApiData] = useState<{entities: any[], relations: any[]} | null>(null);
  const [viewMode, setViewMode] = useState<'sample' | 'api'>('sample');
  const [topic, setTopic] = useState('');
  const [loadingAPI, setLoadingAPI] = useState(false);
  const [currentCardId, setCurrentCardId] = useState<number | null>(null);
  const [modalCard, setModalCard] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [modalEditContent, setModalEditContent] = useState('');
  const [modalEditTitle, setModalEditTitle] = useState('');
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [addNodeSearch, setAddNodeSearch] = useState('');
  
  // 从URL参数加载指定卡片的链接图谱
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cardId = params.get('card');
    if (cardId) {
      loadCardBacklinks(parseInt(cardId));
    }
    // 加载已保存的图谱状态（持久化节点/连线）
    loadPersistedGraph();
  }, []);

  // 加载持久化的图谱状态
  const loadPersistedGraph = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/graph/state`);
      if (res.ok) {
        const state = await res.json();
        if (state && state.nodes && state.nodes.length > 0) {
          setGraphData({ nodes: state.nodes, links: state.links || [], categories: state.categories || [] });
          console.log(`[Graph] 已加载持久化图谱: ${state.nodes.length} 节点`);
        }
      }
    } catch (e) {
      console.error('[Graph] 加载持久化图谱失败:', e);
    }
  };

  // 保存图谱状态到数据库
  const saveGraphState = async (data: {nodes: any[], links: any[], categories: any[]}) => {
    try {
      await fetch(`${API_BASE}/api/knowledge/graph/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'default', ...data })
      });
    } catch (e) {
      console.error('[Graph] 保存图谱失败:', e);
    }
  };
  
  const loadCardBacklinks = async (cardId: number) => {
    setCurrentCardId(cardId);
    setLoadingAPI(true);
    try {
      // 从后端获取卡片的 backlinks 图谱
      const response = await fetch(`${API_BASE}/api/backlinks/card/${cardId}/graph`, {
        method: 'GET'
      });
      if (response.ok) {
        const data = await response.json();
        setApiData(data);
        setViewMode('api');
      } else {
        console.error('加载链接图谱失败:', response.status);
      }
    } catch (e) {
      console.error('加载链接图谱失败:', e);
    } finally {
      setLoadingAPI(false);
    }
  };

  const loadKnowledgeGraph = async () => {
    if (!topic.trim()) return;
    setLoadingAPI(true);
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/network/suggest?topic=${encodeURIComponent(topic)}&limit=20`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('API error: ' + response.status);
      const data = await response.json();
      console.log('[Search] API返回:', data);
      // 先设置数据，再切换模式，避免竞态
      setApiData(data);
      setViewMode('api');
      // 等待状态更新后再初始化图表
      setTimeout(() => initChart(), 50);
    } catch (e) {
      console.error('Load KG failed:', e);
      alert('搜索失败: ' + e.message);
    } finally {
      setLoadingAPI(false);
    }
  };

  // 加载所有卡片列表
  const loadCards = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/cards?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        setCards(data.cards || []);
      }
    } catch (e) {
      console.error('加载卡片列表失败:', e);
    }
  };

  // 打开卡片详情（弹窗）
  const openCardDetail = async (cardId: string | number) => {
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/cards/${cardId}`);
      if (res.ok) {
        const card = await res.json();
        setModalCard(card);
        setModalEditTitle(card.title || '');
        setModalEditContent(card.content || '');
        setIsModalEditing(false);
        setModalOpen(true);
      } else {
        setModalCard({ title: `卡片 ${cardId}`, content: '卡片不存在或已删除', color: 'blue' });
        setModalEditTitle('');
        setModalEditContent('');
        setIsModalEditing(false);
        setModalOpen(true);
      }
    } catch (e) {
      console.error('加载卡片失败:', e);
      setModalCard({ title: `卡片 ${cardId}`, content: '加载失败: ' + String(e), color: 'red' });
      setModalEditTitle('');
      setModalEditContent('');
      setIsModalEditing(false);
      setModalOpen(true);
    }
  };

  // 保存卡片编辑
  const handleModalSave = async () => {
    if (!modalCard?.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/cards/${modalCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: modalEditTitle,
          content: modalEditContent,
          type: modalCard.card_type || modalCard.type || 'blue',
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setModalCard(updated);
        setIsModalEditing(false);
        // 刷新卡片列表
        loadCards();
      }
    } catch (e) {
      console.error('保存卡片失败:', e);
    }
  };

  // 初始化时加载卡片列表
  useEffect(() => {
    loadCards();
  }, []);

// 计算图谱显示数据（从API响应转换）
const computeDisplayData = (data: any) => {
  // 如果是 suggestions 格式（搜索结果），转换为节点
  if (data.suggestions && !data.nodes) {
    const suggestions = data.suggestions;
    const centerX = 500;
    const centerY = 300;
    const radius = 280;
    const nodes = suggestions.map((s: any, i: number) => {
      const typeList = ['blue', 'green', 'yellow', 'red'];
      const typeIdx = typeList.indexOf(s.card_type || 'blue');
      const angle = (i / Math.max(suggestions.length, 1)) * 2 * Math.PI;
      return {
        id: String(s.card_id),
        name: s.title || `卡片${s.card_id}`,
        category: typeIdx >= 0 ? typeIdx : 0,
        symbolSize: 35,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        score: s.score,
        content: s.content
      };
    });
    return {
      nodes,
      links: [],
      categories: [
        { name: '事实' },
        { name: '解释' },
        { name: '风险' },
        { name: '行动' }
      ]
    };
  }

  // 处理普通图数据（nodes + links）
  const rawNodes = data.nodes || data.entities || [];
  const rawLinks = data.links || data.relations || [];
  const centerX = 500;
  const centerY = 300;
  const radius = 280;
  const totalNodes = rawNodes.length || 1;

  const nodeMap = new Map();
  let nodeIndex = 0;
  rawNodes.forEach((e: any) => {
    const id = String(e.id);
    if (!nodeMap.has(id)) {
      const typeList = ['blue', 'green', 'yellow', 'red'];
      const typeIdx = e.type ? typeList.indexOf(e.type) : -1;
      const angle = (nodeIndex / totalNodes) * 2 * Math.PI;
      nodeMap.set(id, {
        id,
        name: e.title || e.name || `节点${e.id}`,
        category: typeIdx >= 0 ? typeIdx : 0,
        symbolSize: e.is_current ? 50 : 35,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
      nodeIndex++;
    }
  });

  const linkSet = new Set();
  const links = rawLinks.filter((r: any) => {
    const key = `${r.source}-${r.target}`;
    if (linkSet.has(key)) return false;
    linkSet.add(key);
    return true;
  }).map((r: any) => ({
    source: String(r.source),
    target: String(r.target),
    label: r.type
  }));

  return {
    nodes: Array.from(nodeMap.values()),
    links,
    categories: [
      { name: '事实' },
      { name: '解释' },
      { name: '风险' },
      { name: '行动' }
    ]
  };
};

useEffect(() => {
    initChart();
    return () => {
      mountedRef.current = false;
      chartInstance.current?.dispose();
    };
  }, [graphData, apiData]);

  const initChart = () => {
    try {
      if (!chartRef.current) return;

      setIsLoading(true);

      // 销毁旧的 chart 实例
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
      chartInstance.current = echarts.init(chartRef.current);

      // 计算 displayData
      let displayData;
      if (viewMode === 'api' && apiData) {
        displayData = computeDisplayData(apiData);
      } else {
        displayData = graphData;
      }

      // 确保 displayData 结构完整
      if (!displayData || !displayData.nodes || !displayData.nodes.length) {
        displayData = sampleData;
      }

      const option: echarts.EChartsOption = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}'
        },
        legend: {
          data: displayData.categories?.map((c: any) => c.name) || ['事实', '解释', '风险', '行动'],
          top: 10,
        },
        series: [{
          type: 'graph',
          layout: 'force',
          data: displayData.nodes.map((node: any) => ({
            id: node.id,
            name: node.name,
            category: node.category ?? 0,
            symbolSize: node.symbolSize || 30,
            x: node.x,
            y: node.y,
            label: {
              show: true,
              fontSize: 11,
              position: 'bottom',
            },
          })),
          links: displayData.links.map((link: any) => ({
            source: link.source,
            target: link.target,
            lineStyle: {
              width: 2,
              curveness: 0.2
            },
            label: {
              show: true,
              fontSize: 10,
              formatter: link.label || ''
            }
          })),
          categories: displayData.categories?.map((c: any, i: number) => ({ name: c.name || ['事实', '解释', '风险', '行动'][i] })) || [
            { name: '事实' }, { name: '解释' }, { name: '风险' }, { name: '行动' }
          ],
          roam: true,
          draggable: true,
          label: {
            show: true,
            position: 'bottom',
            fontSize: 11,
            formatter: '{b}'
          },
          labelLayout: { hideOverlap: true },
          scaleLimit: { min: 0.3, max: 3 },
          lineStyle: { color: 'source', curveness: 0.3 },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 4 }
          },
          force: {
            repulsion: 5000,
            gravity: 0.03,
            edgeLength: [150, 400],
            layoutAnimation: true,
            alphaDecay: 0.02,
            alphaMin: 0.001
          }
        }],
        animationDuration: 5000,
        animationEasing: 'elasticOut'
      };

      chartInstance.current.setOption(option, true);

      setTimeout(() => {
        if (mountedRef.current && chartInstance.current) {
          chartInstance.current.resize();
        }
      }, 500);

      // 点击选中节点
      if (!mountedRef.current || !chartInstance.current) return;
      chartInstance.current.on('click', (params) => {
        if (params.dataType === 'node') {
          setSelectedNode(params.name as string);
        }
      });

      // 点击查看卡片详情
      chartInstance.current.on('click', async (params) => {
        if (params.dataType === 'node') {
          const nodeId = params.data.id;
          const nodeName = params.data.name;
          
          // 点击节点时选中显示在左侧面板
          setSelectedNode(nodeName);
          
          // api模式从服务端获取卡片详情，sample模式显示提示
          if (nodeId && viewMode === 'api') {
            try {
              const res = await fetch(`${API_BASE}/api/knowledge/cards/${nodeId}`);
              if (res.ok) {
                const card = await res.json();
                setModalCard(card);
                setModalOpen(true);
              } else {
                setModalCard({ title: nodeName || `卡片 ${nodeId}`, content: '卡片不存在或已删除', color: 'blue' });
                setModalOpen(true);
              }
            } catch (e) {
              console.error('加载卡片失败:', e);
              setModalCard({ title: nodeName || `卡片 ${nodeId}`, content: '加载失败: ' + String(e), color: 'red' });
              setModalOpen(true);
            }
          } else if (viewMode === 'sample') {
            // sample模式显示示例节点信息
            setModalCard({ 
              title: nodeName || '示例节点', 
              content: '这是示例数据中的节点。\n\n请使用"API数据"模式搜索主题，系统将根据搜索结果构建知识网络，点击节点可查看真实卡片详情。', 
              color: 'blue' 
            });
            setModalOpen(true);
          }
        }
      });

    } catch (e) {
      console.error('initChart 错误:', e);
      alert('图表渲染错误: ' + String(e));
    } finally {
      setIsLoading(false);
    }
  };


  const handleAddNode = () => {
    // 先加载卡片列表（如果还没有的话）
    if (cards.length === 0) {
      loadCards();
    }
    setShowAddNodeModal(true);
    setAddNodeSearch('');
  };

  // 从卡片列表中选择卡片加入图谱
  const handleSelectCardToAddNode = (card: any) => {
    if (!card || !card.id) return;

    const colorMap: Record<string, number> = { blue: 0, green: 1, yellow: 2, red: 3 };
    const cardType = card.card_type || card.type || 'blue';
    const category = colorMap[cardType] ?? 0;

    const newNodeId = String(card.id);
    const newNode: GraphNode = {
      id: newNodeId,
      name: card.title || `卡片 ${card.id}`,
      category,
      symbolSize: 35
    };

    // 新节点关联到当前选中节点（或默认第一个节点）
    const sourceNode = selectedNode || (graphData.nodes.length > 0 ? String(graphData.nodes[0].id) : null);
    const newLinks: GraphLink[] = sourceNode
      ? [{ source: sourceNode, target: newNodeId, label: '关联' }]
      : [];

    const newGraphData = {
      nodes: [...graphData.nodes, newNode],
      links: [...graphData.links, ...newLinks],
      categories: graphData.categories
    };

    setGraphData(newGraphData);
    setShowAddNodeModal(false);
    setAddNodeSearch('');
    // 持久化到数据库
    saveGraphState(newGraphData);

    // 强制刷新图表
    if (chartInstance.current) {
      chartInstance.current.setOption({
        series: [{
          data: newGraphData.nodes.map((n: any) => ({
            id: n.id, name: n.name, category: n.category ?? 0, symbolSize: n.symbolSize || 30
          })),
          links: newGraphData.links.map((l: any) => ({
            source: l.source, target: l.target,
            lineStyle: { width: 2, curveness: 0.2 },
            label: { show: true, fontSize: 10, formatter: l.label || '' }
          }))
        }]
      });
    }
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;

    const newData = {
      nodes: graphData.nodes.filter(n => String(n.id) !== String(selectedNode) && n.name !== selectedNode),
      links: graphData.links.filter(l => String(l.source) !== String(selectedNode) && String(l.target) !== String(selectedNode)),
      categories: graphData.categories
    };

    setGraphData(newData);
    chartInstance.current?.setOption({
      series: [{
        data: newData.nodes.map(node => ({
          id: node.id,
          name: node.name,
          category: node.category,
          symbolSize: node.symbolSize,
        })),
        links: newData.links,
      }]
    });

    setSelectedNode(null);
    // 持久化到数据库
    saveGraphState(newData);
  };

  const handleZoomIn = () => {
    chartInstance.current?.dispatchAction({
      type: 'zoom',
      scaleFactor: 1.2
    });
  };

  const handleZoomOut = () => {
    chartInstance.current?.dispatchAction({
      type: 'zoom',
      scaleFactor: 0.8
    });
  };

  const handleRefresh = () => {
    initChart();
  };

return (
    <div className="flex h-full">
      <aside className="w-64 p-4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <h2 className="text-lg font-bold flex items-center space-x-2 mb-4">
          <Network className="w-5 h-5" />
          <span>知识图谱</span>
        </h2>
        
        {currentCardId && (
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">当前查看卡片</div>
            <div className="font-medium text-sm text-purple-900 dark:text-purple-200">ID: {currentCardId}</div>
            <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
              {apiData?.nodes?.length || 0} 个关联节点
            </div>
            <button
              onClick={() => window.open(`/?highlightCard=${currentCardId}`, '_blank')}
              className="mt-2 w-full py-1.5 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              在新窗口打开
            </button>
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入主题搜索..."
              className="flex-1 px-3 py-2 text-sm border rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && loadKnowledgeGraph()}
            />
            <button
              onClick={loadKnowledgeGraph}
              disabled={loadingAPI}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loadingAPI ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="flex space-x-1">
            <button
              onClick={() => { setViewMode('sample'); setApiData(null); initChart(); }}
              className={`flex-1 px-2 py-1 text-xs rounded ${viewMode === 'sample' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              示例
            </button>
            <button
              onClick={() => { if(topic.trim()) loadKnowledgeGraph(); }}
              disabled={!topic.trim()}
              className={`flex-1 px-2 py-1 text-xs rounded ${viewMode === 'api' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              API数据
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAddNode}
            disabled={!selectedNode}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>添加节点</span>
          </button>
          
          <button
            onClick={handleDeleteNode}
            disabled={!selectedNode}
            className="w-full flex items-center justify-center space-x-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>删除节点</span>
          </button>

          <button
            onClick={() => onNavigate?.('knowledge-network')}
            className="w-full flex items-center justify-center space-x-2 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600"
          >
            <Network className="w-4 h-4" />
            <span>知识网络</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleZoomIn}
              className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
            >
              <ZoomIn className="w-4 h-4" />
              <span>放大</span>
            </button>
            <button
              onClick={handleZoomOut}
              className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
            >
              <ZoomOut className="w-4 h-4" />
              <span>缩小</span>
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="w-full flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-700 py-2 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>刷新布局</span>
          </button>
        </div>

        <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium mb-2">当前选中</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedNode || '点击节点选择'}
          </p>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2 text-gray-500">操作说明</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 鼠标拖拽移动节点</li>
            <li>• 滚轮缩放视图</li>
            <li>• 点击节点查看详情</li>
            <li>• 双击空白重新布局</li>
          </ul>
        </div>

        {/* 卡片列表 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">卡片列表</h3>
            <button
              onClick={loadCards}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              title="刷新卡片列表"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {cards.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 py-2">暂无卡片</p>
            ) : (
              cards.map((card) => {
                const colorMap: Record<string, string> = {
                  blue: 'bg-blue-500',
                  green: 'bg-green-500',
                  yellow: 'bg-yellow-500',
                  red: 'bg-red-500',
                };
                const typeLabel: Record<string, string> = {
                  blue: '事实',
                  green: '解释',
                  yellow: '风险',
                  red: '行动',
                };
                const type = card.card_type || card.type || 'blue';
                return (
                  <div
                    key={card.id}
                    onClick={() => openCardDetail(card.id)}
                    className="p-2 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded text-white ${colorMap[type] || colorMap.blue}`}>
                        {typeLabel[type] || '事实'}
                      </span>
                      <span className="text-xs text-gray-400">#{card.id}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                      {card.title || '无标题'}
                    </p>
                    {card.content && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {card.content.substring(0, 40)}
                        {card.content.length > 40 ? '...' : ''}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-10">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}
        <div ref={chartRef} className="w-full h-full" />
      </main>

      {/* 卡片详情弹窗 */}
      {modalOpen && modalCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setModalOpen(false); setIsModalEditing(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              {isModalEditing ? (
                <input
                  type="text"
                  value={modalEditTitle}
                  onChange={(e) => setModalEditTitle(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-b border-blue-400 outline-none dark:text-white flex-1 mr-4"
                  placeholder="卡片标题"
                />
              ) : (
                <h3 className="text-lg font-semibold dark:text-white">{modalCard.title || '无标题'}</h3>
              )}
              <div className="flex items-center gap-2">
                {/* 编辑/预览模式切换 */}
                {isModalEditing ? (
                  <button
                    onClick={() => setIsModalEditing(false)}
                    className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> 预览
                  </button>
                ) : (
                  <button
                    onClick={() => setIsModalEditing(true)}
                    className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> 编辑
                  </button>
                )}
                <button onClick={() => { setModalOpen(false); setIsModalEditing(false); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 弹窗内容区 */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* 类型标签 */}
              <div className="mb-3 flex items-center gap-2">
                {isModalEditing ? (
                  <select
                    value={modalCard.card_type || modalCard.type || 'blue'}
                    onChange={(e) => setModalCard({ ...modalCard, card_type: e.target.value })}
                    className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="blue">事实</option>
                    <option value="green">解释</option>
                    <option value="yellow">风险</option>
                    <option value="red">行动</option>
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded text-white ${({ blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500' }[modalCard.card_type || modalCard.type || 'blue'] || 'bg-blue-500')}`}>
                    {{ blue: '事实', green: '解释', yellow: '风险', red: '行动' }[modalCard.card_type || modalCard.type || 'blue'] || '事实'}
                  </span>
                )}
                <span className="text-xs text-gray-400">#{modalCard.id}</span>
              </div>

              {/* 内容区 */}
              {isModalEditing ? (
                <textarea
                  value={modalEditContent}
                  onChange={(e) => setModalEditContent(e.target.value)}
                  className="w-full h-64 p-3 border rounded-lg text-sm font-mono resize-none bg-white dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="输入卡片内容..."
                />
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {modalCard.content || <span className="text-gray-400 italic">暂无内容</span>}
                </div>
              )}

              {/* 地址信息 */}
              {modalCard.address && !isModalEditing && (
                <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                  地址: {modalCard.address}
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="flex justify-between gap-2 p-4 border-t dark:border-gray-700">
              <span className="text-xs text-gray-400 self-center">
                {modalCard.created_at ? `创建: ${new Date(modalCard.created_at).toLocaleString()}` : ''}
                {modalCard.updated_at ? ` | 修改: ${new Date(modalCard.updated_at).toLocaleString()}` : ''}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setModalOpen(false); setIsModalEditing(false); }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                >
                  关闭
                </button>
                {isModalEditing && (
                  <button
                    onClick={handleModalSave}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    保存
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 添加节点 - 卡片选择模态框 */}
      {showAddNodeModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAddNodeModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[75vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold dark:text-white">添加到图谱</h3>
              <button onClick={() => setShowAddNodeModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={addNodeSearch}
                  onChange={e => setAddNodeSearch(e.target.value)}
                  placeholder="搜索卡片标题..."
                  className="w-full pl-9 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {cards.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">暂无卡片，请先创建卡片</p>
              ) : (
                cards
                  .filter(card => {
                    if (!addNodeSearch) return true;
                    const q = addNodeSearch.toLowerCase();
                    const title = (card.title || '').toLowerCase();
                    const content = (card.content || '').toLowerCase();
                    return title.includes(q) || content.includes(q);
                  })
                  .map(card => {
                    const typeMap: Record<string, string> = { blue: '事实', green: '解释', yellow: '风险', red: '行动' };
                    const colorMap: Record<string, string> = {
                      blue: 'bg-blue-500', green: 'bg-green-500',
                      yellow: 'bg-yellow-500', red: 'bg-red-500'
                    };
                    const type = card.card_type || card.type || 'blue';
                    return (
                      <div
                        key={card.id}
                        onClick={() => handleSelectCardToAddNode(card)}
                        className="p-3 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded text-white ${colorMap[type] || colorMap.blue}`}>
                            {typeMap[type] || '事实'}
                          </span>
                          <span className="text-xs text-gray-400">#{card.id}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {card.title || '无标题'}
                        </p>
                        {card.content && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {card.content.substring(0, 60)}{card.content.length > 60 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphView;