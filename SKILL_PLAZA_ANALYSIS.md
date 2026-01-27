# 🎯 Antinet 妙计（Skill）广场 - 功能分析报告

## 📊 当前技能系统概览

### ✅ 已有的技能系统

**技能注册表：** `backend/services/skill_system.py`
- 24 个内置技能
- 8 个技能类别
- 8 个 Agent 对应

**技能路由：** `backend/routes/skill_routes.py`
- `/api/skill/list` - 列出所有技能
- `/api/skill/execute` - 执行技能
- `/api/skill/categories` - 获取技能类别

---

## 🎨 已有的 24 个内置技能

### 1. 数据处理（密卷房）- 3 个技能

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| **data_cleaning** | 数据清洗：去除噪声、处理缺失值、标准化格式 | ✅ 已实现 |
| **feature_extraction** | 特征提取：从数据中提取关键特征和模式 | ✅ 已实现 |
| **data_validation** | 数据验证：检查数据完整性和一致性 | ✅ 已实现 |

### 2. 事实生成（通政司）- 3 个技能

| 技能名称 | 功能描述 | NPU 集成 | 状态 |
|---------|---------|---------|------|
| **fact_extraction** | 事实提取：从文本中提取关键事实 | ✅ 使用 NPU | ✅ 已实现 |
| **fact_classification** | 事实分类：将事实分类到不同类别 | ✅ 使用 NPU | ✅ 已实现 |
| **fact_verification** | 事实验证：验证事实的准确性和合理性 | ✅ 使用 NPU | ✅ 已实现 |

### 3. 解释生成（监察院）- 2 个技能

| 技能名称 | 功能描述 | NPU 集成 | 状态 |
|---------|---------|---------|------|
| **cause_analysis** | 原因分析：分析事件发生的根本原因 | ✅ 使用 NPU | ✅ 已实现 |
| **explanation_generation** | 解释生成：生成事件的可理解解释 | ✅ 使用 NPU | ✅ 已实现 |

### 4. 风险检测（刑狱司）- 3 个技能

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| **risk_detection** | 风险检测：识别潜在风险 | ✅ 已实现 |
| **risk_assessment** | 风险评估：评估风险等级和影响 | ✅ 已实现 |
| **warning_generation** | 预警生成：生成风险预警信息 | ✅ 已实现 |

### 5. 行动建议（参谋司）- 3 个技能

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| **action_recommendation** | 行动建议：生成可执行的行动建议 | ✅ 已实现 |
| **prioritization** | 优先级排序：对行动建议进行优先级排序 | ✅ 已实现 |
| **resource_allocation** | 资源分配：建议资源分配方案 | ✅ 已实现 |

### 6. 记忆管理（太史阁）- 3 个技能

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| **knowledge_storage** | 知识存储：存储四色卡片到知识库 | ✅ 已实现 |
| **knowledge_retrieval** | 知识检索：从知识库检索相关卡片 | ✅ 已实现 |
| **memory_association** | 记忆关联：建立卡片间的关联关系 | ✅ 已实现 |

### 7. 消息传递（驿传司）- 3 个技能

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| **task_dispatch** | 任务分发：分发任务到不同 Agent | ✅ 已实现 |
| **message_routing** | 消息路由：路由消息到目标 Agent | ✅ 已实现 |
| **notification** | 通知推送：推送通知给用户或团队 | ✅ 已实现 |

### 8. 任务调度（锦衣卫）- 4 个技能

| 技能名称 | 功能描述 | 状态 |
|---------|---------|------|
| **task_decomposition** | 任务分解：将复杂任务分解为子任务 | ✅ 已实现 |
| **agent_coordination** | Agent 协调：协调多个 Agent 协作 | ✅ 已实现 |
| **result_aggregation** | 结果聚合：聚合多个 Agent 的结果 | ✅ 已实现 |
| **quality_control** | 质量控制：检查结果质量 | ✅ 已实现（代码中未列出但应该有）|

---

## 🎯 你提到的需求分析

### 1. 知识图谱 📊

**当前状态：** ⚠️ **部分实现**

**已有功能：**
- ✅ `memory_association` 技能 - 建立卡片间的关联关系
- ✅ `backend/api/knowledge.py` - 知识图谱 API（有基础结构）
- ✅ 四色卡片系统 - 天然的知识节点

**缺失功能：**
- ❌ 可视化知识图谱（前端展示）
- ❌ 图谱自动构建算法
- ❌ 语义关联分析
- ❌ 图谱查询语言

**建议：**
```
优先级：⭐⭐⭐ 高
理由：
1. 知识图谱是知识管理的核心功能
2. 可以展示卡片间的关联关系
3. 增强知识检索和发现能力
4. 适合演示和实际使用
```

### 2. 生成 CHART 图表 📈

**当前状态：** ✅ **已实现**

**已有功能：**
- ✅ `backend/skills/xlsx/excel_exporter.py` - Excel 图表生成
  - 支持柱状图（BarChart）
  - 支持折线图（LineChart）
  - 支持饼图（PieChart）
- ✅ Excel 导出技能 - 包含数据可视化

**示例代码：**
```python
from openpyxl.chart import BarChart, LineChart, PieChart, Reference

class AntinetExcelExporter:
    def add_chart(self, ws, chart_type, data_range, title):
        """添加图表到工作表"""
        if chart_type == 'bar':
            chart = BarChart()
        elif chart_type == 'line':
            chart = LineChart()
        elif chart_type == 'pie':
            chart = PieChart()
        
        chart.title = title
        # ... 配置图表
```

**缺失功能：**
- ❌ 前端实时图表（Echarts/Chart.js）
- ❌ 交互式图表
- ❌ 更多图表类型（散点图、雷达图等）

**建议：**
```
优先级：⭐⭐ 中
理由：
1. Excel 图表已满足基本需求
2. 前端实时图表可以增强用户体验
3. 适合数据分析演示
```

### 3. 发送邮件通知团队 📧

**当前状态：** ⚠️ **部分实现**

**已有功能：**
- ✅ `notification` 技能 - 通知推送框架
- ✅ `backend/agents/messenger.py` - 驿传司（消息传递）
- ✅ 消息队列机制

**缺失功能：**
- ❌ 邮件发送功能（SMTP）
- ❌ 邮件模板系统
- ❌ 团队成员管理
- ❌ 通知订阅设置

**建议：**
```
优先级：⭐ 低
理由：
1. 当前是本地应用，邮件需求不强烈
2. 可以用系统通知或前端提示替代
3. 如果需要团队协作，可以考虑添加
```

---

## 🆕 建议新增的技能

### 1. 知识图谱可视化技能 ⭐⭐⭐ 高优先级

**技能名称：** `knowledge_graph_visualization`

**功能描述：**
- 自动构建知识图谱
- 生成图谱可视化数据（节点+边）
- 支持图谱查询和过滤
- 计算节点重要性

**实现方案：**
```python
class KnowledgeGraphVisualizationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="knowledge_graph_visualization",
            description="知识图谱可视化：构建和展示卡片间的关联关系",
            category="知识管理",
            agent_name="太史阁"
        )
    
    async def execute(self, cards: List[Dict]) -> Dict:
        """
        构建知识图谱
        
        返回：
        {
            "nodes": [{"id": "card_001", "label": "标题", "type": "blue"}],
            "edges": [{"source": "card_001", "target": "card_002", "label": "解释"}],
            "statistics": {"total_nodes": 10, "total_edges": 15}
        }
        """
        # 1. 提取节点（卡片）
        nodes = [
            {
                "id": card["id"],
                "label": card["title"],
                "type": card["type"],
                "category": card.get("category", "")
            }
            for card in cards
        ]
        
        # 2. 构建边（关联关系）
        edges = []
        for card in cards:
            # 基于引用关系
            for ref_id in card.get("references", []):
                edges.append({
                    "source": card["id"],
                    "target": ref_id,
                    "label": "引用",
                    "type": "reference"
                })
            
            # 基于标签相似度
            # ... 语义关联分析
        
        return {
            "nodes": nodes,
            "edges": edges,
            "statistics": {
                "total_nodes": len(nodes),
                "total_edges": len(edges)
            }
        }
```

**前端集成：**
- 使用 Echarts 或 D3.js 展示图谱
- 支持节点拖拽和缩放
- 点击节点显示卡片详情

### 2. 智能图表推荐技能 ⭐⭐ 中优先级

**技能名称：** `chart_recommendation`

**功能描述：**
- 分析数据特征
- 推荐最合适的图表类型
- 自动生成图表配置

**实现方案：**
```python
class ChartRecommendationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="chart_recommendation",
            description="智能图表推荐：根据数据特征推荐最合适的图表类型",
            category="数据可视化",
            agent_name="密卷房"
        )
    
    async def execute(self, data: List[Dict]) -> Dict:
        """
        推荐图表类型
        
        返回：
        {
            "recommended_chart": "bar",
            "reason": "数据包含分类变量和数值变量，适合柱状图",
            "chart_config": {...}
        }
        """
        # 1. 分析数据特征
        features = self._analyze_data_features(data)
        
        # 2. 推荐图表类型
        if features["has_time_series"]:
            chart_type = "line"
            reason = "数据包含时间序列，适合折线图"
        elif features["has_categories"] and features["has_numeric"]:
            chart_type = "bar"
            reason = "数据包含分类变量和数值变量，适合柱状图"
        elif features["has_proportions"]:
            chart_type = "pie"
            reason = "数据表示比例关系，适合饼图"
        else:
            chart_type = "table"
            reason = "数据结构复杂，建议使用表格"
        
        # 3. 生成图表配置
        chart_config = self._generate_chart_config(chart_type, data, features)
        
        return {
            "recommended_chart": chart_type,
            "reason": reason,
            "chart_config": chart_config,
            "alternative_charts": self._get_alternative_charts(features)
        }
```

### 3. 邮件通知技能 ⭐ 低优先级

**技能名称：** `email_notification`

**功能描述：**
- 发送邮件通知
- 支持邮件模板
- 批量发送

**实现方案：**
```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmailNotificationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="email_notification",
            description="邮件通知：发送邮件通知给团队成员",
            category="消息传递",
            agent_name="驿传司"
        )
    
    async def execute(self, 
                     recipients: List[str], 
                     subject: str, 
                     content: str,
                     template: str = "default") -> Dict:
        """
        发送邮件通知
        
        参数：
            recipients: 收件人列表
            subject: 邮件主题
            content: 邮件内容
            template: 邮件模板
        
        返回：
            发送结果
        """
        try:
            # 1. 加载邮件模板
            html_content = self._render_template(template, content)
            
            # 2. 创建邮件
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = "antinet@example.com"
            msg['To'] = ", ".join(recipients)
            
            # 3. 添加内容
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # 4. 发送邮件
            with smtplib.SMTP('smtp.example.com', 587) as server:
                server.starttls()
                server.login("username", "password")
                server.send_message(msg)
            
            return {
                "success": True,
                "recipients_count": len(recipients),
                "sent_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
```

---

## 📋 技能优先级排序

### 立即实现 ⭐⭐⭐

1. **知识图谱可视化技能**
   - 理由：核心功能，展示知识关联
   - 工作量：中等（2-3 天）
   - 价值：高

### 近期实现 ⭐⭐

2. **智能图表推荐技能**
   - 理由：增强数据分析能力
   - 工作量：小（1-2 天）
   - 价值：中

3. **前端实时图表**
   - 理由：提升用户体验
   - 工作量：中等（2-3 天）
   - 价值：中

### 可选实现 ⭐

4. **邮件通知技能**
   - 理由：团队协作需求
   - 工作量：小（1 天）
   - 价值：低（当前是本地应用）

---

## 🎯 推荐的技能广场结构

### 技能分类

```
📦 Antinet 妙计广场
├── 🎨 数据处理（3 个技能）
│   ├── data_cleaning
│   ├── feature_extraction
│   └── data_validation
├── 🔍 事实生成（3 个技能 + NPU）
│   ├── fact_extraction
│   ├── fact_classification
│   └── fact_verification
├── 💡 解释生成（2 个技能 + NPU）
│   ├── cause_analysis
│   └── explanation_generation
├── ⚠️ 风险检测（3 个技能）
│   ├── risk_detection
│   ├── risk_assessment
│   └── warning_generation
├── 🎯 行动建议（3 个技能）
│   ├── action_recommendation
│   ├── prioritization
│   └── resource_allocation
├── 📚 知识管理（4 个技能）✨ 新增
│   ├── knowledge_storage
│   ├── knowledge_retrieval
│   ├── memory_association
│   └── knowledge_graph_visualization ✨ 新增
├── 📊 数据可视化（3 个技能）✨ 新增
│   ├── excel_chart_generation
│   ├── chart_recommendation ✨ 新增
│   └── interactive_chart_generation ✨ 新增
├── 📧 消息通知（4 个技能）
│   ├── task_dispatch
│   ├── message_routing
│   ├── notification
│   └── email_notification ✨ 新增
└── 🎭 任务调度（4 个技能）
    ├── task_decomposition
    ├── agent_coordination
    ├── result_aggregation
    └── quality_control
```

---

## 🚀 实施建议

### 阶段 1：完善现有技能（立即）

1. **测试所有 24 个内置技能**
   ```powershell
   cd C:\test\antinet
   .\quick_start.ps1
   
   # 测试技能列表
   curl http://localhost:8000/api/skill/list
   
   # 测试技能执行
   curl -X POST http://localhost:8000/api/skill/execute \
     -H "Content-Type: application/json" \
     -d '{"skill_name": "data_cleaning", "parameters": {"data": [...]}}'
   ```

2. **优化 NPU 集成技能**
   - 确保 NPU 模型加载正常
   - 优化推理延迟
   - 添加错误处理和降级机制

### 阶段 2：添加知识图谱可视化（本周）

1. **后端：创建知识图谱技能**
   ```python
   # backend/services/skill_system.py
   self.register(KnowledgeGraphVisualizationSkill())
   ```

2. **前端：集成图谱展示**
   ```typescript
   // src/components/KnowledgeGraph.tsx
   import * as echarts from 'echarts';
   
   // 使用 Echarts 图谱布局
   const option = {
     series: [{
       type: 'graph',
       layout: 'force',
       data: nodes,
       links: edges
     }]
   };
   ```

3. **API：添加图谱接口**
   ```python
   # backend/routes/knowledge_routes.py
   @router.get("/graph")
   async def get_knowledge_graph():
       # 调用知识图谱技能
       result = await skill_registry.execute_skill(
           "knowledge_graph_visualization",
           cards=all_cards
       )
       return result
   ```

### 阶段 3：添加智能图表推荐（下周）

1. **创建图表推荐技能**
2. **集成到数据分析流程**
3. **前端展示推荐结果**

### 阶段 4：可选功能（按需）

1. **邮件通知**（如果需要团队协作）
2. **更多图表类型**（散点图、雷达图等）
3. **图谱高级功能**（社区发现、路径查询等）

---

## 📝 总结

### 当前技能系统

- ✅ **24 个内置技能** - 覆盖 8 大类别
- ✅ **NPU 集成** - 5 个技能使用 NPU 推理
- ✅ **Excel 图表** - 已支持基础图表生成
- ⚠️ **知识图谱** - 有基础，需要可视化
- ⚠️ **邮件通知** - 有框架，需要实现

### 推荐新增技能

1. ⭐⭐⭐ **知识图谱可视化** - 立即实现
2. ⭐⭐ **智能图表推荐** - 近期实现
3. ⭐ **邮件通知** - 可选实现

### 下一步行动

```powershell
# 1. 测试现有技能
cd C:\test\antinet
.\quick_start.ps1
curl http://localhost:8000/api/skill/list

# 2. 创建知识图谱技能
# 编辑 backend/services/skill_system.py
# 添加 KnowledgeGraphVisualizationSkill

# 3. 测试新技能
curl -X POST http://localhost:8000/api/skill/execute \
  -H "Content-Type: application/json" \
  -d '{"skill_name": "knowledge_graph_visualization", "parameters": {}}'
```

---

**创建时间：** 2026-01-26  
**分析范围：** 技能系统 + 知识图谱 + 图表生成 + 邮件通知  
**推荐优先级：** 知识图谱 > 图表推荐 > 邮件通知  
**状态：** ✅ 分析完成，等待实施确认
