/**
 * 会议卡片保存弹窗
 * 将会议中提取/查询的四色卡片保存到知识库
 * 表单预填 card_type/title/content，支持编辑后保存
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';
import type { MeetingCard, CardColor } from '@/types/card';
import { CARD_COLOR_CSS } from '@/types/card';

interface MeetingCardSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: MeetingCard | null;
  meetingId: string;
  topic: string;
  onSaved: (card: MeetingCard, cardId: number) => void;
}

const cardTypeOptions: { value: CardColor; label: string }[] = [
  { value: 'blue', label: '蓝色·事实' },
  { value: 'green', label: '绿色·解释' },
  { value: 'yellow', label: '黄色·风险' },
  { value: 'red', label: '红色·行动' },
];

export default function MeetingCardSaveModal({
  isOpen,
  onClose,
  card,
  meetingId,
  topic,
  onSaved,
}: MeetingCardSaveModalProps) {
  const [cardType, setCardType] = useState<CardColor>('blue');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  // 弹窗打开时同步预填数据
  useState(() => {
    if (card) {
      setCardType(card.card_type);
      setTitle(card.title);
      setContent(card.content);
    }
  });

  // 也可以用 useEffect 来响应 card 变化
  if (card && isOpen) {
    // 在每次 card prop 变化且有新卡片传入时更新表单
    if (title === '') {
      setCardType(card.card_type);
      setTitle(card.title);
      setContent(card.content);
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('卡片标题不能为空');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(getApiBaseUrl() + '/api/meeting/cards/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: {
            card_type: cardType,
            title: title.trim(),
            content: content.trim(),
          },
          meeting_id: meetingId,
          topic,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('卡片已保存到知识库');
        if (card) {
          onSaved(card, data.card_id);
        }
        onClose();
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (err) {
      console.error('[SaveCard] 保存失败:', err);
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* 弹窗 */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  保存卡片到知识库
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* 表单 */}
              <div className="px-5 py-4 space-y-4">
                {/* 卡片类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    卡片类型
                  </label>
                  <div className="flex gap-2">
                    {cardTypeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setCardType(opt.value)}
                        className={`px-3 py-1.5 text-xs rounded-lg border-2 transition-all ${
                          cardType === opt.value
                            ? 'border-current text-white'
                            : 'border-gray-200 dark:border-gray-600 text-gray-500'
                        }`}
                        style={
                          cardType === opt.value
                            ? { backgroundColor: CARD_COLOR_CSS[opt.value], borderColor: CARD_COLOR_CSS[opt.value] }
                            : {}
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 标题 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    卡片标题
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="输入卡片标题"
                    maxLength={100}
                  />
                </div>

                {/* 内容 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    卡片内容
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                    placeholder="输入或编辑卡片内容"
                  />
                </div>

                {/* 来源信息 */}
                {card && (
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    来源: {card.source === 'agent_extracted' 
                      ? `Agent「${card.agent_name}」提取` 
                      : '人工查询'} 
                    {meetingId && ` · 会议: ${meetingId.slice(0, 8)}...`}
                  </div>
                )}
              </div>

              {/* 底部操作 */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  {saving ? '保存中...' : '保存到知识库'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
