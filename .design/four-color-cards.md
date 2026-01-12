# 四色卡片设计规范

## 概述

四色卡片是 Antinet 智能知识管理系统的核心方法论,基于卢曼卡片盒方法,通过结构化的颜色分类实现知识的有效管理和沉淀。

## 设计理念

### 核心原则

1. **颜色明确**: 每种颜色代表特定的知识类型
2. **语义清晰**: 卡片内容与颜色类型高度一致
3. **视觉统一**: 统一的视觉设计和交互体验
4. **灵活扩展**: 支持自定义卡片类型和关联关系

### 设计目标

- ✅ 快速识别知识类型
- ✅ 促进知识关联
- ✅ 便于知识检索
- ✅ 支持知识演进

## 颜色系统

### 蓝色卡片 - 核心概念

**用途**: 记录重要的想法、理论和主要观点

**设计规范**:

```tsx
const blueCard = {
  color: 'blue',
  name: '核心概念',
  description: '记录重要的想法、理论和主要观点',
  icon: <Brain size={20} />,
  bg: 'bg-blue-500',
  hoverBg: 'bg-blue-600',
  textColor: 'text-blue-800',
  bgColor: 'bg-blue-50 dark:bg-blue-950/40',
  borderColor: 'border-blue-200 dark:border-blue-800'
};
```

**样式示例**:

```tsx
<motion.div className={`${blueCard.bgColor} border ${blueCard.borderColor} rounded-xl`}>
  <div className={`flex items-center gap-2 ${blueCard.color} p-3`}>
    {blueCard.icon}
    <span className="font-semibold">{blueCard.name}</span>
  </div>
  <div className="p-4 bg-white dark:bg-gray-800">
    <h3 className="font-bold mb-2">{card.title}</h3>
    <p className="text-gray-700 dark:text-gray-300">{card.content}</p>
  </div>
</motion.div>
```

**示例内容**:

- "卢曼卡片盒方法"
- "机器学习基础原理"
- "量子计算应用场景"

### 绿色卡片 - 关联链接

**用途**: 连接不同概念,发现隐性知识联系

**设计规范**:

```tsx
const greenCard = {
  color: 'green',
  name: '关联链接',
  description: '连接不同概念,发现隐性知识联系',
  icon: <Network size={20} />,
  bg: 'bg-green-500',
  hoverBg: 'bg-green-600',
  textColor: 'text-green-800',
  bgColor: 'bg-green-50 dark:bg-green-950/40',
  borderColor: 'border-green-200 dark:border-green-800'
};
```

**样式示例**:

```tsx
<motion.div className={`${greenCard.bgColor} border ${greenCard.borderColor} rounded-xl`}>
  <div className={`flex items-center gap-2 ${greenCard.color} p-3`}>
    {greenCard.icon}
    <span className="font-semibold">{greenCard.name}</span>
  </div>
  <div className="p-4 bg-white dark:bg-gray-800">
    <h3 className="font-bold mb-2">{card.title}</h3>
    <p className="text-gray-700 dark:text-gray-300">{card.content}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {card.relatedCards.map(id => (
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          关联: {id}
        </span>
      ))}
    </div>
  </div>
</motion.div>
```

**示例内容**:

- "卢曼方法与AI结合"
- "深度学习与强化学习的关系"
- "区块链与数据安全的关联"

### 黄色卡片 - 参考来源

**用途**: 保存资料、文档和外部资源链接

**设计规范**:

```tsx
const yellowCard = {
  color: 'yellow',
  name: '参考来源',
  description: '保存资料、文档和外部资源链接',
  icon: <Database size={20} />,
  bg: 'bg-yellow-500',
  hoverBg: 'bg-yellow-600',
  textColor: 'text-yellow-800',
  bgColor: 'bg-yellow-50 dark:bg-yellow-950/40',
  borderColor: 'border-yellow-200 dark:border-yellow-800'
};
```

**样式示例**:

```tsx
<motion.div className={`${yellowCard.bgColor} border ${yellowCard.borderColor} rounded-xl`}>
  <div className={`flex items-center gap-2 ${yellowCard.color} p-3`}>
    {yellowCard.icon}
    <span className="font-semibold">{yellowCard.name}</span>
  </div>
  <div className="p-4 bg-white dark:bg-gray-800">
    <h3 className="font-bold mb-2">{card.title}</h3>
    <p className="text-gray-700 dark:text-gray-300">{card.content}</p>
    {card.externalLink && (
      <a href={card.externalLink} className="mt-3 inline-flex items-center text-blue-600 hover:underline">
        <ExternalLink size={14} className="mr-1" />
        外部链接
      </a>
    )}
  </div>
</motion.div>
```

**示例内容**:

- "《如何阅读一本书》"
- "机器学习论文集"
- "技术博客存档"

### 红色卡片 - 索引关键词

**用途**: 标记重要术语,便于快速检索和导航

**设计规范**:

```tsx
const redCard = {
  color: 'red',
  name: '索引关键词',
  description: '标记重要术语,便于快速检索和导航',
  icon: <Search size={20} />,
  bg: 'bg-red-500',
  hoverBg: 'bg-red-600',
  textColor: 'text-red-800',
  bgColor: 'bg-red-50 dark:bg-red-950/40',
  borderColor: 'border-red-200 dark:border-red-800'
};
```

**样式示例**:

```tsx
<motion.div className={`${redCard.bgColor} border ${redCard.borderColor} rounded-xl`}>
  <div className={`flex items-center gap-2 ${redCard.color} p-3`}>
    {redCard.icon}
    <span className="font-semibold">{redCard.name}</span>
  </div>
  <div className="p-4 bg-white dark:bg-gray-800">
    <h3 className="font-bold mb-2">{card.title}</h3>
    <p className="text-gray-700 dark:text-gray-300">{card.content}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {card.tags.map(tag => (
        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
          #{tag}
        </span>
      ))}
    </div>
  </div>
</motion.div>
```

**示例内容**:

- "知识管理"
- "人工智能"
- "数据科学"

## 卡片数据结构

### TypeScript 接口

```typescript
type CardColor = 'blue' | 'green' | 'yellow' | 'red';

type CardCategory = '核心概念' | '关联链接' | '参考来源' | '索引关键词';

interface FourColorCard {
  id: string;
  color: CardColor;
  title: string;
  content: string;
  category: CardCategory;
  address: string;  // 卢曼地址,如 "A1"
  createdAt: string;
  updatedAt: string;
  relatedCards: string[];  // 关联卡片ID列表
  tags?: string[];  // 可选标签
  externalLink?: string;  // 可选外部链接
}
```

### Pydantic 模型

```python
from pydantic import BaseModel, Field
from typing import List, Optional

class FourColorCard(BaseModel):
    """四色卡片"""
    color: str = Field(..., description="卡片颜色: blue|green|yellow|red")
    title: str = Field(..., description="卡片标题")
    content: str = Field(..., description="卡片内容")
    category: str = Field(..., description="类别: 事实|解释|风险|行动")
```

## 卡片创建流程

### 前端创建流程

```tsx
// 1. 打开创建卡片模态框
const handleCreateCard = () => {
  setCreateModalColor('blue');  // 默认蓝色
  setShowCreateModal(true);
};

// 2. 填写卡片信息
const handleSubmit = (cardData: CardFormData) => {
  const newCard: FourColorCard = {
    id: `card-${Date.now()}`,
    title: cardData.title,
    content: cardData.content,
    color: cardData.color,
    address: cardData.address,
    createdAt: new Date().toISOString(),
    relatedCards: cardData.relatedCards || []
  };

  // 3. 保存到本地存储
  localStorage.setItem('antinet_cards', JSON.stringify([newCard, ...cards]));

  // 4. 显示成功提示
  toast('卡片创建成功！');
};
```

### 后端生成流程

```python
# 1. NPU 推理
result = model.infer(input_ids=input_ids)

# 2. 解析为四色卡片
cards = []

# 蓝色卡片 - 事实
cards.append(FourColorCard(
    color="blue",
    title="数据事实",
    content=fact_content,
    category="事实"
))

# 绿色卡片 - 解释
cards.append(FourColorCard(
    color="green",
    title="原因解释",
    content=explanation_content,
    category="解释"
))

# 黄色卡片 - 风险
cards.append(FourColorCard(
    color="yellow",
    title="风险预警",
    content=risk_content,
    category="风险"
))

# 红色卡片 - 行动
cards.append(FourColorCard(
    color="red",
    title="行动建议",
    content=action_content,
    category="行动"
))
```

## 卡片展示设计

### 列表视图

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredCards.map(card => (
    <motion.div
      key={card.id}
      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
      className={`border rounded-xl overflow-hidden ${cardTypeMap[card.color].borderColor}`}
    >
      <div className={`${cardTypeMap[card.color].bgColor} p-4 border-b ${cardTypeMap[card.color].borderColor}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className={`${cardTypeMap[card.color].color} p-2 rounded-full mr-3`}>
              {cardTypeMap[card.color].icon}
            </div>
            <h3 className="font-semibold">{card.title}</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${cardTypeMap[card.color].color} text-white`}>
            {card.address}
          </span>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800">
        <p className="text-gray-700 dark:text-gray-300 mb-4">{card.content}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(card.createdAt)}
          </span>
          <button onClick={() => openDetailModal(card)} className="text-blue-600 hover:underline text-sm">
            查看详情
          </button>
        </div>
      </div>
    </motion.div>
  ))}
</div>
```

### 详情视图

```tsx
<motion.div className="bg-white dark:bg-gray-800 rounded-xl p-6">
  {/* 卡片头部 */}
  <div className={`${cardTypeMap[card.color].bgColor} p-4 rounded-lg mb-4`}>
    <div className="flex items-center gap-2">
      {cardTypeMap[card.color].icon}
      <h2 className="text-xl font-bold">{card.title}</h2>
    </div>
  </div>

  {/* 卡片内容 */}
  <div className="mb-6">
    <p className="text-gray-700 dark:text-gray-300">{card.content}</p>
  </div>

  {/* 卡片元信息 */}
  <div className="grid grid-cols-2 gap-4 mb-6">
    <div>
      <span className="text-sm text-gray-500 dark:text-gray-400">地址</span>
      <p className="font-semibold">{card.address}</p>
    </div>
    <div>
      <span className="text-sm text-gray-500 dark:text-gray-400">创建时间</span>
      <p className="font-semibold">{formatDate(card.createdAt)}</p>
    </div>
  </div>

  {/* 关联卡片 */}
  {card.relatedCards.length > 0 && (
    <div className="mb-6">
      <h3 className="font-semibold mb-3">关联卡片</h3>
      <div className="flex flex-wrap gap-2">
        {card.relatedCards.map(id => {
          const relatedCard = cards.find(c => c.id === id);
          return relatedCard && (
            <button
              onClick={() => handleRelatedCardClick(id)}
              className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200"
            >
              {relatedCard.title}
            </button>
          );
        })}
      </div>
    </div>
  )}
</motion.div>
```

## 卡片搜索与筛选

### 搜索功能

```tsx
// 按标题和内容搜索
const filteredCards = cards.filter(card => {
  const searchQuery = searchQuery.toLowerCase();
  return (
    card.title.toLowerCase().includes(searchQuery) ||
    card.content.toLowerCase().includes(searchQuery) ||
    card.address.toLowerCase().includes(searchQuery)
  );
});
```

### 颜色筛选

```tsx
// 按颜色筛选
const filteredCards = cards.filter(card => {
  if (!selectedCardColor) return true;
  return card.color === selectedCardColor;
});
```

### 组合筛选

```tsx
// 搜索 + 颜色筛选
const filteredCards = cards.filter(card => {
  const colorMatch = !selectedCardColor || card.color === selectedCardColor;
  const searchMatch = !searchQuery ||
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.address.toLowerCase().includes(searchQuery.toLowerCase());

  return colorMatch && searchMatch;
});
```

## 卡片动画效果

### 进入动画

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3 }}
  className={cardClasses}
>
  {/* 卡片内容 */}
</motion.div>
```

### 悬停动画

```tsx
<motion.div
  whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
  className={cardClasses}
>
  {/* 卡片内容 */}
</motion.div>
```

### 删除动画

```tsx
<AnimatePresence>
  {cards.map(card => (
    <motion.div
      key={card.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
    >
      {/* 卡片内容 */}
    </motion.div>
  ))}
</AnimatePresence>
```

## 响应式设计

### 断点设计

```tsx
// 移动端: 1列
// 平板: 2列
// 桌面: 3列
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {cards.map(card => (
    <Card key={card.id} card={card} />
  ))}
</div>
```

### 深色模式

```tsx
// 使用 dark: 前缀
<div className="bg-white dark:bg-gray-800">
  <h3 className="text-gray-900 dark:text-gray-100">
    {card.title}
  </h3>
</div>
```

## 可访问性

### 键盘导航

```tsx
<button
  onClick={() => openDetailModal(card)}
  onKeyDown={(e) => e.key === 'Enter' && openDetailModal(card)}
  tabIndex={0}
  role="button"
  aria-label={`查看卡片详情: ${card.title}`}
>
  查看详情
</button>
```

### 屏幕阅读器

```tsx
<div
  role="article"
  aria-labelledby={`card-title-${card.id}`}
  aria-describedby={`card-content-${card.id}`}
>
  <h3 id={`card-title-${card.id}`}>{card.title}</h3>
  <p id={`card-content-${card.id}`}>{card.content}</p>
</div>
```

## 最佳实践

### 卡片创建

1. ✅ 标题简洁明了
2. ✅ 内容结构化
3. ✅ 正确选择颜色
4. ✅ 设置关联卡片
5. ✅ 使用卢曼地址

### 卡片管理

1. ✅ 定期整理卡片
2. ✅ 更新关联关系
3. ✅ 标签分类
4. ✅ 版本历史

### 知识沉淀

1. ✅ 从分析结果创建卡片
2. ✅ 从团队协作整合知识
3. ✅ 定期回顾和优化
4. ✅ 建立知识网络

## 总结

四色卡片设计规范:

1. **颜色系统**: 蓝/绿/黄/红,各具语义
2. **视觉统一**: 统一的样式和交互
3. **数据结构**: TypeScript + Pydantic
4. **展示设计**: 列表/详情/筛选
5. **动画效果**: 流畅的过渡动画
6. **响应式**: 适配移动端到桌面端
7. **可访问性**: 键盘导航和屏幕阅读器

**核心价值**:

- ✅ 快速识别知识类型
- ✅ 促进知识关联
- ✅ 便于知识检索
- ✅ 支持知识演进
