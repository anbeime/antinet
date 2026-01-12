# Framer Motion 动画规范

## 概述

本文档定义 Antinet 智能知识管理系统的动画设计规范,使用 Framer Motion 实现流畅、自然的用户交互体验。

## 设计原则

### 核心原则

1. **流畅自然**: 动画过渡自然,避免突兀
2. **性能优先**: 使用 transform 和 opacity 优化性能
3. **用户友好**: 动画时长适中 (200-500ms)
4. **可配置**: 支持深色模式、主题切换

### 性能优化

```tsx
// ✅ 好: 使用 transform 和 opacity
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
/>

// ❌ 不好: 使用 layout 属性
<motion.div
  initial={{ height: 0 }}
  animate={{ height: 'auto' }}
/>
```

## 基础动画

### 进入动画

#### 淡入 + 向上

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  内容
</motion.div>
```

#### 淡入 + 缩放

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3 }}
>
  内容
</motion.div>
```

#### 淡入

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
>
  内容
</motion.div>
```

### 退出动画

#### 淡出 + 向下

```tsx
<motion.div
  exit={{ opacity: 0, y: 20 }}
  transition={{ duration: 0.3 }}
>
  内容
</motion.div>
```

#### 淡出 + 缩小

```tsx
<motion.div
  exit={{ opacity: 0, scale: 0.8 }}
  transition={{ duration: 0.3 }}
>
  内容
</motion.div>
```

### 列表动画

```tsx
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      layout
    >
      {item.content}
    </motion.div>
  ))}
</AnimatePresence>
```

## 交互动画

### 悬停动画

#### 缩放 + 阴影

```tsx
<motion.div
  whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
  whileTap={{ scale: 0.95 }}
  className="card"
>
  卡片内容
</motion.div>
```

#### 向上移动

```tsx
<motion.div
  whileHover={{ y: -5 }}
  className="card"
>
  卡片内容
</motion.div>
```

#### 颜色变化

```tsx
<motion.button
  whileHover={{ backgroundColor: '#3b82f6' }}
  whileTap={{ backgroundColor: '#2563eb' }}
  className="px-4 py-2 bg-gray-200 rounded-lg"
>
  按钮
</motion.button>
```

### 点击动画

#### 缩放效果

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
>
  点击我
</motion.button>
```

#### 反馈动画

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  onClick={handleClick}
>
  {isClicked && (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 2, opacity: 0 }}
    >
      ✓
    </motion.span>
  )}
  点击我
</motion.button>
```

## 组件动画

### 模态框动画

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="fixed inset-0 bg-black/50 backdrop-blur-sm"
  onClick={onClose}
/>

<motion.div
  initial={{ opacity: 0, scale: 0.9, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.9, y: 20 }}
  transition={{ duration: 0.3 }}
  className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl"
>
  模态框内容
</motion.div>
```

### 标签页切换动画

```tsx
<motion.div
  key={activeTab}
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.3 }}
>
  {tabContent}
</motion.div>
```

### 折叠/展开动画

```tsx
<motion.div
  initial={false}
  animate={isOpen}
  variants={{
    open: { height: 'auto', opacity: 1 },
    closed: { height: 0, opacity: 0 }
  }}
  transition={{ duration: 0.3 }}
>
  可折叠内容
</motion.div>
```

### 侧边栏动画

```tsx
<motion.aside
  initial={{ x: '-100%' }}
  animate={{ x: 0 }}
  exit={{ x: '-100%' }}
  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
  className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800"
>
  侧边栏内容
</motion.aside>
```

## 页面过渡

### 淡入淡出

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.5 }}
>
  页面内容
</motion.div>
```

### 滑入滑出

```tsx
<motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '-100%' }}
  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
>
  页面内容
</motion.div>
```

## 加载动画

### 旋转加载

```tsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
>
  <Loader size={24} />
</motion.div>
```

### 脉冲加载

```tsx
<motion.div
  animate={{ opacity: [0.5, 1, 0.5] }}
  transition={{ duration: 1.5, repeat: Infinity }}
  className="w-2 h-2 rounded-full bg-blue-500"
/>
```

### 骨架屏动画

```tsx
<motion.div
  animate={{ opacity: [0.5, 1, 0.5] }}
  transition={{ duration: 1.5, repeat: Infinity }}
  className="h-4 bg-gray-200 rounded"
/>
```

## 特殊动画

### 旋转动画

```tsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
>
  <Brain className="w-8 h-8" />
</motion.div>
```

### 弹跳动画

```tsx
<motion.div
  animate={{ y: [0, -10, 0] }}
  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
>
  内容
</motion.div>
```

### 闪烁动画

```tsx
<motion.div
  animate={{ opacity: [1, 0.5, 1] }}
  transition={{ duration: 1, repeat: Infinity }}
>
  内容
</motion.div>
```

## 过渡类型

### 缓动函数

```tsx
// 缓入缓出 (默认)
transition={{ duration: 0.3 }}

// 缓入
transition={{ duration: 0.3, ease: 'easeIn' }}

// 缓出
transition={{ duration: 0.3, ease: 'easeOut' }}

// 自定义贝塞尔曲线
transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
```

### 弹簧动画

```tsx
// 弹性效果
transition={{ type: 'spring', damping: 25, stiffness: 200 }}

// 更强的弹性
transition={{ type: 'spring', damping: 10, stiffness: 300 }}

// 更柔和的弹性
transition={{ type: 'spring', damping: 30, stiffness: 150 }}
```

## 性能优化

### 使用 GPU 加速

```tsx
// ✅ 好: 使用 transform
<motion.div
  animate={{ y: 20 }}
/>

// ❌ 不好: 使用 top/left
<motion.div
  animate={{ top: '20px' }}
/>
```

### 避免重排

```tsx
// ✅ 好: 使用 opacity
<motion.div
  animate={{ opacity: 0.5 }}
/>

// ❌ 不好: 使用 visibility
<motion.div
  animate={{ visibility: 'hidden' }}
/>
```

### 批量更新

```tsx
// ✅ 好: 使用 layout
<motion.div layout>
  内容
</motion.div>

// ❌ 不好: 手动计算位置
<motion.div
  animate={{ y: calculatedY }}
>
  内容
</motion.div>
```

## 响应式动画

### 断点动画

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: isMobile ? 0.3 : 0.5 }}
>
  内容
</motion.div>
```

### 深色模式动画

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: theme === 'dark' ? 0.3 : 0.5 }}
  className={`bg-${theme === 'dark' ? 'gray-800' : 'white'}`}
>
  内容
</motion.div>
```

## 可访问性

### 减少动画

```tsx
const prefersReducedMotion = useReducedMotion();

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
>
  内容
</motion.div>
```

### 悬停替代

```tsx
<motion.div
  whileHover={!isMobile ? { scale: 1.05 } : undefined}
  whileTap={{ scale: 0.95 }}
>
  内容
</motion.div>
```

## 最佳实践

### 1. 动画时长

```tsx
// ✅ 好: 适中时长
transition={{ duration: 0.3 }}  // 快速交互
transition={{ duration: 0.5 }}  // 标准过渡

// ❌ 不好: 过长或过短
transition={{ duration: 0.05 }}  // 太快
transition={{ duration: 2 }}     // 太慢
```

### 2. 动画性能

```tsx
// ✅ 好: 使用 transform 和 opacity
<motion.div
  animate={{ opacity: 1, scale: 1, y: 0 }}
/>

// ❌ 不好: 使用 layout 属性
<motion.div layout>
  内容
</motion.div>
```

### 3. 动画一致性

```tsx
// ✅ 好: 使用统一的过渡配置
const transition = { duration: 0.3, ease: 'easeInOut' };

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={transition}
/>

// ❌ 不好: 每个动画都不同
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5, ease: 'custom' }}
/>
```

### 4. 动画可配置

```tsx
// ✅ 好: 支持动画开关
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: animationsEnabled ? 0.3 : 0 }}
/>

// ❌ 不好: 强制动画
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
/>
```

## 总结

Framer Motion 动画规范:

1. **基础动画**: 进入/退出/列表动画
2. **交互动画**: 悬停/点击/反馈
3. **组件动画**: 模态框/标签页/折叠
4. **页面过渡**: 淡入淡出/滑入滑出
5. **加载动画**: 旋转/脉冲/骨架屏
6. **特殊动画**: 旋转/弹跳/闪烁
7. **过渡类型**: 缓动/弹簧
8. **性能优化**: GPU 加速/避免重排
9. **可访问性**: 减少动画
10. **最佳实践**: 时长/性能/一致性/可配置

**核心原则**:

- ✅ 流畅自然
- ✅ 性能优先
- ✅ 用户友好
- ✅ 可配置
