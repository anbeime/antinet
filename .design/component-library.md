# Tailwind CSS 组件库

## 概述

本文档定义 Antinet 智能知识管理系统的 Tailwind CSS 组件库,确保统一的视觉风格和用户体验。

## 设计系统

### 颜色系统

#### 主色调

```tsx
// 蓝色 - 主要操作
bg-blue-500
hover:bg-blue-600
text-blue-600
border-blue-200

// 紫色 - 强调
bg-purple-500
hover:bg-purple-600
text-purple-600

// 绿色 - 成功
bg-green-500
hover:bg-green-600
text-green-600

// 黄色 - 警告
bg-yellow-500
hover:bg-yellow-600
text-yellow-600

// 红色 - 错误
bg-red-500
hover:bg-red-600
text-red-600
```

#### 中性色

```tsx
// 背景颜色
bg-white
bg-gray-50
bg-gray-100
bg-gray-200

// 文字颜色
text-gray-900
text-gray-600
text-gray-400
text-gray-500

// 边框颜色
border-gray-200
border-gray-300
border-gray-700 (dark mode)
```

#### 深色模式

```tsx
// 使用 dark: 前缀
bg-white dark:bg-gray-800
text-gray-900 dark:text-gray-100
border-gray-200 dark:border-gray-700
```

### 字体系统

```tsx
// 标题
text-3xl font-bold       // H1 - 页面标题
text-2xl font-bold       // H2 - 区块标题
text-xl font-bold        // H3 - 卡片标题
text-lg font-semibold    // H4 - 小标题

// 正文
text-base                // 默认正文
text-sm                  // 辅助文字
text-xs                  // 标签/元信息

// 字重
font-bold                // 700
font-semibold            // 600
font-medium              // 500
font-normal              // 400
```

### 间距系统

```tsx
// 内边距
p-4      // 16px - 常规
p-6      // 24px - 较大
p-8      // 32px - 大

// 外边距
mb-4     // 16px - 元素间距
mb-6     // 24px - 区块间距
mb-8     // 32px - 大间距
gap-2    // 8px - 紧凑
gap-4    // 16px - 常规
gap-6    // 24px - 较大
```

### 圆角系统

```tsx
rounded-lg   // 8px - 卡片
rounded-xl   // 12px - 大卡片
rounded-2xl  // 16px - 模态框
rounded-full // 50% - 圆形按钮/头像
```

### 阴影系统

```tsx
shadow-sm     // 轻微阴影
shadow-md     // 常规阴影
shadow-lg     // 大阴影
shadow-xl     // 超大阴影
```

## 组件库

### 1. 按钮组件

#### 主按钮

```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
  按钮
</button>
```

#### 次要按钮

```tsx
<button className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-medium transition-colors">
  按钮
</button>
```

#### 渐变按钮

```tsx
<button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
  按钮
</button>
```

#### 图标按钮

```tsx
<button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
  <PlusCircle size={16} />
  <span>新建</span>
</button>
```

### 2. 卡片组件

#### 基础卡片

```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
  <h3 className="text-xl font-bold mb-4">卡片标题</h3>
  <p className="text-gray-700 dark:text-gray-300">卡片内容</p>
</div>
```

#### 彩色卡片

```tsx
<div className="bg-blue-500 text-white p-4 rounded-lg">
  <h3 className="font-bold">标题</h3>
  <p>内容</p>
</div>
```

#### 图标卡片

```tsx
<div className="flex items-start p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white mr-3 flex-shrink-0">
    <Brain size={20} />
  </div>
  <div>
    <h3 className="font-medium">标题</h3>
    <p className="text-sm text-gray-600 dark:text-gray-300">内容</p>
  </div>
</div>
```

### 3. 输入组件

#### 文本输入

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
  <input
    type="text"
    placeholder="请输入..."
    className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
  />
</div>
```

#### 文本域

```tsx
<textarea
  placeholder="请输入内容..."
  rows={4}
  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
/>
```

### 4. 标签组件

#### 基础标签

```tsx
<span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
  标签
</span>
```

#### 彩色标签

```tsx
<span className={`px-3 py-1 rounded-full text-sm ${colorMap[color].bg} ${colorMap[color].text}`}>
  标签
</span>
```

#### 圆角标签

```tsx
<span className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full text-sm font-medium transition-colors">
  标签
</span>
```

### 5. 模态框组件

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* 背景遮罩 */}
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

  {/* 模态框内容 */}
  <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">标题</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>
      {/* 模态框内容 */}
    </div>
  </div>
</div>
```

### 6. 加载组件

#### 加载中

```tsx
<div className="flex items-center gap-2 text-gray-600">
  <Loader className="animate-spin" size={16} />
  <span>加载中...</span>
</div>
```

#### 加载遮罩

```tsx
<div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="text-center">
    <Loader className="animate-spin mx-auto mb-4" size={48} />
    <p className="text-lg font-semibold">加载中...</p>
  </div>
</div>
```

### 7. 提示组件

#### 成功提示

```tsx
<div className="bg-green-50 text-green-800 px-4 py-3 rounded-lg border border-green-200">
  <div className="flex items-center">
    <CheckCircle size={20} className="mr-2" />
    <span>操作成功</span>
  </div>
</div>
```

#### 错误提示

```tsx
<div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg border border-red-200">
  <div className="flex items-center">
    <AlertCircle size={20} className="mr-2" />
    <span>操作失败</span>
  </div>
</div>
```

#### 警告提示

```tsx
<div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg border border-amber-200">
  <div className="flex items-center">
    <AlertTriangle size={20} className="mr-2" />
    <span>注意</span>
  </div>
</div>
```

### 8. 列表组件

#### 基础列表

```tsx
<ul className="space-y-2">
  <li className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">项目 1</li>
  <li className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">项目 2</li>
  <li className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">项目 3</li>
</ul>
```

#### 悬停列表

```tsx
<ul className="space-y-2">
  <li className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
    项目 1
  </li>
  <li className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
    项目 2
  </li>
</ul>
```

### 9. 表格组件

#### 基础表格

```tsx
<table className="w-full text-left">
  <thead className="bg-gray-50 dark:bg-gray-700">
    <tr>
      <th className="px-4 py-3 text-sm font-semibold">列 1</th>
      <th className="px-4 py-3 text-sm font-semibold">列 2</th>
      <th className="px-4 py-3 text-sm font-semibold">列 3</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-t border-gray-200 dark:border-gray-700">
      <td className="px-4 py-3">数据 1</td>
      <td className="px-4 py-3">数据 2</td>
      <td className="px-4 py-3">数据 3</td>
    </tr>
  </tbody>
</table>
```

### 10. 导航组件

#### 标签导航

```tsx
<div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
  <button className={`py-2 border-b-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}>
    概览
  </button>
  <button className={`py-2 border-b-2 ${activeTab === 'cards' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}>
    卡片
  </button>
</div>
```

#### 图标导航

```tsx
<div className="flex items-center space-x-6">
  <button className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}>
    <Database size={18} />
    <span>概览</span>
  </button>
  <button className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'cards' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}>
    <Briefcase size={18} />
    <span>卡片</span>
  </button>
</div>
```

## 动画效果

### Framer Motion 基础动画

#### 进入动画

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  内容
</motion.div>
```

#### 悬停动画

```tsx
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  按钮
</motion.div>
```

#### 列表动画

```tsx
<AnimatePresence>
  {items.map(item => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {item.content}
    </motion.div>
  ))}
</AnimatePresence>
```

### CSS 动画

#### 旋转动画

```tsx
<div className="animate-spin">
  <Loader size={24} />
</div>
```

#### 脉冲动画

```tsx
<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
```

## 响应式设计

### 断点系统

```tsx
// 移动端 (默认)
<div className="grid grid-cols-1 gap-4">
  {/* 单列 */}
</div>

// 平板 (md: 768px+)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* 双列 */}
</div>

// 桌面 (lg: 1024px+)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 三列 */}
</div>

// 大屏 (xl: 1280px+)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* 四列 */}
</div>
```

### 隐藏/显示

```tsx
// 移动端隐藏,桌面显示
<div className="hidden md:block">
  桌面内容
</div>

// 桌面隐藏,移动端显示
<div className="block md:hidden">
  移动端内容
</div>
```

## 工具函数

### 颜色映射

```typescript
const colorMap = {
  blue: {
    bg: 'bg-blue-500',
    hoverBg: 'bg-blue-600',
    text: 'text-blue-800',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  green: {
    bg: 'bg-green-500',
    hoverBg: 'bg-green-600',
    text: 'text-green-800',
    bgColor: 'bg-green-50 dark:bg-green-950/40',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  // ... 其他颜色
};
```

### 条件类名

```typescript
import { clsx } from 'clsx';

const buttonClass = clsx(
  'px-6 py-3 rounded-lg font-medium transition-colors',
  isActive
    ? 'bg-blue-600 text-white'
    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
);
```

### 合并类名

```typescript
import { twMerge } from 'tailwind-merge';

const mergedClass = twMerge(
  'px-4 py-2 bg-blue-500',
  customClass
);
```

## 最佳实践

### 1. 使用原子化类名

```tsx
// ✅ 好
<div className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm">
  内容
</div>

// ❌ 不好
<div className="card">
  内容
</div>
```

### 2. 响应式设计

```tsx
// ✅ 好
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  内容
</div>

// ❌ 不好
<div className="grid grid-cols-3 gap-6">
  内容
</div>
```

### 3. 深色模式支持

```tsx
// ✅ 好
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  内容
</div>

// ❌ 不好
<div className="bg-white text-gray-900">
  内容
</div>
```

### 4. 避免内联样式

```tsx
// ✅ 好
<div className="bg-blue-500 text-white p-4">
  内容
</div>

// ❌ 不好
<div style={{ backgroundColor: 'blue', color: 'white', padding: '16px' }}>
  内容
</div>
```

## 总结

Tailwind CSS 组件库规范:

1. **颜色系统**: 主色调 + 中性色 + 深色模式
2. **组件库**: 按钮、卡片、输入、标签、模态框等
3. **动画效果**: Framer Motion + CSS 动画
4. **响应式设计**: 断点系统 + 隐藏/显示
5. **工具函数**: 颜色映射、条件类名、合并类名

**核心原则**:

- ✅ 原子化类名
- ✅ 响应式设计
- ✅ 深色模式支持
- ✅ 一致的视觉风格
- ✅ 流畅的动画效果
