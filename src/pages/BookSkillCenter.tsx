/**
 * BookSkillCenter - 书籍方法论中心
 * 四色知识管理系统集成：提取方法论(黄) → 问题匹配 → 案例回填(蓝)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, BookMarked, Search, MessageSquare, Plus,
  ArrowRight, Save, FileText, BrainCircuit, Sparkles,
  Library, Lightbulb, TrendingUp, CheckCircle, Zap,
  Loader, AlertCircle, ChevronRight, Star, Clock,
  Book, FileUp, Download, Link2, X, ExternalLink, Filter
} from 'lucide-react';
import { skillService } from '@/services/skillService';
import { researchProjectService } from '@/services/dataService';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { CARD_COLOR_MAP, CARD_COLOR_CSS } from '@/types/card';
import AppHeader from '@/components/AppHeader';

// ============ Types ============
interface BookMethodology {
  methodology_id: string;
  book_name: string;
  book_author: string;
  name_en: string;
  name_cn: string;
  trigger_scenario: string;
  description: string;
  steps: string[];
  output_format: string;
  examples: string;
  usage_count: number;
  created_at: string;
  command_name: string;
}

// ============ Tab Config ============
type TabType = 'extract' | 'query' | 'case' | 'bookshelf';

interface CaseStudy {
  case_id: string;
  book_name: string;
  methodology_name: string;
  problem: string;
  solution: string;
  outcome: string;
  created_at: string;
}

const FOUR_COLORS = {
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-300', icon: Lightbulb, label: '方法论' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300', icon: BookMarked, label: '案例' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', text: 'text-green-700 dark:text-green-300', icon: BrainCircuit, label: '解释' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700', text: 'text-red-700 dark:text-red-300', icon: Zap, label: '行动' },
};

interface TabConfig {
  key: TabType;
  label: string;
  icon: React.ElementType;
  color: string;
}

const TABS: TabConfig[] = [
  { key: 'extract', label: '提取方法论', icon: BookOpen, color: 'text-yellow-500' },
  { key: 'query', label: '问题匹配', icon: Search, color: 'text-blue-500' },
  { key: 'case', label: '案例沉淀', icon: CheckCircle, color: 'text-green-500' },
  { key: 'bookshelf', label: '书籍书架', icon: Library, color: 'text-purple-500' },
];

// ============ Main Component ============
const BookSkillCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('extract');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Load statistics on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await skillService.getBookSkillStats();
      setStats(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <AppHeader />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookMarked className="text-yellow-500" size={32} />
            Book Skill Generator
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            把书籍方法论变成随时待命的 AI 顾问 · 四色知识管理系统集成
          </p>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader size={16} className="animate-spin" />
            加载统计...
          </div>
        ) : stats ? (
          <div className="flex gap-3 flex-wrap items-center">
            <StatBadge icon={BookOpen} value={stats.total_books} label="书籍" color="yellow" />
            <StatBadge icon={Lightbulb} value={stats.total_methodologies} label="方法论" color="yellow" />
            <StatBadge icon={CheckCircle} value={stats.total_case_studies} label="案例" color="blue" />
            {stats.total_methodologies > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                <TrendingUp size={14} />
                活跃中
              </div>
            )}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.md';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const text = await file.text();
                    localStorage.setItem('book_skill_import_text', text);
                    setActiveTab('extract');
                    toast.success(`已加载文件: ${file.name}`);
                  }
                };
                input.click();
              }}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="导入文件"
            >
              <FileUp size={14} />
            </button>
            <button
              onClick={() => {
                const url = getApiBaseUrl() + '/api/knowledge/cards?type=methodology&limit=5';
                fetch(url).then(r => r.ok ? toast.success('API 连接正常') : toast.error('API 异常')).catch(() => toast.error('API 不可达'));
              }}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
              title="连接测试"
            >
              <Link2 size={14} />
            </button>
            <button
              onClick={() => setActiveTab('extract')}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800/40 transition-colors"
            >
              <Plus size={14} />
              新增书籍
            </button>
          </div>
        ) : null}
      </motion.div>

      {/* Four-Color Flow Diagram */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-yellow-50 via-blue-50 to-green-50 dark:from-yellow-900/10 dark:via-blue-900/10 dark:to-green-900/10 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-center gap-2 md:gap-4 text-xs md:text-sm flex-wrap">
          {[
            { label: '📕 书籍输入', c: 'yellow' as const },
            { label: '🟡 提取方法论', c: 'yellow' as const },
            { label: '🤖 AI 顾问推演', c: 'blue' as const },
            { label: '🔵 案例沉淀', c: 'blue' as const },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              {i > 0 && <ArrowRight size={16} className="text-gray-400" />}
              <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-medium ${FOUR_COLORS[step.c].bg} ${FOUR_COLORS[step.c].text}`}>
                {step.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      {/* Color Legend */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400">
        {Object.entries(CARD_COLOR_MAP).map(([key, val]) => (
          <span key={key} className={`flex items-center gap-1 px-2 py-0.5 rounded ${CARD_COLOR_CSS[key as keyof typeof CARD_COLOR_CSS] ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>
            {val} ({key})
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} className={activeTab === tab.key ? tab.color : ''} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'extract' && <ExtractPanel onComplete={loadStats} />}
          {activeTab === 'query' && <QueryPanel />}
          {activeTab === 'case' && <CasePanel onComplete={loadStats} />}
          {activeTab === 'bookshelf' && <BookshelfPanel />}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
};

// ============ Stat Badge ============
const StatBadge: React.FC<{
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
}> = ({ icon: Icon, value, label, color }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
    color === 'yellow' ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20' :
    color === 'blue' ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' :
    'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
  }`}>
    <Icon size={16} className={`${color === 'yellow' ? 'text-yellow-500' : color === 'blue' ? 'text-blue-500' : 'text-green-500'}`} />
    <span className="font-bold text-lg">{value}</span>
    <span className="text-xs text-gray-500">{label}</span>
  </div>
);

// ============ Extract Panel ============
const ExtractPanel: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [mode, setMode] = useState<'text' | 'notes'>('text');
  const [bookName, setBookName] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topicCards, setTopicCards] = useState<any[]>([]);
  const [booksInTopic, setBooksInTopic] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [enableLLM, setEnableLLM] = useState(false);
  const [pdfAnnotations, setPdfAnnotations] = useState<any[]>([]); // PDF 标注卡片
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [selectedAnnotations, setSelectedAnnotations] = useState<Set<string>>(new Set());

  // 加载专题列表 - 使用 Research Project API
  useEffect(() => {
    const loadTopics = async () => {
      setLoadingTopics(true);
      try {
        const data = await researchProjectService.getAll();
        setTopics(data || []);
      } catch { /* ignore */ }
      setLoadingTopics(false);
    };
    loadTopics();
  }, []);

  // 当选择专题时，加载该专题下的书籍列表
  useEffect(() => {
    const loadTopicBooks = async () => {
      if (!selectedTopic) {
        setTopicCards([]);
        setBooksInTopic([]);
        setContent('');
        return;
      }
      try {
        const projects = await researchProjectService.getAll();
        const project = projects.find((p: any) => p.name === selectedTopic);
        if (project && project.id) {
          const cards = await researchProjectService.getCards(project.id);
          setTopicCards(cards || []);
          
          // 按书籍/来源分组
          const bookMap = new Map<string, any[]>();
          cards.forEach((c: any) => {
            const bookKey = c.book_name || c.source || c.category || '默认';
            if (!bookMap.has(bookKey)) {
              bookMap.set(bookKey, []);
            }
            bookMap.get(bookKey)!.push(c);
          });
          
          const books = Array.from(bookMap.entries()).map(([name, cardList]) => ({
            name,
            count: cardList.length,
            cards: cardList
          }));
          setBooksInTopic(books);
        }
      } catch { /* ignore */ }
    };
loadTopicBooks();
  }, [selectedTopic]);

  // 加载 PDF 标注笔记（从 localStorage 笔记队列）
  useEffect(() => {
    const loadNotes = () => {
      if (mode !== 'notes') {
        setPdfAnnotations([]);
        setSelectedAnnotations(new Set());
        return;
      }
      setLoadingAnnotations(true);
      try {
        const saved = JSON.parse(localStorage.getItem('bookskill_notes') || '[]');
        setPdfAnnotations(saved);
      } catch { /* ignore */ }
      setLoadingAnnotations(false);
    };
    loadNotes();
    
    // 监听 localStorage 变化（当在其他标签页添加笔记时）
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bookskill_notes') loadNotes();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [mode]);

  const toggleAnnotation = (id: string) => {
    const newSelected = new Set(selectedAnnotations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAnnotations(newSelected);
    
    // 更新内容 - 使用 id 匹配
    const selectedCards = pdfAnnotations.filter((a: any, i: number) => newSelected.has(a.id || String(i)));
    if (selectedCards.length > 0) {
      const combined = selectedCards.map((c: any) => 
        `【${c.title || '无标题'}】\n${c.content || ''}`
      ).join('\n\n---\n\n');
      setContent(combined);
    } else {
      setContent('');
    }
  };

  const handleExtract = async () => {
    let modelToUse = enableLLM ? 'local-7b' : undefined;
    
    if (!content.trim()) {
      toast.error('请填写书籍内容或笔记');
      return;
    }
    
    setLoading(true);
    setResult(null);
    try {
      let data;
      if (mode === 'notes') {
        data = await skillService.extractBookSkillFromNotes(content, bookName, bookAuthor);
      } else {
        data = await skillService.extractBookSkill(content, bookName, bookAuthor, modelToUse);
      }
      setResult(data);
      toast.success(`成功提取 ${data.methodologies?.length || 0} 个方法论`);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || '提取失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={18} className="text-yellow-500" />
            书籍输入
          </h2>

          {/* Mode toggle */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setMode('text')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                mode === 'text' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
              }`}
            >
              <Book size={14} className="inline mr-1" /> 书籍原文
            </button>
            <button
              onClick={() => setMode('notes')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                mode === 'notes' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
              }`}
            >
              <FileText size={14} className="inline mr-1" /> 我的笔记
            </button>
          </div>

          {/* 专题快速选择 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Library size={14} className="text-purple-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">从专题提取</span>
            </div>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
            >
              <option value="">-- 选择专题 --</option>
              {topics.map((t: any) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* LLM 增强开关 */}
          {selectedTopic && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-purple-500" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">LLM 增强提取</span>
                <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableLLM}
                    onChange={(e) => setEnableLLM(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-xs text-purple-600 dark:text-purple-400">启用</span>
                </label>
              </div>
              <p className="text-[10px] text-purple-600 dark:text-purple-400">
                💡 启用后使用 7B 模型进行增强提取
              </p>
            </div>
          )}

          {/* 书籍原文 / 笔记输入 */}
          <input
            type="text"
            placeholder="书籍名称（选填）"
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
          />
          <input
            type="text"
            placeholder="作者（选填）"
            value={bookAuthor}
            onChange={(e) => setBookAuthor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
          />
          <textarea
            placeholder={mode === 'text' ? "粘贴书籍核心章节内容..." : "从下方选择标注卡片，或直接编辑..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={mode === 'notes' ? 4 : 10}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none"
          />
          
          {/* PDF 标注卡片选择 - 仅笔记模式显示 */}
          {mode === 'notes' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  PDF 笔记队列 ({selectedAnnotations.size}/{pdfAnnotations.length})
                </span>
                <div className="flex items-center gap-2">
                  {pdfAnnotations.length > 0 && (
                    <button
                      onClick={() => {
                        localStorage.removeItem('bookskill_notes');
                        setPdfAnnotations([]);
                        setSelectedAnnotations(new Set());
                        setContent('');
                        toast.success('笔记队列已清空');
                      }}
                      className="text-[10px] text-red-500 hover:text-red-600"
                    >
                      清空
                    </button>
                  )}
                  <a href="/pdf-viewer" target="_blank" className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                    去标注 PDF →
                  </a>
                </div>
              </div>
              {loadingAnnotations ? (
                <div className="text-center py-4 text-xs text-gray-400"><Loader size={14} className="animate-spin inline mr-1" />加载中...</div>
              ) : pdfAnnotations.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <p>笔记队列空着</p>
                  <p className="mt-1">在 PDF 预览页面勾选卡片 → 添加到笔记</p>
                  <a href="/pdf-viewer" target="_blank" className="inline-block mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                    去添加笔记
                  </a>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {pdfAnnotations.map((ann: any, idx: number) => {
                    const isSelected = selectedAnnotations.has(ann.id || idx);
                    const colorClass = ann.card_type === 'blue' ? 'border-l-blue-400 bg-blue-50 dark:bg-blue-900/20' :
                                       ann.card_type === 'green' ? 'border-l-green-400 bg-green-50 dark:bg-green-900/20' :
                                       ann.card_type === 'yellow' ? 'border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' :
                                       ann.card_type === 'red' ? 'border-l-red-400 bg-red-50 dark:bg-red-900/20' :
                                       'border-l-gray-400 bg-gray-50 dark:bg-gray-800';
                    return (
                      <div key={ann.id || idx} className="relative group">
                        <button
                          onClick={() => toggleAnnotation(ann.id || String(idx))}
                          className={`w-full text-left p-2.5 rounded border cursor-pointer border-l-4 transition-all ${colorClass} ${
                            isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : 'border-gray-100 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input type="checkbox" checked={isSelected} onChange={() => {}}
                              className="mt-0.5 w-3.5 h-3.5 rounded text-amber-500 cursor-pointer" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{ann.title}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{ann.content}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const id = ann.id || String(idx);
                                const newSet = new Set(selectedAnnotations);
                                newSet.delete(id);
                                setSelectedAnnotations(newSet);
                                const filtered = pdfAnnotations.filter((a: any, i: number) => (a.id || String(i)) !== id);
                                setPdfAnnotations(filtered);
                                localStorage.setItem('bookskill_notes', JSON.stringify(filtered));
                                toast.success('已移除');
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity"
                            >
                              <X size={12} className="text-gray-400" />
                            </button>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] text-gray-400 text-center">
                勾选卡片自动填充到文本框，点击 ❌ 从队列移除
              </p>
            </div>
          )}
          
          <button
            onClick={handleExtract}
            disabled={loading || !content.trim()}
            className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <><Loader size={16} className="animate-spin" /> 提取中...</>
            ) : (
              <><Sparkles size={16} /> 提取方法论</>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <div>
        {/* 专题卡片预览 */}
        {!result && selectedTopic && topicCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Library size={18} className="text-purple-500" />
                专题卡片预览
              </h2>
              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-800 rounded text-purple-600 dark:text-purple-300">
                {topicCards.length} 张
              </span>
            </div>
            
            {/* 按书籍分组显示卡片 */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {booksInTopic.map((book, bi) => (
                <div key={bi} className="space-y-2">
                  {/* 书籍标题 - 可点击 */}
                  <button
                    onClick={() => {
                      const combinedContent = book.cards.map((c: any) => 
                        `【${c.title || '无标题'}】\n${c.content || ''}`
                      ).join('\n\n---\n\n');
                      setContent(combinedContent);
                      setBookName(book.name);
                    }}
                    className="w-full text-left p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700 hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/40 dark:hover:to-orange-900/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Book size={16} className="text-yellow-600 dark:text-yellow-400" />
                        <span className="font-medium text-yellow-700 dark:text-yellow-300">{book.name}</span>
                      </div>
                      <span className="text-xs text-yellow-500 dark:text-yellow-400">
                        {book.count} 张卡片
                      </span>
                    </div>
                  </button>
                  
                  {/* 卡片列表 - 带颜色的卡片 */}
                  <div className="pl-4 space-y-2">
                    {book.cards.map((c: any, ci: number) => {
                      const colorClass = c.card_type === 'blue' ? 'border-l-blue-400 bg-blue-50 dark:bg-blue-900/20' :
                                         c.card_type === 'green' ? 'border-l-green-400 bg-green-50 dark:bg-green-900/20' :
                                         c.card_type === 'red' ? 'border-l-red-400 bg-red-50 dark:bg-red-900/20' :
                                         'border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
                      return (
                        <button
                          key={ci}
                          onClick={() => {
                            setContent(`【${c.title || '无标题'}】\n${c.content || ''}`);
                            setBookName(book.name);
                          }}
                          className={`w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer ${colorClass} hover:shadow-md transition-shadow`}
                        >
                          <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{c.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{c.content}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-gray-400 text-center">
              点击书籍或卡片填充内容
            </p>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4"
          >
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Lightbulb size={18} className="text-yellow-500" />
              提取结果
            </h2>
            <p className="text-sm text-gray-500">
              从《{result.book_skill?.book_name || bookName}》提取了 <strong className="text-yellow-600">{result.methodologies?.length || 0}</strong> 个方法论
            </p>

            {/* Four-color sync indicator */}
            {result.yellow_cards_synced > 0 && (
              <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                <CheckCircle size={14} />
                已同步 {result.yellow_cards_synced} 个方法论到四色系统🟡黄色卡片
              </div>
            )}

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {(result.methodologies || []).map((m: BookMethodology, i: number) => (
                <div key={m.methodology_id} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800/30 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">#{i + 1}</span>
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm mt-0.5">{m.name_cn}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{m.name_en}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-200 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300 font-medium">🟡 方法论</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{m.trigger_scenario}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(m.steps || []).slice(0, 3).map((step, si) => (
                      <span key={si} className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-gray-500">
                        {si + 1}. {step.slice(0, 20)}...
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-mono">{m.command_name}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ============ Query Panel ============
const QueryPanel: React.FC = () => {
  const [problem, setProblem] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseOutcome, setCaseOutcome] = useState('');

  const handleQuery = async () => {
    if (!problem.trim()) {
      toast.error('请描述你遇到的问题');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await skillService.queryBookMethodology(problem, bookFilter || undefined);
      setResult(data);
      setShowCaseForm(false);
    } catch (err: any) {
      toast.error(err.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCase = async () => {
    if (!result?.matched_methodologies?.length) return;
    const m = result.matched_methodologies[0];
    try {
      await skillService.saveBookCaseStudy(
        m.book_name,
        m.name_cn,
        problem,
        result.guide?.slice(0, 500) || '',
        caseOutcome
      );
      toast.success('✅ 案例已沉淀到四色蓝色卡片！');
      setShowCaseForm(false);
      setCaseOutcome('');
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Search size={18} className="text-blue-500" />
            描述你的问题
          </h2>
          <p className="text-xs text-gray-500">AI 会自动匹配最合适的书籍方法论，像教练一样引导你解决问题</p>
          <input
            type="text"
            placeholder="限定书籍范围（选填，如《精益创业》）"
            value={bookFilter}
            onChange={(e) => setBookFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <textarea
            placeholder="描述你遇到的实际问题，越具体越好..."
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          />
          <button
            onClick={handleQuery}
            disabled={loading || !problem.trim()}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <><Loader size={16} className="animate-spin" /> 匹配中...</>
            ) : (
              <><MessageSquare size={16} /> 匹配方法论</>
            )}
          </button>
        </div>
      </div>

      {/* AI Guide Result */}
      <div>
        {result && result.status === 'success' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4"
          >
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BrainCircuit size={18} className="text-blue-500" />
              AI 顾问建议
            </h2>

            {result.matched_methodologies?.length > 0 && (
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  📖 匹配到来自《{result.matched_methodologies[0].book_name}》的方法论：<strong>{result.matched_methodologies[0].name_cn}</strong>
                </p>
              </div>
            )}

            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {result.guide}
            </div>

            {!showCaseForm ? (
              <button
                onClick={() => setShowCaseForm(true)}
                className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={16} /> 把这次实践记入蓝色案例卡片
              </button>
            ) : (
              <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                  <CheckCircle size={14} /> 记录实践结果
                </p>
                <textarea
                  placeholder="描述你的实际执行结果..."
                  value={caseOutcome}
                  onChange={(e) => setCaseOutcome(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCase}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    保存蓝色卡片 🔵
                  </button>
                  <button
                    onClick={() => setShowCaseForm(false)}
                    className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {result && result.status === 'no_methodologies' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">还没有提取过书籍方法论</p>
            <p className="text-sm text-gray-400 mt-1">请先在「提取方法论」页面添加书籍</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ Case Panel ============
const CasePanel: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [bookName, setBookName] = useState('');
  const [methodName, setMethodName] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [outcome, setOutcome] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedCases, setSavedCases] = useState<CaseStudy[]>([]);
  const [caseFilter, setCaseFilter] = useState('');

  const handleSave = async () => {
    if (!bookName || !methodName || !problem || !solution) {
      toast.error('请填写完整信息');
      return;
    }
    setLoading(true);
    try {
      await skillService.saveBookCaseStudy(bookName, methodName, problem, solution, outcome);
      toast.success('✅ 案例已保存为蓝色卡片！');
      const newCase: CaseStudy = { case_id: Date.now().toString(), book_name: bookName, methodology_name: methodName, problem, solution, outcome, created_at: new Date().toISOString() };
      setSavedCases(prev => [...prev, newCase]);
      setBookName('');
      setMethodName('');
      setProblem('');
      setSolution('');
      setOutcome('');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <CheckCircle size={18} className="text-green-500" />
          手动记录案例 → 蓝色卡片回填
        </h2>
        <p className="text-xs text-gray-500">
          将使用方法论解决问题的过程记录为蓝色案例卡片，形成「理论 → 推演 → 实践」的增强回路
        </p>
        {[
          { label: '书籍名称', val: bookName, set: setBookName, ph: '如《非暴力沟通》' },
          { label: '方法论名称', val: methodName, set: setMethodName, ph: '如「对话氛围重建法」' },
        ].map((f) => (
          <input
            key={f.label}
            type="text"
            placeholder={f.ph}
            value={f.val}
            onChange={(e) => f.set(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        ))}
        {[
          { label: '遇到的问题', val: problem, set: setProblem, rows: 3 },
          { label: '解决方案', val: solution, set: setSolution, rows: 4 },
          { label: '实际结果（选填）', val: outcome, set: setOutcome, rows: 2 },
        ].map((f) => (
          <textarea
            key={f.label}
            placeholder={f.label}
            value={f.val}
            onChange={(e) => f.set(e.target.value)}
            rows={f.rows}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
          />
        ))}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <><Loader size={16} className="animate-spin" /> 保存中...</> : <><Save size={16} /> 保存 → 蓝色卡片 🔵</>}
        </button>
        {savedCases.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="搜索已保存案例..."
                value={caseFilter}
                onChange={(e) => setCaseFilter(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500 outline-none"
              />
              <span className="text-xs text-gray-400">{savedCases.length} 条</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ Bookshelf Panel ============
const BookshelfPanel: React.FC = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await skillService.listBookSkills();
      setBooks(data.books || []);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBook = async (bookName: string) => {
    setSelectedBook(null);
    try {
      const data = await skillService.getBookSkill(bookName);
      setSelectedBook(data);
    } catch {
      toast.error('获取书籍详情失败');
    }
  };

  const filteredBooks = books.filter((b: any) =>
    !filterText || b.book_name?.toLowerCase().includes(filterText.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12"><Loader size={32} className="animate-spin mx-auto text-blue-500" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="筛选书籍..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-8 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {filterText && (
              <button onClick={() => setFilterText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={loadBooks}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            title="刷新"
          >
            <Loader size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {filteredBooks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Library size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">书架还是空的</p>
            <p className="text-sm text-gray-400 mt-1">先在「提取方法论」页面添加书籍吧</p>
          </div>
        ) : (
          (filteredBooks || []).map((b: any) => (
            <button
              key={b.book_id}
              onClick={() => handleSelectBook(b.book_name)}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-yellow-300 dark:hover:border-yellow-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-yellow-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">《{b.book_name}》</p>
                      {b.usage_count > 0 && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {b.book_author && <p className="text-xs text-gray-400">{b.book_author}</p>}
                      {b.last_used && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock size={10} />
                          {new Date(b.last_used).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full">
                    🟡 {b.methodology_count} 方法论
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Book Detail */}
      <div>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BookMarked size={18} className="text-yellow-500" />
                《{selectedBook.book_name}》
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { navigator.clipboard?.writeText(JSON.stringify(selectedBook, null, 2)); toast.success('已导出为 JSON'); }}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                  title="导出为 JSON"
                >
                  <Download size={14} />
                </button>
                {selectedBook.book_id && (
                  <button
                    onClick={() => window.open(`/book-skill?book=${selectedBook.book_id}`, '_blank')}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500"
                    title="在新标签页打开"
                  >
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded">
                🟡 方法论: {selectedBook.methodology_count}
              </span>
              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                🔵 蓝色卡片: {selectedBook.total_cards_generated?.blue || 0}
              </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {(selectedBook.methodologies || []).map((m: BookMethodology) => (
                <div key={m.methodology_id} className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={14} className="text-yellow-500" />
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{m.name_cn}</span>
                    <span className="text-[10px] text-gray-400">{m.name_en}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">适用场景: {m.trigger_scenario}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">{m.command_name}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BookSkillCenter;
