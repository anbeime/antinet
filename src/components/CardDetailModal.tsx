import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight, ExternalLink, Share2, Bookmark, Edit2, Trash2, Clock, Lightbulb, Plus } from 'lucide-react';
import { toast } from 'sonner';

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

const CardDetailModal: React.FC<CardDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  card, 
  allCards,
  onDelete,
  onRelatedCardClick,
  onUpdateCard,
  onCreateRecommendedCard
}) => {
  // 控制更多洞察的显示/隐藏
  const [showMoreInsights, setShowMoreInsights] = useState(false);
  // 控制关联编辑模式
  const [isEditingRelations, setIsEditingRelations] = useState(false);
  // 存储当前编辑中的关联列表
  const [editingRelatedCards, setEditingRelatedCards] = useState<string[]>([]);
  // 搜索关联卡片的查询
  const [searchQuery, setSearchQuery] = useState('');
  // 显示搜索建议
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 当卡片数据变化时，更新编辑中的关联列表
  React.useEffect(() => {
    if (card) {
      setEditingRelatedCards([...card.relatedCards]);
    }
  }, [card?.relatedCards]);

  // 如果没有卡片数据或模态框未打开，则不渲染
  if (!isOpen || !card) return null;

  // 获取关联卡片的详细信息
  const relatedCardsDetails = editingRelatedCards.map(id => 
    allCards.find(c => c.id === id)
  ).filter((card): card is KnowledgeCard => card !== undefined);

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

  // 过滤可关联的卡片
  const filterAvailableCards = () => {
    // 排除当前卡片和已经关联的卡片
    return allCards.filter(availableCard => 
      availableCard.id !== card.id && 
      !editingRelatedCards.includes(availableCard.id) &&
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
  const saveRelationChanges = () => {
    const updatedCard = {
      ...card,
      relatedCards: editingRelatedCards
    };
    
    // 确保关联卡片数据不为undefined
    if (!updatedCard.relatedCards) {
      updatedCard.relatedCards = [];
    }
    
    // 调用父组件的更新函数
    onUpdateCard(updatedCard);
    
    // 退出编辑模式
    setIsEditingRelations(false);
    
    // 显示成功提示
    toast('关联卡片已更新', {
      className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
    });
  };

  // 取消关联编辑
  const cancelRelationEdit = () => {
    setEditingRelatedCards([...card.relatedCards]);
    setIsEditingRelations(false);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 模态框头部 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className={`${cardTypeMap[card.color].color} w-3 h-3 rounded-full mr-2`}></div>
            <h2 className="text-xl font-bold">{card.title}</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="分享"
            >
              <Share2 size={18} />
            </button>
            <button 
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="收藏"
            >
              <Bookmark size={18} />
            </button>
            <button 
              className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              aria-label="编辑"
              onClick={() => {
                toast('编辑功能开发中，敬请期待！', {
                  icon: <Edit2 size={16} />,
                  className: 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                });
              }}
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
              <div className={`${cardTypeMap[card.color].color} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                {card.address}
              </div>
            </div>
            <p className="text-lg leading-relaxed whitespace-pre-line">{card.content}</p>
          </div>
          
          {/* 关联卡片 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">关联卡片</h3>
              {!isEditingRelations ? (
                <button 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    onClick={() => {
                      setIsEditingRelations(true);
                      // 进入编辑模式时，延迟显示建议列表，确保DOM已更新
                      setTimeout(() => {
                        setShowSuggestions(true);
                      }, 100);
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
              // 查看模式
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
              // 编辑模式
              <div className="space-y-4">
                {/* 已关联卡片 */}
                {editingRelatedCards.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {relatedCardsDetails.map(relatedCard => (
                      <div 
                        key={relatedCard.id}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                      >
                        <div className={`${cardTypeMap[relatedCard.color].color} w-2 h-2 rounded-full mr-2`}></div>
                        <span>{relatedCard.title}</span>
                        <button 
                          type="button"
                          onClick={() => removeRelatedCard(relatedCard.id)}
                          className="ml-2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                 {/* 搜索关联卡片 */}
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
                  
                  {/* 搜索建议下拉框 - 自动显示可选卡片 */}
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
          
           {/* AI分析建议 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-6 border border-blue-100 dark:border-blue-800">
            <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-300">AI知识洞察</h3>
            <div className="space-y-3">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                这张卡片与您知识体系中的多个核心概念相关联，是连接不同知识领域的重要节点。
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                建议您进一步探索与"{card.title}"相关的最新研究和实践，以丰富这一核心概念的深度和广度。
              </p>
              <div className="mt-4 flex justify-end">
                <button 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                  onClick={() => setShowMoreInsights(!showMoreInsights)}
                >
                  {showMoreInsights ? '收起洞察' : '查看更多洞察'} <ExternalLink size={14} className="ml-1" />
                </button>
              </div>
            </div>

            {/* 更多AI洞察详情 */}
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
                {/* 洞察维度1：知识重要性分析 */}
                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">知识重要性分析</h4>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-blue-700 dark:text-blue-400">在知识体系中的重要性</span>
                    <span className="text-xs font-medium text-blue-800 dark:text-blue-300">85%</span>
                  </div>
                  <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <p className="mt-2 text-xs text-blue-700 dark:text-blue-400">
                    这张卡片是您知识体系中的关键节点，与多个核心概念相关联，对整体知识网络的完整性有重要影响。
                  </p>
                </div>

                {/* 洞察维度2：关联强度分析 */}
                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">关联强度分析</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {relatedCardsDetails.slice(0, 2).map((related, index) => (
                      <div key={index} className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex items-center mb-1">
                          <div className={`${cardTypeMap[related.color].color} w-2 h-2 rounded-full mr-2`}></div>
                          <span className="text-xs font-medium">{related.title}</span>
                        </div>
                        <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${80 - index * 10}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-blue-600 dark:text-blue-400">{80 - index * 10}% 关联强度</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 洞察维度3：知识空白识别 */}
                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">知识空白识别</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                    系统检测到与"{card.title}"相关的以下知识空白：
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0">
                        <Lightbulb size={10} />
                      </div>
                      <span className="text-xs text-blue-700 dark:text-blue-400">
                        缺乏与{card.title}相关的最新行业案例研究
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0">
                        <Lightbulb size={10} />
                      </div>
                      <span className="text-xs text-blue-700 dark:text-blue-400">
                        与实际项目应用的关联不足，建议添加具体实践案例
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 洞察维度4：发展建议 */}
                <div className="mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">知识发展建议</h4>
                  <div className="space-y-2">
                    <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-100 dark:border-green-800">
                      <p className="text-xs text-green-800 dark:text-green-300">
                        <span className="font-medium">建议1:</span> 补充与"{card.title}"相关的最新研究成果和理论发展
                      </p>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-100 dark:border-green-800">
                      <p className="text-xs text-green-800 dark:text-green-300">
                        <span className="font-medium">建议2:</span> 建立与实际项目的连接，添加应用案例和实践经验
                      </p>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-100 dark:border-green-800">
                      <p className="text-xs text-green-800 dark:text-green-300">
                        <span className="font-medium">建议3:</span> 探索与"{card.title}"相关的交叉学科知识，拓展知识广度
                      </p>
                    </div>
                  </div>
                </div>

                {/* 洞察维度5：推荐相关卡片 */}
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">推荐相关卡片</h4>
                  <div className="space-y-2">
                       {[
                      { title: "知识管理系统的最佳实践", reason: "补充方法论知识" },
                      { title: "AI在知识发现中的应用", reason: "拓展技术应用场景" },
                      { title: "组织学习与知识创新", reason: "增强理论深度" }
                    ].map((rec, index) => (
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
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CardDetailModal;