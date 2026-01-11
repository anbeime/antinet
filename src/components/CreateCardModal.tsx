import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Brain, 
  Network, 
  Database, 
  Search, 
  X, 
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// 定义卡片类型
type CardColor = 'blue' | 'green' | 'yellow' | 'red';

// 卡片类型映射
const cardTypeMap = {
  blue: { 
    name: '核心概念', 
    description: '记录重要的想法、理论和主要观点',
    icon: <Brain size={18} />,
    color: 'bg-blue-500',
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  green: { 
    name: '关联链接', 
    description: '连接不同概念，发现隐性知识联系',
    icon: <Network size={18} />,
    color: 'bg-green-500',
    textColor: 'text-green-800',
    bgColor: 'bg-green-50 dark:bg-green-950/40',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  yellow: { 
    name: '参考来源', 
    description: '保存资料、文档和外部资源链接',
    icon: <Database size={18} />,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-800',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/40',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  red: { 
    name: '索引关键词', 
    description: '标记重要术语，便于快速检索和导航',
    icon: <Search size={18} />,
    color: 'bg-red-500',
    textColor: 'text-red-800',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-800'
  }
};

interface CardFormData {
  title: string;
  content: string;
  color: CardColor;
  address: string;
  relatedCards: string[];
}

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: CardFormData) => void;
  initialColor?: CardColor;
  existingCards: { id: string; title: string }[];
}

const CreateCardModal: React.FC<CreateCardModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialColor = 'blue',
  existingCards
}) => {
  const [formData, setFormData] = useState<CardFormData>({
    title: '',
    content: '',
    color: initialColor,
    address: '',
    relatedCards: []
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof CardFormData, string>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 当模态框打开时，重置表单
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        content: '',
        color: initialColor,
        address: '',
        relatedCards: []
      });
      setErrors({});
      setSearchQuery('');
      setShowSuggestions(false);
    }
  }, [isOpen, initialColor]);

  // 处理表单输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除对应字段的错误
    if (errors[name as keyof CardFormData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof CardFormData];
        return newErrors;
      });
    }
  };

  // 处理卡片类型选择
  const handleColorChange = (color: CardColor) => {
    setFormData(prev => ({ ...prev, color }));
  };

  // 生成地址建议
  const generateAddressSuggestion = () => {
    // 简单的地址生成逻辑，实际应用中可能需要更复杂的逻辑
    const colors: Record<CardColor, string> = {
      blue: 'A',
      green: 'B',
      yellow: 'C',
      red: 'D'
    };
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    return `${colors[formData.color]}${randomNumber}`;
  };

  // 自动生成地址
  const handleGenerateAddress = () => {
    setFormData(prev => ({ ...prev, address: generateAddressSuggestion() }));
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CardFormData, string>> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = '请输入卡片标题';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = '请输入卡片内容';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = '请输入卡片地址';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
      onClose();
      toast('卡片创建成功！', {
        icon: <CheckCircle size={16} />,
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } else {
      toast('请检查表单填写是否完整', {
        icon: <AlertCircle size={16} />,
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };

  // 过滤关联卡片建议
  const filteredSuggestions = existingCards.filter(card => 
    !formData.relatedCards.includes(card.id) && 
    card.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 添加关联卡片
  const addRelatedCard = (cardId: string) => {
    // 确保relatedCards数组存在
    const currentRelatedCards = formData.relatedCards || [];
    
    // 检查卡片是否已关联
    if (currentRelatedCards.includes(cardId)) {
      toast('该卡片已添加为关联卡片', {
        className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
      });
      return;
    }
    
    // 添加新的关联卡片
    setFormData(prev => ({
      ...prev,
      relatedCards: [...currentRelatedCards, cardId]
    }));
    
    // 清空搜索框并关闭建议列表
    setSearchQuery('');
    setShowSuggestions(false);
    
    // 显示成功提示
    const card = existingCards.find(c => c.id === cardId);
    if (card) {
      toast(`已添加关联卡片：${card.title}`, {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    }
  };

  // 移除关联卡片
  const removeRelatedCard = (cardId: string) => {
    setFormData(prev => ({
      ...prev,
      relatedCards: prev.relatedCards.filter(id => id !== cardId)
    }));
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">创建新卡片</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 卡片类型选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">选择卡片类型</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(cardTypeMap).map(([color, type]) => (
                <motion.button
                  key={color}
                  type="button"
                  onClick={() => handleColorChange(color as CardColor)}
                  whileHover={{ y: -2 }}
                  className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
                    formData.color === color 
                      ? `${type.bgColor} ${type.borderColor} shadow-sm` 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`${type.color} p-2 rounded-full mb-2 text-white`}>
                    {type.icon}
                  </div>
                  <span className={`text-sm font-medium ${formData.color === color ? type.textColor : ''}`}>
                    {type.name}
                  </span>
                </motion.button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {cardTypeMap[formData.color].description}
            </p>
          </div>
          
          {/* 卡片标题 */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">卡片标题 *</label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="输入卡片标题"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                errors.title 
                  ? 'border-red-500 focus:ring-red-500/20 dark:border-red-400' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600'
              } dark:bg-gray-700`}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {errors.title}
              </p>
            )}
          </div>
          
          {/* 卡片内容 */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">卡片内容 *</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="输入卡片内容..."
              rows={5}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors resize-none ${
                errors.content 
                  ? 'border-red-500 focus:ring-red-500/20 dark:border-red-400' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600'
              } dark:bg-gray-700`}
            />
            {errors.content && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {errors.content}
              </p>
            )}
          </div>
          
          {/* 卡片地址 */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium mb-2">卡片地址 *</label>
            <div className="flex space-x-2">
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                placeholder="输入卡片地址（如：A1, B2）"
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                  errors.address 
                    ? 'border-red-500 focus:ring-red-500/20 dark:border-red-400' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600'
                } dark:bg-gray-700`}
              />
              <button 
                type="button" 
                onClick={handleGenerateAddress}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                自动生成
              </button>
            </div>
            {errors.address && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {errors.address}
              </p>
            )}
          </div>
          
          {/* 关联卡片 */}
          <div>
            <label className="block text-sm font-medium mb-2">关联卡片</label>
            
            {/* 已关联卡片 */}
            {formData.relatedCards.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {formData.relatedCards.map(cardId => {
                  const card = existingCards.find(c => c.id === cardId);
                  return card ? (
                    <div 
                      key={cardId}
                      className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                    >
                      <span>{card.title}</span>
                      <button 
                        type="button"
                        onClick={() => removeRelatedCard(cardId)}
                        className="ml-2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : null;
                })}
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
              {showSuggestions && filteredSuggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {filteredSuggestions.map(card => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => addRelatedCard(card.id)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Plus size={16} className="mr-2 text-blue-500" />
                      <span>{card.title}</span>
                    </button>
                  ))}
                </motion.div>
              )}
              
              {showSuggestions && filteredSuggestions.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 text-sm text-gray-500 dark:text-gray-400">
                  未找到匹配的卡片
                </div>
              )}
            </div>
          </div>
          
          {/* 表单操作按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              创建卡片
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreateCardModal;