// src/components/KnowledgeGraph.tsx
// 知识图谱可视化组件 — 整合双向链接图谱数据源
// 增强功能：节点点击跳转卡片、按专题过滤、链接类型可视化

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, Link2, Network, Filter, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { backlinkService, type BacklinkGraph } from '../services/integrationService';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  category: string;
  size: number;
  importance: number;
  project_id?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  weight: number;
  link_type?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: {
    total_nodes: number;
    total_edges: number;
    node_types: Record<string, number>;
    edge_types: Record<string, number>;
    average_degree: number;
    max_degree_node: {
      id: string;
      degree: number;
    };
    density: number;
  };
}

// 数据源切换类型
type DataSource = 'knowledge' | 'backlinks';

// 链接类型颜色映射
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

const LINK_TYPE_LABELS: Record<string, string> = {
  supports: '支撑',
  contradicts: '对比',
  examples: '举例',
  background: '背景',
  same_project: '同专题',
  manual: '手动关联',
  backlink: '引用',
  forwardlink: '引用了',
};

interface KnowledgeGraphProps {
  focusCardId?: number;
  /** 可选的专题ID过滤 */
  filterProjectId?: number;
  /** 节点点击回调 */
  onNodeClick?: (cardId: number) => void;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ focusCardId, filterProjectId, onNodeClick }) => {
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [backlinkGraphData, setBacklinkGraphData] = useState<BacklinkGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>(focusCardId ? 'backlinks' : 'knowledge');
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<Array<{id: number; name: string; color: string}>>([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(filterProjectId || null);
  const [isFreeDragMode, setIsFreeDragMode] = useState(false);  // 自由拖拽模式

  // 卡片类型颜色映射
  const typeColors = {
    blue: '#ADD8E6',    // 蓝色 - 事实
    green: '#90EE90',   // 绿色 - 解释
    yellow: '#FFFF99',  // 黄色 - 风险
    red: '#FFB6C1'      // 红色 - 行动
  };

  // 加载专题列表用于过滤
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch(getApiBaseUrl() + '/api/research/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.map((p: any) => ({ id: p.id, name: p.name, color: p.color || 'blue' })));
        }
      } catch {}
    };
    loadProjects();
  }, []);

  // 加载知识图谱数据
  const loadKnowledgeGraph = useCallback(async () => {
    setLoading(true);
    try {
      // 如果指定了专题ID，则只加载该专题的卡片
      const projectParam = selectedProjectFilter ? `&project_id=${selectedProjectFilter}` : '';
      const response = await fetch(getApiBaseUrl() + `/api/knowledge/graph?limit=500${projectParam}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setGraphData(data);
      setDataSource('knowledge');
      toast.success('知识图谱加载成功');
    } catch (error) {
      console.error('加载知识图谱失败:', error);
      toast.error('加载知识图谱失败');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectFilter]);

  // 加载双向链接图谱数据
  const loadBacklinkGraph = useCallback(async (cardId?: number) => {
    const id = cardId || focusCardId;
    if (!id) {
      toast.error('请指定卡片ID查看双向链接图谱');
      return;
    }
    setLoading(true);
    try {
      const data = await backlinkService.getGraph(id);
      setBacklinkGraphData(data);
      setDataSource('backlinks');
      toast.success('双向链接图谱加载成功');
    } catch (error) {
      console.error('加载双向链接图谱失败:', error);
      toast.error('加载双向链接图谱失败');
    } finally {
      setLoading(false);
    }
  }, [focusCardId]);

// 初始化图表
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
  }, []);

  // 根据传入的参数加载数据
  useEffect(() => {
    if (focusCardId) {
      loadBacklinkGraph(focusCardId);
    } else {
      // 如果传入了专题ID，使用它加载该专题的图谱
      loadKnowledgeGraph();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [focusCardId, selectedProjectFilter]);

  // 渲染图表
  useEffect(() => {
    if (!chartInstance.current) return;

    if (dataSource === 'knowledge' && graphData) {
      renderKnowledgeGraph();
    } else if (dataSource === 'backlinks' && backlinkGraphData) {
      renderBacklinkGraph();
    }
  }, [graphData, backlinkGraphData, dataSource, selectedProjectFilter, highlightedNodes]);

  // 节点点击事件处理
  useEffect(() => {
    if (!chartInstance.current) return;

    const handleClick = (params: any) => {
      if (params.dataType === 'node') {
        const nodeId = parseInt(params.data.id);
        if (!isNaN(nodeId)) {
          setSelectedNode(nodeId);
          if (onNodeClick) {
            onNodeClick(nodeId);
          } else {
            // 默认行为：跳转到主页并高亮该卡片
            navigate(`/?highlightCard=${nodeId}`);
          }
        }
      }
    };

    chartInstance.current.on('click', handleClick);
    return () => {
      chartInstance.current?.off('click', handleClick);
    };
  }, [onNodeClick, navigate]);

  // 渲染传统知识图谱
  const renderKnowledgeGraph = () => {
    if (!chartInstance.current || !graphData) return;

    // 按专题过滤
    let filteredNodes = graphData.nodes;
    let filteredEdges = graphData.edges;

    if (selectedProjectFilter) {
      filteredNodes = graphData.nodes.filter(node => 
        node.project_id === selectedProjectFilter || !node.project_id
      );
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = graphData.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    }

    const nodes = filteredNodes.map(node => {
      const isHighlighted = highlightedNodes.size === 0 || highlightedNodes.has(node.id);
      return {
        id: node.id,
        name: node.label,
        symbolSize: node.size || 20,
        value: node.importance || 0,
        category: node.type,
        project_id: node.project_id,
        itemStyle: {
          color: typeColors[node.type as keyof typeof typeColors] || '#999',
          opacity: isHighlighted ? 1 : 0.2,
        },
        label: {
          show: true,
          fontSize: 10,
          color: isHighlighted ? '#333' : '#ccc',
        }
      };
    });

    const links = filteredEdges.map(edge => {
      const linkTypeKey = edge.link_type || edge.type || 'manual';
      return {
        source: edge.source,
        target: edge.target,
        label: {
          show: true,
          formatter: LINK_TYPE_LABELS[linkTypeKey] || edge.label,
          fontSize: 8
        },
        lineStyle: {
          width: edge.weight * 2,
          curveness: 0.3,
          color: LINK_TYPE_COLORS[linkTypeKey] || '#999',
          type: linkTypeKey === 'same_project' ? 'dashed' as const : 'solid' as const,
        }
      };
    });

    const option: echarts.EChartsOption = {
      title: {
        text: selectedProjectFilter 
          ? `知识图谱 — ${projects.find(p => p.id === selectedProjectFilter)?.name || '专题过滤'}`
          : '知识图谱',
        subtext: `${filteredNodes.length} 个节点, ${filteredEdges.length} 条边`,
        left: 'center',
        top: 10
      },
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const projName = params.data.project_id 
              ? projects.find(p => p.id === params.data.project_id)?.name || ''
              : '';
            return `<strong>${params.data.name}</strong><br/>类型: ${params.data.category}<br/>重要性: ${(params.data.value * 100).toFixed(1)}%${projName ? `<br/>专题: ${projName}` : ''}<br/><span style="color:#3b82f6">点击查看卡片详情</span>`;
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
            const labels: Record<string, string> = { blue: '[蓝] 事实', green: '[绿] 解释', yellow: '[黄] 风险', red: '[红] 行动' };
            return labels[name] || name;
          }
        }
      ],
      series: [{
        type: 'graph',
        layout: isFreeDragMode ? 'none' : 'force',
        data: nodes,
        links: links,
        categories: [{ name: 'blue' }, { name: 'green' }, { name: 'yellow' }, { name: 'red' }],
        roam: true,
        draggable: true,
        label: { show: true, position: 'right', formatter: '{b}' },
        labelLayout: { hideOverlap: true },
        scaleLimit: { min: 0.2, max: 3 },
        lineStyle: { color: 'source', curveness: 0.3 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
        force: isFreeDragMode ? undefined : {
          repulsion: 800,
          gravity: 0.02,
          edgeLength: [150, 300],
          layoutAnimation: true
        }
      }]
    };

    chartInstance.current.setOption(option, true);
    setupResize();
  };

  // 渲染双向链接图谱
  const renderBacklinkGraph = () => {
    if (!chartInstance.current || !backlinkGraphData) return;

    const nodes = backlinkGraphData.nodes.map(node => {
      const isHighlighted = highlightedNodes.size === 0 || highlightedNodes.has(String(node.id));
      return {
        id: String(node.id),
        name: node.title,
        symbolSize: node.is_current ? 40 : 25,
        category: node.type,
        itemStyle: {
          color: node.is_current ? '#FF6B6B' : (typeColors[node.type as keyof typeof typeColors] || '#999'),
          borderColor: node.is_current ? '#FF0000' : undefined,
          borderWidth: node.is_current ? 3 : 0,
          opacity: isHighlighted ? 1 : 0.3,
        },
        label: {
          show: true,
          fontSize: node.is_current ? 13 : 10,
          fontWeight: node.is_current ? ('bold' as const) : ('normal' as const),
          color: isHighlighted ? '#333' : '#ccc',
        }
      };
    });

    const links = backlinkGraphData.links.map(link => ({
      source: String(link.source),
      target: String(link.target),
      lineStyle: {
        color: LINK_TYPE_COLORS[link.type] || '#6366F1',
        width: 2,
        curveness: 0.2,
        type: 'solid' as const,
      },
      label: {
        show: true,
        formatter: LINK_TYPE_LABELS[link.type] || '链接',
        fontSize: 9,
        color: LINK_TYPE_COLORS[link.type] || '#6366F1',
      }
    }));

    const option: echarts.EChartsOption = {
      title: {
        text: '双向链接图谱',
        subtext: `${backlinkGraphData.nodes.length} 个节点, ${backlinkGraphData.links.length} 条链接`,
        left: 'center',
        top: 10
      },
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const isCurrent = backlinkGraphData.nodes.find(n => String(n.id) === params.data.id)?.is_current;
            return `<strong>${params.data.name}</strong>${isCurrent ? ' (当前卡片)' : ''}<br/>类型: ${params.data.category}<br/><span style="color:#3b82f6">点击查看卡片详情</span>`;
          }
          if (params.dataType === 'edge') {
            return params.data.label?.formatter || '链接';
          }
          return '';
        }
      },
      legend: [
        {
          data: ['反向链接', '正向链接'],
          orient: 'vertical',
          left: 10,
          top: 50,
        }
      ],
      series: [{
        type: 'graph',
        layout: isFreeDragMode ? 'none' : 'force',
        data: nodes,
        links: links,
        roam: true,
        draggable: true,
        label: { show: true, position: 'right', formatter: '{b}' },
        labelLayout: { hideOverlap: true },
        scaleLimit: { min: 0.2, max: 3 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
        force: isFreeDragMode ? undefined : {
          repulsion: 600,
          gravity: 0.03,
          edgeLength: [120, 250],
          layoutAnimation: true
        }
      }]
    };

    chartInstance.current.setOption(option, true);
    setupResize();
  };

  const setupResize = () => {
    const handleResize = () => { chartInstance.current?.resize(); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  };

  // 工具栏操作
  const handleZoomIn = () => {
    chartInstance.current?.dispatchAction({ type: 'graphRoam', zoom: 1.2 });
  };

  const handleZoomOut = () => {
    chartInstance.current?.dispatchAction({ type: 'graphRoam', zoom: 0.8 });
  };

  const handleReset = () => {
    chartInstance.current?.dispatchAction({ type: 'restore' });
  };

  const handleRefresh = () => {
    if (dataSource === 'knowledge') {
      loadKnowledgeGraph();
    } else {
      loadBacklinkGraph();
    }
  };

  // 切换数据源
  const switchDataSource = (source: DataSource) => {
    if (source === dataSource) return;
    if (source === 'backlinks' && !focusCardId) {
      toast.info('请在卡片详情中查看双向链接图谱');
      return;
    }
    setDataSource(source);
    if (source === 'knowledge') {
      loadKnowledgeGraph();
    } else {
      loadBacklinkGraph();
    }
  };

  // 高亮相邻节点
  const handleHighlightAdjacent = () => {
    if (!selectedNode || !graphData) return;
    const adjacent = new Set<string>();
    adjacent.add(String(selectedNode));
    graphData.edges.forEach(e => {
      if (e.source === String(selectedNode)) adjacent.add(e.target);
      if (e.target === String(selectedNode)) adjacent.add(e.source);
    });
    setHighlightedNodes(adjacent);
  };

  // 清除高亮
  const handleClearHighlight = () => {
    setHighlightedNodes(new Set());
    setSelectedNode(null);
  };

  const currentStats = dataSource === 'knowledge' && graphData
    ? { nodes: graphData.statistics.total_nodes, edges: graphData.statistics.total_edges, avgDegree: graphData.statistics.average_degree, density: graphData.statistics.density }
    : backlinkGraphData
      ? { nodes: backlinkGraphData.nodes.length, edges: backlinkGraphData.links.length, avgDegree: backlinkGraphData.links.length > 0 ? (backlinkGraphData.links.length * 2 / backlinkGraphData.nodes.length) : 0, density: 0 }
      : null;

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>
              {dataSource === 'knowledge' ? '知识图谱' : '双向链接图谱'}
            </CardTitle>
            {/* 数据源切换 */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  dataSource === 'knowledge'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
                onClick={() => switchDataSource('knowledge')}
              >
                <Network size={12} className="inline mr-1" />
                知识图谱
              </button>
              <button
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  dataSource === 'backlinks'
                    ? 'bg-white dark:bg-gray-600 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
                onClick={() => switchDataSource('backlinks')}
                title={!focusCardId ? '请从卡片详情进入' : ''}
              >
                <Link2 size={12} className="inline mr-1" />
                双向链接
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {/* 专题过滤 */}
            {dataSource === 'knowledge' && projects.length > 0 && (
              <div className="flex items-center gap-1">
                <Filter size={14} className="text-gray-400" />
                <select
                  className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-200"
                  value={selectedProjectFilter || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedProjectFilter(val);
                  }}
                >
                  <option value="">全部专题</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            {selectedNode && (
              <Button variant="outline" size="sm" onClick={handleHighlightAdjacent} title="高亮相邻节点">
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            {highlightedNodes.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearHighlight} title="清除高亮">
                清除
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              variant={isFreeDragMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsFreeDragMode(!isFreeDragMode)}
              title={isFreeDragMode ? "切换到力导向布局" : "切换到自由拖拽模式"}
            >
              {isFreeDragMode ? "🔒 锁定布局" : "✋ 自由拖拽"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentStats && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">节点数</div>
                <div className="text-lg font-semibold">{currentStats.nodes}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">边数</div>
                <div className="text-lg font-semibold">{currentStats.edges}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">平均度数</div>
                <div className="text-lg font-semibold">{currentStats.avgDegree.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">图密度</div>
                <div className="text-lg font-semibold">{(currentStats.density * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}
        <div className="relative w-full" style={{ height: '600px' }}>
          {/* 加载状态 */}
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-lg">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">正在构建知识网络...</p>
            </div>
          )}
          {/* 空数据状态 */}
          {!loading && !graphData && !backlinkGraphData && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg">
              <Network className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">暂无知识网络数据</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {filterProjectId ? '该专题下暂无卡片关联' : '请先创建卡片，卡片间的链接将自动形成知识网络'}
              </p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 inline mr-1" />
                刷新
              </button>
            </div>
          )}
          <div ref={chartRef} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
};

export default KnowledgeGraph;
