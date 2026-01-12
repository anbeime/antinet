/**
 * 四色卡片组件
 * 展示 NPU 分析生成的四色卡片（事实/解释/风险/行动）
 */
import React from 'react';
import { motion } from 'framer-motion';
import { FourColorCard as CardType } from '@/services/npuService';

interface Props {
  cards: CardType[];
}

const colorMap = {
  blue: {
    bg: 'bg-blue-500',
    border: 'border-blue-600',
    text: 'text-blue-900',
    bgLight: 'bg-blue-50',
    darkBg: 'dark:bg-blue-900',
    darkText: 'dark:text-blue-100',
  },
  green: {
    bg: 'bg-green-500',
    border: 'border-green-600',
    text: 'text-green-900',
    bgLight: 'bg-green-50',
    darkBg: 'dark:bg-green-900',
    darkText: 'dark:text-green-100',
  },
  yellow: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-600',
    text: 'text-yellow-900',
    bgLight: 'bg-yellow-50',
    darkBg: 'dark:bg-yellow-900',
    darkText: 'dark:text-yellow-100',
  },
  red: {
    bg: 'bg-red-500',
    border: 'border-red-600',
    text: 'text-red-900',
    bgLight: 'bg-red-50',
    darkBg: 'dark:bg-red-900',
    darkText: 'dark:text-red-100',
  },
};

const categoryIcons = {
  '事实': '📊',
  '解释': '💡',
  '风险': '⚠️',
  '行动': '🎯',
};

export default function FourColorCards({ cards }: Props) {
  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        暂无分析结果
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card, index) => {
        const colors = colorMap[card.color];
        const icon = categoryIcons[card.category] || '📌';

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              rounded-lg border-2 overflow-hidden
              ${colors.border} ${colors.bgLight} ${colors.darkBg}
            `}
          >
            {/* 卡片头部 */}
            <div className={`${colors.bg} px-4 py-3 flex items-center gap-3`}>
              <span className="text-2xl">{icon}</span>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">
                  {card.title}
                </h3>
                <span className="text-white text-sm opacity-90">
                  {card.category}
                </span>
              </div>
            </div>

            {/* 卡片内容 */}
            <div className={`p-4 ${colors.text} ${colors.darkText}`}>
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {card.content}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
