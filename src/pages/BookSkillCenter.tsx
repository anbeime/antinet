/**
 * BookSkillCenter - 书籍方法论中心
 * 四色知识管理系统集成：提取方法论(黄) → 问题匹配 → 案例回填(蓝)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, BookMarked, Search, Plus,
  ArrowRight, FileText, BrainCircuit, Sparkles,
  Library, Lightbulb, TrendingUp, CheckCircle, Zap,
  Loader, ChevronRight, Clock,
  Book, FileUp, Link2, X, ExternalLink,
  Trash2, Edit3
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

type TabType = 'extract' | 'notes' | 'topics' | 'books';

const TABS = [
  { key: 'extract' as TabType, label: '提取方法论', icon: BookOpen, color: 'text-yellow-500' },
  { key: 'notes' as TabType, label: '我的笔记', icon: BookMarked, color: 'text-green-500' },
  { key: 'topics' as TabType, label: '专题', icon: Library, color: 'text-purple-500' },
  { key: 'books' as TabType, label: '书籍书架', icon: Book, color: 'text-blue-500' },
];

const FOUR_COLORS = {
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-300', icon: Lightbulb, label: '方法论' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300', icon: BookMarked, label: '案例' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', text: 'text-green-700 dark:text-green-300', icon: BrainCircuit, label: '解释' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700', text: 'text-red-700 dark:text-red-300', icon: Zap, label: '行动' },
};

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
          {activeTab === 'notes' && <NotesPanel />}
          {activeTab === 'topics' && <TopicsPanel />}
          {activeTab === 'books' && <BooksPanel />}
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
              {loadingTopics && <Loader size={12} className="animate-spin text-purple-500 ml-1" />}
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

// ============ 我的笔记 - PDF 批注卡片队列 ============
const NotesPanel: React.FC = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('bookskill_notes') || '[]');
    setNotes(saved);
    const handle = () => {
      const s = JSON.parse(localStorage.getItem('bookskill_notes') || '[]');
      setNotes(s);
    };
    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, []);

  const filtered = notes.filter((n: any) =>
    !filter || n.title?.toLowerCase().includes(filter.toLowerCase()) || n.content?.toLowerCase().includes(filter.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const removeFromNotes = (id: string) => {
    const filtered = notes.filter((n: any, i: number) => (n.id || String(i)) !== id);
    setNotes(filtered);
    localStorage.setItem('bookskill_notes', JSON.stringify(filtered));
    const s = new Set(selectedIds);
    s.delete(id);
    setSelectedIds(s);
    toast.success('已移除');
  };

  const clearAll = () => {
    localStorage.removeItem('bookskill_notes');
    setNotes([]);
    setSelectedIds(new Set());
    toast.success('笔记队列已清空');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <BookMarked size={18} className="text-green-500" />
            笔记队列
            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
              {notes.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600">清空</button>
            )}
            <a href="/pdf-viewer" target="_blank"
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600">
              <ExternalLink size={12} /> 去 PDF 批注
            </a>
          </div>
        </div>

        {/* 搜索 */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-green-400" />
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border border-dashed rounded-lg">
            <BookMarked size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">笔记队列空着</p>
            <p className="text-xs mt-1">在 PDF 预览页面勾选卡片 → 添加到笔记</p>
            <a href="/pdf-viewer" target="_blank"
              className="inline-block mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
              去添加笔记
            </a>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map((note: any, idx: number) => {
              const id = note.id || String(idx);
              const colorClass = note.card_type === 'blue' ? 'border-l-blue-400 bg-blue-50 dark:bg-blue-900/20' :
                                 note.card_type === 'green' ? 'border-l-green-400 bg-green-50 dark:bg-green-900/20' :
                                 note.card_type === 'red' ? 'border-l-red-400 bg-red-50 dark:bg-red-900/20' :
                                 'border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
              return (
                <div key={id} className="relative group">
                  <div className={`p-4 rounded-lg border border-l-4 cursor-pointer transition-all ${colorClass} ${selectedIds.has(id) ? 'ring-2 ring-green-400' : 'border-gray-100 dark:border-gray-700'}`}
                    onClick={() => toggleSelect(id)}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={selectedIds.has(id)} onChange={() => {}}
                        className="mt-1 w-4 h-4 rounded text-green-500 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{note.title}</h3>
                          <button onClick={(e) => { e.stopPropagation(); removeFromNotes(id); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity">
                            <Trash2 size={12} className="text-gray-400" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-wrap line-clamp-3">{note.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
                            {note.card_type === 'blue' ? '📋 事实' : note.card_type === 'green' ? '🔗 关联' : note.card_type === 'red' ? '🎯 行动' : '⚠️ 风险'}
                          </span>
                          {note.addedAt && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock size={10} /> {new Date(note.addedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 已选笔记预览 */}
      {selectedIds.size > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-5 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Edit3 size={14} className="text-green-500" />
            已选笔记预览 (Markdown)
            <span className="text-xs text-gray-400">共 {selectedIds.size} 条</span>
          </h3>
          <textarea readOnly rows={8}
            value={filtered.filter((_, i) => selectedIds.has(String(notes.findIndex((n: any, j: number) => (n.id || String(j)) === (notes.find((_, k: number) => (notes[k]?.id || String(k)) === (notes[i]?.id || String(i))))?.id || String(notes.indexOf(_))))))
              .map(n => `【${n.title || '无标题'}】\n${n.content || ''}`).join('\n\n---\n\n')}
            className="w-full p-3 text-sm font-mono border rounded-lg bg-gray-50 dark:bg-gray-700 resize-none outline-none" />
          <p className="text-xs text-gray-400 text-center">勾选笔记 → 上方自动生成 Markdown 文本</p>
        </div>
      )}
    </div>
  );
};

// ============ 专题 ============

const TopicsPanel: React.FC = () => {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [booksInTopic, setBooksInTopic] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/research/projects').then(r => r.ok ? r.json() : []).then(setTopics).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const selectTopic = async (t: any) => {
    setSelectedTopic(t);
    try {
      const res = await fetch(`/api/research/projects/${t.id}/cards`);
      if (res.ok) {
        const cards = await res.json();
        const bookMap = new Map<string, any[]>();
        (cards || []).forEach((c: any) => {
          const key = c.book_name || c.source || c.category || '默认';
          if (!bookMap.has(key)) bookMap.set(key, []);
          bookMap.get(key)!.push(c);
        });
        setBooksInTopic(Array.from(bookMap.entries()).map(([name, list]) => ({ name, count: list.length, cards: list })));
      }
    } catch {}
  };

  if (loading) return <div className="text-center py-12"><Loader size={24} className="animate-spin mx-auto text-purple-500" /></div>;

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左侧：专题列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Library size={18} className="text-purple-500" />研究专题 ({topics.length})</h2>
        {topics.length === 0 ? (
          <div className="text-center py-8 text-gray-400"><Library size={48} className="mx-auto mb-3 opacity-40" /><p>暂无专题</p></div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {topics.map((t: any) => (
              <button key={t.id} onClick={() => selectTopic(t)}
                className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  selectedTopic?.id === t.id ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Library size={16} className="text-purple-500 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{t.name}</span>
                </div>
                <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 右侧：专题卡片预览 */}
      <div>
        {selectedTopic ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-5 space-y-4 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><BookMarked size={16} className="text-yellow-500" />{selectedTopic.name}</h3>
              <a href={`/pdf-viewer?topic=${encodeURIComponent(selectedTopic.name)}`} target="_blank"
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600">
                <FileText size={12} /> 去批注
              </a>
            </div>
            {booksInTopic.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">该专题暂无卡片</p>
            ) : (
              <div className="space-y-4">
                {booksInTopic.map((book, bi) => (
                  <div key={bi} className="space-y-2">
                    <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-yellow-700 dark:text-yellow-300">{book.name}</span>
                        <span className="text-xs text-yellow-500">{book.count} 张</span>
                      </div>
                    </div>
                    <div className="pl-4 space-y-1.5">
                      {book.cards.map((c: any, ci: number) => (
                        <div key={ci} className={`p-3 rounded-lg border border-l-4 cursor-pointer ${
                          c.card_type === 'blue' ? 'border-l-blue-400 bg-blue-50 dark:bg-blue-900/20' :
                          c.card_type === 'green' ? 'border-l-green-400 bg-green-50 dark:bg-green-900/20' :
                          c.card_type === 'red' ? 'border-l-red-400 bg-red-50 dark:bg-red-900/20' :
                          'border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                        }`}>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{c.title}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-8 text-center text-gray-400">
            <Library size={48} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">选择一个专题查看卡片</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ 书籍书架 ============

const BooksPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <div className="text-center py-12"><Loader size={24} className="animate-spin mx-auto text-blue-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Book size={18} className="text-blue-500" />我的书架</h2>
          <a href="/pdf-viewer" target="_blank"
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600">
            <Plus size={12} /> 添加书籍 PDF
          </a>
        </div>
        <div className="text-center py-12 text-gray-400 border border-dashed rounded-lg">
          <Book size={48} className="mx-auto mb-3 opacity-40" />
          <p>可选择以下方式阅读批注</p>
          <div className="flex gap-3 justify-center mt-4">
            <a href="/pdf-viewer" target="_blank"
              className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
              <FileText size={14} /> PDF 批注阅读
            </a>
            <a href="/pdf-viewer?mode=markdown" target="_blank"
              className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
              <FileText size={14} /> Markdown 编辑
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};



export default BookSkillCenter;