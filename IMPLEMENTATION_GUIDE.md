# 🚀 知识图谱和智能图表实施指南

## ✅ 已完成的工作

### 1. 知识图谱可视化技能 ⭐⭐⭐

**后端技能：** `backend/skills/knowledge_graph_skill.py`
- ✅ 创建 `KnowledgeGraphVisualizationSkill` 类
- ✅ 实现节点提取（从卡片）
- ✅ 实现边构建（引用关系、标签相似度、四色卡片关系）
- ✅ 计算节点重要性（度中心性）
- ✅ 生成统计信息

**技能注册：** `backend/services/skill_system.py`
- ✅ 注册知识图谱可视化技能

**API 路由：** `backend/routes/knowledge_routes.py`
- ✅ 添加 `/api/knowledge/graph` 接口

**前端组件：** `src/components/KnowledgeGraph.tsx`
- ✅ 使用 Echarts 图谱布局
- ✅ 力导向布局
- ✅ 节点拖拽和缩放
- ✅ 四色卡片颜色映射
- ✅ 统计信息展示
- ✅ 工具栏（刷新、放大、缩小、重置）

---

## 🎯 下一步：测试和集成

### 步骤 1：安装前端依赖

```bash
cd C:\test\antinet
# 如果前端在其他目录，先找到它
Get-ChildItem -Directory -Recurse -Filter "frontend" -Depth 2

# 进入前端目录
cd <前端目录>

# 安装 echarts
npm install echarts
# 或
pnpm add echarts
```

### 步骤 2：启动后端服务

```powershell
cd C:\test\antinet
.\quick_start.ps1
```

**验证后端：**
```powershell
# 测试技能列表
curl http://localhost:8000/api/skill/list

# 测试知识图谱 API
curl http://localhost:8000/api/knowledge/graph
```

### 步骤 3：集成前端组件

**方法 A：添加到导航菜单**

编辑 `src/App.tsx` 或主路由文件：

```typescript
import KnowledgeGraph from './components/KnowledgeGraph';

// 添加路由
<Route path="/knowledge-graph" element={<KnowledgeGraph />} />

// 添加导航链接
<NavLink to="/knowledge-graph">知识图谱</NavLink>
```

**方法 B：添加到知识管理页面**

编辑知识管理相关页面，嵌入图谱组件：

```typescript
import KnowledgeGraph from './components/KnowledgeGraph';

function KnowledgePage() {
  return (
    <div>
      <h1>知识管理</h1>
      <KnowledgeGraph />
    </div>
  );
}
```

### 步骤 4：启动前端服务

```bash
cd <前端目录>
npm run dev
# 或
pnpm dev
```

### 步骤 5：测试知识图谱

1. 打开浏览器：http://localhost:3000/knowledge-graph
2. 应该看到知识图谱可视化
3. 测试功能：
   - ✅ 节点拖拽
   - ✅ 缩放
   - ✅ 悬停显示详情
   - ✅ 点击节点高亮相邻节点
   - ✅ 刷新按钮

---

## 📊 步骤 6：实现智能图表推荐技能 ⭐⭐

### 6.1 创建图表推荐技能

**文件：** `backend/skills/chart_recommendation_skill.py`

```python
"""
Chart Recommendation Skill
智能图表推荐技能
"""
import logging
from typing import Dict, List, Any
import pandas as pd

logger = logging.getLogger(__name__)


class ChartRecommendationSkill:
    """智能图表推荐技能"""
    
    def __init__(self):
        self.name = "chart_recommendation"
        self.description = "智能图表推荐：根据数据特征推荐最合适的图表类型"
        self.category = "数据可视化"
        self.agent_name = "密卷房"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
    
    async def execute(self, data: List[Dict], **kwargs) -> Dict[str, Any]:
        """
        推荐图表类型
        
        参数:
            data: 数据列表
        
        返回:
            {
                "recommended_chart": "bar",
                "reason": "数据包含分类变量和数值变量，适合柱状图",
                "chart_config": {...},
                "alternative_charts": [...]
            }
        """
        try:
            logger.info(f"[{self.name}] 开始分析数据特征")
            
            # 1. 分析数据特征
            features = self._analyze_data_features(data)
            logger.info(f"[{self.name}] 数据特征: {features}")
            
            # 2. 推荐图表类型
            chart_type, reason = self._recommend_chart_type(features)
            logger.info(f"[{self.name}] 推荐图表: {chart_type}, 原因: {reason}")
            
            # 3. 生成图表配置
            chart_config = self._generate_chart_config(chart_type, data, features)
            
            # 4. 获取备选图表
            alternative_charts = self._get_alternative_charts(features)
            
            return {
                "recommended_chart": chart_type,
                "reason": reason,
                "chart_config": chart_config,
                "alternative_charts": alternative_charts,
                "data_features": features
            }
            
        except Exception as e:
            logger.error(f"[{self.name}] 图表推荐失败: {e}", exc_info=True)
            raise
    
    def _analyze_data_features(self, data: List[Dict]) -> Dict[str, Any]:
        """分析数据特征"""
        if not data:
            return {}
        
        # 转换为 DataFrame
        df = pd.DataFrame(data)
        
        features = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "numeric_columns": [],
            "categorical_columns": [],
            "datetime_columns": [],
            "has_time_series": False,
            "has_categories": False,
            "has_numeric": False,
            "has_proportions": False
        }
        
        # 分析每列的类型
        for col in df.columns:
            dtype = df[col].dtype
            
            if pd.api.types.is_numeric_dtype(dtype):
                features["numeric_columns"].append(col)
                features["has_numeric"] = True
                
                # 检查是否是比例数据（0-1 或 0-100）
                if df[col].min() >= 0 and df[col].max() <= 1:
                    features["has_proportions"] = True
                elif df[col].min() >= 0 and df[col].max() <= 100:
                    features["has_proportions"] = True
                    
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                features["datetime_columns"].append(col)
                features["has_time_series"] = True
                
            else:
                features["categorical_columns"].append(col)
                features["has_categories"] = True
        
        return features
    
    def _recommend_chart_type(self, features: Dict) -> tuple:
        """推荐图表类型"""
        # 时间序列数据 -> 折线图
        if features.get("has_time_series"):
            return "line", "数据包含时间序列，适合折线图展示趋势"
        
        # 比例数据 -> 饼图
        if features.get("has_proportions") and features.get("row_count", 0) <= 10:
            return "pie", "数据表示比例关系且类别较少，适合饼图"
        
        # 分类 + 数值 -> 柱状图
        if features.get("has_categories") and features.get("has_numeric"):
            return "bar", "数据包含分类变量和数值变量，适合柱状图"
        
        # 多个数值列 -> 散点图或折线图
        if len(features.get("numeric_columns", [])) >= 2:
            return "scatter", "数据包含多个数值变量，适合散点图分析相关性"
        
        # 默认 -> 表格
        return "table", "数据结构复杂，建议使用表格展示"
    
    def _generate_chart_config(self, chart_type: str, data: List[Dict], features: Dict) -> Dict:
        """生成图表配置"""
        df = pd.DataFrame(data)
        
        config = {
            "type": chart_type,
            "data": data,
            "options": {}
        }
        
        if chart_type == "bar":
            # 柱状图配置
            x_col = features["categorical_columns"][0] if features["categorical_columns"] else df.columns[0]
            y_col = features["numeric_columns"][0] if features["numeric_columns"] else df.columns[1]
            
            config["options"] = {
                "xAxis": {
                    "type": "category",
                    "data": df[x_col].tolist()
                },
                "yAxis": {
                    "type": "value"
                },
                "series": [{
                    "type": "bar",
                    "data": df[y_col].tolist()
                }]
            }
            
        elif chart_type == "line":
            # 折线图配置
            x_col = features["datetime_columns"][0] if features["datetime_columns"] else df.columns[0]
            y_col = features["numeric_columns"][0] if features["numeric_columns"] else df.columns[1]
            
            config["options"] = {
                "xAxis": {
                    "type": "category",
                    "data": df[x_col].tolist()
                },
                "yAxis": {
                    "type": "value"
                },
                "series": [{
                    "type": "line",
                    "data": df[y_col].tolist(),
                    "smooth": True
                }]
            }
            
        elif chart_type == "pie":
            # 饼图配置
            name_col = features["categorical_columns"][0] if features["categorical_columns"] else df.columns[0]
            value_col = features["numeric_columns"][0] if features["numeric_columns"] else df.columns[1]
            
            config["options"] = {
                "series": [{
                    "type": "pie",
                    "data": [
                        {"name": row[name_col], "value": row[value_col]}
                        for _, row in df.iterrows()
                    ]
                }]
            }
        
        return config
    
    def _get_alternative_charts(self, features: Dict) -> List[Dict]:
        """获取备选图表"""
        alternatives = []
        
        if features.get("has_numeric"):
            alternatives.append({
                "type": "bar",
                "name": "柱状图",
                "reason": "适合比较数值大小"
            })
            alternatives.append({
                "type": "line",
                "name": "折线图",
                "reason": "适合展示趋势变化"
            })
        
        if features.get("has_proportions"):
            alternatives.append({
                "type": "pie",
                "name": "饼图",
                "reason": "适合展示比例关系"
            })
        
        if len(features.get("numeric_columns", [])) >= 2:
            alternatives.append({
                "type": "scatter",
                "name": "散点图",
                "reason": "适合分析相关性"
            })
        
        return alternatives
    
    def get_info(self) -> Dict:
        """获取技能信息"""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "agent_name": self.agent_name,
            "enabled": self.enabled,
            "last_used": self.last_used,
            "usage_count": self.usage_count
        }
```

### 6.2 注册图表推荐技能

编辑 `backend/services/skill_system.py`：

```python
# 图表推荐技能
try:
    from skills.chart_recommendation_skill import ChartRecommendationSkill
    self.register(ChartRecommendationSkill())
    logger.info("[SkillRegistry] 图表推荐技能已注册")
except Exception as e:
    logger.warning(f"[SkillRegistry] 无法注册图表推荐技能: {e}")
```

### 6.3 创建图表推荐 API

编辑 `backend/routes/analysis_routes.py` 或创建新的路由：

```python
@router.post("/recommend-chart")
async def recommend_chart(data: List[Dict]):
    """
    推荐图表类型
    
    参数:
        data: 数据列表
    
    返回:
        推荐的图表类型和配置
    """
    try:
        from services.skill_system import get_skill_registry
        
        registry = get_skill_registry()
        result = await registry.execute_skill(
            "chart_recommendation",
            data=data
        )
        
        return result.get("result", {})
        
    except Exception as e:
        logger.error(f"图表推荐失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
```

### 6.4 创建前端图表组件

**文件：** `src/components/SmartChart.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface SmartChartProps {
  data: any[];
  chartType?: string;
  options?: any;
}

const SmartChart: React.FC<SmartChartProps> = ({ data, chartType, options }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    if (chartInstance.current && options) {
      chartInstance.current.setOption(options);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [options]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

export default SmartChart;
```

---

## 📋 完整实施清单

### ✅ 已完成

1. ✅ 创建知识图谱可视化技能
2. ✅ 注册知识图谱技能
3. ✅ 添加知识图谱 API
4. ✅ 创建前端知识图谱组件

### 🔄 进行中

5. ⏳ 安装前端依赖（echarts）
6. ⏳ 集成知识图谱组件到前端
7. ⏳ 测试知识图谱功能

### 📝 待完成

8. ⬜ 创建图表推荐技能
9. ⬜ 注册图表推荐技能
10. ⬜ 添加图表推荐 API
11. ⬜ 创建前端智能图表组件
12. ⬜ 测试图表推荐功能

---

## 🚀 立即执行

### 步骤 1：测试后端技能

```powershell
cd C:\test\antinet
.\quick_start.ps1

# 新窗口测试
curl http://localhost:8000/api/skill/list
curl http://localhost:8000/api/knowledge/graph
```

### 步骤 2：安装前端依赖并启动

```bash
cd <前端目录>
npm install echarts
npm run dev
```

### 步骤 3：集成和测试

按照上面的指南集成知识图谱组件，然后测试功能。

---

**创建时间：** 2026-01-26  
**状态：** 知识图谱已实现，图表推荐待实施  
**下一步：** 测试知识图谱 → 实现图表推荐
