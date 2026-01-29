// src/components/KnowledgeGraph.tsx
// 知识图谱可视化组件

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  category: string;
  size: number;
  importance: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  weight: number;
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

const KnowledgeGraph: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);

  // 卡片类型颜色映射
  const typeColors = {
    blue: '#ADD8E6',    // 蓝色 - 事实
    green: '#90EE90',   // 绿色 - 解释
    yellow: '#FFFF99',  // 黄色 - 风险
    red: '#FFB6C1'      // 红色 - 行动
  };

  // 加载知识图谱数据
  const loadGraphData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/knowledge/graph');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGraphData(data);
      toast.success('知识图谱加载成功');
    } catch (error) {
      console.error('加载知识图谱失败:', error);
      toast.error('加载知识图谱失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化图表
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 加载数据
    loadGraphData();

    // 清理
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // 渲染图表
  useEffect(() => {
    if (!chartInstance.current || !graphData) return;

    // 转换节点数据
    const nodes = graphData.nodes.map(node => ({
      id: node.id,
      name: node.label,
      symbolSize: node.size || 20,
      value: node.importance || 0,
      category: node.type,
      itemStyle: {
        color: typeColors[node.type as keyof typeof typeColors] || '#999'
      },
      label: {
        show: true,
        fontSize: 10
      }
    }));

    // 转换边数据
    const links = graphData.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      label: {
        show: true,
        formatter: edge.label,
        fontSize: 8
      },
      lineStyle: {
        width: edge.weight * 2,
        curveness: 0.3
      }
    }));

    // 图表配置
    const option: echarts.EChartsOption = {
      title: {
        text: '知识图谱',
        subtext: `${graphData.statistics.total_nodes} 个节点, ${graphData.statistics.total_edges} 条边`,
        left: 'center',
        top: 10
      },
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `
              <strong>${params.data.name}</strong><br/>
              类型: ${params.data.category}<br/>
              重要性: ${(params.data.value * 100).toFixed(1)}%
            `;
          } else {
            return params.data.label.formatter;
          }
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
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: nodes,
          links: links,
          categories: [
            { name: 'blue' },
            { name: 'green' },
            { name: 'yellow' },
            { name: 'red' }
          ],
          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}'
          },
          labelLayout: {
            hideOverlap: true
          },
          scaleLimit: {
            min: 0.4,
            max: 2
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 4
            }
          },
          force: {
            repulsion: 100,
            gravity: 0.1,
            edgeLength: [50, 150],
            layoutAnimation: true
          }
        }
      ]
    };

    chartInstance.current.setOption(option);

    // 响应式
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [graphData]);

  // 工具栏操作
  const handleZoomIn = () => {
    chartInstance.current?.dispatchAction({
      type: 'graphRoam',
      zoom: 1.2
    });
  };

  const handleZoomOut = () => {
    chartInstance.current?.dispatchAction({
      type: 'graphRoam',
      zoom: 0.8
    });
  };

  const handleReset = () => {
    chartInstance.current?.dispatchAction({
      type: 'restore'
    });
  };

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>知识图谱</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadGraphData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
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
        {graphData && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">节点数</div>
                <div className="text-lg font-semibold">{graphData.statistics.total_nodes}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">边数</div>
                <div className="text-lg font-semibold">{graphData.statistics.total_edges}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">平均度数</div>
                <div className="text-lg font-semibold">
                  {graphData.statistics.average_degree.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">图密度</div>
                <div className="text-lg font-semibold">
                  {(graphData.statistics.density * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
        <div
          ref={chartRef}
          className="w-full"
          style={{ height: '600px' }}
        />
      </CardContent>
    </Card>
  );
};

export default KnowledgeGraph;
