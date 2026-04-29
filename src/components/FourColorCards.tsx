/**
 * 四色卡片组件
 * 展示 NPU 分析生成的四色卡片（事实/解释/风险/行动）
 * 支持语音朗读功能
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { chatService } from '@/services/chatService';
import { speechService } from '@/config/api';

interface CardType {
  card_id: string;
  card_type: string;
  title: string;
  content: string;
  category: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
  similarity?: number;
}

interface ColorStyle {
  bg: string;
  border: string;
  text: string;
  bgLight: string;
  darkBg: string;
  darkText: string;
}

const colorMap: Record<'blue' | 'green' | 'yellow' | 'red', ColorStyle> = {
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

const categoryIcons: Record<'事实' | '解释' | '风险' | '行动', string> = {
  '事实': '[实]',
  '解释': '[解]',
  '风险': '[险]',
  '行动': '[动]',
};

// 后端API返回的卡片格式转换为组件需要的格式
function convertApiCardToComponentCard(apiCard: any): CardType | null {
  // 安全检查
  if (!apiCard || typeof apiCard !== 'object') {
    console.warn('Invalid card data:', apiCard);
    return null;
  }

  const content = apiCard.content || {};
  let contentText = '';

  if (typeof content === 'object' && content !== null) {
    // 根据卡片类型提取内容
    if (content.description) contentText = content.description;
    else if (content.explanation) contentText = content.explanation;
    else if (content.risk) contentText = content.risk;
    else if (content.action) contentText = content.action;
    else contentText = JSON.stringify(content, null, 2);
  } else if (typeof content === 'string') {
    contentText = content;
  }

  // 清理markdown格式
  contentText = contentText
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n{3,}/g, '\n\n');

  // 映射card_type到color
  const colorMapType: Record<string, 'blue' | 'green' | 'yellow' | 'red'> = {
    'blue': 'blue',
    'green': 'green',
    'yellow': 'yellow',
    'red': 'red',
    '事实': 'blue',
    '解释': 'green',
    '风险': 'yellow',
    '行动': 'red'
  };
  
  const cardType = apiCard.card_type || apiCard.type || 'blue';
  const color: 'blue' | 'green' | 'yellow' | 'red' = colorMapType[cardType] || 'blue';

  // 映射card_type到category
  const categoryMap: Record<string, string> = {
    'blue': '事实',
    'green': '解释',
    'yellow': '风险',
    'red': '行动'
  };
  const category = apiCard.category || categoryMap[cardType] || '事实';

  return {
    card_id: apiCard.card_id || apiCard.id || `card_${Math.random()}`,
    card_type: cardType,
    color: color,
    title: apiCard.title || '无标题',
    content: contentText || '无内容',
    category: category,
    similarity: apiCard.similarity
  };
}

export default function FourColorCards() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speakingCardId, setSpeakingCardId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const speakCard = async (card: CardType) => {
    if (speakingCardId === card.card_id) {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
      setSpeakingCardId(null);
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }

    try {
      const result = await speechService.speakCard(card.title, card.content);
      if (result?.audio_url) {
        const filename = result.audio_url.split('/').pop() || '';
        const audio = speechService.playAudio(speechService.getAudioUrl(filename));
        setCurrentAudio(audio);
        setSpeakingCardId(card.card_id);
        audio.onended = () => setSpeakingCardId(null);
      }
    } catch (err) {
      toast.error('朗读失败');
      setSpeakingCardId(null);
    }
  };

  // 从API加载四色卡片数据
  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        setError(null);

        // 调用API获取所有卡片
        const response = await chatService.listCards();
        
        // 安全检查：确保 response 和 cards 存在
        if (!response || !Array.isArray(response.cards)) {
          console.warn('Invalid response from listCards:', response);
          setCards([]);
          return;
        }

        // 转换API卡片格式为组件需要的格式，过滤掉无效的卡片
        const componentCards = response.cards
          .map(convertApiCardToComponentCard)
          .filter((card): card is CardType => card !== null);

        setCards(componentCards);
      } catch (err) {
        console.error('加载四色卡片失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
        // 不显示 toast，避免打扰用户
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-red-500 dark:text-red-400">
          <p className="mb-2">加载失败</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        暂无分析结果
      </div>
    );
  }

  // 按颜色分组统计
  const colorStats: Record<'blue' | 'green' | 'yellow' | 'red', number> = {
    blue: cards.filter(c => c.color === 'blue').length,
    green: cards.filter(c => c.color === 'green').length,
    yellow: cards.filter(c => c.color === 'yellow').length,
    red: cards.filter(c => c.color === 'red').length,
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
        {cards.map((card, index) => {
          const colors = colorMap[card.color];
          const icon = categoryIcons[card.category as keyof typeof categoryIcons] || '📌';

          return (
            <motion.div
              key={card.card_id}
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
                <button
                  onClick={() => speakCard(card)}
                  className={`mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    speakingCardId === card.card_id
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {speakingCardId === card.card_id ? (
                    <>⏹ 停止朗读</>
                  ) : (
                    <>🔊 朗读</>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
