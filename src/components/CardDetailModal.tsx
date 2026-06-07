import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import { X, ChevronRight, ExternalLink, Share2, Edit2, Trash2, Clock, Lightbulb, Plus, Link2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, BarChart3, ListTodo, Calendar, MapPin, Maximize2, Minimize2, Copy, ZoomIn, ZoomOut, FileText, Download, ChevronDown, FilePen, FileType, FileSpreadsheet, Link, Network, Loader, Loader2, History, Eye, FileSearch, CheckCircle2, Circle, AlertCircle, GitBranch, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { backlinkService, cardTaskService, calendarEventService, sourceFileService, type BacklinkCard, type BacklinkStats, type TaskWithRelation, type CalendarEvent, type SourceFileInfo } from '../services/integrationService';
import type { SiblingCardsResponse, SiblingCard } from '../services/dataService';
import { cn } from '@/lib/utils';
import { getApiBaseUrl } from '@/lib/apiConfig';
import ReactMarkdown from 'react-markdown';



// 注册中文字体（本地文件，不依赖外部CDN）
const FONT_URL_REGULAR = new URL('/fonts/NotoSansSC-Regular.ttf', import.meta.url).href;
Font.register({
  family: 'Noto Sans SC',
  fonts: [
    { src: FONT_URL_REGULAR, fontWeight: 'normal' },
    { src: FONT_URL_REGULAR, fontWeight: 'bold' },
  ],
});

// 定义卡片类型
type CardColor = 'blue' | 'green' | 'yellow' | 'red';

interface KnowledgeCard {
  id: string;
  color: CardColor;
  title: string;
  content: string;
  address: string;
  createdAt: string;
  relatedCards: string[];
  projectId?: number | null;
  images?: ImageInfo[];  // 图片列表
}

// 图片信息类型
interface ImageInfo {
  id: string;
  filename: string;
  original_name: string;
  path: string;
  url: string;
  size: number;
}

interface CardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: KnowledgeCard | null;
  allCards: KnowledgeCard[];
  onDelete: (id: string) => void;
  onRelatedCardClick: (id: string) => void;
  onUpdateCard: (updatedCard: KnowledgeCard) => void;
  onCreateRecommendedCard: (title: string, reason: string) => void;
  refreshTrigger?: number;  // 外部触发刷新（如任务创建后）
}

// 卡片类型映射
const cardTypeMap = {
  blue: {
    name: '核心概念',
    color: 'bg-blue-500',
    hoverColor: 'bg-blue-600',
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  green: {
    name: '关联链接',
    color: 'bg-green-500',
    hoverColor: 'bg-green-600',
    textColor: 'text-green-800',
    bgColor: 'bg-green-50 dark:bg-green-950/40',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  yellow: {
    name: '参考来源',
    color: 'bg-yellow-500',
    hoverColor: 'bg-yellow-600',
    textColor: 'text-yellow-800',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/40',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  red: {
    name: '索引关键词',
    color: 'bg-red-500',
    hoverColor: 'bg-red-600',
    textColor: 'text-red-800',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-800'
  }
};

// 格式化日期时间
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// 单卡PDF样式
const pdfStyles = StyleSheet.create({
  page: { padding: 50, backgroundColor: '#ffffff', fontFamily: 'Noto Sans SC' },
  header: { marginBottom: 30, borderBottom: '2pt solid #3b82f6', paddingBottom: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e40af', marginBottom: 6, fontFamily: 'Noto Sans SC' },
  subtitle: { fontSize: 11, color: '#6b7280', fontFamily: 'Noto Sans SC' },
  cardContainer: { marginBottom: 25, padding: 18, borderRadius: 8, borderWidth: 2 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 8, fontFamily: 'Noto Sans SC' },
  cardContent: { fontSize: 12, lineHeight: 1.7, fontFamily: 'Noto Sans SC' },
  cardFooter: { marginTop: 10, paddingTop: 8, borderTop: '1pt solid #e5e7eb' },
  cardMeta: { fontSize: 9, color: '#9ca3af', fontFamily: 'Noto Sans SC' },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, textAlign: 'center', fontSize: 9, color: '#9ca3af', fontFamily: 'Noto Sans SC' },
  badge: { padding: '3 8', borderRadius: 4, fontSize: 9, fontFamily: 'Noto Sans SC', alignSelf: 'flex-start', marginBottom: 8 },
  badgeText: { color: '#ffffff', fontFamily: 'Noto Sans SC' },
});

const cardColorsPDF = {
  blue:   { border: '#3b82f6', background: '#eff6ff', badge: '#1e40af', name: '核心概念' },
  green:  { border: '#10b981', background: '#ecfdf5', badge: '#047857', name: '关联链接' },
  yellow: { border: '#f59e0b', background: '#fffbeb', badge: '#d97706', name: '参考来源' },
  red:    { border: '#ef4444', background: '#fef2f2', badge: '#dc2626', name: '索引关键词' },
};

interface SingleCardPDFProps { card: KnowledgeCard; }

const SingleCardPDFDocument: React.FC<SingleCardPDFProps> = ({ card }) => {
  const color = card.color as 'blue' | 'green' | 'yellow' | 'red';
  const cfg = cardColorsPDF[color];
  const date = new Date(card.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>{card.title}</Text>
          <Text style={pdfStyles.subtitle}>
            Antinet 知识卡片 | {cfg.name} | {date}
          </Text>
        </View>
        <View style={[pdfStyles.cardContainer, { borderColor: cfg.border, backgroundColor: cfg.background }]}>
          <View style={[pdfStyles.badge, { backgroundColor: cfg.badge }]}>
            <Text style={pdfStyles.badgeText}>{cfg.name}</Text>
          </View>
          <Text style={[pdfStyles.cardTitle, { color: cfg.badge }]}>{card.title}</Text>
          <Text style={pdfStyles.cardContent}>{card.content}</Text>
          <View style={pdfStyles.cardFooter}>
            <Text style={pdfStyles.cardMeta}>地址: {card.address}</Text>
          </View>
        </View>
        <Text style={pdfStyles.footer}>由 Antinet 智能知识管家生成</Text>
      </Page>
    </Document>
  );
};

// ============================================================
// 导出的卡片数据类型（用于单卡导出）
// ============================================================
interface ExportableCard {
  id: string;
  color: CardColor;
  title: string;
  content: string;
  address: string;
  createdAt: string;
}

// 单卡导出函数
const exportSingleCardToXLSX = (card: ExportableCard) => {
  import('xlsx').then(XLSX => {
    const row = {
      '类型': card.color === 'blue' ? '核心概念' : card.color === 'green' ? '关联链接' : card.color === 'yellow' ? '参考来源' : '索引关键词',
      '标题': card.title,
      '内容': card.content,
      '地址': card.address,
      '创建时间': card.createdAt,
    };
    const ws = XLSX.utils.json_to_sheet([row]);
    ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 60 }, { wch: 30 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '知识卡片');
    XLSX.writeFile(wb, `${card.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.xlsx`);
    toast.success('Excel 导出成功');
  }).catch(() => toast.error('Excel 导出失败'));
};

const exportSingleCardToDOCX = (card: ExportableCard) => {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/>
<style>
body { font-family: "Microsoft YaHei", "SimHei", sans-serif; padding: 40px; }
h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 4px; color: white; font-size: 12px; margin-bottom: 12px; }
.blue   { background: #3b82f6; }
.green  { background: #10b981; }
.yellow { background: #f59e0b; }
.red    { background: #ef4444; }
.content { font-size: 14px; line-height: 1.8; white-space: pre-wrap; margin-top: 20px; }
.meta { color: #6b7280; font-size: 12px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
</style></head><body>
<h1>${card.title}</h1>
<span class="badge ${card.color}">${
  card.color === 'blue' ? '核心概念' : card.color === 'green' ? '关联链接' :
  card.color === 'yellow' ? '参考来源' : '索引关键词'
}</span>
<div class="content">${card.content}</div>
<div class="meta">地址: ${card.address} | 创建: ${card.createdAt}</div>
</body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${card.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Word 文档导出成功');
};

// ============================================================
// CardDetailModal 组件
// ============================================================
const CardDetailModal: React.FC<CardDetailModalProps> = ({
  isOpen,
  onClose,
  card,
  allCards,
  onDelete,
  onRelatedCardClick,
  onUpdateCard,
  onCreateRecommendedCard,
  refreshTrigger,
}) => {
  // 原有状态
  const [showMoreInsights, setShowMoreInsights] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [isEditingRelations, setIsEditingRelations] = useState(false);
  const [editingRelatedCards, setEditingRelatedCards] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingCard, setSavingCard] = useState(false);

  // 全屏切换功能
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // P0: 双向链接状态
  const [backlinks, setBacklinks] = useState<BacklinkCard[]>([]);
  const [forwardlinks, setForwardlinks] = useState<BacklinkCard[]>([]);
  const [backlinkStats, setBacklinkStats] = useState<BacklinkStats | null>(null);
  const [backlinksLoading, setBacklinksLoading] = useState(false);

  // P0: 卡片关联任务状态
  const [cardTasks, setCardTasks] = useState<TaskWithRelation[]>([]);
  const [cardEvents, setCardEvents] = useState<CalendarEvent[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());  // 已展开的任务ID

  // 维度2: 链词关联状态
  const [chainWordSuggestions, setChainWordSuggestions] = useState<Array<{
    card_id: string;
    title: string;
    content: string;
    card_type: string;
    relation: string;
    strength: number;
    chain_word: string;
    reason: string;
  }>>([]);
  const [chainWordLoading, setChainWordLoading] = useState(false);

  // 任务编辑弹窗（点击关联任务卡片打开）
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editTaskCategory, setEditTaskCategory] = useState('inbox');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // P0: 创建任务弹窗
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // P0: 创建日历事件弹窗
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Tab 切换
  const [activeTab, setActiveTab] = useState<'relations' | 'backlinks' | 'tasks' | 'chainwords'>('relations');

// 复制和放大功能
  const [isZoomed, setIsZoomed] = useState(false);

  // 单卡导出菜单
  const [showExportMenu, setShowExportMenu] = useState(false);

  // 专题列表
  const [projects, setProjects] = useState<Array<{id: number; name: string}>>([]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch(getApiBaseUrl() + '/api/research/projects');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.projects || []);
          setProjects(list.map((p: any) => ({ id: p.id, name: p.name })));
        }
      } catch (e) {
        console.error('加载专题失败:', e);
      }
    };
    if (isOpen) loadProjects();
  }, [isOpen]);

  // 源文件溯源状态
  const [sourceFileInfo, setSourceFileInfo] = useState<SourceFileInfo | null>(null);
  const [sourceFileLoading, setSourceFileLoading] = useState(false);

  // 源文件 Markdown 查看器状态
  const [showSourceMarkdown, setShowSourceMarkdown] = useState(false);
  const [sourceMarkdownData, setSourceMarkdownData] = useState<any>(null);
  const [sourceMarkdownLoading, setSourceMarkdownLoading] = useState(false);
  const [sourceHighlightIndex, setSourceHighlightIndex] = useState<number | null>(null);  // 自动高亮定位的段落索引
  const [sourceViewMode, setSourceViewMode] = useState<'markdown' | 'pdf'>('markdown');  // PDF/Markdown 视图切换
  const [sourceFullscreen, setSourceFullscreen] = useState(false);  // 源文件查看器全屏模式
 
  // PDF 预览（Markdown→PDF 转换，类似知识图谱页面）
  const [sourcePdfUrl, setSourcePdfUrl] = useState('');
  const [sourcePdfError, setSourcePdfError] = useState('');
  const [sourceExportTheme, setSourceExportTheme] = useState('chinese-red');
  const [sourcePdfGenerating, setSourcePdfGenerating] = useState(false);


  // 同批次兄弟卡片（知识图谱子网）
  const [siblingCards, setSiblingCards] = useState<SiblingCard[]>([]);
  const [siblingSourceName, setSiblingSourceName] = useState<string>('');
  const [siblingSourceFileId, setSiblingSourceFileId] = useState<string>('');
  const [siblingsLoading, setSiblingsLoading] = useState(false);

  // 内容区引用（选中文本检测）
  const contentRef = useRef<HTMLDivElement>(null);

  // 当卡片数据变化时，更新编辑中的关联列表
  useEffect(() => {
    if (card) {
      setEditingRelatedCards([...card.relatedCards]);
      setEditTitle(card.title);
      setEditContent(card.content);
    }
  }, [card?.relatedCards, card?.title, card?.content]);

  // 点击加载 AI 知识洞察
  const loadInsights = () => {
    if (!card) return;

    setInsightsLoading(true);
    const relatedTitles = forwardlinks.slice(0, 5).map(f => f.title).join('、');
    console.log('[AI洞察] 开始分析, relatedTitles:', relatedTitles);
    fetch(getApiBaseUrl() + '/api/genie-playground/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_title: card.title,
        card_content: card.content.slice(0, 500),
        related_titles: relatedTitles
      })
    })
      .then(r => r.json())
  .then(data => {
        console.log('[AI洞察] 收到完整响应:', data);

        try {
          if (typeof data.response === 'object') {
            setInsights(data.response);
            return;
          }

          const text = data.response || '';
          console.log('[AI洞察] response字段内容:', text);

          let jsonText = text;
          const responseIndex = text.indexOf('[Response]:');
          if (responseIndex !== -1) {
            jsonText = text.substring(responseIndex + '[Response]:'.length).trim();
          }

          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.summary !== undefined) {
                console.log('[AI洞察] 提取的JSON:', jsonMatch[0]);
                setInsights(parsed);
                return;
              }
            } catch (_) {}
          }

          console.log('[AI洞察] JSON解析失败, 使用文本fallback');
          const bulletMatches = jsonText.match(/\d+\.\s*\*\*(.+?)\*\*[:：]\s*(.+?)(?=\n\d+\.|\n\n|$)/g);
          const summary = bulletMatches
            ? bulletMatches.map((b: string) => b.replace(/^\d+\.\s*\*\*/, '').replace(/\*\*[:：]/, ':').trim()).join('；').slice(0, 80)
            : jsonText.slice(0, 80);
          setInsights({
            summary,
            importance: 50,
            gap: '需要深入分析',
            recommendations: [{ title: '深入探索此主题', reason: '关联分析' }],
            raw_text: jsonText
          });
        } catch (e) {
          console.error('[AI洞察] 解析失败:', e);
        }
      })
      .catch((e) => console.error('[AI洞察] 请求失败:', e))
      .finally(() => {
        console.log('[AI洞察] 分析完成');
        setInsightsLoading(false);
      });
  };

  // 合并 relatedCards 和 forwardlinks 形成完整关联列表（去重）
  const mergedRelatedIds = useMemo(() => {
    const ids = new Set<string>(card?.relatedCards || []);
    // forwardlinks 是从 card_backlinks 表获取的"我引用了谁"
    forwardlinks.forEach(fl => ids.add(String(fl.id)));
    return Array.from(ids);
  }, [card?.relatedCards, forwardlinks]);

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartPos({ x: position.x, y: position.y });
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition({ x: startPos.x + dx, y: startPos.y + dy });
    }
  }, [isDragging, dragStart, startPos]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  // P0: 加载双向链接数据
  const loadBacklinks = useCallback(async () => {
    if (!card) return;
    const cardId = parseInt(card.id);
    if (isNaN(cardId)) return;
    setBacklinksLoading(true);
    try {
      const [backData, forwardData, statsData] = await Promise.all([
        backlinkService.getBacklinks(cardId),
        backlinkService.getForwardlinks(cardId),
        backlinkService.getStats(cardId),
      ]);
      setBacklinks(backData);
      setForwardlinks(forwardData);
      setBacklinkStats(statsData);
    } catch (err) {
      console.error('加载双向链接失败:', err);
    } finally {
      setBacklinksLoading(false);
    }
  }, [card]);

  // P0: 加载卡片关联的任务和日历事件
  const loadCardIntegrations = useCallback(async () => {
    if (!card) return;
    const cardId = parseInt(card.id);
    if (isNaN(cardId)) return;
    setTasksLoading(true);
    try {
      const [tasks, events] = await Promise.all([
        cardTaskService.getTasksByCard(cardId),
        calendarEventService.getByCardId(cardId),
      ]);
      setCardTasks(tasks);
      setCardEvents(events);
    } catch (err) {
      console.error('加载卡片关联数据失败:', err);
    } finally {
      setTasksLoading(false);
    }
  }, [card]);

  // 维度2: 加载链词关联推荐
  const loadChainWordSuggestions = useCallback(async () => {
    if (!card) return;
    const cardId = card.id;
    setChainWordLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/chat/enhanced/chain/suggest/${cardId}?top_k=5`);
      if (res.ok) {
        const data = await res.json();
        setChainWordSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('加载链词推荐失败:', err);
    } finally {
      setChainWordLoading(false);
    }
  }, [card]);

  // 加载源文件溯源信息
  const loadSourceFileInfo = useCallback(async () => {
    if (!card) return;
    const cardId = parseInt(card.id);
    if (isNaN(cardId)) return;
    setSourceFileLoading(true);
    try {
      const info = await sourceFileService.getCardSourceFile(cardId);
      setSourceFileInfo(info);
    } catch (err) {
      console.error('加载源文件信息失败:', err);
      setSourceFileInfo(null);
    } finally {
      setSourceFileLoading(false);
    }
  }, [card]);

  // 打开源文件 Markdown 查看器（带段落高亮）
  const openSourceMarkdownViewer = async (sourceFileId: string, highlightParaIndex?: number) => {
    setShowSourceMarkdown(true);
    setSourceMarkdownLoading(true);
    setSourceHighlightIndex(highlightParaIndex ?? null);  // 设置高亮段落索引
    try {
      // 使用 dataService 的 markdown 接口
      const { sourceFileService: sfService } = await import('../services/dataService');
      const data = await sfService.getSourceFileMarkdown(sourceFileId);
      setSourceMarkdownData(data);
    } catch (err) {
      console.error('加载源文件 Markdown 失败:', err);
      toast.error('加载源文件内容失败');
      setSourceMarkdownData(null);
    } finally {
      setSourceMarkdownLoading(false);
    }
  };

  // 自动滚动到高亮段落
  useEffect(() => {
    if (sourceMarkdownData && sourceMarkdownLoading === false && sourceHighlightIndex !== null) {
      // 延迟执行，确保 DOM 已渲染
      const timer = setTimeout(() => {
        const el = document.getElementById(`source-para-${sourceHighlightIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // 添加高亮闪烁效果
          el.classList.add('ring-4', 'ring-yellow-400');
          setTimeout(() => el.classList.remove('ring-4', 'ring-yellow-400'), 2000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sourceMarkdownData, sourceMarkdownLoading, sourceHighlightIndex]);

  // 生成 PDF 预览（Markdown → 样式化 PDF）
  const generateSourcePdf = async (theme?: string) => {
    const effectiveTheme = theme || sourceExportTheme;
    const mdContent = `# ${card?.title || '知识卡片'}\n\n${card?.content || ''}`;
    if (!mdContent.trim()) return;
    setSourcePdfGenerating(true);
    setSourcePdfError('');
    try {
      const formData = new FormData();
      const blob = new Blob([mdContent], { type: 'text/markdown' });
      formData.append('file', blob, 'card.md');
      formData.append('title', card?.title || '知识卡片');
      formData.append('author', 'Antinet');
      formData.append('theme', effectiveTheme);
      const res = await fetch(`${getApiBaseUrl()}/api/md2pdf/convert`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'PDF 生成失败');
      }
      const pdfBlob = await res.blob();
      if (sourcePdfUrl) URL.revokeObjectURL(sourcePdfUrl);
      setSourcePdfUrl(URL.createObjectURL(pdfBlob));
    } catch (e: any) {
      setSourcePdfError(e.message || 'PDF 生成失败');
    } finally {
      setSourcePdfGenerating(false);
    }
  };

  // 加载同批次兄弟卡片
  const loadSiblingCards = useCallback(async () => {
    if (!card) return;
    const cardId = parseInt(card.id);
    if (isNaN(cardId)) return;
    setSiblingsLoading(true);
    try {
      const { sourceFileService: sfSvc } = await import('../services/dataService');
      const data: SiblingCardsResponse = await sfSvc.getCardSiblings(cardId);
      setSiblingCards(data.siblings || []);
      if (data.source_file) {
        setSiblingSourceName(data.source_file.original_name || '');
        setSiblingSourceFileId(data.source_file.source_file_id || '');
      }
    } catch (err) {
      console.error('加载同批次卡片失败:', err);
    } finally {
      setSiblingsLoading(false);
    }
  }, [card]);

  // 卡片打开时加载数据
  useEffect(() => {
    if (isOpen && card) {
      loadBacklinks();
      loadCardIntegrations();
      loadSourceFileInfo();
      loadSiblingCards();
      loadChainWordSuggestions();  // 维度2: 加载链词推荐
      setSourceViewMode('markdown');  // 每次打开重置为 Markdown 视图
      setSourceFullscreen(false);
      if (sourcePdfUrl) { URL.revokeObjectURL(sourcePdfUrl); setSourcePdfUrl(''); }
    }
  }, [isOpen, card, loadBacklinks, loadCardIntegrations, loadSourceFileInfo, loadSiblingCards, loadChainWordSuggestions]);

  // 切换到 PDF 标签时自动生成 PDF
  useEffect(() => {
    if (showSourceMarkdown && sourceViewMode === 'pdf' && card?.content) {
      generateSourcePdf();
    }
  }, [sourceViewMode, showSourceMarkdown]);

  // 外部触发刷新（如任务创建后）
  useEffect(() => {
    if (isOpen && card && refreshTrigger !== undefined && refreshTrigger > 0) {
      loadCardIntegrations();
    }
  }, [refreshTrigger]);

  // P0: 选中文本创建任务 — 检测选中文本
  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
    }
  };

  // P0: 打开创建任务弹窗
  const openCreateTask = (extractText?: string) => {
    const text = extractText || selectedText;
    setNewTaskTitle(text.slice(0, 50) + (text.length > 50 ? '...' : ''));
    setSelectedText(text);
    setShowCreateTask(true);
  };

  // P0: 提交创建任务
  const handleCreateTask = async () => {
    if (!card || !newTaskTitle.trim()) return;
    const cardId = parseInt(card.id);
    if (isNaN(cardId)) return;
    setCreatingTask(true);
    try {
      await cardTaskService.createTaskFromCard({
        card_id: cardId,
        title: newTaskTitle.trim(),
        description: selectedText ? `选自卡片「${card.title}」` : undefined,
        priority: newTaskPriority,
        due_date: newTaskDueDate || undefined,
        extract_paragraph: selectedText || undefined,
      });
      toast.success('任务已创建并关联到卡片');
      setShowCreateTask(false);
      setNewTaskTitle('');
      setNewTaskPriority('high');
      setNewTaskDueDate('');
      setSelectedText('');
      loadCardIntegrations();
    } catch (err) {
      toast.error('创建任务失败');
      console.error(err);
    } finally {
      setCreatingTask(false);
    }
  };

  // 保存编辑后的任务
  const handleSaveTask = async () => {
    if (!editingTask || !editTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/data/gtd/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          description: editTaskDesc,
          priority: editTaskPriority,
          category: editTaskCategory,
          due_date: editTaskDueDate || null,
        }),
      });
      if (res.ok) {
        toast.success('任务已更新');
        setEditingTask(null);
        loadCardIntegrations();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || '更新失败');
      }
    } catch { toast.error('更新失败'); }
    finally { setSavingTask(false); }
  };

  // P0: 打开创建日历事件弹窗
  const openCreateEvent = () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    setNewEventTitle(card ? `来自: ${card.title}` : '');
    setNewEventStartTime(start.toISOString().slice(0, 16));
    setNewEventEndTime(end.toISOString().slice(0, 16));
    setShowCreateEvent(true);
  };

  // P0: 提交创建日历事件
  const handleCreateEvent = async () => {
    if (!card || !newEventTitle.trim() || !newEventStartTime || !newEventEndTime) return;
    const cardId = parseInt(card.id);
    if (isNaN(cardId)) return;
    setCreatingEvent(true);
    try {
      await calendarEventService.create({
        title: newEventTitle.trim(),
        start_time: newEventStartTime,
        end_time: newEventEndTime,
        location: newEventLocation || undefined,
        source_card_id: cardId,
        source_paragraph: selectedText || undefined,
      });
      toast.success('日历事件已创建');
      setShowCreateEvent(false);
      loadCardIntegrations();
    } catch (err) {
      toast.error('创建日历事件失败');
      console.error(err);
    } finally {
      setCreatingEvent(false);
    }
  };

  // 如果没有卡片数据或模态框未打开，则不渲染
  if (!isOpen || !card) return null;

  // 获取关联卡片的详细信息（展示用：合并 relatedCards + forwardlinks）
  const relatedCardsDetails = mergedRelatedIds.map(id => {
    const found = allCards.find(c => c.id === id);
    if (found) return found;
    // 如果在 allCards 中找不到，尝试从 forwardlinks/backlinks 中构造
    const fl = forwardlinks.find(f => String(f.id) === id);
    const bl = backlinks.find(b => String(b.id) === id);
    const linkData = fl || bl;
    if (linkData) {
      return {
        id: String(linkData.id),
        color: (linkData.card_type || 'blue') as CardColor,
        title: linkData.title,
        content: '',
        address: '',
        createdAt: linkData.created_at || '',
        relatedCards: []
      } as KnowledgeCard;
    }
    return null;
  }).filter((card): card is KnowledgeCard => card !== null);

  // 处理删除卡片
  const handleDelete = () => {
    if (window.confirm('确定要删除这张卡片吗？此操作无法撤销。')) {
      onDelete(card.id);
      onClose();
      toast('卡片已成功删除', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };

  // 开始编辑
  const startEditing = () => {
    setEditTitle(card.title);
    setEditContent(card.content);
    setIsEditing(true);
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditTitle(card.title);
    setEditContent(card.content);
    setIsEditing(false);
  };

  // 保存编辑
  const saveEditing = async () => {
    if (!editTitle.trim()) {
      toast('标题不能为空', { className: 'bg-red-50 text-red-800' });
      return;
    }
    if (savingCard) return;
    setSavingCard(true);
    const updatedCard = {
      ...card,
      title: editTitle,
      content: editContent
    };
    try {
      await onUpdateCard(updatedCard);
      setIsEditing(false);
      toast('卡片已更新', { className: 'bg-green-50 text-green-800' });
    } catch {
      toast('卡片更新失败', { className: 'bg-red-50 text-red-800' });
    } finally {
      setSavingCard(false);
    }
  };

  // 分享卡片
  const handleShare = () => {
    const shareText = `【${cardTypeMap[card.color].name}】${card.title}\n\n${card.content}\n\nID: ${card.address}`;
    navigator.clipboard?.writeText(shareText);
    toast('卡片内容已复制到剪贴板', { className: 'bg-green-50 text-green-800' });
  };

  // 复制卡片内容
  const handleCopy = () => {
    const copyText = `${card.title}\n\n${card.content}`;
    navigator.clipboard?.writeText(copyText);
    toast('已复制卡片标题和内容', { className: 'bg-blue-50 text-blue-800' });
  };

  // 过滤可关联的卡片
  const filterAvailableCards = () => {
    return allCards.filter(availableCard =>
      availableCard.id !== card.id &&
      !mergedRelatedIds.includes(availableCard.id) &&
      availableCard.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // 添加关联卡片
  const addRelatedCard = (cardId: string) => {
    setEditingRelatedCards(prev => [...prev, cardId]);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // 移除关联卡片
  const removeRelatedCard = (cardId: string) => {
    setEditingRelatedCards(prev => prev.filter(id => id !== cardId));
  };

  // 保存关联卡片更改
  const saveRelationChanges = async () => {
    const updatedCard = {
      ...card,
      relatedCards: editingRelatedCards
    };
    if (!updatedCard.relatedCards) {
      updatedCard.relatedCards = [];
    }
    try {
      await onUpdateCard(updatedCard);
      setIsEditingRelations(false);
      setTimeout(() => loadBacklinks(), 500);
      toast('关联卡片已更新', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } catch {
      toast('关联卡片更新失败', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };

  // 取消关联编辑
  const cancelRelationEdit = () => {
    setEditingRelatedCards([...mergedRelatedIds]);
    setIsEditingRelations(false);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // 获取卡片类型颜色
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      blue: '核心概念',
      green: '关联链接',
      yellow: '参考来源',
      red: '索引关键词',
    };
    return names[type] || type;
  };

  if (!card || !isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1,
          scale: 1,
          x: position.x,
          y: position.y
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col",
          isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "w-full max-w-4xl max-h-[90vh]"
        )}
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 模态框头部 - 可拖拽 */}
        <div 
          className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 gap-2"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="flex items-center min-w-0 flex-1">
            <div className={`${cardTypeMap[card.color].color} w-3 h-3 rounded-full mr-2 flex-shrink-0`}></div>
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1 min-w-0"
                autoFocus
              />
            ) : (
              <h2 className="text-xl font-bold truncate">{card.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  className="px-3 py-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                  onClick={cancelEditing}
                >
                  取消
                </button>
                <button
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={saveEditing}
                  disabled={savingCard}
                >
                  {savingCard ? '保存中...' : '保存'}
                </button>
              </>
            ) : (
              <>
                {/* P0: 红卡一键转任务按钮 */}
                {card.color === 'red' && (
                  <button
                    className="p-2 text-green-600 hover:text-green-700 dark:hover:text-green-400 rounded-full hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                    aria-label="创建任务"
                    title="创建任务"
                    onClick={() => openCreateTask(card.title)}
                  >
                    <ListTodo size={18} />
                  </button>
                )}
                {/* P0: 选中文本创建任务按钮 */}
                {selectedText && (
                  <button
                    className="p-2 text-amber-600 hover:text-amber-700 dark:hover:text-amber-400 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                    aria-label="从选中文本创建任务"
                    title={`创建任务: "${selectedText.slice(0, 20)}..."`}
                    onClick={() => openCreateTask()}
                  >
                    <ListTodo size={18} />
                  </button>
                )}
                <button
                  className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  aria-label="复制"
                  onClick={handleCopy}
                  title="复制内容"
                >
                  <Copy size={18} />
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  aria-label="分享"
                  onClick={handleShare}
                >
                  <Share2 size={18} />
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  aria-label="编辑"
                  onClick={startEditing}
                >
                  <Edit2 size={18} />
                </button>

<button
                  className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  aria-label="删除"
                  onClick={handleDelete}
                >
                  <Trash2 size={18} />
                </button>

                {/* 链接图谱快捷入口 — 桌面端显示 */}
                <span className="hidden sm:inline-flex items-center gap-1">
                  <button
                    className="p-2 text-purple-500 hover:text-purple-600 dark:hover:text-purple-400 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                    aria-label="链接图谱"
                    title="查看链接图谱"
                    onClick={() => {
                      window.open(`/knowledge-graph?card=${card.id}`, '_blank');
                    }}
                  >
                    <Network size={18} />
                  </button>

                  {/* 双向链接快捷入口 — 桌面端显示 */}
                  <button
                    className="p-2 text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 rounded-full hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
                    aria-label="双向链接"
                    title="查看双向链接"
                    onClick={() => {
                      setActiveTab('backlinks');
                    }}
                  >
                    <Link size={18} />
                  </button>

                  {/* 单卡导出下拉菜单 — 桌面端显示 */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400 rounded-full hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                      aria-label="导出"
                      title="导出"
                    >
                      <Download size={18} />
                    </button>

                    {showExportMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowExportMenu(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                          <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', height: 0, overflow: 'hidden' }}>
                            {card && (
                              <PDFDownloadLink
                                id="single-card-pdf-link"
                                document={<SingleCardPDFDocument card={card as KnowledgeCard} />}
                                fileName={`${card.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.pdf`}
                              />
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setShowExportMenu(false);
                              if (card) {
                                const linkEl = document.getElementById('single-card-pdf-link') as HTMLAnchorElement;
                                if (linkEl) {
                                  setTimeout(() => linkEl.click(), 80);
                                }
                              }
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                          >
                            <FilePen className="w-5 h-5 text-red-600" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">PDF 文档</div>
                              <div className="text-xs text-gray-500">精确保留格式，适合打印</div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setShowExportMenu(false);
                              if (card) exportSingleCardToDOCX(card as unknown as ExportableCard);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
                          >
                            <FileType className="w-5 h-5 text-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">Word 文档</div>
                              <div className="text-xs text-gray-500">完美支持中文编辑</div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setShowExportMenu(false);
                              if (card) exportSingleCardToXLSX(card as unknown as ExportableCard);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">Excel 表格</div>
                              <div className="text-xs text-gray-500">结构化数据格式</div>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 缩放按钮 — 桌面端显示 */}
                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="p-2 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                    aria-label={isZoomed ? '退出放大' : '放大查看'}
                    title={isZoomed ? '退出放大' : '放大查看'}
                  >
                    {isZoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
                  </button>

                  {/* 全屏按钮 — 桌面端显示 */}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    aria-label={isFullscreen ? '退出全屏' : '全屏'}
                    title={isFullscreen ? '退出全屏' : '全屏'}
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </span>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 模态框内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 卡片基本信息 */}
          <div className={`${cardTypeMap[card.color].bgColor} border ${cardTypeMap[card.color].borderColor} rounded-lg p-6 mb-6`}>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <div className="flex items-center">
                <span className={`${cardTypeMap[card.color].color} text-white text-xs px-2 py-1 rounded-full`}>
                  {cardTypeMap[card.color].name}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm ml-3 flex items-center">
                  <Clock size={14} className="mr-1" />
                  创建于 {formatDate(card.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* P0: 链接统计徽章 */}
                {backlinkStats && backlinkStats.total_links > 0 && (
                  <span className="text-xs text-purple-600 dark:text-purple-400 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center gap-1">
                    <Link2 size={12} />
                    {backlinkStats.total_links} 链接
                  </span>
                )}
                {/* 所属专题标签 */}
                {(() => {
                  const proj = projects.find(p => p.id === card.projectId);
                  return proj ? (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center gap-1">
                      <BarChart3 size={12} />
                      {proj.name}
                    </span>
                  ) : null;
                })()}
                <div className={`${cardTypeMap[card.color].color} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                  {card.address}
                </div>
                {/* 源文件溯源按钮 - 微信读书风格：主按钮可直接点击跳转查看，下拉菜单提供更多操作 */}
                {sourceFileLoading && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-0.5 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    溯源加载中
                  </span>
                )}
                {sourceFileInfo && sourceFileInfo.has_source && (
                  <div className="relative group">
                    {/* 主按钮：直接点击查看源文件（带段落高亮） */}
                    <button
                      onClick={() => {
                        if (!sourceFileInfo.source_file_id) return;
                        // 从 location_in_source 解析段落号，如 "第3段" -> 3
                        const paraMatch = (sourceFileInfo.location_in_source || '').match(/第(\d+)段/);
                        const paraIdx = paraMatch ? parseInt(paraMatch[1]) : undefined;
                        openSourceMarkdownViewer(sourceFileInfo.source_file_id!, paraIdx);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-l-full flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer border-r border-blue-200 dark:border-blue-800"
                      title={`来源: ${sourceFileInfo.original_name} - 点击查看源文件`}
                    >
                      <FileText size={12} />
                      <span>{(sourceFileInfo.original_name || '源文件').length > 12 ? (sourceFileInfo.original_name || '源文件').slice(0, 12) + '..' : (sourceFileInfo.original_name || '源文件')}</span>
                      {sourceFileInfo.location_in_source && (
                        <MapPin size={10} className="opacity-70 text-orange-500" />
                      )}
                    </button>
                    {/* 下拉按钮：单独触发显示更多操作 */}
                    <button
                      className="text-xs text-blue-600 dark:text-blue-400 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-r-full flex items-center hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                      title="更多溯源操作"
                    >
                      <ChevronDown size={10} className="opacity-50" />
                    </button>
                    {/* 下拉菜单 */}
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[220px]">
                      <button
                        onClick={() => {
                          window.open(`/?tab=pdf-analysis`, '_blank');
                        }}
                        className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2 text-green-600 dark:text-green-400"
                      >
                        <History size={12} />
                        文档处理记录
                      </button>
                      <button
                        onClick={() => {
                          if (sourceFileInfo.source_file_id) {
                            sourceFileService.downloadSourceFile(sourceFileInfo.source_file_id);
                          }
                        }}
                        className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                      >
                        <Download size={12} />
                        下载原始文件
                      </button>
                      <button
                        onClick={() => {
                          if (!sourceFileInfo.source_file_id) return;
                          const paraMatch = (sourceFileInfo.location_in_source || '').match(/第(\d+)段/);
                          const paraIdx = paraMatch ? parseInt(paraMatch[1]) : undefined;
                          openSourceMarkdownViewer(sourceFileInfo.source_file_id!, paraIdx);
                        }}
                        className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-purple-600 dark:text-purple-400"
                      >
                        <FilePen size={12} />
                        {sourceFileInfo.location_in_source ? '查看 Markdown 溯源（高亮此段）' : '查看 Markdown 溯源'}
                      </button>
                      <button
                        onClick={() => {
                          if (sourceFileInfo.source_file_id) {
                            // 从 location_in_source 解析段落号，如 "第3段" -> 3
                            const paraMatch = (sourceFileInfo.location_in_source || '').match(/第(\d+)段/);
                            const paraIdx = paraMatch ? parseInt(paraMatch[1]) : undefined;
                            openSourceMarkdownViewer(sourceFileInfo.source_file_id!, paraIdx);
                          }
                        }}
                        className="w-full text-left text-xs px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg flex items-center gap-2 text-orange-600 dark:text-orange-400"
                      >
                        <MapPin size={12} />
                        定位到源文件此段落
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[300px] text-lg leading-relaxed bg-white/50 dark:bg-gray-700/50 border-2 border-blue-500 rounded-lg p-4 focus:outline-none resize-y"
                placeholder="输入卡片内容..."
              />
            ) : (
              <div
                ref={contentRef}
                onMouseUp={handleTextSelect}
                className="text-lg select-text prose prose-gray dark:prose-invert max-w-none"
              >
                <ReactMarkdown>{card.content}</ReactMarkdown>
              </div>
            )}
            
{/* 图片附件展示 - 包括images数组和content中的markdown图片 */}
            {(() => {
              // 从content中提取markdown图片
              const markdownImages: Array<{url: string; alt: string}> = [];
              if (card.content) {
                const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
                let match;
                while ((match = imgRegex.exec(card.content)) !== null) {
                  markdownImages.push({ alt: match[1], url: match[2] });
                }
              }
              
              // 合并images数组中的图片和markdown图片
              const allImages = [
                ...(card.images || []).map(img => ({ url: img.url, alt: img.original_name || img.filename || '图片' })),
                ...markdownImages
              ];
              
              if (allImages.length === 0) return null;
              
              return (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={14} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      图片附件 ({allImages.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {allImages.map((img, idx) => (
                      <div 
                        key={idx}
                        className="relative group cursor-pointer"
                        onClick={() => window.open(`${getApiBaseUrl()}${img.url}`, '_blank')}
                      >
                        <img
                          src={img.url.startsWith('http') ? img.url : `${getApiBaseUrl()}${img.url}`}
                          alt={img.alt}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600 group-hover:border-blue-400 transition-colors"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12">图片加载失败</text></svg>';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-colors flex items-center justify-center">
                          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            
            {/* P0: 选中文本提示条 */}
            {!isEditing && selectedText && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center justify-between"
              >
                <span className="text-sm text-amber-700 dark:text-amber-300 truncate max-w-[70%]">
                  已选: 「{selectedText.slice(0, 40)}{selectedText.length > 40 ? '...' : ''}」
                </span>
                <div className="flex gap-2">
                  <button
                    className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-1"
                    onClick={() => openCreateTask()}
                  >
                    <ListTodo size={12} /> 创建任务
                  </button>
                  <button
                    className="text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1"
                    onClick={openCreateEvent}
                  >
                    <Calendar size={12} /> 创建日程
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* P0: Tab 切换栏 */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'relations'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              onClick={() => setActiveTab('relations')}
            >
              关联卡片
            </button>
            <button
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'backlinks'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              onClick={() => setActiveTab('backlinks')}
            >
              <span className="flex items-center gap-1">
                <Link2 size={14} />
                双向链接
                {backlinkStats && backlinkStats.total_links > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-xs rounded-full">
                    {backlinkStats.total_links}
                  </span>
                )}
              </span>
            </button>
            <button
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              onClick={() => setActiveTab('tasks')}
            >
              <span className="flex items-center gap-1">
                <ListTodo size={14} />
                任务与日程
                {(cardTasks.length + cardEvents.length) > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300 text-xs rounded-full">
                    {cardTasks.length + cardEvents.length}
                  </span>
                )}
              </span>
            </button>
            {/* 维度2: 链词关联标签 */}
            <button
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chainwords'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              onClick={() => setActiveTab('chainwords')}
            >
              <span className="flex items-center gap-1">
                <GitBranch size={14} />
                链词关联
                {chainWordSuggestions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-xs rounded-full">
                    {chainWordSuggestions.length}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Tab 内容: 关联卡片 */}
          {activeTab === 'relations' && (
            <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">关联卡片</h3>
                {!isEditingRelations ? (
                  <button
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    onClick={() => {
                      setEditingRelatedCards([...mergedRelatedIds]);
                      setIsEditingRelations(true);
                      setTimeout(() => { setShowSuggestions(true); }, 100);
                    }}
                  >
                    编辑关联 <Edit2 size={14} className="ml-1" />
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                      onClick={cancelRelationEdit}
                    >
                      取消
                    </button>
                    <button
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      onClick={saveRelationChanges}
                    >
                      保存
                    </button>
                  </div>
                )}
              </div>

              {!isEditingRelations ? (
                relatedCardsDetails.length > 0 ? (
                  <div className="space-y-3">
                    {relatedCardsDetails.map(relatedCard => (
                      <motion.div
                        key={relatedCard.id}
                        whileHover={{ x: 5 }}
                        className={`border ${cardTypeMap[relatedCard.color].borderColor} rounded-lg p-4 cursor-pointer hover:shadow-md transition-all`}
                        onClick={() => onRelatedCardClick(relatedCard.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <div className={`${cardTypeMap[relatedCard.color].color} w-2 h-2 rounded-full mt-2 mr-3`}></div>
                            <div>
                              <h4 className="font-medium">{relatedCard.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{relatedCard.content}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className={`text-xs ${cardTypeMap[relatedCard.color].color} text-white px-2 py-0.5 rounded-full mr-3`}>
                              {relatedCard.address}
                            </span>
                            <ChevronRight size={16} className="text-gray-400" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                    <p className="text-gray-500 dark:text-gray-400">暂无关联卡片</p>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {editingRelatedCards.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editingRelatedCards.map(cardId => {
                        const rc = allCards.find(c => c.id === cardId);
                        if (!rc) return null;
                        return (
                          <div
                            key={rc.id}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                          >
                            <div className={`${cardTypeMap[rc.color].color} w-2 h-2 rounded-full mr-2`}></div>
                            <span>{rc.title}</span>
                            <button
                              type="button"
                              onClick={() => removeRelatedCard(rc.id)}
                              className="ml-2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onClick={() => setShowSuggestions(true)}
                      placeholder="搜索要关联的卡片..."
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                    />

                    {showSuggestions && filterAvailableCards().length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {filterAvailableCards().map(availableCard => (
                          <button
                            key={availableCard.id}
                            type="button"
                            onClick={() => addRelatedCard(availableCard.id)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                          >
                            <div className={`${cardTypeMap[availableCard.color].color} w-2 h-2 rounded-full mr-2`}></div>
                            <Plus size={14} className="mr-2 text-blue-500" />
                            <span>{availableCard.title}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}

                    {showSuggestions && filterAvailableCards().length === 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 text-sm text-gray-500 dark:text-gray-400">
                        未找到匹配的卡片
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 同批次兄弟卡片（知识图谱子网） */}
            {siblingCards.length > 0 && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Network size={14} className="text-purple-500" />
                    同批次导入
                    {siblingSourceFileId ? (
                      <button
                        onClick={() => openSourceMarkdownViewer(siblingSourceFileId)}
                        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 max-w-[260px] truncate"
                        title={`查看源文件: ${siblingSourceName}`}
                      >
                        <span className="truncate">({siblingSourceName || '未知来源'})</span>
                        <ExternalLink size={11} className="opacity-60 flex-shrink-0" />
                      </button>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">({siblingSourceName || '未知来源'})</span>
                    )}
                    <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-xs rounded-full">
                      {siblingCards.length} 张
                    </span>
                  </h4>
                </div>
                {siblingsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader size={16} className="animate-spin text-purple-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {siblingCards.map(sc => (
                      <div
                        key={sc.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                          sc.link_type
                            ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-purple-300'
                        }`}
                        onClick={() => onRelatedCardClick(String(sc.id))}
                      >
                        <div className={`${cardTypeMap[sc.card_type as CardColor]?.color || 'bg-gray-500'} w-2 h-2 rounded-full mr-3 flex-shrink-0`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-sm truncate">{sc.title}</h5>
                            {sc.link_type && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full flex-shrink-0">
                                {sc.link_type === 'same_batch' ? '同批链接' : sc.link_type}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{sc.content?.slice(0, 80)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <span className={`text-[10px] ${cardTypeMap[sc.card_type as CardColor]?.color || 'bg-gray-500'} text-white px-1.5 py-0.5 rounded`}>
                            {sc.location_in_source || ''}
                          </span>
                          <ChevronRight size={14} className="text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            </>          
          )}

          {/* P0: Tab 内容: 双向链接 */}
          {activeTab === 'backlinks' && (
            <div className="mb-6 space-y-4">
              {backlinksLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  加载链接数据...
                </div>
              ) : (
                <>
                  {/* 链接统计卡片 */}
                  {backlinkStats && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center border border-purple-100 dark:border-purple-800">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <ArrowLeft size={14} className="text-purple-500" />
                          <span className="text-xs text-purple-600 dark:text-purple-400">反向链接</span>
                        </div>
                        <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{backlinkStats.backlink_count}</div>
                      </div>
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <ArrowRight size={14} className="text-indigo-500" />
                          <span className="text-xs text-indigo-600 dark:text-indigo-400">正向链接</span>
                        </div>
                        <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{backlinkStats.forwardlink_count}</div>
                      </div>
                      <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-center border border-violet-100 dark:border-violet-800">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <BarChart3 size={14} className="text-violet-500" />
                          <span className="text-xs text-violet-600 dark:text-violet-400">总计</span>
                        </div>
                        <div className="text-xl font-bold text-violet-700 dark:text-violet-300">{backlinkStats.total_links}</div>
                      </div>
                    </div>
                  )}

                  {/* 反向链接列表（谁引用了我） */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                      <ArrowLeft size={14} className="text-purple-500" />
                      被引用（反向链接）
                    </h4>
                    {backlinks.length > 0 ? (
                      <div className="space-y-2">
                        {backlinks.map(bl => (
                          <div
                            key={bl.id}
                            className="flex items-center p-3 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-lg cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-colors"
                            onClick={() => onRelatedCardClick(String(bl.id))}
                          >
                            <div className={`${getTypeColor(bl.card_type)} w-2.5 h-2.5 rounded-full mr-3`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{bl.title}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <span className={`${getTypeColor(bl.card_type)} text-white px-1.5 py-0.5 rounded text-[10px]`}>{getTypeName(bl.card_type)}</span>
                                {bl.link_text && <span>· {bl.link_text}</span>}
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-gray-400" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">暂无反向链接</p>
                    )}
                  </div>

                  {/* 正向链接列表（我引用了谁） */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                      <ArrowRight size={14} className="text-indigo-500" />
                      引用了（正向链接）
                    </h4>
                    {forwardlinks.length > 0 ? (
                      <div className="space-y-2">
                        {forwardlinks.map(fl => (
                          <div
                            key={fl.id}
                            className="flex items-center p-3 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-lg cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition-colors"
                            onClick={() => onRelatedCardClick(String(fl.id))}
                          >
                            <div className={`${getTypeColor(fl.card_type)} w-2.5 h-2.5 rounded-full mr-3`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{fl.title}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <span className={`${getTypeColor(fl.card_type)} text-white px-1.5 py-0.5 rounded text-[10px]`}>{getTypeName(fl.card_type)}</span>
                                {fl.link_text && <span>· {fl.link_text}</span>}
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-gray-400" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">暂无正向链接</p>
                    )}
                  </div>

                  {/* 查看图谱按钮 */}
                  <button
                    className="w-full py-2.5 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 transition-colors flex items-center justify-center gap-2"
                    onClick={() => {
                      window.open(`/knowledge-graph?card=${card.id}`, '_blank');
                    }}
                  >
                    <Link2 size={16} />
                    查看链接图谱
                  </button>
                </>
              )}
            </div>

          )}

          {/* P0: Tab 内容: 任务与日程 */}
          {activeTab === 'tasks' && (
            <div className="mb-6 space-y-4">
              {tasksLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  加载关联数据...
                </div>
              ) : (
                <>
                  {/* 关联任务 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <ListTodo size={14} className="text-green-500" />
                        关联任务 ({cardTasks.length})
                      </h4>
                      <button
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        onClick={() => openCreateTask(card.title)}
                      >
                        <Plus size={12} /> 新建任务
                      </button>
                    </div>
                    {cardTasks.length > 0 ? (
                      <div className="space-y-2">
                        {cardTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => {
                              setEditingTask(task);
                              setEditTaskTitle(task.title || '');
                              setEditTaskDesc(task.description || '');
                              setEditTaskPriority(task.priority as any || 'medium');
                              setEditTaskCategory(task.category || 'inbox');
                              setEditTaskDueDate(task.due_date || '');
                            }}
                            className={`p-3 border rounded-lg transition-colors cursor-pointer hover:shadow-md ${
                              task.is_completed
                                ? 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-75'
                                : 'bg-green-50/30 dark:bg-green-900/10 border-green-100 dark:border-green-800 hover:bg-green-100/50 dark:hover:bg-green-900/20'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {/* 完成切换 */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const res = await fetch(`${getApiBaseUrl()}/api/data/gtd/tasks/${task.id}/complete?is_completed=${!task.is_completed}`, { method: 'PUT' });
                                    if (res.ok) {
                                      toast.success(task.is_completed ? '已取消完成' : '已完成 ✓');
                                      loadCardIntegrations();
                                    }
                                  } catch { toast.error('操作失败'); }
                                }}
                                className="mt-0.5 text-gray-400 hover:text-green-500 flex-shrink-0"
                              >
                                {task.is_completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-medium ${task.is_completed ? 'line-through text-gray-400' : ''}`}>
                                    {task.title}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${
                                    task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}>
                                    {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {task.category === 'inbox' ? '收集箱' : task.category === 'today' ? '今日待办' : task.category === 'later' ? '将来可能' : task.category === 'archive' ? '已归档' : task.category || '收集箱'}
                                  </span>
                                </div>
                                {task.description && (
                                  <div className="mt-1">
                                    <p className={`text-xs text-gray-500 dark:text-gray-400 ${expandedTasks.has(task.id) ? '' : 'line-clamp-2'}`}>
                                      {task.description}
                                    </p>
                                    {task.description.length > 100 && (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedTasks(prev => {
                                            const next = new Set(prev);
                                            next.has(task.id) ? next.delete(task.id) : next.add(task.id);
                                            return next;
                                          });
                                        }}
                                        className="text-[10px] text-blue-500 hover:underline cursor-pointer mt-0.5 inline-block"
                                      >
                                        {expandedTasks.has(task.id) ? '收起' : '展开全部'}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                  {task.due_date && <span>截止: {task.due_date}</span>}
                                  {task.created_at && <span>创建于 {new Date(task.created_at).toLocaleDateString()}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                        暂无关联任务
                      </div>
                    )}
                  </div>

                  {/* 关联日历事件 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <Calendar size={14} className="text-blue-500" />
                        关联日程 ({cardEvents.length})
                      </h4>
                      <button
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        onClick={openCreateEvent}
                      >
                        <Plus size={12} /> 新建日程
                      </button>
                    </div>
                    {cardEvents.length > 0 ? (
                      <div className="space-y-2">
                        {cardEvents.map(event => (
                          <div
                            key={event.id}
                            className="p-3 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg"
                          >
                            <div className="flex items-start gap-2">
                              <Calendar size={14} className="mt-1 text-blue-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium ${event.is_completed ? 'line-through text-gray-400' : ''}`}>
                                  {event.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  <span>{new Date(event.start_time).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                  <span>→</span>
                                  <span>{new Date(event.end_time).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  {event.location && (
                                    <span className="flex items-center gap-0.5"><MapPin size={10} />{event.location}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                        暂无关联日程
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

          )}

          {/* 维度2: 链词关联标签内容 */}
          {activeTab === 'chainwords' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <GitBranch size={18} className="text-purple-500" />
                  链词关联推荐
                </h3>
                <button
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  onClick={loadChainWordSuggestions}
                  disabled={chainWordLoading}
                >
                  <RefreshCw size={14} className={chainWordLoading ? 'animate-spin' : ''} />
                  刷新
                </button>
              </div>

              {chainWordLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-purple-500" />
                  <span className="ml-2 text-gray-500">正在分析链词关联...</span>
                </div>
              ) : chainWordSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {chainWordSuggestions.map((suggestion, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ x: 5 }}
                      className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all bg-purple-50/30 dark:bg-purple-900/10"
                      onClick={() => onRelatedCardClick(suggestion.card_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              suggestion.card_type === 'blue' ? 'bg-blue-100 text-blue-700' :
                              suggestion.card_type === 'green' ? 'bg-green-100 text-green-700' :
                              suggestion.card_type === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {suggestion.card_type === 'blue' ? '事实' :
                               suggestion.card_type === 'green' ? '解释' :
                               suggestion.card_type === 'yellow' ? '风险' : '行动'}
                            </span>
                            <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <GitBranch size={12} />
                              {suggestion.chain_word}
                            </span>
                            <span className="text-xs text-gray-500">
                              关联强度: {(suggestion.strength * 100).toFixed(0)}%
                            </span>
                          </div>
                          <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{suggestion.content}</p>
                          <p className="text-xs text-purple-500 mt-2">{suggestion.reason}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 flex-shrink-0 ml-3" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-6 border border-dashed border-purple-300 dark:border-purple-700 rounded-lg text-center">
                  <GitBranch size={32} className="mx-auto text-purple-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">暂无链词关联推荐</p>
                  <p className="text-sm text-gray-400 mt-1">点击刷新重新分析</p>
                </div>
              )}

              {/* 链词说明 */}
              <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">关于链词关联</h4>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  链词关联通过自动分析卡片内容中的关键词和语义关系，发现卡片之间的潜在联系。
                  例如："风险" → "应对策略"、"需求" → "解决方案"。
                </p>
              </div>
            </div>
          )}

          {/* AI分析建议 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-6 border border-blue-100 dark:border-blue-800">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">AI知识洞察</h3>
              {insightsLoading && <Loader2 size={16} className="animate-spin text-blue-500" />}
            </div>
            {insightsLoading ? (
              <p className="text-sm text-blue-400 animate-pulse">AI 正在分析...</p>
 ) : insights ? (
          <div className="space-y-3">
            {insights.raw_text ? (
              <div className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-wrap">{insights.raw_text}</div>
            ) : (
              <p className="text-sm text-blue-700 dark:text-blue-400">{insights.summary || '暂无分析'}</p>
            )}
            <div className="mt-4 flex justify-end">
                  <button
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    onClick={() => setShowMoreInsights(!showMoreInsights)}
                  >
                    {showMoreInsights ? '收起洞察' : '查看更多洞察'} <ExternalLink size={14} className="ml-1" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  这张卡片与您知识体系中的多个核心概念相关联，是连接不同知识领域的重要节点。
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  建议您进一步探索与"{card?.title}"相关的最新研究和实践，以丰富这一核心概念的深度和广度。
                </p>
                <button
                  onClick={loadInsights}
                  disabled={insightsLoading}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-2"
                >
                  {insightsLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> AI 分析中...
                    </>
                  ) : (
                    <>点击获取 AI 洞察</>
                  )}
                </button>
              </div>
            )}

            {/* 更多AI洞察详情 */}
            {insights && (
            <motion.div
              initial={false}
              animate={{
                height: showMoreInsights ? 'auto' : 0,
                opacity: showMoreInsights ? 1 : 0
              }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-blue-200 dark:border-blue-700">
                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">知识重要性分析</h4>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-blue-700 dark:text-blue-400">在知识体系中的重要性</span>
                    <span className="text-xs font-medium text-blue-800 dark:text-blue-300">{insights.importance || 'N/A'}%</span>
                  </div>
                  <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(parseInt(insights.importance) || 50, 100)}%` }}></div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">关联强度分析</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {(relatedCardsDetails.length > 0 ? relatedCardsDetails.slice(0, 2) : []).map((related, index) => (
                      <div key={index} className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex items-center mb-1">
                          <div className={`${cardTypeMap[related.color].color} w-2 h-2 rounded-full mr-2`}></div>
                          <span className="text-xs font-medium">{related.title}</span>
                        </div>
                        <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.max(60 - index * 10, 30)}%` }}></div>
                        </div>
                        <span className="text-xs text-blue-600 dark:text-blue-400">{Math.max(60 - index * 10, 30)}% 关联强度</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">知识空白识别</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0">
                        <Lightbulb size={10} />
                      </div>
                      <span className="text-xs text-blue-700 dark:text-blue-400">{insights.gap || '暂无识别'}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">推荐相关卡片</h4>
                  <div className="space-y-2">
                    {(insights.recommendations || []).map((rec: any, index: number) => (
                      <div key={index} className="flex items-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0">
                          <ChevronRight size={10} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium">{rec.title}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">{rec.reason}</p>
                        </div>
                        <button
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          onClick={() => onCreateRecommendedCard(rec.title, rec.reason)}
                        >
                          创建
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
            )}
          </div>
        </div>

        {/* P0: 创建任务弹窗 */}
        {showCreateTask && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20" onClick={() => setShowCreateTask(false)}>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-[420px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ListTodo size={18} className="text-green-500" />
                从卡片创建任务
              </h3>
              {selectedText && (
                <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded text-xs text-amber-700 dark:text-amber-300 max-h-20 overflow-y-auto">
                  选中文本: 「{selectedText}」
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">任务标题</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    placeholder="输入任务标题..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">优先级</label>
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none"
                    >
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">截止日期</label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={e => setNewTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => setShowCreateTask(false)}
                  >
                    取消
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    onClick={handleCreateTask}
                    disabled={creatingTask || !newTaskTitle.trim()}
                  >
                    {creatingTask ? '创建中...' : '创建任务'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* P0: 创建日历事件弹窗 */}
        {showCreateEvent && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20" onClick={() => setShowCreateEvent(false)}>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-[420px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                创建日程事件
              </h3>
              {selectedText && (
                <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded text-xs text-blue-700 dark:text-blue-300 max-h-20 overflow-y-auto">
                  关联文本: 「{selectedText.slice(0, 60)}」
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">事件标题</label>
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={e => setNewEventTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="输入事件标题..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">开始时间</label>
                    <input
                      type="datetime-local"
                      value={newEventStartTime}
                      onChange={e => setNewEventStartTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">结束时间</label>
                    <input
                      type="datetime-local"
                      value={newEventEndTime}
                      onChange={e => setNewEventEndTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">地点</label>
                  <input
                    type="text"
                    value={newEventLocation}
                    onChange={e => setNewEventLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none"
                    placeholder="可选..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => setShowCreateEvent(false)}
                  >
                    取消
                  </button>
                  <button
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    onClick={handleCreateEvent}
                    disabled={creatingEvent || !newEventTitle.trim() || !newEventStartTime || !newEventEndTime}
                  >
                    {creatingEvent ? '创建中...' : '创建日程'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* 放大查看模态框 */}
        {isZoomed && (
          <div
            className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-8"
            onClick={() => setIsZoomed(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* 放大模态框头部 */}
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 gap-2">
                <div className="flex items-center min-w-0 flex-1">
                  <div className={`${cardTypeMap[card.color].color} w-4 h-4 rounded-full mr-3 flex-shrink-0`}></div>
                  <h2 className="text-2xl font-bold truncate">{card.title}</h2>
                  <span className={`ml-3 hidden sm:inline ${cardTypeMap[card.color].color} text-white text-xs px-2 py-1 rounded-full flex-shrink-0`}>
                    {cardTypeMap[card.color].name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleCopy}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="复制内容"
                  >
                    <Copy size={20} />
                  </button>
                  <button
                    onClick={() => setIsZoomed(false)}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              {/* 放大后的卡片内容 */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className={`${cardTypeMap[card.color].bgColor} border ${cardTypeMap[card.color].borderColor} rounded-xl p-8`}>
                  <div className="text-lg leading-relaxed whitespace-pre-wrap" style={{ whiteSpace: 'pre-wrap' }}>
                    {card.content}
                  </div>
                </div>
                
                {/* 元信息 */}
                <div className="mt-6 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1" />
                    创建于 {formatDate(card.createdAt)}
                  </div>
                  <div className={`${cardTypeMap[card.color].color} text-white px-3 py-1 rounded-full`}>
                    {card.address}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* 源文件 Markdown 溯源查看器 */}
      {showSourceMarkdown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          style={sourceFullscreen ? { padding: 0 } : { padding: '1rem' }}
          onClick={() => { setShowSourceMarkdown(false); setSourceFullscreen(false); if (sourcePdfUrl) { URL.revokeObjectURL(sourcePdfUrl); setSourcePdfUrl(''); } }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
              sourceFullscreen
                ? 'fixed inset-2 rounded-xl'
                : 'max-w-5xl w-full max-h-[85vh]'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {sourceMarkdownData?.source_file?.name || '源文件'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {sourceFileInfo?.location_in_source || '溯源查看'}
                    {sourceMarkdownData?.cards && sourceMarkdownData.cards.length > 0 && (
                      <span> · 共 {sourceMarkdownData.cards.length} 张卡片</span>
                    )}
                  </p>
                </div>
                {/* Markdown/PDF 视图切换 */}
                <div className="flex items-center bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 ml-4">
                  <button
                    onClick={() => setSourceViewMode('markdown')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${
                      sourceViewMode === 'markdown'
                        ? 'bg-purple-500 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <FileText size={12} className="inline mr-1" />Markdown 文本
                  </button>
                  <button
                    onClick={() => setSourceViewMode('pdf')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-r-lg transition-colors ${
                      sourceViewMode === 'pdf'
                        ? 'bg-red-500 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <FileText size={12} className="inline mr-1" />PDF 预览
                  </button>
                </div>
                {/* PDF 主题选择器 */}
                {sourceViewMode === 'pdf' && (
                  <select
                    value={sourceExportTheme}
                    onChange={async e => {
                      setSourceExportTheme(e.target.value);
                      if (card?.content) { generateSourcePdf(e.target.value); }
                    }}
                    className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 cursor-pointer ml-2"
                  >
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
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSourceFullscreen(!sourceFullscreen)}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title={sourceFullscreen ? '退出全屏' : '全屏查看'}
                >
                  {sourceFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button onClick={() => { setShowSourceMarkdown(false); setSourceViewMode('markdown'); setSourceFullscreen(false); if (sourcePdfUrl) { URL.revokeObjectURL(sourcePdfUrl); setSourcePdfUrl(''); } }} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* PDF 预览视图（Markdown → 样式化 PDF，与知识图谱页面效果一致） */}
              {sourceViewMode === 'pdf' ? (
                sourcePdfGenerating ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader size={24} className="animate-spin text-red-500 mr-3" />
                    <span className="text-gray-500">生成 PDF 中...</span>
                  </div>
                ) : sourcePdfError ? (
                  <div className="flex flex-col items-center justify-center py-20 text-red-500">
                    <AlertCircle size={48} strokeWidth={1} className="mb-4 opacity-30" />
                    <p className="text-sm">{sourcePdfError}</p>
                    <button onClick={() => generateSourcePdf()} className="mt-4 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">
                      重试
                    </button>
                  </div>
                ) : sourcePdfUrl ? (
                  <div className="-m-6 h-full flex flex-col bg-gray-100 dark:bg-gray-900">
                    {/* 顶部操作栏 */}
                    {sourcePdfUrl && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
                        <a href={sourcePdfUrl} download={`card_${card?.id || 'export'}.pdf`}
                          className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                          <Download size={12} />下载 PDF
                        </a>
                        <div className="flex-1" />
                      </div>
                    )}
                    <div className="flex-1 min-h-0">
                      <object data={sourcePdfUrl} type="application/pdf" className="w-full h-full">
                        <embed src={sourcePdfUrl} type="application/pdf" className="w-full h-full" />
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <p>无法预览 PDF，请<a href={sourcePdfUrl} download className="text-blue-500 underline">下载查看</a></p>
                        </div>
                      </object>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <FileText size={48} strokeWidth={1} className="mb-4 opacity-30" />
                    <p className="text-sm mb-4">点击生成 PDF 预览</p>
                    <button onClick={() => generateSourcePdf()} className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">
                      生成 PDF
                    </button>
                  </div>
                )
              ) : sourceMarkdownLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader size={24} className="animate-spin text-purple-500 mr-3" />
                  <span className="text-gray-500">加载中...</span>
                </div>
              ) : !sourceMarkdownData || !sourceMarkdownData.source_file?.markdown_content ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <FileText size={48} strokeWidth={1} className="mb-4 opacity-30" />
                  <p>暂无源文件内容</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 悬浮导航栏：快速定位 */}
                  <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileSearch size={14} className="text-purple-600" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">关联卡片</span>
                      <div className="flex flex-wrap gap-1">
                        {sourceMarkdownData.cards.slice(0, 8).map((c: any) => {
                          const colorMap: Record<string, string> = {
                            blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600',
                            red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          };
                          const paraMatch = (c.location_in_source || '').match(/第(\d+)段/);
                          const paraIdx = paraMatch ? parseInt(paraMatch[1]) : null;
                          const isCurrentCard = String(c.card_id) === card?.id;
                          return (
                            <button
                              key={c.card_id}
                              onClick={() => {
                                if (paraIdx !== null) {
                                  setSourceHighlightIndex(paraIdx);
                                  const el = document.getElementById(`source-para-${paraIdx}`);
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[c.card_type] || 'bg-gray-100'} hover:opacity-80 transition-opacity ${isCurrentCard ? 'ring-2 ring-purple-500' : ''}`}
                              title={c.title}
                            >
                              {c.location_in_source}
                            </button>
                          );
                        })}
                        {sourceMarkdownData.cards.length > 8 && (
                          <span className="text-xs text-gray-400 px-1">+{sourceMarkdownData.cards.length - 8}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                        title="回到顶部"
                      >
                        <ArrowUp size={12} /> 顶部
                      </button>
                      <button
                        onClick={() => {
                          const lastCard = sourceMarkdownData.cards[sourceMarkdownData.cards.length - 1];
                          if (lastCard) {
                            const paraMatch = (lastCard.location_in_source || '').match(/第(\d+)段/);
                            const paraIdx = paraMatch ? parseInt(paraMatch[1]) : null;
                            if (paraIdx !== null) {
                              setSourceHighlightIndex(paraIdx);
                              const el = document.getElementById(`source-para-${paraIdx}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }
                        }}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                        title="跳到最后一张卡片"
                      >
                        末卡片 <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>

                  {/* 卡片导航列表（完整版） */}
                  {sourceMarkdownData.cards.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">关联卡片导航</p>
                      <div className="flex flex-wrap gap-2">
                        {sourceMarkdownData.cards.map((c: any) => {
                          const colorMap: Record<string, string> = {
                            blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600',
                            red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          };
                          // 解析段落号用于锚点跳转
                          const paraMatch = (c.location_in_source || '').match(/第(\d+)段/);
                          const paraIdx = paraMatch ? parseInt(paraMatch[1]) : null;
                          return (
                            <button
                              key={c.card_id}
                              onClick={() => {
                                if (paraIdx !== null) {
                                  const el = document.getElementById(`source-para-${paraIdx}`);
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[c.card_type] || 'bg-gray-100'} hover:opacity-80 transition-opacity`}
                            >
                              {c.location_in_source}: {(c.title || '').slice(0, 15)}...
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Markdown 正文（分段 + 高亮当前卡片段落） */}
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    {(() => {
                      const md = sourceMarkdownData.source_file.markdown_content;
                      // 去掉标题头（文件名和元信息行）
                      const headerPattern = new RegExp('^# .+?\\n\\n>.+?\\n\\n---\\n\\n', 's');
                      const body = md.replace(headerPattern, '');
                      // 按 \n\n 分段
                      const paragraphs = body.split(/\n\n+/).filter((p: string) => p.trim());
                      return paragraphs.map((p: string, i: number) => {
                        // 找出哪些卡片对应此段落
                        const matchingCards = sourceMarkdownData.cards.filter((c: any) => {
                          const m = (c.location_in_source || '').match(/第(\d+)段/);
                          return m ? parseInt(m[1]) === i + 1 : false;
                        });
                        const isHighlighted = matchingCards.length > 0;
                        const isCurrentCard = matchingCards.some((c: any) => String(c.card_id) === card?.id);
                        return (
                          <div
                            id={`source-para-${i + 1}`}
                            key={i}
                            className={`mb-4 p-3 rounded-lg border transition-colors ${
                              isCurrentCard
                                ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-300'
                                : isHighlighted
                                ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20'
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                            }`}
                          >
                            {/* 段落号标记 + 匹配的卡片标签 */}
                            {isHighlighted && (
                              <div className="flex items-center gap-2 mb-2 -mt-1">
                                <span className="text-[10px] text-gray-400 font-mono">#{i + 1}</span>
                                {matchingCards.map((c: any) => (
                                  <span
                                    key={c.card_id}
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      String(c.card_id) === card?.id
                                        ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 font-bold'
                                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}
                                  >
                                    {c.title?.slice(0, 12)}
                                    {String(c.card_id) === card?.id ? ' ←' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-sans">{p}</pre>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 任务编辑弹窗 */}
      {editingTask && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={() => setEditingTask(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ListTodo size={18} className="text-green-500" />
                编辑任务
              </h3>
              <button onClick={() => setEditingTask(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">任务标题 *</label>
                <input
                  value={editTaskTitle}
                  onChange={e => setEditTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">任务描述</label>
                <textarea
                  value={editTaskDesc}
                  onChange={e => setEditTaskDesc(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">优先级</label>
                  <select value={editTaskPriority} onChange={e => setEditTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">分类</label>
                  <select value={editTaskCategory} onChange={e => setEditTaskCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                    <option value="inbox">收集箱</option>
                    <option value="today">今日待办</option>
                    <option value="later">将来可能</option>
                    <option value="archive">归档</option>
                    <option value="projects">项目</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">截止日期</label>
                <input
                  type="date"
                  value={editTaskDueDate}
                  onChange={e => setEditTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleSaveTask}
                disabled={savingTask || !editTaskTitle.trim()}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
              >
                {savingTask ? <Loader size={14} className="animate-spin" /> : null}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CardDetailModal;
