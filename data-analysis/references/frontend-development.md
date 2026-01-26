# 前端开发指南

## 目录
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [核心组件实现](#核心组件实现)
- [API接口对接](#api接口对接)
- [响应式设计](#响应式设计)
- [性能优化](#性能优化)

## 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **图表库**：Recharts
- **图标库**：Lucide React
- **动画库**：Framer Motion（可选）

### 依赖安装

```bash
npm install react react-dom typescript
npm install -D vite @vitejs/plugin-react
npm install tailwindcss postcss autoprefixer
npm install recharts lucide-react framer-motion
```

### Tailwind CSS配置

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## 项目结构

```
antinet-frontend/
├── src/
│   ├── components/
│   │   ├── KnowledgeOverview.tsx       # 知识概览主组件
│   │   ├── CardGrid.tsx               # 四色卡片网格
│   │   ├── ActivityList.tsx           # 最近活动列表
│   │   ├── KnowledgeDistribution.tsx  # 知识分布饼图
│   │   ├── FeatureHighlights.tsx      # 特性亮点
│   │   └── GraphModal.tsx             # 关联图谱模态框
│   ├── types/
│   │   ├── card.ts                    # 卡片类型定义
│   │   ├── activity.ts                # 活动记录类型定义
│   │   └── api.ts                     # API响应类型定义
│   ├── services/
│   │   └── api.ts                     # API调用服务
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
│   └── assets/                        # 静态资源
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 核心组件实现

### 1. 知识概览主组件（KnowledgeOverview.tsx）

```tsx
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { 
  FileText, AlertCircle, Lightbulb, Activity, 
  Clock, Database, MessageSquare, Link2, 
  Brain, Shield, Zap 
} from 'lucide-react';

// 类型定义
interface KnowledgeCard {
  id: string;
  type: 'fact' | 'explanation' | 'risk' | 'action';
  title: string;
  summary: string;
  source: 'document' | 'database' | 'api' | 'user';
  relatedIds: string[];
  confidence?: number;
}

interface ActivityRecord {
  id: string;
  title: string;
  type: string;
  time: string;
  description: string;
}

interface Feature {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

// 主组件
const KnowledgeOverview: React.FC = () => {
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [activeCard, setActiveCard] = useState<KnowledgeCard | null>(null);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // 调用API获取卡片数据
      const cardsRes = await fetch('/api/cards');
      const cardsData = await cardsRes.json();
      setCards(cardsData);

      // 调用API获取活动数据
      const activitiesRes = await fetch('/api/activities');
      const activitiesData = await activitiesRes.json();
      setActivities(activitiesData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取关联图谱
  const fetchRelatedGraph = async (cardId: string) => {
    try {
      const response = await fetch('/api/knowledge/graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardId, type: 'semantic' })
      });
      return await response.json();
    } catch (error) {
      console.error('获取关联图谱失败:', error);
      return null;
    }
  };

  // 点击卡片
  const handleCardClick = async (card: KnowledgeCard) => {
    setActiveCard(card);
    await fetchRelatedGraph(card.id);
    setShowGraphModal(true);
  };

  // 卡片类型元数据
  const getCardMeta = (type: KnowledgeCard['type']) => {
    const metaMap = {
      fact: { 
        icon: <FileText className="w-6 h-6" />, 
        color: 'bg-blue-50 border-blue-200 text-blue-800', 
        title: '事实卡片' 
      },
      explanation: { 
        icon: <Lightbulb className="w-6 h-6" />, 
        color: 'bg-green-50 border-green-200 text-green-800', 
        title: '解释卡片' 
      },
      risk: { 
        icon: <AlertCircle className="w-6 h-6" />, 
        color: 'bg-yellow-50 border-yellow-200 text-yellow-800', 
        title: '风险卡片' 
      },
      action: { 
        icon: <Activity className="w-6 h-6" />, 
        color: 'bg-red-50 border-red-200 text-red-800', 
        title: '行动卡片' 
      }
    };
    return metaMap[type];
  };

  // 数据源图标
  const getSourceIcon = (source: KnowledgeCard['source']) => {
    const iconMap = {
      document: <FileText className="w-4 h-4 ml-1" />,
      database: <Database className="w-4 h-4 ml-1" />,
      api: <Brain className="w-4 h-4 ml-1" />,
      user: <MessageSquare className="w-4 h-4 ml-1" />
    };
    return iconMap[source];
  };

  // 饼图数据
  const pieData = [
    { name: '事实卡片', value: cards.filter(c => c.type === 'fact').length, color: '#3b82f6' },
    { name: '解释卡片', value: cards.filter(c => c.type === 'explanation').length, color: '#22c55e' },
    { name: '风险卡片', value: cards.filter(c => c.type === 'risk').length, color: '#eab308' },
    { name: '行动卡片', value: cards.filter(c => c.type === 'action').length, color: '#ef4444' }
  ];

  // 特性亮点
  const features: Feature[] = [
    {
      id: 'feat1',
      icon: <Brain className="w-8 h-8 text-blue-500" />,
      title: 'NPU加速推理',
      description: '基于Qwen2-1.5B轻量化模型，端侧推理延迟<500ms'
    },
    {
      id: 'feat2',
      icon: <Link2 className="w-8 h-8 text-green-500" />,
      title: '智能知识关联',
      description: '支持主题/逻辑/属性/用户定义四种关联方式构建知识图谱'
    },
    {
      id: 'feat3',
      icon: <Shield className="w-8 h-8 text-yellow-500" />,
      title: '端侧安全存储',
      description: 'AES-256加密存储，原始数据全程不出域，保障数据安全'
    },
    {
      id: 'feat4',
      icon: <Zap className="w-8 h-8 text-red-500" />,
      title: '多模态支持',
      description: '支持文档/图片OCR/数据库多源数据接入与分析'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-800">Antinet 智能知识管家</h1>
          </div>
          <nav className="hidden md:flex gap-6">
            <a href="#" className="text-gray-700 hover:text-indigo-600 font-medium">知识概览</a>
            <a href="#" className="text-gray-700 hover:text-indigo-600 font-medium">数据分析</a>
            <a href="#" className="text-gray-700 hover:text-indigo-600 font-medium">知识图谱</a>
            <a href="#" className="text-gray-700 hover:text-indigo-600 font-medium">性能监控</a>
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-8">
        {/* 四色卡片模块 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            知识卡片概览
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map(card => {
              const meta = getCardMeta(card.type);
              return (
                <div 
                  key={card.id}
                  className={`border rounded-lg p-5 cursor-pointer hover:shadow-lg transition-shadow ${meta.color}`}
                  onClick={() => handleCardClick(card)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium">{meta.title}</span>
                    {getSourceIcon(card.source)}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm line-clamp-2">{card.summary}</p>
                  {card.confidence && (
                    <div className="mt-2 text-xs text-gray-500">
                      置信度: {(card.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                  <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    关联{card.relatedIds.length}个卡片
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 最近知识活动 + 知识分布 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* 最近知识活动 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-600" />
              最近知识活动
            </h2>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {activities.map(activity => (
                <div key={activity.id} className="p-4 border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-800">{activity.title}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                      {activity.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 知识分布 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <PieChart className="w-6 h-6 text-indigo-600" />
              知识卡片分布
            </h2>
            <div className="bg-white rounded-lg shadow-sm border p-4 h-full">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}个`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* 特性亮点 */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-600" />
            核心特性亮点
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(feature => (
              <div key={feature.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 关联图谱模态框 */}
      {showGraphModal && activeCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">
                {getCardMeta(activeCard.type).title} - 关联图谱
              </h3>
              <button 
                onClick={() => setShowGraphModal(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h4 className="font-medium mb-2">当前卡片：{activeCard.title}</h4>
                <p className="text-sm text-gray-600">{activeCard.summary}</p>
              </div>
              <div id="graph-container" className="h-[400px] bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p>知识图谱可视化区域</p>
                  <p className="text-sm mt-2">关联卡片：{activeCard.relatedIds.length}个</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 页脚 */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Antinet 智能知识管家 © 2026 骁龙AIPC端侧智能数据工作站</p>
        </div>
      </footer>
    </div>
  );
};

export default KnowledgeOverview;
```

### 2. API服务层

```typescript
// src/services/api.ts
interface GraphRequest {
  cardId: string;
  type: 'semantic' | 'topic' | 'logic' | 'attribute' | 'user';
}

interface GraphResponse {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    color: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
}

class ApiService {
  private baseUrl = '/api';

  async getCards() {
    const response = await fetch(`${this.baseUrl}/cards`);
    if (!response.ok) throw new Error('获取卡片失败');
    return response.json();
  }

  async getActivities() {
    const response = await fetch(`${this.baseUrl}/activities`);
    if (!response.ok) throw new Error('获取活动失败');
    return response.json();
  }

  async getGraph(request: GraphRequest): Promise<GraphResponse> {
    const response = await fetch(`${this.baseUrl}/knowledge/graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('获取图谱失败');
    return response.json();
  }

  async uploadFiles(files: FileList) {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('上传失败');
    return response.json();
  }

  async queryNLP(query: string) {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });
    if (!response.ok) throw new Error('查询失败');
    return response.json();
  }
}

export const apiService = new ApiService();
```

## API接口对接

### 基础配置

```typescript
// src/config/api.ts
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  retryCount: 3
};

// 设置全局fetch拦截器
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [url, options] = args;
  const startTime = Date.now();
  
  try {
    const response = await originalFetch(url, {
      ...options,
      signal: AbortSignal.timeout(API_CONFIG.timeout)
    });
    
    const duration = Date.now() - startTime;
    console.log(`API Request: ${url} - ${duration}ms`);
    
    return response;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

### 错误处理

```typescript
// src/utils/errorHandler.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;
  
  if (error instanceof Response) {
    return new ApiError(
      `API Error: ${error.status} ${error.statusText}`,
      error.status
    );
  }
  
  return new ApiError('未知错误');
};
```

## 响应式设计

### 断点配置

```javascript
// tailwind.config.js
export default {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // 骁龙AIPC适配
      'tablet': '768px',
      'laptop': '1024px'
    }
  }
}
```

### 响应式组件

```tsx
// 卡片网格响应式
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {cards.map(card => (
    <Card key={card.id} {...card} />
  ))}
</div>

// 导航栏响应式
<nav className="hidden md:flex gap-6">
  {/* 桌面端导航 */}
</nav>
<button className="md:hidden">
  {/* 移动端菜单按钮 */}
</button>
```

## 性能优化

### 1. 代码分割

```typescript
// App.tsx
import { lazy, Suspense } from 'react';

const KnowledgeOverview = lazy(() => import('./components/KnowledgeOverview'));
const DataAnalysis = lazy(() => import('./components/DataAnalysis'));
const KnowledgeGraph = lazy(() => import('./components/KnowledgeGraph'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <KnowledgeOverview />
    </Suspense>
  );
}
```

### 2. 虚拟滚动

```tsx
import { FixedSizeList as List } from 'react-window';

const CardList = ({ cards }: { cards: KnowledgeCard[] }) => (
  <List
    height={600}
    itemCount={cards.length}
    itemSize={200}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <Card {...cards[index]} />
      </div>
    )}
  </List>
);
```

### 3. 缓存策略

```typescript
// src/utils/cache.ts
class CacheService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5分钟

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
}

export const cacheService = new CacheService();
```

## 骁龙AIPC适配

### 性能监控

```typescript
// src/utils/performance.ts
export const monitorPerformance = () => {
  if ('performance' in window) {
    // NPU状态监控
    const npuStatus = {
      available: true,
      latency: 0,
      usage: 0
    };

    return npuStatus;
  }
  return null;
};

// 在组件中使用
useEffect(() => {
  const status = monitorPerformance();
  console.log('NPU Status:', status);
}, []);
```

### 离线支持

```typescript
// src/utils/offline.ts
export const setupOfflineSupport = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration);
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    });
  }
};
```

## 部署

### 开发环境

```bash
npm install
npm run dev
```

### 生产构建

```bash
npm run build
npm run preview
```

### Docker部署（可选）

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## 注意事项

- 所有API调用应添加错误处理和重试机制
- 大数据量场景下使用虚拟滚动和分页加载
- 图片资源使用懒加载
- 关键操作添加加载状态提示
- 定期清理缓存避免内存泄漏
- 确保所有组件都有适当的错误边界
