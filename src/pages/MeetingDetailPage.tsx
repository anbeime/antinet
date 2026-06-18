/**
 * 会议详情页 - 展示完整会议记录，支持从文本/卡片创建任务
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Clock,
  Calendar,
  Users,
  FileText,
  CheckSquare,
  MoreVertical,
  X,
  Plus,
  Link as LinkIcon,
  Quote,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';
import type { MeetingCard, CardColor } from '@/types/card';
import { CARD_COLOR_MAP, CARD_COLOR_CSS } from '@/types/card';

// ==================== 类型定义 ====================

interface MeetingDetail {
  id: number;
  meeting_id: string;
  topic: string;
  context: string;
  rounds: number;
  participants: string[];
  summary: string;
  decision: string;
  action_items: string[];
  cards?: MeetingCard[];
  all_speeches: Array<{
    agent_name: string;
    agent_title: string;
    system_prompt?: string;
    speech: string;
  }>;
  all_rounds: Array<{
    round: number;
    theme: string;
    speeches: Array<{
      agent_id: string;
      agent_name: string;
      agent_title: string;
      speech: string;
    }>;
  }>;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  created_at: string;
}

interface TaskFromMeetingRequest {
  title: string;
  description?: string;
  meeting_id: number;
  context_text?: string;
  source_card_id?: number;
  priority?: 'low' | 'medium' | 'high';
  category?: 'inbox' | 'today' | 'later' | 'archive' | 'projects';
  due_date?: string;
}

// ==================== 任务创建模态框 ====================

const CreateTaskFromMeetingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingDetail;
  sourceContext?: string;
  sourceCard?: MeetingCard | null;
  onSuccess: (task: any) => void;
}> = ({ isOpen, onClose, meeting, sourceContext, sourceCard, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState<'inbox' | 'today' | 'later'>('inbox');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 从来源上下文预填
      if (sourceContext) {
        const preview = sourceContext.length > 50 ? sourceContext.slice(0, 50) + '...' : sourceContext;
        setTitle(`跟进：${preview}`);
        setDescription(sourceContext);
      } else if (sourceCard) {
        setTitle(`跟进：${sourceCard.title}`);
        setDescription(sourceCard.content);
      } else {
        setTitle('');
        setDescription('');
      }
    }
  }, [isOpen, sourceContext, sourceCard]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('任务标题不能为空');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/meeting/tasks/from-meeting-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          meeting_id: meeting.id,
          context_text: sourceContext || undefined,
          source_card_id: sourceCard?.id,
          priority,
          category,
          due_date: dueDate || undefined
        } as TaskFromMeetingRequest)
      });

      const data = await res.json();

      if (data.success) {
        toast.success('任务创建成功');
        onSuccess(data.task);
        onClose();
        // 重置表单
        setTitle('');
        setDescription('');
        setDueDate('');
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (err) {
      console.error('创建任务失败:', err);
      toast.error('创建任务失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  从会议创建任务
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {/* 来源上下文 */}
              <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
                <div className="flex items-start gap-3">
                  <Quote className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                      来源会议
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                      {meeting.topic}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <Clock size={12} />
                      {new Date(meeting.start_time).toLocaleString('zh-CN')}
                      · {Math.round(meeting.duration_seconds / 60)} 分钟
                    </div>
                    {sourceContext && (
                      <div className="mt-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                        {sourceContext}
                      </div>
                    )}
                    {sourceCard && (
                      <div className="mt-2 p-2 rounded border" style={{ borderColor: CARD_COLOR_CSS[sourceCard.card_type], background: `${CARD_COLOR_CSS[sourceCard.card_type]}10` }}>
                        <div className="text-xs font-medium" style={{ color: CARD_COLOR_CSS[sourceCard.card_type] }}>
                          {CARD_COLOR_MAP[sourceCard.card_type]} · {sourceCard.title}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {sourceCard.content}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 表单 */}
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    任务标题 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="输入任务标题"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    任务描述
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                    placeholder="补充任务详情..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      优先级
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      分类
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="inbox">收集箱</option>
                      <option value="today">今日</option>
                      <option value="later">稍后</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      截止日期
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 底部 */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckSquare size={14} />
                  {saving ? '创建中...' : '创建任务'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ==================== 文本选择工具条 ====================

// 检测文本中的 URL 并渲染为可点击链接
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0; // 重置正则状态
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
        >
          {part.slice(0, 30)}{part.length > 30 ? '...' : ''}
          <ExternalLink size={12} />
        </a>
      );
    }
    return part;
  });
};

const TextSelectionToolbar: React.FC<{
  position: { x: number; y: number };
  onSelectCreateTask: () => void;
  onCopy: () => void;
  onClose: () => void;
}> = ({ position, onSelectCreateTask, onCopy, onClose }) => {
  return (
    <motion.div
      className="fixed z-[100] flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{ left: position.x, top: position.y }}
    >
      <button
        onClick={onSelectCreateTask}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
      >
        <Plus size={14} />
        创建任务
      </button>
      <button
        onClick={onCopy}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Copy size={14} />
        复制
      </button>
      <button
        onClick={onClose}
        className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

// ==================== 四色卡片组件 ====================

const MeetingCardWithActions: React.FC<{
  card: MeetingCard & { id?: number };
  onCreateTask: (card: MeetingCard & { id?: number }) => void;
}> = ({ card, onCreateTask }) => {
  const color = card.card_type as CardColor;
  const colorCss = CARD_COLOR_CSS[color] || '#3b82f6';
  const colorMap = CARD_COLOR_MAP[color] || '未知';
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className="relative rounded-lg border p-3 transition-all hover:shadow-md"
      style={{
        borderColor: `${colorCss}40`,
        background: `${colorCss}08`
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span
            className="text-white text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap"
            style={{ background: colorCss }}
          >
            {colorMap}
          </span>
          <span className="text-gray-800 dark:text-gray-200 text-sm font-medium truncate">
            {card.title}
          </span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute right-0 top-full mt-1 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 min-w-[140px]"
              >
                <button
                  onClick={() => {
                    onCreateTask(card);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
                >
                  <Plus size={14} />
                  创建为任务
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(card.content);
                    toast.success('已复制卡片内容');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Copy size={14} />
                  复制内容
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-xs mt-2 leading-relaxed">
        {card.content}
      </p>
    </div>
  );
};

// ==================== 主组件 ====================

const MeetingDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSource, setCreateSource] = useState<{
    context?: string;
    card?: MeetingCard & { id?: number };
  }>({});
  const [textSelection, setTextSelection] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 加载会议详情
  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }
    const loadMeeting = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/meeting/history/${meetingId}`);
        const data = await res.json();
        if (data.meeting) {
          setMeeting(data.meeting);
        }
      } catch (err) {
        console.error('加载会议失败:', err);
        toast.error('加载会议失败');
      } finally {
        setLoading(false);
      }
    };
    loadMeeting();
  }, [meetingId]);

  // 加载关联任务
  useEffect(() => {
    if (meeting?.id) {
      const loadTasks = async () => {
        try {
          const res = await fetch(`${getApiBaseUrl()}/api/meeting/tasks/from-meeting/${meeting.id}`);
          const data = await res.json();
          if (data.success) {
            setTasks(data.tasks);
          }
        } catch (err) {
          console.error('加载任务失败:', err);
        }
      };
      loadTasks();
    }
  }, [meeting?.id]);

  // 文本选择处理
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !contentRef.current) {
        setTextSelection(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 2) {
        setTextSelection(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setTextSelection({
        text,
        position: {
          x: rect.left + rect.width / 2 - 100,
          y: rect.bottom + window.scrollY + 8
        }
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleCreateTaskFromText = () => {
    if (!textSelection || !meeting) return;
    setCreateSource({ context: textSelection.text });
    setShowCreateModal(true);
    setTextSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleCreateTaskFromCard = (card: MeetingCard & { id?: number }) => {
    setCreateSource({ card });
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#121826' }}>
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#121826' }}>
        <div className="text-gray-400">会议不存在</div>
      </div>
    );
  }

  const durationMin = Math.round(meeting.duration_seconds / 60);

  return (
    <div className="min-h-screen" style={{ background: '#121826' }}>
      {/* 顶部导航 */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-4">
        <button
          onClick={() => navigate('/virtual-office-meeting')}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{meeting.topic}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <Clock size={12} /> {durationMin} 分钟
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {new Date(meeting.start_time).toLocaleDateString('zh-CN')}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} /> {meeting.participants?.length || 8} 位 Agent
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            // 导出会议记录
            const content = JSON.stringify(meeting, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `meeting-${meeting.meeting_id}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('会议记录已导出');
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-300 border border-gray-600/50 hover:border-gray-500 hover:text-white transition-colors"
          style={{ background: '#0f1729' }}
        >
          <Download size={14} />
          导出
        </button>
      </div>

      <div className="flex gap-5 p-5" style={{ height: 'calc(100vh - 80px)' }}>
        {/* 左侧：会议内容 */}
        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
          {/* 摘要和决策 */}
          <div className="rounded-xl border border-gray-700/50 p-5" style={{ background: '#1a2235' }}>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-yellow-500" />
              <span className="text-white font-medium text-sm">会议总结</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {meeting.summary || '无总结'}
            </p>
            
            {meeting.decision && (
              <>
                <div className="my-4 h-px bg-gray-700/50" />
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare size={18} className="text-green-500" />
                  <span className="text-white font-medium text-sm">决策</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {meeting.decision}
                </p>
              </>
            )}
          </div>

          {/* 行动项 */}
          {meeting.action_items?.length > 0 && (
            <div className="rounded-xl border border-gray-700/50 p-5" style={{ background: '#1a2235' }}>
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare size={18} className="text-red-500" />
                <span className="text-white font-medium text-sm">行动项</span>
              </div>
              <div className="space-y-2">
                {meeting.action_items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-red-900/10 border border-red-700/30"
                  >
                    <span className="text-red-400 text-xs font-medium flex-shrink-0">
                      {i + 1}.
                    </span>
                    <p className="text-gray-300 text-sm">{item}</p>
                    <button
                      onClick={() => handleCreateTaskFromCard({
                        card_type: 'red',
                        title: item.slice(0, 30),
                        content: item,
                        source: 'meeting_action'
                      } as any)}
                      className="ml-auto p-1 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-900/30 transition-colors"
                      title="创建为任务"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 知识卡片 */}
          {meeting.cards && meeting.cards.length > 0 && (
            <div className="rounded-xl border border-gray-700/50 p-5" style={{ background: '#1a2235' }}>
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon size={18} className="text-purple-500" />
                <span className="text-white font-medium text-sm">提取的知识卡片</span>
                <span className="text-gray-500 text-xs ml-auto">{meeting.cards.length} 张卡片</span>
              </div>
              <div className="space-y-3">
                {meeting.cards.map((card, i) => (
                  <MeetingCardWithActions
                    key={i}
                    card={card}
                    onCreateTask={handleCreateTaskFromCard}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 讨论记录 */}
          <div className="rounded-xl border border-gray-700/50 p-5" style={{ background: '#1a2235' }}>
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-blue-500" />
              <span className="text-white font-medium text-sm">讨论记录</span>
              <span className="text-gray-500 text-xs ml-auto">{meeting.all_speeches?.length || 0} 条发言</span>
            </div>
            <div ref={contentRef} className="space-y-3">
              {meeting.all_rounds?.map((round) => (
                <div key={round.round} className="rounded-lg border border-gray-700/30 overflow-hidden">
                  <div className="px-4 py-2 bg-gray-800/50 text-xs text-gray-400 font-medium">
                    第 {round.round} 轮：{round.theme}
                  </div>
                  <div className="p-3 space-y-2">
                    {round.speeches.map((speech, i) => (
                      <div key={i} className="flex gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, #6366f1, #8b5cf6)` }}
                        >
                          {speech.agent_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-xs font-medium">{speech.agent_name}</span>
                            <span className="text-gray-500 text-[10px]">{speech.agent_title}</span>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed mt-1">{renderTextWithLinks(speech.speech)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：关联任务 */}
        <div className="w-[320px] flex flex-col gap-4">
          <div className="rounded-xl border border-gray-700/50 flex flex-col" style={{ background: '#1a2235' }}>
            <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-green-500" />
                <span className="text-white font-medium text-sm">关联任务</span>
              </div>
              <button
                onClick={() => {
                  setCreateSource({});
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus size={14} />
                新建
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-sm mb-2">暂无关联任务</div>
                  <div className="text-gray-600 text-xs">
                    从文本或卡片创建任务
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-gray-700/40 p-3 hover:border-gray-600 transition-colors"
                      style={{ background: task.is_completed ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                          style={{
                            background: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#22c55e'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {task.title}
                          </div>
                          {task.source_context && (
                            <div className="text-gray-500 text-[10px] mt-1 line-clamp-2">
                              {task.source_context}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="text-[10px] px-1 rounded"
                              style={{
                                background: task.priority === 'high' ? '#ef444420' : task.priority === 'medium' ? '#f59e0b20' : '#22c55e20',
                                color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#22c55e'
                              }}
                            >
                              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                            </span>
                            {task.due_date && (
                              <span className="text-gray-500 text-[10px]">
                                {new Date(task.due_date).toLocaleDateString('zh-CN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 提示卡片 */}
          <div className="rounded-xl border border-blue-700/30 p-4" style={{ background: '#1a2235' }}>
            <div className="text-blue-400 text-xs font-medium mb-2">💡 操作提示</div>
            <ul className="text-gray-400 text-xs space-y-1.5">
              <li>• 选中任意文本，点击「创建任务」</li>
              <li>• 卡片右上角「···」菜单可创建任务</li>
              <li>• 行动项右侧「+」快速创建</li>
              <li>• 任务可回溯到源会议和原文</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 文本选择工具条 */}
      <AnimatePresence>
        {textSelection && (
          <TextSelectionToolbar
            position={textSelection.position}
            onSelectCreateTask={handleCreateTaskFromText}
            onCopy={() => {
              navigator.clipboard.writeText(textSelection.text);
              toast.success('已复制选中内容');
              setTextSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
            onClose={() => {
              setTextSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
          />
        )}
      </AnimatePresence>

      {/* 创建任务模态框 */}
      <CreateTaskFromMeetingModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateSource({});
        }}
        meeting={meeting}
        sourceContext={createSource.context}
        sourceCard={createSource.card}
        onSuccess={(task) => {
          setTasks(prev => [task, ...prev]);
        }}
      />
    </div>
  );
};

export default MeetingDetailPage;
