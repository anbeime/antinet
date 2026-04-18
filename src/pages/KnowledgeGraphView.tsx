import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as echarts from 'echarts';
import { 
  Share2, Plus, Trash2, Download, Search, RefreshCw, 
  ZoomIn, ZoomOut, Move, Loader, Eye, Settings,
  Database, GitBranch, Network
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

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

  useEffect(() => {
    initChart();
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  const initChart = () => {
    if (!chartRef.current) return;
    
    setIsLoading(true);
    chartInstance.current = echarts.init(chartRef.current);
    
    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}'
      },
      legend: {
        data: sampleData.categories.map(c => c.name),
        top: 10,
      },
      series: [{
        type: 'graph',
        layout: 'force',
        data: sampleData.nodes.map(node => ({
          id: node.id,
          name: node.name,
          category: node.category,
          symbolSize: node.symbolSize,
          label: {
            show: true,
            fontSize: 12,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 4
            }
          },
          force: {
            repulsion: 200,
            gravity: 0.1,
            edgeLength: 100,
          },
          draggable: true,
          roam: true,
        })),
        links: sampleData.links.map(link => ({
          source: link.source,
          target: link.target,
          label: {
            show: !!link.label,
            formatter: link.label || '',
          }
        })),
        categories: sampleData.categories.map((c, i) => ({
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
            color: '#5470c6'
          }
        },
        label: {
          position: 'right',
          formatter: '{b}',
          fontSize: 12,
        },
      }],
      animationDuration: 1500,
      animationEasing: 'quinticOut',
    };
    
    chartInstance.current.setOption(option);
    
    chartInstance.current.on('click', (params) => {
      if (params.dataType === 'node') {
        setSelectedNode(params.name as string);
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
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Network className="w-5 h-5 mr-2 text-blue-500" />
          知识图谱
        </h2>

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
    </div>
  );
};

export default KnowledgeGraphView;