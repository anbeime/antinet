/**
 * 会议卡片面板组件
 * 在虚拟会议中展示四色知识卡片（Agent提取 + 人类查询命中）
 * 支持保存到知识库功能，支持点击标题查看详情
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, X } from 'lucide-react';
import { MeetingCard, CardColor, CARD_COLOR_MAP, CARD_COLOR_CSS } from '@/types/card';

// ==================== 卡片颜色样式映射 ====================
const CARD_STYLE_MAP: Record<CardColor, { bg: string; border: string; badge: string }> = {
  blue:   { bg: 'bg-blue-900/30',    border: 'border-blue-700/40',   badge: 'bg-blue-600/80' },
  green:  { bg: 'bg-green-900/30',   border: 'border-green-700/40',  badge: 'bg-green-600/80' },
  yellow: { bg: 'bg-yellow-900/30',  border: 'border-yellow-700/40', badge: 'bg-yellow-600/80' },
  red:    { bg: 'bg-red-900/30',      border: 'border-red-700/40',    badge: 'bg-red-600/80' },
};

// 卡片类型图标
const CARD_ICON_MAP: Record<CardColor, string> = {
  blue: '📋', green: '🔗', yellow: '⚠️', red: '🎯'
};

interface MeetingCardPanelProps {
  cards: MeetingCard[];
  onSaveCard?: (card: MeetingCard) => void;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 最多显示多少张卡片（折叠时） */
  maxCollapsed?: number;
}

/**
 * 卡片详情弹窗
 */
export const CardDetailPopup: React.FC<{
  card: MeetingCard;
  onClose: () => void;
}> = ({ card, onClose }) => {
  const color = card.card_type as CardColor;
  const style = CARD_STYLE_MAP[color] || CARD_STYLE_MAP.blue;
  const icon = CARD_ICON_MAP[color] || '📋';
  const typeName = CARD_COLOR_MAP[color] || '未知';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <motion.div
        className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* 弹窗内容 */}
      <motion.div
        className={`relative w-full max-w-lg rounded-xl border ${style.border} bg-gray-900 shadow-2xl overflow-hidden`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${style.border} ${style.bg}`}>
          <div className="flex items-center gap-2">
            <span className={`${style.badge} text-white text-xs px-2 py-0.5 rounded font-medium`}>
              {icon} {typeName}
            </span>
            <span className="text-white text-sm font-semibold truncate">{card.title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
            {card.content || '(无内容)'}
          </p>
        </div>

        {/* 底部信息 */}
        <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {card.source === 'agent_extracted' && card.agent_name && (
              <span className="text-gray-400 text-xs">🤖 {card.agent_name} 提取</span>
            )}
            {card.source === 'human_query' && (
              <span className="text-gray-400 text-xs">🔍 知识库查询</span>
            )}
            {card.agent_name && card.source === 'human_query' && (
              <span className="text-gray-400 text-xs">📁 {card.agent_name}</span>
            )}
            {card.match_score !== undefined && card.match_score > 0 && (
              <span className="text-gray-500 text-xs">匹配度: {(card.match_score * 100).toFixed(0)}%</span>
            )}
          </div>
          {card.round && (
            <span className="text-gray-500 text-xs">第 {card.round} 轮</span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/**
 * 单张会议卡片组件
 */
const MeetingCardItem: React.FC<{
  card: MeetingCard;
  onSave?: (card: MeetingCard) => void;
  onClick?: (card: MeetingCard) => void;
}> = ({ card, onSave, onClick }) => {
  const color = card.card_type as CardColor;
  const style = CARD_STYLE_MAP[color] || CARD_STYLE_MAP.blue;
  const icon = CARD_ICON_MAP[color] || '📋';
  const typeName = CARD_COLOR_MAP[color] || '未知';
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${style.border} ${style.bg} p-3 sm:p-2.5 transition-all hover:border-opacity-70 cursor-pointer active:scale-[0.98]`}
      onClick={() => onClick?.(card)}
    >
      {/* 卡片头部：类型标签 + 标题 + 详情/保存按钮 */}
      <div className="flex items-start justify-between gap-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={`${style.badge} text-white text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap`}>
            {icon} {typeName}
          </span>
          <span
            className="text-white text-xs font-medium truncate cursor-pointer hover:text-blue-300 hover:underline transition-colors"
            onClick={() => onClick?.(card)}
            title="点击查看详情"
          >
            {card.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onClick?.(card)}
            className="p-1 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-900/30 transition-colors"
            title="查看详情"
          >
            <span className="text-xs">ℹ️</span>
          </button>
          {onSave && (
            <button
              onClick={() => onSave(card)}
              disabled={card.saved}
              className={`flex-shrink-0 p-1 rounded transition-colors ${
                card.saved
                  ? 'text-green-400 cursor-default'
                  : 'text-gray-500 hover:text-blue-400 hover:bg-blue-900/30'
              }`}
              title={card.saved ? '已添加到输入框' : '添加到输入框'}
            >
              {card.saved ? <BookmarkCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <Bookmark className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* 卡片内容 */}
      <div className="mt-1.5" onClick={e => e.stopPropagation()}>
        <p
          className={`text-gray-400 text-xs leading-relaxed ${
            !expanded && card.content.length > 60 ? 'line-clamp-2' : ''
          }`}
          onClick={() => setExpanded(!expanded)}
        >
          {card.content}
        </p>
        {card.content.length > 60 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-400/60 text-[10px] mt-0.5 hover:text-blue-400"
          >
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      {/* 卡片来源标签 */}
      <div className="mt-1.5 flex items-center gap-2">
        {card.source === 'agent_extracted' && card.agent_name && (
          <span className="text-gray-500 text-[10px]">🤖 {card.agent_name} 提取</span>
        )}
        {card.source === 'human_query' && (
          <span className="text-gray-500 text-[10px]">🔍 知识库查询</span>
        )}
        {card.match_score !== undefined && card.match_score > 0 && (
          <span className="text-gray-500 text-[10px]">匹配度: {(card.match_score * 100).toFixed(0)}%</span>
        )}
      </div>
    </motion.div>
  );
};

/**
 * 会议卡片面板 - 展示会议中所有卡片
 */
const MeetingCardPanel: React.FC<MeetingCardPanelProps> = ({
  cards,
  onSaveCard,
  defaultExpanded = true,
  maxCollapsed = 3,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [selectedCard, setSelectedCard] = useState<MeetingCard | null>(null);

  if (!cards || cards.length === 0) return null;

  // 按颜色分组
  const cardsByColor: Record<string, MeetingCard[]> = {};
  for (const card of cards) {
    const ct = card.card_type;
    if (!cardsByColor[ct]) cardsByColor[ct] = [];
    cardsByColor[ct].push(card);
  }

  const displayCards = expanded ? cards : cards.slice(0, maxCollapsed);

  return (
    <div className="space-y-2">
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs font-medium">📑 会议卡片</span>
          <span className="text-gray-600 text-[10px]">{cards.length} 张</span>
          {/* 四色计数 */}
          <div className="flex gap-1">
            {(['blue', 'green', 'yellow', 'red'] as CardColor[]).map(color => {
              const count = (cardsByColor[color] || []).length;
              if (count === 0) return null;
              return (
                <span
                  key={color}
                  className="text-[10px] px-1 rounded"
                  style={{ color: CARD_COLOR_CSS[color] }}
                >
                  {CARD_ICON_MAP[color]}{count}
                </span>
              );
            })}
          </div>
        </div>
        <button className="text-gray-500 hover:text-gray-300">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 卡片列表 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {displayCards.map((card, idx) => (
                <MeetingCardItem
                  key={`${card.source}-${card.title}-${idx}`}
                  card={card}
                  onSave={onSaveCard}
                  onClick={setSelectedCard}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 卡片详情弹窗 */}
      <AnimatePresence>
        {selectedCard && (
          <CardDetailPopup
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </AnimatePresence>

      {/* 显示更多/更少 */}
      {cards.length > maxCollapsed && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-blue-400/60 text-[10px] hover:text-blue-400 w-full text-center"
        >
          还有 {cards.length - maxCollapsed} 张卡片，点击展开
        </button>
      )}
    </div>
  );
};

export default MeetingCardPanel;
