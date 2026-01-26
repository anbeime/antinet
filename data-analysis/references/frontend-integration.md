# 前端集成参考

## 目录
- [技术栈](#技术栈)
- [核心组件](#核心组件)
- [API对接规范](#api对接规范)
- [数据格式定义](#数据格式定义)
- [状态管理建议](#状态管理建议)
- [性能优化策略](#性能优化策略)
- [开发示例](#开发示例)

---

## 技术栈

### 核心框架
- **React 18**：UI框架，支持Hooks和并发渲染
- **TypeScript**：类型安全，提升代码质量和可维护性
- **Vite**：构建工具，快速冷启动和热更新

### UI与动画
- **Tailwind CSS**：原子化CSS，快速构建响应式UI
- **Framer Motion**：动画库，实现平滑过渡和交互效果

### 数据可视化
- **Recharts**：图表库，支持折线图、柱状图、饼图、热力图等
- **D3.js（可选）**：复杂可视化需求（如知识图谱）

### 图标
- **Lucide React**：轻量级图标库，提供丰富的矢量图标

---

## 核心组件

### 1. 知识概览（KnowledgeOverview）

**功能**：展示知识库统计信息、卡片类型分布、最近活动

**实现要点**：
- 使用卡片布局展示统计数据
- 使用Recharts饼图展示卡片类型分布
- 使用列表展示最近活动

**示例代码**：
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface KnowledgeOverviewProps {
  stats: {
    totalCards: number;
    blueCards: number;
    greenCards: number;
    yellowCards: number;
    redCards: number;
    recentActivities: Array<{
      type: string;
      timestamp: string;
      description: string;
    }>;
  };
}

export const KnowledgeOverview: React.FC<KnowledgeOverviewProps> = ({ stats }) => {
  const data = [
    { name: "事实", value: stats.blueCards, color: "#3B82F6" },
    { name: "分析", value: stats.greenCards, color: "#22C55E" },
    { name: "创意", value: stats.yellowCards, color: "#EAB308" },
    { name: "风险", value: stats.redCards, color: "#EF4444" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>知识库统计</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{stats.totalCards}</p>
          <p className="text-sm text-gray-500">总卡片数</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>卡片类型分布</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {stats.recentActivities.map((activity, index) => (
              <li key={index} className="text-sm">
                <span className="font-semibold">{activity.type}</span>
                <span className="text-gray-500 ml-2">{activity.timestamp}</span>
                <p className="text-gray-700">{activity.description}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### 2. 知识图谱可视化（KnowledgeGraph）

**功能**：可视化展示四色卡片及其关联关系，支持交互式探索

**实现要点**：
- 使用D3.js或Cytoscape.js实现图谱布局
- 支持节点拖拽、缩放、筛选
- 支持点击节点查看详情

**示例代码**（使用Cytoscape.js）：
```tsx
import { useEffect, useRef } from "react";
import cytoscape, { Core } from "cytoscape";

interface KnowledgeGraphProps {
  nodes: Array<{
    id: string;
    label: string;
    type: "blue" | "green" | "yellow" | "red";
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
  }>;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ nodes, edges }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements = [
      ...nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
        },
      })),
      ...edges.map((edge) => ({
        data: {
          source: edge.source,
          target: edge.target,
          label: edge.label,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#666",
            label: "data(label)",
            "font-size": "12px",
            "text-valign": "center",
            "text-halign": "center",
          },
        },
        {
          selector: 'node[type="blue"]',
          style: { "background-color": "#3B82F6" },
        },
        {
          selector: 'node[type="green"]',
          style: { "background-color": "#22C55E" },
        },
        {
          selector: 'node[type="yellow"]',
          style: { "background-color": "#EAB308" },
        },
        {
          selector: 'node[type="red"]',
          style: { "background-color": "#EF4444" },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#999",
            "target-arrow-color": "#999",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
      },
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "600px", border: "1px solid #ddd" }}
    />
  );
};
```

---

### 3. 规则配置（RuleConfig）

**功能**：配置四色卡片分类规则、关联规则、规则优先级

**实现要点**：
- 表单编辑器，支持规则CRUD操作
- 规则语法高亮和验证
- 规则测试和预览

**示例代码**：
```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Rule {
  id: string;
  name: string;
  type: "classification" | "association";
  priority: number;
  expression: string;
  description: string;
}

export const RuleConfig: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([
    {
      id: "1",
      name: "销售额分类规则",
      type: "classification",
      priority: 1,
      expression: "sales > 1000000",
      description: "销售额大于100万的地区归类为高价值",
    },
  ]);

  const handleAddRule = () => {
    const newRule: Rule = {
      id: Date.now().toString(),
      name: "新规则",
      type: "classification",
      priority: rules.length + 1,
      expression: "",
      description: "",
    };
    setRules([...rules, newRule]);
  };

  const handleSaveRules = async () => {
    const response = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    });
    if (response.ok) {
      alert("规则保存成功");
    } else {
      alert("规则保存失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">规则配置</h2>
        <div className="space-x-2">
          <Button onClick={handleAddRule}>添加规则</Button>
          <Button onClick={handleSaveRules}>保存规则</Button>
        </div>
      </div>
      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="border rounded p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">规则名称</label>
                <Input
                  value={rule.name}
                  onChange={(e) => {
                    const updated = rules.map((r) =>
                      r.id === rule.id ? { ...r, name: e.target.value } : r
                    );
                    setRules(updated);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">规则类型</label>
                <select
                  value={rule.type}
                  onChange={(e) => {
                    const updated = rules.map((r) =>
                      r.id === rule.id
                        ? { ...r, type: e.target.value as "classification" | "association" }
                        : r
                    );
                    setRules(updated);
                  }}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="classification">分类规则</option>
                  <option value="association">关联规则</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">规则表达式</label>
              <Textarea
                value={rule.expression}
                onChange={(e) => {
                  const updated = rules.map((r) =>
                    r.id === rule.id ? { ...r, expression: e.target.value } : r
                  );
                  setRules(updated);
                }}
                placeholder="例如: sales > 1000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">规则描述</label>
              <Textarea
                value={rule.description}
                onChange={(e) => {
                  const updated = rules.map((r) =>
                    r.id === rule.id ? { ...r, description: e.target.value } : r
                  );
                  setRules(updated);
                }}
                placeholder="描述规则的用途和逻辑"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### 4. 卡片生成（CardGeneration）

**功能**：根据用户查询生成四色卡片，支持批量处理和OCR识别

**实现要点**：
- 输入框支持文本查询
- 文件上传支持CSV/JSON/Excel/图像
- 实时展示生成进度

**示例代码**：
```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Card {
  id: string;
  type: "blue" | "green" | "yellow" | "red";
  title: string;
  content: string;
  confidence: number;
}

export const CardGeneration: React.FC = () => {
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/generate-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (response.ok) {
        const data = await response.json();
        setCards(data.cards);
      } else {
        alert("卡片生成失败");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload-file", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setCards(data.cards);
      } else {
        alert("文件上传失败");
      }
    } finally {
      setLoading(false);
    }
  };

  const getCardColor = (type: "blue" | "green" | "yellow" | "red") => {
    switch (type) {
      case "blue":
        return "bg-blue-100 border-blue-300";
      case "green":
        return "bg-green-100 border-green-300";
      case "yellow":
        return "bg-yellow-100 border-yellow-300";
      case "red":
        return "bg-red-100 border-red-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">文本查询</label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入分析查询，例如：分析上个月销售趋势"
          />
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "生成中..." : "生成卡片"}
          </Button>
          <Button variant="outline" onClick={() => document.getElementById("file-upload")?.click()}>
            上传文件
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.json,.xlsx,.jpg,.png,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Card key={card.id} className={getCardColor(card.type)}>
            <CardHeader>
              <CardTitle className="text-lg">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{card.content}</p>
              <p className="text-xs text-gray-500 mt-2">置信度: {(card.confidence * 100).toFixed(0)}%</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

---

### 5. 报告看板（ReportDashboard）

**功能**：展示分析报告，包含总览、事实、解释、风险、行动等部分

**实现要点**：
- 使用选项卡切换不同部分
- 集成Recharts展示图表
- 支持导出报告为PDF/Word

**示例代码**：
```tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Report {
  summary: {
    title: string;
    description: string;
  };
  facts: Array<{
    title: string;
    description: string;
    data: Array<{ name: string; value: number }>;
  }>;
  explanations: Array<{
    title: string;
    description: string;
  }>;
  risks: Array<{
    title: string;
    level: "high" | "medium" | "low";
    description: string;
  }>;
  actions: Array<{
    title: string;
    description: string;
  }>;
}

export const ReportDashboard: React.FC<{ report: Report }> = ({ report }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{report.summary.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{report.summary.description}</p>
        </CardContent>
      </Card>
      <Tabs defaultValue="facts">
        <TabsList>
          <TabsTrigger value="facts">事实</TabsTrigger>
          <TabsTrigger value="explanations">解释</TabsTrigger>
          <TabsTrigger value="risks">风险</TabsTrigger>
          <TabsTrigger value="actions">行动</TabsTrigger>
        </TabsList>
        <TabsContent value="facts">
          <div className="space-y-4">
            {report.facts.map((fact, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{fact.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{fact.description}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={fact.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#3B82F6" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="explanations">
          <div className="space-y-4">
            {report.explanations.map((explanation, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{explanation.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{explanation.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="risks">
          <div className="space-y-4">
            {report.risks.map((risk, index) => (
              <Card key={index} className="border-red-300 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{risk.title}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      risk.level === "high" ? "bg-red-500 text-white" :
                      risk.level === "medium" ? "bg-yellow-500 text-white" :
                      "bg-green-500 text-white"
                    }`}>
                      {risk.level.toUpperCase()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{risk.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="actions">
          <div className="space-y-4">
            {report.actions.map((action, index) => (
              <Card key={index} className="border-blue-300 bg-blue-50">
                <CardHeader>
                  <CardTitle>{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

---

## API对接规范

### 基础配置
```typescript
const API_BASE_URL = "http://localhost:8000/api";

const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },

  async upload<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`UPLOAD ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },
};
```

### API接口清单

#### 1. 生成卡片
```typescript
interface GenerateCardsRequest {
  query: string;
}

interface GenerateCardsResponse {
  cards: Array<{
    id: string;
    type: "blue" | "green" | "yellow" | "red";
    title: string;
    content: string;
    confidence: number;
  }>;
}

const generateCards = (request: GenerateCardsRequest) => {
  return apiClient.post<GenerateCardsResponse>("/generate-cards", request);
};
```

#### 2. 上传文件
```typescript
interface UploadFileResponse {
  cards: Array<{
    id: string;
    type: "blue" | "green" | "yellow" | "red";
    title: string;
    content: string;
    confidence: number;
  }>;
};

const uploadFile = (file: File) => {
  return apiClient.upload<UploadFileResponse>("/upload-file", file);
};
```

#### 3. 获取知识库统计
```typescript
interface KnowledgeStats {
  totalCards: number;
  blueCards: number;
  greenCards: number;
  yellowCards: number;
  redCards: number;
  recentActivities: Array<{
    type: string;
    timestamp: string;
    description: string;
  }>;
}

const getKnowledgeStats = () => {
  return apiClient.get<KnowledgeStats>("/knowledge/stats");
};
```

#### 4. 获取知识图谱
```typescript
interface KnowledgeGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: "blue" | "green" | "yellow" | "red";
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
  }>;
}

const getKnowledgeGraph = () => {
  return apiClient.get<KnowledgeGraph>("/knowledge/graph");
};
```

#### 5. 保存规则
```typescript
interface SaveRulesRequest {
  rules: Array<{
    id: string;
    name: string;
    type: "classification" | "association";
    priority: number;
    expression: string;
    description: string;
  }>;
}

const saveRules = (request: SaveRulesRequest) => {
  return apiClient.post<void>("/rules", request);
};
```

#### 6. 获取报告
```typescript
interface GetReportRequest {
  query: string;
}

interface Report {
  summary: {
    title: string;
    description: string;
  };
  facts: Array<{
    title: string;
    description: string;
    data: Array<{ name: string; value: number }>;
  }>;
  explanations: Array<{
    title: string;
    description: string;
  }>;
  risks: Array<{
    title: string;
    level: "high" | "medium" | "low";
    description: string;
  }>;
  actions: Array<{
    title: string;
    description: string;
  }>;
}

const getReport = (request: GetReportRequest) => {
  return apiClient.post<Report>("/report", request);
};
```

---

## 数据格式定义

### 卡片数据格式
```typescript
interface Card {
  id: string;
  type: "blue" | "green" | "yellow" | "red";
  title: string;
  content: string;
  confidence: number;
  timestamp: string;
  tags: string[];
  references: string[];
}
```

### 知识图谱数据格式
```typescript
interface KnowledgeGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: "blue" | "green" | "yellow" | "red";
    metadata: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
    weight: number;
  }>;
}
```

### 报告数据格式
```typescript
interface Report {
  summary: {
    title: string;
    description: string;
    generatedAt: string;
  };
  facts: Array<{
    id: string;
    title: string;
    description: string;
    data: Array<{ name: string; value: number }>;
  }>;
  explanations: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  risks: Array<{
    id: string;
    title: string;
    level: "high" | "medium" | "low";
    description: string;
    mitigation: string;
  }>;
  actions: Array<{
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
}
```

---

## 状态管理建议

### 使用Zustand
```typescript
import { create } from "zustand";

interface AppState {
  cards: Card[];
  setCards: (cards: Card[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  cards: [],
  setCards: (cards) => set({ cards }),
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
}));
```

---

## 性能优化策略

### 1. 代码分割
```typescript
import { lazy } from "react";

const KnowledgeGraph = lazy(() => import("./components/KnowledgeGraph"));
const ReportDashboard = lazy(() => import("./components/ReportDashboard"));
```

### 2. 虚拟滚动
```typescript
import { FixedSizeList } from "react-window";

const CardList: React.FC<{ cards: Card[] }> = ({ cards }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={cards.length}
      itemSize={120}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <Card {...cards[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

### 3. 防抖和节流
```typescript
import { debounce } from "lodash";

const debouncedGenerate = debounce(async (query: string) => {
  const cards = await generateCards({ query });
  setCards(cards);
}, 500);
```

---

## 开发示例

### 完整页面示例
```tsx
import { useState, useEffect } from "react";
import { useAppStore } from "./store";
import { KnowledgeOverview } from "./components/KnowledgeOverview";
import { CardGeneration } from "./components/CardGeneration";
import { KnowledgeGraph } from "./components/KnowledgeGraph";
import { RuleConfig } from "./components/RuleConfig";
import { ReportDashboard } from "./components/ReportDashboard";

export const App: React.FC = () => {
  const { setCards, setLoading, error, setError } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const stats = await getKnowledgeStats();
        // 处理统计数据
      } catch (err) {
        setError("获取统计数据失败");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [setLoading, setError]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold">Antinet智能知识管家</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">知识概览</TabsTrigger>
            <TabsTrigger value="generation">卡片生成</TabsTrigger>
            <TabsTrigger value="graph">知识图谱</TabsTrigger>
            <TabsTrigger value="rules">规则配置</TabsTrigger>
            <TabsTrigger value="report">报告看板</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <KnowledgeOverview stats={/* stats */} />
          </TabsContent>
          <TabsContent value="generation">
            <CardGeneration />
          </TabsContent>
          <TabsContent value="graph">
            <KnowledgeGraph nodes={/* nodes */} edges={/* edges */} />
          </TabsContent>
          <TabsContent value="rules">
            <RuleConfig />
          </TabsContent>
          <TabsContent value="report">
            <ReportDashboard report={/* report */} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
```

---

## 总结

本参考文档提供了完整的前端集成指南，包括：
- 核心组件实现（知识概览、知识图谱、规则配置、卡片生成、报告看板）
- API对接规范（基础配置、接口清单）
- 数据格式定义（卡片、知识图谱、报告）
- 状态管理建议（Zustand）
- 性能优化策略（代码分割、虚拟滚动、防抖节流）
- 开发示例（完整页面示例）

开发者可基于此文档快速构建前端应用，与后端API无缝对接，实现动态可体验的知识管理应用。
