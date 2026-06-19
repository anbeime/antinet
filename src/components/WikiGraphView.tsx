import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  title: string;
  type: string;
  tags: string[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  weight: number;
}

interface WikiGraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (node: GraphNode | null) => void;
}

const nodeColors: Record<string, string> = {
  concept: '#3b82f6',
  entity: '#10b981',
  note: '#f59e0b',
  query: '#8b5cf6',
  comparison: '#ec4899',
  article: '#6366f1',
  default: '#64748b'
};

const WikiGraphView: React.FC<WikiGraphViewProps> = ({ nodes, edges, onNodeClick, onNodeHover }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<'force' | 'radial' | 'hierarchical'>('force');

  const filteredNodes = nodes.filter(node => {
    if (filterType !== 'all' && node.type !== filterType) return false;
    if (filterTag && !node.tags.includes(filterTag)) return false;
    if (searchQuery && !node.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = edges.filter(e => {
    const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
    const targetId = typeof e.target === 'string' ? e.target : e.target.id;
    return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
  });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredNodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#94a3b8');

    if (layout === 'hierarchical') {
      const layerOrder = ['concept', 'entity', 'note', 'query', 'comparison', 'article', 'default'];
      const layerCounts: Record<string, number> = {};
      filteredNodes.forEach(n => {
        const t = layerOrder.includes(n.type) ? n.type : 'default';
        layerCounts[t] = (layerCounts[t] || 0) + 1;
      });
      const posInLayer: Record<string, number> = {};
      Object.keys(layerCounts).forEach(k => { posInLayer[k] = 0; });

      const layerSpacing = height / (layerOrder.length + 1);

      filteredNodes.forEach(n => {
        const t = layerOrder.includes(n.type) ? n.type : 'default';
        const layerIdx = layerOrder.indexOf(t);
        const total = layerCounts[t] || 1;
        const pos = posInLayer[t]++;
        n.x = width / 2 + (pos - (total - 1) / 2) * 80;
        n.y = layerSpacing * (layerIdx + 1);
      });

      g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(filteredEdges)
        .join('line')
        .attr('x1', d => (typeof d.source === 'object' ? (d.source as GraphNode).x! : 0))
        .attr('y1', d => (typeof d.source === 'object' ? (d.source as GraphNode).y! : 0))
        .attr('x2', d => (typeof d.target === 'object' ? (d.target as GraphNode).x! : 0))
        .attr('y2', d => (typeof d.target === 'object' ? (d.target as GraphNode).y! : 0))
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', d => Math.sqrt(d.weight))
        .attr('marker-end', 'url(#arrowhead)');

      const nodeGroup = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(filteredNodes)
        .join('g')
        .attr('cursor', 'pointer')
        .attr('transform', d => `translate(${d.x},${d.y})`);

      nodeGroup.append('circle')
        .attr('r', d => 12 + Math.min(d.title.length / 2, 8))
        .attr('fill', d => nodeColors[d.type] || nodeColors.default)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      nodeGroup.append('text')
        .text(d => d.title.length > 12 ? d.title.substring(0, 12) + '...' : d.title)
        .attr('text-anchor', 'middle')
        .attr('dy', d => 12 + Math.min(d.title.length / 2, 8) + 15)
        .attr('font-size', '11px')
        .attr('fill', '#475569')
        .attr('pointer-events', 'none');

      nodeGroup.on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        onNodeClick?.(d.id);
      });

      nodeGroup.on('mouseenter', (event, d) => {
        onNodeHover?.(d);
        d3.select(event.currentTarget).select('circle')
          .transition().duration(200)
          .attr('r', parseFloat(d3.select(event.currentTarget).select('circle').attr('r')) + 5);
      });

      nodeGroup.on('mouseleave', (event, d) => {
        onNodeHover?.(null);
        d3.select(event.currentTarget).select('circle')
          .transition().duration(200)
          .attr('r', 12 + Math.min(d.title.length / 2, 8));
      });

      svg.on('click', () => setSelectedNode(null));
      return;
    }

    const simulation = d3.forceSimulation<GraphNode>(filteredNodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(filteredEdges)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredEdges)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', d => Math.sqrt(d.weight))
      .attr('marker-end', 'url(#arrowhead)');

    const nodeGroup = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(filteredNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
      .on('start', (event: any, d: GraphNode) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event: any, d: GraphNode) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: any, d: GraphNode) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }) as any);

    nodeGroup.append('circle')
      .attr('r', d => 12 + Math.min(d.title.length / 2, 8))
      .attr('fill', d => nodeColors[d.type] || nodeColors.default)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    nodeGroup.append('text')
      .text(d => d.title.length > 12 ? d.title.substring(0, 12) + '...' : d.title)
      .attr('text-anchor', 'middle')
      .attr('dy', d => 12 + Math.min(d.title.length / 2, 8) + 15)
      .attr('font-size', '11px')
      .attr('fill', '#475569')
      .attr('pointer-events', 'none');

    nodeGroup.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
      onNodeClick?.(d.id);
    });

    nodeGroup.on('mouseenter', (event, d) => {
      onNodeHover?.(d);
      d3.select(event.currentTarget).select('circle')
        .transition()
        .duration(200)
        .attr('r', parseFloat(d3.select(event.currentTarget).select('circle').attr('r')) + 5);
    });

    nodeGroup.on('mouseleave', (event, d) => {
      onNodeHover?.(null);
      d3.select(event.currentTarget).select('circle')
        .transition()
        .duration(200)
        .attr('r', 12 + Math.min(d.title.length / 2, 8));
    });

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    svg.on('click', () => {
      setSelectedNode(null);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredNodes, filteredEdges, layout]);

  const allTags = Array.from(new Set(nodes.flatMap(n => n.tags)));

  const focusNode = useCallback((nodeId: string) => {
    const node = filteredNodes.find(n => n.id === nodeId);
    if (!node || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = Number(svg.attr('width')) || 800;
    const height = Number(svg.attr('height')) || 600;

    svg.transition()
      .duration(750)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomIdentity.translate(width / 2 - (node.x || 0), height / 2 - (node.y || 0)).scale(1.5)
      );

    setSelectedNode(node);
  }, [filteredNodes]);

  return (
    <div className="flex h-full">
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-800 mb-4">图谱控制</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">搜索节点</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="输入节点名称..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">类型过滤</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              <option value="concept">概念</option>
              <option value="entity">实体</option>
              <option value="note">笔记</option>
              <option value="query">问答</option>
              <option value="comparison">对比</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">标签过滤</label>
            <select
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部标签</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">布局</label>
            <div className="flex gap-2">
              {['force', 'radial', 'hierarchical'].map(l => (
                <button
                  key={l}
                  onClick={() => setLayout(l as any)}
                  className={`flex-1 px-2 py-1 text-xs rounded ${layout === l ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  {l === 'force' ? '力导向' : l === 'radial' ? '放射' : '层级'}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              节点: {filteredNodes.length} / {nodes.length}
            </div>
            <div className="text-sm text-gray-500">
              边: {filteredEdges.length} / {edges.length}
            </div>
          </div>
        </div>

      {selectedNode && (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">{selectedNode.title}</h4>
        <div className="text-xs text-gray-500 mb-2">类型: {selectedNode.type}</div>
        <div className="flex flex-wrap gap-1">
          {selectedNode.tags.map(tag => (
            <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <button
          onClick={() => focusNode(selectedNode.id)}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          聚焦此节点
        </button>
      </div>
      )}
      </div>

      <div ref={containerRef} className="flex-1 bg-gray-50 relative">
        <svg ref={svgRef} className="w-full h-full" />

        {filteredNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            暂无节点数据
          </div>
        )}
      </div>
    </div>
  );
};

export default WikiGraphView;