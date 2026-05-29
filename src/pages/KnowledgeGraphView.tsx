import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import MindMap from './MindMap';
import { motion, AnimatePresence } from 'framer-motion';
import * as echarts from 'echarts';
import ReactMarkdown from 'react-markdown';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  Share2, Plus, Trash2, Download, Search, RefreshCw,
  ZoomIn, ZoomOut, Move, Loader, Eye, Settings,
  Database, GitBranch, Network, X, ExternalLink, Edit3, List, FileText
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
  const mountedRef = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{nodes: GraphNode[], links: GraphLink[], categories: GraphCategory[]}>(sampleData);
  const [apiData, setApiData] = useState<{entities: any[], relations: any[]} | null>(null);
  const [graphSource, setGraphSource] = useState<'sample' | 'api'>('sample');
  const [pageMode, setPageMode] = useState<'graph' | 'list' | 'mindmap'>('graph');  // 图谱/列表/思维导图 切换
  const [listSearch, setListSearch] = useState('');
  const [listColorFilter, setListColorFilter] = useState<string>('all');
  const [listLoading, setListLoading] = useState(false);
  const [listSelectedCard, setListSelectedCard] = useState<any>(null);
  const [listMarkdown, setListMarkdown] = useState('');
  const [listEditorSide, setListEditorSide] = useState<'edit' | 'preview' | 'split'>('preview');
  const [listCardNetwork, setListCardNetwork] = useState<{nodes: any[], links: any[]}>({nodes: [], links: []});
  const [exportTheme, setExportTheme] = useState('chinese-red');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
  const [pdfPreviewError, setPdfPreviewError] = useState('');
  const [pdfMaximized, setPdfMaximized] = useState(false);
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




  // 计算图谱显示数据（从API响应转换），与图谱图表共用
  const computeDisplayData = (data: any) => {
    // 如果是 suggestions 格式（搜索结果），转换为节点
    if (data.suggestions && !data.nodes) {
      const suggestions = data.suggestions;
      const nodes = suggestions.map((s: any, i: number) => {
        const typeList = ['blue', 'green', 'yellow', 'red'];
        const typeIdx = typeList.indexOf(s.card_type || 'blue');
        const angle = (i / Math.max(suggestions.length, 1)) * 2 * Math.PI;
        return {
          id: String(s.card_id),
          name: s.title || `卡片${s.card_id}`,
          category: typeIdx >= 0 ? typeIdx : 0,
          symbolSize: 35,
          x: 500 + 280 * Math.cos(angle),
          y: 300 + 280 * Math.sin(angle),
          score: s.score,
          content: s.content
        };
      });
      return { nodes, links: [], categories: [{ name: '事实' }, { name: '解释' }, { name: '风险' }, { name: '行动' }] };
    }
    // 处理普通图数据（nodes + links）
    const rawNodes = data.nodes || data.entities || [];
    const rawLinks = data.links || data.relations || [];
    const nodeMap = new Map();
    let nodeIndex = 0;
    rawNodes.forEach((e: any) => {
      const id = String(e.id);
      if (!nodeMap.has(id)) {
        const typeList = ['blue', 'green', 'yellow', 'red'];
        const typeIdx = e.type ? typeList.indexOf(e.type) : -1;
        const angle = (nodeIndex / Math.max(rawNodes.length, 1)) * 2 * Math.PI;
        nodeMap.set(id, {
          id,
          name: e.title || e.name || `节点${e.id}`,
          category: typeIdx >= 0 ? typeIdx : 0,
          symbolSize: e.is_current ? 50 : 35,
          x: 500 + 280 * Math.cos(angle),
          y: 300 + 280 * Math.sin(angle)
        });
        nodeIndex++;
      }
    });
    const linkSet = new Set();
    const links = rawLinks.filter((r: any) => { const key = `${r.source}-${r.target}`; if (linkSet.has(key)) return false; linkSet.add(key); return true; })
      .map((r: any) => ({ source: String(r.source), target: String(r.target), label: r.type }));
    return { nodes: Array.from(nodeMap.values()), links, categories: [{ name: '事实' }, { name: '解释' }, { name: '风险' }, { name: '行动' }] };
  };

  // 列表数据源：有 currentCardId 时与图谱/导图保持一致
  const listDataSource = useMemo(() => {
    if (currentCardId && apiData) {
      const graphNodes = apiData.nodes || apiData.entities || [];
      if (graphNodes.length === 0) return cards;
      const graphIds = new Set(graphNodes.map((n: any) => String(n.id)));
      // 优先从 cards 中匹配（保持完整卡片数据）
      const matched = cards.filter((c: any) => graphIds.has(String(c.id)));
      if (matched.length > 0) return matched;
      // 如果 ID 不匹配，从图谱节点直接派生卡片对象
      return graphNodes.map((n: any) => ({
        id: n.id,
        title: n.title || n.name || `节点${n.id}`,
        content: n.content || n.description || '',
        card_type: n.type || n.card_type || 'blue',
        type: n.type || n.card_type || 'blue',
      }));
    }
    return cards;
  }, [cards, currentCardId, apiData]);

  // 从图谱数据构建思维导图树（与图谱/列表共享同一数据源）
  const mindmapTree = useMemo(() => {
    const displayData = graphSource === 'api' && apiData
      ? computeDisplayData(apiData)
      : graphData;
    const nodes = displayData.nodes || [];
    const links = displayData.links || [];
    if (!nodes.length) return null;

    const categoryColors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444'];
    const hasIncoming = new Set(links.map((l: any) => String(l.target)));
    let roots = nodes.filter((n: any) => !hasIncoming.has(String(n.id)));
    if (!roots.length && nodes.length > 0) roots = [nodes[0]];

    const buildTree = (node: any, visited = new Set<string>()): any => {
      if (visited.has(String(node.id))) return {
        id: String(node.id), text: node.name, children: [],
        collapsed: false, color: categoryColors[node.category || 0]
      };
      const newVisited = new Set(visited);
      newVisited.add(String(node.id));
      const children = links
        .filter((l: any) => String(l.source) === String(node.id))
        .map((l: any) => nodes.find((n: any) => String(n.id) === String(l.target)))
        .filter(Boolean)
        .map((child: any) => buildTree(child, newVisited));
      return {
        id: String(node.id),
        text: node.name,
        children,
        collapsed: false,
        color: categoryColors[node.category || 0]
      };
    };

    if (roots.length === 1) return buildTree(roots[0]);
    // 多个根节点：创建虚拟根节点包裹
    return {
      id: 'virtual-root',
      text: '知识图谱',
      children: roots.map((r: any) => buildTree(r)),
      collapsed: false,
      color: '#8b5cf6'
    };
  }, [graphData, apiData, graphSource]);

  
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
  
  // ========== 带超时的 fetch（后端不可用时快速降级） ==========
  const fetchWithTimeout = useCallback(async (url: string, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const loadCardBacklinks = async (cardId: number) => {
    setCurrentCardId(cardId);
    setLoadingAPI(true);
    try {
      // 从后端获取卡片的 backlinks 图谱
      const response = await fetchWithTimeout(`${API_BASE}/api/backlinks/card/${cardId}/graph`);
      if (response.ok) {
        const data = await response.json();
 setApiData(data);
 setGraphSource('api');
 // 不覆盖 cards 列表 —— 保持全部卡片供搜索用
 // 图谱数据通过 apiData + graphSource='api' 单独管理
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
      const response = await fetchWithTimeout(`${API_BASE}/api/knowledge/network/suggest?topic=${encodeURIComponent(topic)}&limit=20`);
      if (!response.ok) throw new Error('API error: ' + response.status);
      const data = await response.json();
      console.log('[Search] API返回:', data);
      // 先设置数据，再切换模式，避免竞态
 setApiData(data);
 setGraphSource('api');
 // 不覆盖 cards 列表 —— 保持全部卡片供搜索用
 // 图谱搜索结果通过 apiData + graphSource='api' 单独管理
    } catch (e) {
      console.error('Load KG failed:', e);
      alert('搜索失败: ' + e.message);
    } finally {
      setLoadingAPI(false);
    }
  };

  // 加载所有卡片列表
  const loadCards = async () => {
    setListLoading(true);
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/knowledge/cards?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        setCards(data.cards || []);
      }
    } catch (e) {
      console.error('加载卡片列表失败:', e);
    } finally {
      setListLoading(false);
    }
  };

  // ========== 列表模式 - 加载卡片详情 ==========
  const loadCardForList = async (cardId: number) => {
    try {
      const cardRes = await fetchWithTimeout(`${API_BASE}/api/knowledge/cards/${cardId}`);
      if (!cardRes.ok) throw new Error('加载卡片失败');
      const card = await cardRes.json();
      setListSelectedCard(card);
      setListMarkdown(`# ${card.title || '无标题'}\n\n${card.content || ''}`);
      setListEditorSide('preview');

      // 并行加载知识网络
      fetchWithTimeout(`${API_BASE}/api/backlinks/card/${cardId}/graph?max_depth=1`)
        .then(async (netRes) => {
          if (netRes.ok) {
            const netData = await netRes.json();
            setListCardNetwork({ nodes: netData.nodes || [], links: netData.links || [] });
          }
        })
        .catch(() => setListCardNetwork({ nodes: [], links: [] }));
    } catch (e) {
      console.error('加载卡片详情失败:', e);
    }
  };

  const handleListSave = async () => {
    if (!listSelectedCard?.id) return;
    // 从 markdown 提取标题和内容
    const lines = listMarkdown.split('\n');
    const title = lines[0]?.startsWith('# ') ? lines[0].slice(2).trim() : (listSelectedCard.title || '无标题');
    const content = lines[0]?.startsWith('# ') ? lines.slice(2).join('\n') : listMarkdown;
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/cards/${listSelectedCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type: listSelectedCard.card_type || listSelectedCard.type || 'blue' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setListSelectedCard(updated);
        setListMarkdown(`# ${updated.title || title}\n\n${updated.content || content}`);
        setListEditorSide('preview');
        loadCards(); // 刷新列表
      }
    } catch (e) {
      console.error('保存失败:', e);
    }
  };

  // 预览卡片（PDF/HTML 新标签，DOCX 转 HTML 弹窗）
  const handlePreviewCard = async (format: 'pdf' | 'docx' | 'html') => {
    if (!listMarkdown) return;
    try {
      if (format === 'pdf') {
        const formData = new FormData();
        const blob = new Blob([listMarkdown], { type: 'text/markdown' });
        formData.append('file', blob, 'card.md');
        formData.append('title', listSelectedCard?.title || '知识卡片');
        formData.append('author', 'Antinet');
        formData.append('theme', exportTheme);
        const res = await fetch(`${API_BASE}/api/md2pdf/convert`, {
          method: 'POST', body: formData,
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '导出失败'); }
        const pdfBlob = await res.blob();
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewError('');
        setPdfPreviewUrl(URL.createObjectURL(pdfBlob));
        setPdfPreviewTitle(listSelectedCard?.title || 'PDF 预览');
        setShowPdfPreview(true);
        return;
      }

      const formData = new FormData();
      const blob = new Blob([listMarkdown], { type: 'text/markdown' });
      formData.append('file', blob, 'card.md');
      const res = await fetch(`${API_BASE}/api/markdown-converter/convert/file?output_format=${format}&theme=${exportTheme}`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '导出失败'); }

      if (format === 'html') {
        const html = await res.text();
        setPreviewTitle(listSelectedCard?.title || 'HTML 预览');
        setPreviewHtml(html);
        setShowPreview(true);
      } else {
        // DOCX: 用 mammoth 转 HTML 预览
        const arrayBuffer = await res.arrayBuffer();
        if (typeof (window as any).mammoth === 'undefined') {
          const script = document.createElement('script');
          script.src = '/mammoth.min.js';
          await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
        }
        const result = await (window as any).mammoth.convertToHtml({ arrayBuffer });
        setPreviewTitle(listSelectedCard?.title || 'DOCX 预览');
        setPreviewHtml(result.value);
        setShowPreview(true);
      }
    } catch (e: any) {
      if (format === "pdf") { setPdfPreviewError(e.message || "预览失败"); setShowPdfPreview(true); } else { console.error("预览失败:", e); }
    }
  };

  // 下载卡片（仅 DOCX/HTML，PDF 通过预览后自行下载）
  const handleDownloadCard = async (format: 'docx' | 'html') => {
    if (!listMarkdown) return;
    const extMap = { docx: '.docx', html: '.html' };
    try {
      const formData = new FormData();
      const blob = new Blob([listMarkdown], { type: 'text/markdown' });
      formData.append('file', blob, 'card.md');
      const res = await fetch(`${API_BASE}/api/markdown-converter/convert/file?output_format=${format}&theme=${exportTheme}`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '导出失败'); }
      const outBlob = await res.blob();
      const url = window.URL.createObjectURL(outBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `card_${listSelectedCard?.id || 'export'}${extMap[format]}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('下载失败:', e);
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

 // 初始化时加载卡片列表（始终加载全部卡片，确保搜索可用）
 useEffect(() => {
 loadCards();
 }, []);



useEffect(() => {
    // 重置挂载标志
    mountedRef.current = true;
    // 切换到图谱模式时重新初始化图表
    if (pageMode === 'graph') {
      // 延迟确保DOM已渲染
      const timer = setTimeout(() => initChart(), 100);
      return () => clearTimeout(timer);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [graphData, apiData, pageMode]);

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
      if (graphSource === 'api' && apiData) {
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
              triggerEvent: true, // 让点击标签文字也能触发事件
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


      // 节点点击/双击的通用处理逻辑（提取为函数避免重复）
      const handleNodeClick = async (params: any) => {
        const isNodeClick =
          params.dataType === 'node' ||
          (params.seriesType === 'graph' && params.data != null);

        if (!isNodeClick) return;

        const nodeId = params.data?.id || params.value?.id;
        const nodeName = params.data?.name || params.name || '';

        // 选中节点，左侧面板同步高亮
        setSelectedNode(nodeName);

        // api模式从服务端获取卡片详情，sample模式显示提示
        if (nodeId && graphSource === 'api') {
          openCardDetail(nodeId);
        } else if (graphSource === 'sample') {
          setModalCard({
            title: nodeName || '示例节点',
            content: '这是示例数据中的节点。\n\n请使用"API数据"模式搜索主题，系统将根据搜索结果构建知识网络，点击节点可查看真实卡片详情。',
            color: 'blue'
          });
          setIsModalEditing(false);
          setModalEditTitle('');
          setModalEditContent('');
          setModalOpen(true);
        }
      };

      // 单击事件（部分情况下可能被拖拽行为吞掉）
      chartInstance.current.on('click', handleNodeClick);

      // 双击事件作为备用（确保一定能弹出）
      chartInstance.current.on('dblclick', handleNodeClick);

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <Network className="w-5 h-5" />
            <span>知识图谱工作台</span>
          </h2>
        </div>


{/* 图谱 / 列表 / 思维导图 切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setPageMode('graph')}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${pageMode === 'graph' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}
          >
            <Network className="w-4 h-4" />
            <span>图谱</span>
          </button>
          <button
            onClick={() => { setPageMode('list'); loadCards(); }}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${pageMode === 'list' ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}
          >
            <List className="w-4 h-4" />
            <span>列表</span>
          </button>
          <button
            onClick={() => { setPageMode('mindmap'); if (cards.length === 0) loadCards(); }}
            className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${pageMode === 'mindmap' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/30'}`}
          >
            <GitBranch className="w-4 h-4" />
            <span>导图</span>
          </button>
        </div>
        
        {currentCardId && (
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">当前查看卡片</div>
            <div className="font-medium text-sm text-purple-900 dark:text-purple-200">ID: {currentCardId}</div>
            <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
              {apiData?.nodes?.length || 0} 个关联节点
            </div>
          </div>
        )}

        <div className="space-y-3 mb-4">

          
          <div className="flex space-x-1">
          <button
            onClick={() => { setGraphSource('sample'); setApiData(null); setCards([]); loadCards(); initChart(); }}
            className={`flex-1 px-2 py-1 text-xs rounded ${graphSource === 'sample' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            示例
          </button>
            <button
              onClick={() => { if(topic.trim()) loadKnowledgeGraph(); }}
              disabled={!topic.trim()}
              className={`flex-1 px-2 py-1 text-xs rounded ${graphSource === 'api' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
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

      {pageMode === 'list' ? (
        /* ========== 卡片列表 - 双栏布局（仿工作台） ========== */
        <>
          {/* 左栏：卡片列表 */}
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold dark:text-white flex items-center gap-1.5">
                  <List className="w-4 h-4" /> 卡片列表
                </h2>
                <button onClick={loadCards} disabled={listLoading}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input id="list-search" name="listSearch" type="text" placeholder="搜索卡片..."
                  value={listSearch} onChange={e => setListSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div className="flex gap-1">
                {(['all','blue','green','yellow','red'] as const).map(k => {
                  const labels: Record<string,string> = { all:'全部', blue:'事实', green:'解释', yellow:'风险', red:'行动' };
                  const clrs: Record<string,string> = { all:'bg-gray-500', blue:'bg-blue-500', green:'bg-green-500', yellow:'bg-yellow-500', red:'bg-red-500' };
                  const active = listColorFilter === k;
                  return <button key={k} onClick={() => setListColorFilter(k)}
                    className={`flex-1 px-2 py-1 text-xs rounded ${active ? clrs[k]+' text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>{labels[k]}</button>;
                })}
              </div>
            </div>

            {/* 卡片条目 */}
            <div className="flex-1 overflow-y-auto">
              {listLoading ? (
                <div className="flex items-center justify-center h-32"><Loader className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : (() => {
                const clrMap: Record<string,string> = { blue:'bg-blue-500', green:'bg-green-500', yellow:'bg-yellow-500', red:'bg-red-500' };
                const clrLight: Record<string,string> = { blue:'bg-blue-50 dark:bg-blue-900/20', green:'bg-green-50 dark:bg-green-900/20', yellow:'bg-yellow-50 dark:bg-yellow-900/20', red:'bg-red-50 dark:bg-red-900/20' };
                const lbl: Record<string,string> = { blue:'事实', green:'解释', yellow:'风险', red:'行动' };
                const filtered = listDataSource.filter((card: any) => {
                  const t = card.card_type || card.type || 'blue';
                  if (listColorFilter !== 'all' && t !== listColorFilter) return false;
                  if (listSearch) {
                    const getContentText = (c: any): string => {
                      if (!c) return '';
                      if (typeof c === 'string') return c;
                      if (typeof c === 'object') return c.description || c.text || JSON.stringify(c);
                      return String(c);
                    };
                    const q = listSearch.toLowerCase();
                    const ti = (card.title||'').toLowerCase();
                    const co = getContentText(card.content).toLowerCase();
                    if (!ti.includes(q) && !co.includes(q)) return false;
                  }
                  return true;
                });
                if (filtered.length === 0) return <div className="text-center text-gray-400 text-sm py-8">{listDataSource.length===0?(graphSource === 'api'?'暂无关联卡片':'暂无卡片，请刷新'):'无匹配卡片'}</div>;
                return filtered.map((card: any) => {
                  const t = card.card_type || card.type || 'blue';
                  const isSel = listSelectedCard?.id === card.id;
                  return (
                    <motion.div key={card.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                      onClick={() => loadCardForList(card.id)}
                      className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 ${isSel ? clrLight[t] : ''}`}>
                      <div className="p-3" style={isSel ? { borderLeft: `3px solid ${t==='blue'?'#3b82f6':t==='green'?'#22c55e':t==='yellow'?'#eab308':'#ef4444'}` } : undefined}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded text-white ${clrMap[t]}`}>{lbl[t]}</span>
                          <span className="text-xs text-gray-400">#{card.id}</span>
                        </div>
                        <h3 className="font-medium text-sm truncate dark:text-white">{card.title||'无标题'}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{card.content?.substring(0,80)||'无内容'}{card.content?.length>80?'...':''}</p>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </div>

          {/* 右栏：卡片详情 + 编辑/预览 */}
          {listSelectedCard ? (
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
              {/* 头部 */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded text-white ${(()=>{const t=listSelectedCard.card_type||'blue'; return {blue:'bg-blue-500',green:'bg-green-500',yellow:'bg-yellow-500',red:'bg-red-500'}[t];})()}`}>
                    {{blue:'事实',green:'解释',yellow:'风险',red:'行动'}[listSelectedCard.card_type||'blue']}</span>
                  <h2 className="font-semibold text-base truncate dark:text-white">{listSelectedCard.title||'无标题'}</h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* 编辑/预览/分屏切换 */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                    {(['edit','preview','split'] as const).map(s => (
                      <button key={s} onClick={() => { setListEditorSide(s); if(s==='edit'){setListMarkdown(`# ${listSelectedCard.title||'无标题'}\n\n${listSelectedCard.content||''}`);} }}
                        className={`px-2.5 py-1 text-xs rounded-md ${listEditorSide===s?'bg-white dark:bg-gray-600 shadow-sm font-medium':'text-gray-500'}`}>
                        {s==='edit'?'编辑':s==='preview'?'预览':'分屏'}
                      </button>
                    ))}
                  </div>
                  {/* 预览/导出按钮 */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 relative">
<button onClick={() => handlePreviewCard('pdf')}
                      className="px-2 py-1 text-xs rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
                      <Eye className="w-3 h-3" />PDF
                    </button>
                    <button onClick={() => handlePreviewCard('docx')}
                      className="px-2 py-1 text-xs rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
                      <Eye className="w-3 h-3" />DOCX
                    </button>
                    <button onClick={() => handlePreviewCard('html')}
                      className="px-2 py-1 text-xs rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
                      <Eye className="w-3 h-3" />HTML
                    </button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-500 mx-0.5 self-center" />
                    <button onClick={() => handleDownloadCard('docx')}
                      className="px-2 py-1 text-xs rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
                      <Download className="w-3 h-3" />DOCX
                    </button>
                    <button onClick={() => handleDownloadCard('html')}
                      className="px-2 py-1 text-xs rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1">
                      <Download className="w-3 h-3" />HTML
                    </button>
                  </div>
                  <button onClick={() => setListSelectedCard(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X className="w-4 h-4" /></button>
                </div>
              </div>

              {/* 编辑区 */}
              <div className="flex-1 flex overflow-hidden min-h-0">
                {(listEditorSide==='edit'||listEditorSide==='split') && (
                  <div className={`flex flex-col ${listEditorSide==='split'?'w-1/2 border-r border-gray-200 dark:border-gray-700':'flex-1'}`}>
                    <textarea
                      id="list-markdown-editor"
                      name="listMarkdown"
                      value={listMarkdown}
                      onChange={e => setListMarkdown(e.target.value)}
                      onBlur={() => { if(listSelectedCard){ const m = listMarkdown; const lines = m.split('\n'); const title = lines[0]?.startsWith('# ')?lines[0].slice(2).trim():listSelectedCard.title; const content = lines[0]?.startsWith('# ')?lines.slice(2).join('\n'):m; setListSelectedCard({...listSelectedCard, title, content}); }}}
                      className="flex-1 p-4 resize-none bg-white dark:bg-gray-900 text-sm font-mono outline-none"
                      placeholder="# 标题\n\n内容，支持 Markdown..." />
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                      <button onClick={()=>{setListEditorSide('preview');}} className="px-3 py-1 text-xs border rounded-lg dark:border-gray-600">取消</button>
                      <button onClick={handleListSave} className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">保存</button>
                    </div>
                  </div>
                )}
                {(listEditorSide==='preview'||listEditorSide==='split') && (
                  <div className={`flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 ${listEditorSide==='split'?'w-1/2':''}`}>
                    {listMarkdown ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{listMarkdown}</ReactMarkdown>
                      </div>
                    ) : <p className="text-gray-400 text-sm">无内容</p>}
                  </div>
                )}
              </div>

              {/* 知识网络缩略（有数据时展示） */}
              {listCardNetwork.nodes && listCardNetwork.nodes.length > 1 && (
                <div className="shrink-0 h-[140px] border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-2">
                  <div className="text-xs font-medium text-gray-500 mb-1">知识网络 ({listCardNetwork.nodes.length} 节点, {listCardNetwork.links.length} 连线)</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {listCardNetwork.nodes.filter((n:any)=>String(n.id)!==String(listSelectedCard?.id)).slice(0,10).map((n:any)=>(
                      <span key={n.id} onClick={() => loadCardForList(parseInt(String(n.id)))}
                        className="text-xs px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full cursor-pointer hover:border-blue-400 hover:text-blue-600 truncate max-w-[120px]">
                        {n.title || n.name || n.id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 text-gray-400">
              <div className="text-center">
                <FileText className="w-12 h-12 mb-3 mx-auto opacity-40" />
                <p className="text-sm">从左侧选择一张卡片查看详情</p>
              </div>
            </div>
)}
        </>
      ) : pageMode === 'mindmap' ? (
        /* ========== 思维导图视图（原版 MindMap 组件） ========== */
        <div className="flex-1 overflow-hidden">
          <MindMap initialRoot={mindmapTree} initialCards={cards} embedded={true} />
        </div>
      ) : (
        /* ========== 图谱视图 ========== */
        <main className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-10">
              <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}
          <div ref={chartRef} className="w-full h-full" />
        </main>
      )}

      {/* 卡片详情弹窗 */}
      {modalOpen && modalCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setModalOpen(false); setIsModalEditing(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              {isModalEditing ? (
                <input
                  id="modal-card-title"
                  name="modalCardTitle"
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
                    id="modal-card-type"
                    name="modalCardType"
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
                  id="modal-card-content"
                  name="modalCardContent"
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
                  id="add-node-search"
                  name="addNodeSearch"
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

      {/* 预览弹窗（DOCX/HTML） */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h3 className="font-semibold truncate">{previewTitle}</h3>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      )}

      {/* PDF 预览弹窗（内嵌主题选择 + 下载 + 最大化） */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 md:p-6" onClick={() => { setShowPdfPreview(false); if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(''); setPdfMaximized(false); }}>
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col ${pdfMaximized ? 'fixed inset-4 md:inset-6' : 'w-full max-w-5xl max-h-[95vh] h-[85vh]'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="font-semibold truncate">{pdfPreviewTitle}</h3>
                <select value={exportTheme} onChange={async e => { setExportTheme(e.target.value); if (listMarkdown) { try { const fd = new FormData(); fd.append('file', new Blob([listMarkdown], { type: 'text/markdown' }), 'card.md'); fd.append('title', listSelectedCard?.title || '知识卡片'); fd.append('author', 'Antinet'); fd.append('theme', e.target.value); const r = await fetch(`${API_BASE}/api/md2pdf/convert`, { method: 'POST', body: fd }); if (r.ok) { const b = await r.blob(); if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(URL.createObjectURL(b)); } } catch (ex) { console.error('切换主题失败:', ex); } } }}
                  className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 cursor-pointer">
                  <option value="warm-academic">暖学术</option>
                  <option value="classic-thesis">经典论文</option>
                  <option value="tufte">Tufte</option>
                  <option value="ieee-journal">期刊蓝</option>
                  <option value="elegant-book">精装书</option>
                  <option value="chinese-red">中国红</option>
                  <option value="ink-wash">水墨</option>
                  <option value="github-light">GitHub</option>
                  <option value="nord-frost">Nord冰霜</option>
                  <option value="ocean-breeze">海洋</option>
                </select>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pdfPreviewUrl && (
                  <a href={pdfPreviewUrl} download={`card_${listSelectedCard?.id || 'export'}.pdf`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <Download className="w-3.5 h-3.5" />下载 PDF
                  </a>
                )}
                <button onClick={() => setPdfMaximized(!pdfMaximized)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title={pdfMaximized ? '还原' : '最大化'}>
                  {pdfMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button onClick={() => { setShowPdfPreview(false); if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(''); setPdfMaximized(false); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 min-h-0">
              {pdfPreviewError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-red-500">
                    <div className="text-lg mb-2">⚠️ 预览加载失败</div>
                    <div className="text-sm">{pdfPreviewError}</div>
                  </div>
                </div>
              ) : pdfPreviewUrl ? (
                <iframe src={pdfPreviewUrl} className="w-full h-full border-0" title="PDF 预览" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphView;