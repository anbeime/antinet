/**
 * 四色卡片组件
 * 展示 NPU 分析生成的四色卡片（事实/解释/风险/行动）
 */
import { motion } from 'framer-motion';
import { FourColorCard as CardType } from '@/services/npuService';

interface Props {
  cards: CardType[] | Record<string, CardType[]>;
  facts?: Record<string, CardType[]>;
  explanations?: Record<string, CardType[]>;
  risks?: Record<string, CardType[]>;
  actions?: Record<string, CardType[]>;
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

// 将所有卡片合并到一个数组
function mergeCards(
  cards?: CardType[] | Record<string, CardType[]>,
  additionalCards?: Record<string, CardType[]>
): CardType[] {
  let allCards: CardType[] = [];

  if (Array.isArray(cards)) {
    allCards = cards;
  } else if (typeof cards === 'object' && cards !== null) {
    Object.values(cards).forEach(cardArray => {
      allCards = allCards.concat(cardArray);
    });
  }

  if (additionalCards) {
    Object.values(additionalCards).forEach(cardArray => {
      allCards = allCards.concat(cardArray);
    });
  }

  return allCards;
}

export default function FourColorCards({ cards, facts, explanations, risks, actions }: Props) {
  // 合并所有卡片
  const allCards = mergeCards(cards, { ...facts, ...explanations, ...risks, ...actions });

  if (!allCards || allCards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        暂无分析结果
      </div>
    );
  }

  // 按颜色分组统计
  const colorStats = {
    blue: allCards.filter(c => c.color === 'blue').length,
    green: allCards.filter(c => c.color === 'green').length,
    yellow: allCards.filter(c => c.color === 'yellow').length,
    red: allCards.filter(c => c.color === 'red').length,
  };

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{colorStats.blue}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">核心概念</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{colorStats.green}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">关联链接</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{colorStats.yellow}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">参考来源</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{colorStats.red}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">索引关键词</div>
        </div>
      </div>

      {/* 卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allCards.map((card, index) => {
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
                  <h3 className="text-white font-bold text-lg truncate">
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
    </div>
  );
}
