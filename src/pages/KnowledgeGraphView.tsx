import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as echarts from 'echarts';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  Share2, Plus, Trash2, Download, Search, RefreshCw,
  ZoomIn, ZoomOut, Move, Loader, Eye, Settings,
  Database, GitBranch, Network, X, ExternalLink
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const API_BASE = getApiBaseUrl()

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

const KnowledgeGraphView: React.FC = () => {
  useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
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
  
  // 从URL参数加载指定卡片的链接图谱
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cardId = params.get('card');
    if (cardId) {
      loadCardBacklinks(parseInt(cardId));
    }
  }, []);
  
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
      const response = await fetch(`${API_BASE}/api/knowledge/network/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, limit: 20 })
      });
      const data = await response.json();
      setApiData(data);
      setViewMode('api');
    } catch (e) {
      console.error('Load KG failed:', e);
    } finally {
      setLoadingAPI(false);
    }
  };

  // 数据格式验证和转换
const normalizeData = (data: any): {nodes: any[], links: any[], categories: any[]} => {
  if (!data) return sampleData;
  
  const nodes = data.entities || data.nodes || [];
  const relations = data.relations || data.links || [];
  
  // 如果没有任何数据，返回示例数据
  if (!nodes.length && !relations.length) {
    return sampleData;
  }
  
  // 构建categories
  const categorySet = new Set<string>();
  nodes.forEach((n: any) => {
    if (n.category) categorySet.add(n.category);
  });
  
  const categories = Array.from(categorySet).map(name => ({ name }));
  
  return { nodes, links: relations, categories };
};

useEffect(() => {
    initChart();
    return () => {
      chartInstance.current?.dispose();
    };
  }, [graphData, apiData]);

  const initChart = () => {
    if (!chartRef.current) return;
    
    setIsLoading(true);
    chartInstance.current = echarts.init(chartRef.current);
    
const displayData = viewMode === 'api' && apiData ? (() => {
      const rawNodes = apiData.nodes || apiData.entities || [];
      const rawLinks = apiData.links || apiData.relations || [];
      
      // 计算圆形分布的初始位置
      const centerX = 500;
      const centerY = 300;
      const radius = 280;
      const totalNodes = rawNodes.length || 1;
      
      // 去重节点并分配初始位置
      let nodeIndex = 0;
      const nodeMap = new Map();
      rawNodes.forEach((e: any) => {
        const id = String(e.id);
        if (!nodeMap.has(id)) {
          const typeList = ['blue', 'green', 'yellow', 'red'];
          const typeIdx = e.type ? typeList.indexOf(e.type) : -1;
          // 圆形分布初始位置
          const angle = (nodeIndex / totalNodes) * 2 * Math.PI;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          nodeMap.set(id, {
            id,
            name: e.title || e.name || `节点${e.id}`,
            category: typeIdx >= 0 ? typeIdx : 0,
            symbolSize: e.is_current ? 50 : 35,
            x,
            y
          });
          nodeIndex++;
        }
      });
      
      // 去重链接
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
    })() : graphData;
    
    if (!displayData.nodes?.length) {
      displayData.nodes = sampleData.nodes;
      displayData.links = sampleData.links;
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
      links: displayData.links.map((link: any) => ({
        source: link.source,
        target: link.target,
        lineStyle: {
          width: 2,
          curveness: 0.2
        },
        label: {
          show: true,
          formatter: link.label === 'backlink' ? '←引用' : link.label === 'forwardlink' ? '引用→' : link.label,
          fontSize: 10,
          color: '#666'
        }
      })),
      categories: displayData.categories.map((c: any, i: number) => ({
        name: c.name,
        itemStyle: {
          color: categoryColors[i % categoryColors.length]
        }
      })),
      lineStyle: {
        color: 'source',
        curveness: 0.1,
        width: 2,
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 4,
          color: '#54c6'
        }
      },
      animationDuration: 5000,
      animationEasing: 'elasticOut'
    };
    
    chartInstance.current.setOption(option, true);
    
    setTimeout(() => {
      chartInstance.current?.resize();
    }, 500);
    
    chartInstance.current.on('click', (params) => {
      if (params.dataType === 'node') {
        setSelectedNode(params.name as string);
      }
    });
    
    // 双击查看节点对应的卡片详情
    chartInstance.current.on('dblclick', async (params) => {
      if (params.dataType === 'node') {
        const nodeId = params.data.id;
        if (nodeId && viewMode === 'api') {
          try {
            const res = await fetch(`${API_BASE}/api/knowledge/cards/${nodeId}`);
            if (res.ok) {
              const card = await res.json();
              setModalCard(card);
              setModalOpen(true);
            } else {
              const graphRes = await fetch(`${API_BASE}/api/backlinks/card/${nodeId}`);
              if (graphRes.ok) {
                const graphData = await graphRes.json();
                setModalCard({
                  title: graphData.nodes?.[0]?.title || `卡片 ${nodeId}`,
                  content: `关联节点: ${graphData.nodes?.length || 0} 个\n链接: ${graphData.links?.length || 0} 条`,
                  color: graphData.nodes?.[0]?.type || 'blue'
                });
                setModalOpen(true);
              }
            }
          } catch (e) {
            console.error('加载卡片失败:', e);
          }
        }
      }
    });
    
    setIsLoading(false);
  };

  const handleAddNode = () => {
    const newId = String(sampleData.nodes.length + 1);
    const newNode: GraphNode = {
      id: newId,
      name: `新节点${newId}`,
      category: 0,
      symbolSize: 25
    };
    
    const newLink = {
      source: selectedNode || '1',
      target: newId,
      label: '关联'
    };
    
    sampleData.nodes.push(newNode);
    sampleData.links.push(newLink);
    
    chartInstance.current?.setOption({
      series: [{
        data: sampleData.nodes.map(node => ({
          id: node.id,
          name: node.name,
          category: node.category,
          symbolSize: node.symbolSize,
        })),
        links: sampleData.links,
      }]
    });
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    
    sampleData.nodes = sampleData.nodes.filter(n => n.id !== selectedNode && n.name !== selectedNode);
    sampleData.links = sampleData.links.filter(l => l.source !== selectedNode && l.target !== selectedNode);
    
    chartInstance.current?.setOption({
      series: [{
        data: sampleData.nodes.map(node => ({
          id: node.id,
          name: node.name,
          category: node.category,
          symbolSize: node.symbolSize,
        })),
        links: sampleData.links,
      }]
    });
    
    setSelectedNode(null);
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold">{modalCard.title}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-500 mb-2">类型: {modalCard.color || modalCard.type || 'blue'}</div>
              <div className="prose dark:prose-invert max-w-none">{modalCard.content}</div>
              {modalCard.address && (
                <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                  地址: {modalCard.address}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphView;