/**
 * BookSkillCenter - 书籍阅读批注中心
 * 四色知识管理系统集成：PDF批注 → 我的笔记
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, BookMarked, FileText, Sparkles,
  Library, Loader, ChevronRight,
  Book, ExternalLink, Clock, X, CheckCircle, Trash2, Edit3, Search, Plus
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { CARD_COLOR_CSS } from '@/types/card';

type TabType = 'notes' | 'topics' | 'books';

const TABS = [
  { key: 'notes' as TabType, label: '我的笔记', icon: BookMarked, color: 'text-green-500' },
  { key: 'topics' as TabType, label: '专题', icon: Library, color: 'text-purple-500' },
  { key: 'books' as TabType, label: '书籍书架', icon: Book, color: 'text-blue-500' },
];

const BookSkillCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('notes');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <AppHeader />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <BookMarked className="text-yellow-500" size={32} />
            书籍阅读批注中心
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            PDF 读书批注 → 四色笔记管理
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.key ? tab.color : ''} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {activeTab === 'notes' && <NotesPanel />}
            {activeTab === 'topics' && <TopicsPanel />}
            {activeTab === 'books' && <BooksPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

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
            value={filtered.filter((_, i) => selectedIds.has(notes.findIndex((n: any, j: number) => (n.id || String(j)) === (notes.find((_, k: number) => (notes[k]?.id || String(k)) === (notes[i]?.id || String(i))))?.id || String(notes.indexOf(_)))))
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