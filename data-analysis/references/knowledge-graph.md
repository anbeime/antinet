# 知识图谱关联

## 目录
- [知识图谱概述](#知识图谱概述)
- [四色卡片关联维度](#四色卡片关联维度)
- [自定义关联规则](#自定义关联规则)
- [跨色卡片引用机制](#跨色卡片引用机制)
- [图谱构建](#图谱构建)
- [关联策略](#关联策略)
- [向量检索](#向量检索)
- [知识复用](#知识复用)
- [持续学习](#持续学习)

## 概述
本文档描述Antinet智能知识管家的知识图谱关联功能。知识图谱用于存储历史分析结果、四色卡片、用户反馈，并支持向量检索和知识复用。

### 知识图谱的价值

- **知识沉淀**：保存所有历史分析结果和卡片
- **快速检索**：基于语义的快速相似案例检索
- **知识复用**：复用历史分析结果，提升效率
- **持续学习**：从用户反馈中学习和优化
- **关联发现**：发现卡片间的隐含关联关系
- **多维整合**：整合四色卡片的不同维度知识

### 知识图谱节点类型

```
├── 数据节点（Data Node）
│   ├── 数据文件节点
│   └── 数据字段节点
│
├── 分析节点（Analysis Node）
│   ├── 分析任务节点
│   └── 分析方法节点
│
├── 卡片节点（Card Node）
│   ├── 蓝色卡片节点（事实层）
│   ├── 绿色卡片节点（分析层）
│   ├── 黄色卡片节点（创意层）
│   └── 红色卡片节点（风险层）
│
├── 洞察节点（Insight Node）
│   ├── 核心发现节点
│   └── 业务启示节点
│
└── 反馈节点（Feedback Node）
    ├── 用户评价节点
    └── 修正建议节点
```

### 知识图谱边类型

```
├── 关系边（Relation Edge）
│   ├── contains（包含）
│   ├── derived_from（衍生自）
│   ├── similar_to（相似于）
│   ├── related_to（关联于）
│   ├── explains（解释）
│   ├── contradicts（矛盾于）
│   └── references（引用）
│
├── 时间边（Temporal Edge）
│   ├── before（之前）
│   ├── after（之后）
│   └── concurrent（同时）
│
└── 评估边（Evaluation Edge）
    ├── validates（验证）
    ├── refutes（反驳）
    └── improves（改进）
```

## 四色卡片关联维度

### 蓝色卡片（事实层）

**关联维度：结构化数据维度**

蓝色卡片在知识图谱中作为事实层节点，关联以下维度：

| 维度 | 说明 | 示例 |
|------|------|------|
| 时间维度 | 时间范围、时间点、时间序列 | 2024年12月、Q3季度、上周 |
| 地点维度 | 地理位置、区域、场所 | 北京、上海、华东地区 |
| 人物维度 | 用户、客户、参与者 | 客户A、销售团队、管理层 |
| 事件维度 | 业务事件、活动、操作 | 促销活动、系统故障、产品发布 |
| 数字指标 | 销量、金额、比例、增长率 | 销售额100万、增长率15% |

**关联规则示例：**
```
规则1：相同时间范围的蓝色卡片自动关联
规则2：相同地理位置的蓝色卡片建立区域关联
规则3：相同指标类型的蓝色卡片建立趋势关联
```

**图谱节点结构：**
```json
{
  "node_id": "fact_card_001",
  "node_type": "blue_card",
  "layer": "fact",
  "dimensions": {
    "time": ["2024-12-01", "2024-12-31"],
    "location": ["北京"],
    "person": [],
    "event": ["促销活动A"],
    "metrics": {
      "sales": 1200000,
      "growth_rate": "15%"
    }
  },
  "embedding": [向量表示]
}
```

### 绿色卡片（分析层）

**关联维度：逻辑关系维度**

绿色卡片在知识图谱中作为分析层节点，关联以下维度：

| 维度 | 说明 | 示例 |
|------|------|------|
| 因果关系 | 原因-结果、影响-后果 | 促销活动→销售增长 |
| 对比关系 | 相似对比、差异对比 | 北京vs上海销售对比 |
| 趋势变化 | 上升、下降、波动 | 销售趋势上升 |
| 关联规则 | 业务规则、关联模式 | 高库存→清理促销 |

**关联规则示例：**
```
规则1：绿色卡片自动关联到相关的蓝色卡片（数据来源）
规则2：因果关系相同或相似的绿色卡片建立关联
规则3：分析对象相同的绿色卡片建立主题关联
```

**图谱节点结构：**
```json
{
  "node_id": "explanation_card_001",
  "node_type": "green_card",
  "layer": "analysis",
  "relations": {
    "causal": [
      {
        "cause": "促销活动A",
        "effect": "销售增长25%",
        "confidence": 0.85
      }
    ],
    "comparison": [
      {
        "items": ["北京", "上海"],
        "metric": "销售额",
        "difference": "+10%"
      }
    ],
    "trend": {
      "direction": "increasing",
      "duration": "3个月"
    }
  },
  "embedding": [向量表示]
}
```

### 黄色卡片（创意层）

**关联维度：创意灵感维度**

黄色卡片在知识图谱中作为创意层节点，关联以下维度：

| 维度 | 说明 | 示例 |
|------|------|------|
| 跨领域类比 | 不同领域的相似模式 | 零售行业→电商行业 |
| 潜在机会 | 未被发现的机会点 | 新兴市场需求 |
| 创新方向 | 新的尝试方向 | 新产品线、新渠道 |
| 头脑风暴 | 创意集合 | 多个创新想法 |

**关联规则示例：**
```
规则1：黄色卡片通过语义相似度关联到其他卡片
规则2：跨领域类比自动关联到相似领域的蓝色/绿色卡片
规则3：相同主题的黄色卡片建立创意集群
```

**图谱节点结构：**
```json
{
  "node_id": "creative_card_001",
  "node_type": "yellow_card",
  "layer": "creative",
  "dimensions": {
    "cross_domain": [
      {
        "source_domain": "零售",
        "target_domain": "电商",
        "similarity": 0.75
      }
    ],
    "opportunity": [
      {
        "title": "新兴市场需求",
        "potential": "高",
        "estimated_value": "50万/年"
      }
    ],
    "innovation": [
      {
        "direction": "新产品线",
        "description": "推出智能家居产品"
      }
    ]
  },
  "embedding": [向量表示]
}
```

### 红色卡片（风险层）

**关联维度：风险预警维度**

红色卡片在知识图谱中作为风险层节点，关联以下维度：

| 维度 | 说明 | 示例 |
|------|------|------|
| 潜在问题 | 可能出现的问题 | 库存积压、客户流失 |
| 负面因素 | 导致风险的因素 | 竞品降价、市场需求下降 |
| 冲突矛盾 | 内外部的矛盾冲突 | 利益冲突、资源冲突 |
| 风险等级 | 风险严重程度 | 高/中/低 |

**关联规则示例：**
```
规则1：红色卡片自动关联到相关的蓝色卡片（数据支撑）
规则2：相同风险类型的红色卡片建立风险集群
规则3：高风险红色卡片优先关联到行动卡片
```

**图谱节点结构：**
```json
{
  "node_id": "risk_card_001",
  "node_type": "red_card",
  "layer": "risk",
  "dimensions": {
    "potential_issues": [
      {
        "issue": "库存积压",
        "probability": 0.8,
        "impact": "high"
      }
    ],
    "negative_factors": [
      {
        "factor": "竞品降价",
        "impact_level": "medium"
      }
    ],
    "conflicts": [
      {
        "type": "resource_conflict",
        "parties": ["市场部", "销售部"],
        "severity": "medium"
      }
    ],
    "risk_level": "high"
  },
  "embedding": [向量表示]
}
```

## 自定义关联规则

### 显性规则定义

用户可以通过自然语言直接描述关联逻辑。

**规则格式：**
```
"将[条件描述]的卡片与[目标描述]的卡片建立[关联类型]"
```

**示例：**
```
规则1：将所有销售额超过100万的地区与对应的营销策略建立关联

规则2：将所有包含"客户流失"关键词的卡片自动关联到风险预警卡片

规则3：将时间范围在最近7天内的卡片按时间顺序建立关联
```

**实现逻辑：**
```python
def apply_explicit_rule(rule: str, cards: List[Card]) -> List[Tuple[str, str]]:
    """
    应用显性规则
    """
    # 解析规则
    conditions = parse_rule_conditions(rule)
    targets = parse_rule_targets(rule)
    relation_type = parse_relation_type(rule)
    
    # 筛选符合条件的卡片
    matched_cards = [card for card in cards if match_conditions(card, conditions)]
    
    # 筛选目标卡片
    target_cards = [card for card in cards if match_targets(card, targets)]
    
    # 建立关联
    relations = []
    for card1 in matched_cards:
        for card2 in target_cards:
            relations.append((card1.id, card2.id, relation_type))
    
    return relations
```

### 隐性规则学习

系统能够通过示例学习关联模式。

**学习流程：**
```
1. 收集示例：用户提供已标注的关联案例
2. 特征提取：提取卡片特征（类型、内容、维度）
3. 模式识别：识别关联模式
4. 规则生成：自动生成关联规则
5. 规则验证：验证规则有效性
6. 规则应用：应用到新卡片
```

**示例输入：**
```json
{
  "examples": [
    {
      "source_card": {
        "id": "card_001",
        "type": "fact",
        "content": "销售额：120万"
      },
      "target_card": {
        "id": "card_002",
        "type": "risk",
        "content": "库存积压风险"
      },
      "relation": "has_risk_of"
    },
    {
      "source_card": {
        "id": "card_003",
        "type": "fact",
        "content": "销售额：150万"
      },
      "target_card": {
        "id": "card_004",
        "type": "risk",
        "content": "库存周转风险"
      },
      "relation": "has_risk_of"
    }
  ]
}
```

**学习后的规则：**
```
规则：当蓝色事实卡片中销售额>100万时，与相关风险卡片建立has_risk_of关联
置信度：0.85
```

**实现逻辑：**
```python
def learn_implicit_rule(examples: List[Example]) -> Rule:
    """
    从示例中学习隐性规则
    """
    # 提取特征
    features = []
    for example in examples:
        source_features = extract_features(example.source_card)
        target_features = extract_features(example.target_card)
        features.append((source_features, target_features, example.relation))
    
    # 训练分类器
    classifier = train_classifier(features)
    
    # 生成规则
    rule = generate_rule(classifier)
    
    return rule
```

### 规则优先级设置

用户可以指定不同关联规则的优先级。

**优先级定义：**
```json
{
  "rule_1": {
    "description": "将销售额超过100万的地区与营销策略关联",
    "priority": "high",
    "weight": 0.8
  },
  "rule_2": {
    "description": "相同时间范围的卡片自动关联",
    "priority": "medium",
    "weight": 0.5
  },
  "rule_3": {
    "description": "语义相似度>0.8的卡片建立关联",
    "priority": "low",
    "weight": 0.3
  }
}
```

**应用逻辑：**
```python
def apply_rules_by_priority(cards: List[Card], rules: List[Rule]) -> List[Relation]:
    """
    按优先级应用规则
    """
    # 按优先级排序规则
    sorted_rules = sorted(rules, key=lambda r: r.priority, reverse=True)
    
    relations = []
    for rule in sorted_rules:
        # 应用规则
        rule_relations = apply_rule(rule, cards)
        
        # 去重和过滤
        rule_relations = deduplicate_relations(relations + rule_relations)
        
        relations = rule_relations
    
    return relations
```

### 规则验证与限制

**验证机制：**
1. **逻辑一致性**：检查规则是否与现有规则矛盾
2. **可执行性**：检查规则是否可执行
3. **性能影响**：评估规则对系统性能的影响
4. **用户确认**：对高风险规则要求用户确认

**限制条件：**
- 过于模糊的规则可能无法正确执行
- 矛盾的规则会被拒绝
- 计算成本过高的规则会被限制或拒绝

**示例：**
```
可接受的规则：
"将所有销售额超过100万的地区与对应的营销策略建立关联"

 过于模糊的规则：
"将相关的卡片建立关联"（"相关"过于模糊）

 矛盾的规则：
规则1："将蓝色卡片与红色卡片关联"
规则2："禁止蓝色卡片与红色卡片关联"（矛盾）
```

## 跨色卡片引用机制

### 直接引用

可以在任意颜色卡片中直接引用其他颜色卡片的节点。

**引用格式：**
```json
{
  "card_id": "card_001",
  "card_type": "green",
  "title": "销售下滑原因分析",
  "content": "竞品于12月中旬推出满减促销活动，分流核心客户群体",
  "references": [
    {
      "card_id": "card_002",
      "card_type": "blue",
      "title": "12月销售数据统计",
      "reference_type": "data_source",
      "context": "基于销售数据分析，发现..."
    },
    {
      "card_id": "card_003",
      "card_type": "red",
      "title": "客户流失风险预警",
      "reference_type": "related_risk",
      "context": "销售下滑可能导致客户流失风险"
    }
  ]
}
```

**引用类型：**
- `data_source`：引用数据来源（通常引用蓝色卡片）
- `related_risk`：引用相关风险（通常引用红色卡片）
- `supporting_analysis`：引用支持性分析（通常引用绿色卡片）
- `follow_up_action`：引用后续行动（通常引用红色卡片）

### 规则映射

通过自定义规则实现跨色节点关联。

**规则示例：**
```
规则1：当黄色创意卡片中的某个概念与蓝色事实卡片中的数据匹配时，自动建立引用关系

规则2：当绿色分析卡片引用的蓝色卡片数据发生变化时，自动更新引用关系

规则3：当红色风险卡片的风险等级提升时，自动关联到相关的蓝色事实卡片
```

**实现逻辑：**
```python
def apply_rule_mapping(card: Card, rules: List[Rule], all_cards: List[Card]) -> List[Reference]:
    """
    应用规则映射建立跨色引用
    """
    references = []
    
    for rule in rules:
        # 检查规则是否适用
        if is_rule_applicable(rule, card):
            # 筛选目标卡片
            target_cards = filter_cards_by_rule(rule, all_cards, card)
            
            # 建立引用
            for target_card in target_cards:
                reference = {
                    "card_id": target_card.id,
                    "card_type": target_card.type,
                    "reference_type": rule.reference_type,
                    "context": rule.generate_context(card, target_card),
                    "created_by": "rule_mapping"
                }
                references.append(reference)
    
    return references
```

### 动态更新

引用关系会随原始节点内容变化而自动更新。

**更新触发条件：**
1. **原始卡片内容更新**
2. **原始卡片删除**
3. **原始卡片关联关系变化**
4. **定期自动检查**（如每周检查一次）

**更新策略：**
```python
def update_references_dynamically(card_id: str, change_type: str, all_cards: List[Card]):
    """
    动态更新引用关系
    """
    if change_type == "content_updated":
        # 重新计算语义相似度
        update_semantic_references(card_id, all_cards)
        
    elif change_type == "card_deleted":
        # 删除所有引用该卡片的引用关系
        delete_references_to_card(card_id)
        
    elif change_type == "relation_changed":
        # 重新应用规则映射
        reapply_rule_mappings(card_id, all_cards)
```

**更新示例：**
```json
// 原始卡片更新前
{
  "card_id": "card_001",
  "references": [
    {"card_id": "card_002", "similarity": 0.85}
  ]
}

// 原始卡片更新后，引用关系自动更新
{
  "card_id": "card_001",
  "references": [
    {"card_id": "card_002", "similarity": 0.75},  // 相似度更新
    {"card_id": "card_005", "similarity": 0.82}   // 新增引用
  ]
}
```

### 引用限制与注意事项

#### 循环引用检测

系统会自动检测并阻止循环引用，避免知识图谱出现逻辑矛盾。

**检测算法：**
```python
def detect_circular_references(card_id: str, visited: Set[str], all_cards: List[Card]) -> bool:
    """
    检测循环引用
    """
    if card_id in visited:
        return True
    
    visited.add(card_id)
    
    card = get_card_by_id(card_id, all_cards)
    if not card:
        return False
    
    for ref in card.references:
        if detect_circular_references(ref.card_id, visited.copy(), all_cards):
            return True
    
    return False
```

**示例：**
```
 循环引用（被阻止）：
card_001 引用 card_002
card_002 引用 card_003
card_003 引用 card_001  ← 循环！
```

#### 权限控制

可以设置节点引用权限，限制某些卡片被其他卡片引用。

**权限级别：**
- `public`：所有卡片可以引用
- `restricted`：仅特定类型卡片可以引用
- `private`：仅创建者可以引用

**设置示例：**
```json
{
  "card_id": "card_001",
  "card_type": "red",
  "title": "高风险预警",
  "content": "...",
  "reference_permissions": {
    "level": "restricted",
    "allowed_types": ["green", "red"],
    "reason": "敏感风险信息，仅分析层和风险层可引用"
  }
}
```

**权限检查：**
```python
def check_reference_permission(source_card: Card, target_card: Card) -> bool:
    """
    检查引用权限
    """
    permission = target_card.reference_permissions
    
    if permission["level"] == "public":
        return True
    
    elif permission["level"] == "restricted":
        return source_card.type in permission["allowed_types"]
    
    elif permission["level"] == "private":
        return source_card.created_by == target_card.created_by
    
    return False
```

#### 引用标记

所有跨色引用都会被明确标记，方便用户追踪知识来源和关联路径。

**标记信息：**
```json
{
  "card_id": "card_001",
  "references": [
    {
      "card_id": "card_002",
      "card_type": "blue",
      "reference_type": "data_source",
      "created_at": "2025-01-21T10:00:00Z",
      "created_by": "system",
      "created_method": "rule_mapping",  // "manual" | "rule_mapping" | "auto"
      "confidence": 0.85,
      "context": "基于销售数据分析，发现..."
    }
  ]
}
```

**追踪功能：**
```python
def trace_reference_path(card_id: str, depth: int = 3) -> List[List[Card]]:
    """
    追踪引用路径
    """
    paths = []
    current_path = []
    
    def dfs(current_id, current_depth):
        if current_depth > depth:
            return
        
        card = get_card_by_id(current_id)
        if not card:
            return
        
        current_path.append(card)
        
        if len(current_path) > 1:
            paths.append(current_path.copy())
        
        for ref in card.references:
            dfs(ref.card_id, current_depth + 1)
        
        current_path.pop()
    
    dfs(card_id, 0)
    return paths
```

## 图谱构建

### 构建流程

```
1. 生成新卡片
   ↓
2. 提取实体和关系
   ↓
3. 向量化内容
   ↓
4. 创建节点和边
   ↓
5. 应用关联规则
   ↓
6. 验证引用关系
   ↓
7. 更新图谱
```

### 节点创建

**数据节点**
```json
{
  "node_id": "data_20250121_001",
  "node_type": "data_file",
  "properties": {
    "file_name": "sales_data.csv",
    "file_path": "./user-data/sales_data.csv",
    "data_type": "time_series",
    "business_domain": "sales",
    "row_count": 365,
    "column_count": 10,
    "created_at": "2025-01-21T10:00:00Z"
  }
}
```

**卡片节点**
```json
{
  "node_id": "card_20250121_001",
  "node_type": "blue_card",
  "layer": "fact",
  "properties": {
    "card_id": "fact_20250121_001",
    "title": "销售额数据",
    "content": {...},
    "confidence": 0.98,
    "dimensions": {
      "time": ["2024-12"],
      "metrics": ["sales", "growth_rate"]
    },
    "created_at": "2025-01-21T10:10:00Z",
    "embedding": [0.123, 0.456, ...]
  }
}
```

### 边创建

**关系边**
```json
{
  "edge_id": "edge_20250121_001",
  "edge_type": "derived_from",
  "source": "card_20250121_002",
  "target": "card_20250121_001",
  "properties": {
    "relationship_strength": 0.9,
    "cross_layer": "analysis_to_fact",  // 跨层引用
    "reference_type": "data_source",
    "created_at": "2025-01-21T10:15:00Z",
    "created_by": "rule_mapping"
  }
}
```

**相似度边**
```json
{
  "edge_id": "edge_20250121_002",
  "edge_type": "similar_to",
  "source": "card_20250121_001",
  "target": "card_20250105_001",
  "properties": {
    "similarity_score": 0.85,
    "similarity_dimensions": ["business_domain", "data_type"],
    "cross_layer": false,
    "created_at": "2025-01-21T10:20:00Z"
  }
}
```

## 关联策略

### 自动关联

**1. 基于业务领域关联**
```
规则：相同业务领域的卡片自动关联
示例：销售领域的所有卡片建立关联网络
跨层：蓝色→绿色→红色
```

**2. 基于数据类型关联**
```
规则：相同数据类型的卡片自动关联
示例：所有时间序列数据的分析卡片建立关联
跨层：蓝色→绿色→黄色
```

**3. 基于时间序列关联**
```
规则：相邻时间段的卡片自动关联
示例：2024年12月和2025年1月的销售分析建立关联
跨层：任意层
```

**4. 基于相似度关联**
```
规则：向量相似度超过阈值的卡片自动关联
阈值：similarity_score >= 0.75
跨层：任意层
```

### 智能关联

**1. 语义关联**
```
方法：基于卡片内容的语义分析
工具：使用预训练语言模型计算语义相似度
跨层：任意层
```

**2. 因果关联**
```
方法：基于卡片间的因果关系
示例：蓝色卡片→绿色卡片→黄色卡片→红色卡片
跨层：fact → analysis → creative → risk
```

**3. 跨域关联**
```
方法：跨业务领域的关联发现
示例：销售数据与库存数据的关联
跨层：蓝色→绿色
```

**4. 异常关联**
```
方法：识别异常模式和特殊关联
示例：某个指标突然下降与外部事件的关联
跨层：蓝色→绿色→红色
```

### 用户反馈关联

**1. 用户标注关联**
```
用户可以手动标注卡片间的关联关系
系统学习用户的标注模式，自动优化关联策略
跨层：任意层
```

**2. 用户反馈修正**
```
用户可以修正或删除错误的关联
系统记录修正，避免重复错误
```

## 向量检索

### 向量化方法

**卡片向量化**
```python
def vectorize_card(card):
    """
    将卡片内容转换为向量
    """
    # 提取关键信息
    title = card['title']
    content = str(card['content'])
    card_type = card['card_type']
    layer = card['layer']
    dimensions = card.get('dimensions', {})
    
    # 组合文本
    text = f"{card_type}:{layer} {title} {content}"
    
    # 使用预训练模型生成向量
    embedding = model.encode(text)
    
    return embedding
```

**向量化内容**
- 卡片标题
- 卡片内容
- 卡片类型
- 图谱层级
- 维度信息

### 检索策略

**语义检索**
```python
def semantic_search(query, top_k=5):
    """
    基于语义相似度的检索
    """
    # 向量化查询
    query_embedding = model.encode(query)
    
    # 计算相似度
    similarities = cosine_similarity(query_embedding, all_embeddings)
    
    # 返回Top-K结果
    top_indices = similarities.argsort()[-top_k:][::-1]
    return [cards[i] for i in top_indices]
```

**混合检索**
```python
def hybrid_search(query, filters=None, top_k=5):
    """
    混合检索：语义检索 + 过滤条件
    """
    # 语义检索
    results = semantic_search(query, top_k=20)
    
    # 应用过滤条件
    if filters:
        results = filter_cards(results, filters)
    
    # 返回Top-K结果
    return results[:top_k]
```

**跨层检索**
```python
def cross_layer_search(query, target_layers=None, top_k=5):
    """
    跨层检索：跨四色卡片层检索
    """
    # 语义检索
    results = semantic_search(query, top_k=20)
    
    # 过滤层级
    if target_layers:
        results = [card for card in results if card.layer in target_layers]
    
    return results[:top_k]
```

**检索示例**
```python
# 查询类似场景
similar_cases = semantic_search(
    query="销售增长原因分析",
    top_k=3
)

# 查询特定业务领域的卡片
sales_cards = hybrid_search(
    query="销售数据分析",
    filters={
        "business_domain": "sales",
        "card_type": ["blue", "green"]
    },
    top_k=5
)

# 跨层检索：从事实层检索到风险层
cross_layer_cards = cross_layer_search(
    query="库存风险",
    target_layers=["fact", "risk"],
    top_k=3
)
```

## 前后端数据接口

### 获取卡片列表

**接口**: `GET /api/cards`

**响应**:
```json
{
  "cards": [
    {
      "id": "card_001",
      "card_type": "blue",
      "layer": "fact",
      "title": "2024年12月销售数据总览",
      "content": {
        "total_sales": 1200000,
        "growth_rate": "15.3%"
      },
      "confidence": 0.98,
      "source": "database",
      "relatedIds": ["card_002", "card_003"],
      "dimensions": {
        "time": ["2024-12-01", "2024-12-31"],
        "location": ["全国"]
      }
    }
  ]
}
```

### 获取知识图谱

**接口**: `POST /api/knowledge/graph`

**请求**:
```json
{
  "cardId": "card_001",
  "type": "semantic"
}
```

**响应**:
```json
{
  "nodes": [
    {
      "id": "card_001",
      "label": "2024年12月销售数据总览",
      "color": "#3b82f6",
      "type": "fact",
      "layer": "fact"
    },
    {
      "id": "card_002",
      "label": "销售下滑原因分析",
      "color": "#22c55e",
      "type": "explanation",
      "layer": "analysis"
    }
  ],
  "edges": [
    {
      "from": "card_001",
      "to": "card_002",
      "label": "关联",
      "relationType": "data_source"
    }
  ]
}
```

### 规则管理接口

**创建规则**: `POST /api/rules`

**请求**:
```json
{
  "rule_type": "explicit",
  "content": "将所有销售额超过100万的地区与对应的营销策略建立关联",
  "priority": 1,
  "status": "active"
}
```

**获取规则列表**: `GET /api/rules`

**响应**:
```json
{
  "rules": [
    {
      "id": "rule_001",
      "rule_type": "explicit",
      "content": "将所有销售额超过100万的地区与对应的营销策略建立关联",
      "priority": 1,
      "status": "active",
      "created_at": "2025-01-21T10:00:00Z"
    }
  ]
}
```

### 前端可视化集成

#### 使用vis-network渲染图谱

```javascript
import { Network } from 'vis-network';

// 准备数据
const nodes = new vis.DataSet([
  { id: 'card_001', label: '2024年12月销售数据', color: '#3b82f6' },
  { id: 'card_002', label: '销售下滑原因分析', color: '#22c55e' }
]);

const edges = new vis.DataSet([
  { from: 'card_001', to: 'card_002', label: '关联' }
]);

// 配置选项
const options = {
  nodes: {
    shape: 'box',
    fontSize: 12,
    size: 20
  },
  edges: {
    length: 150,
    arrows: { to: { enabled: true } }
  },
  layout: {
    hierarchical: { direction: 'LR' }
  }
};

// 创建网络
const container = document.getElementById('graph-container');
const network = new Network(container, { nodes, edges }, options);
```

详细前端集成规范：见 [references/frontend-integration.md](references/frontend-integration.md)

## 知识复用

### 复用场景

**1. 相似场景复用**
```
场景：用户分析2025年1月的销售趋势
复用：检索2024年1月或2024年12月的类似分析
收益：快速生成初步分析，减少从零开始的工作量
跨层：蓝色→绿色→红色
```

**2. 最佳实践复用**
```
场景：用户需要分析库存风险
复用：检索历史中成功的库存风险分析方法
收益：应用已验证的最佳实践，提高分析质量
跨层：绿色→红色
```

**3. 错误避免复用**
```
场景：用户分析某个数据集
复用：检索历史中类似数据集分析时的错误
收益：避免重复犯错，提高分析准确性
跨层：任意层
```

**4. 洞察复用**
```
场景：生成新的分析卡片
复用：检索相关的历史洞察和业务启示
收益：提供更深入的分析视角
跨层：绿色→黄色
```

### 复用策略

**直接复用**
```
直接使用历史卡片的内容
适用场景：完全相同的分析任务
跨层：任意层
```

**适配复用**
```
根据当前情况调整历史卡片内容
适用场景：相似但略有不同的分析任务
跨层：任意层
```

**组合复用**
```
组合多个历史卡片的内容
适用场景：复杂分析任务
跨层：多层级组合
```

**灵感复用**
```
参考历史卡片的思路和结构
适用场景：创新型分析任务
跨层：绿色→黄色
```

### 复用质量评估

**复用适用性评估**
```python
def evaluate_reuse_applicability(historical_card, current_task):
    """
    评估历史卡片对当前任务的适用性
    """
    factors = {
        "similarity": calculate_similarity(historical_card, current_task),
        "relevance": calculate_relevance(historical_card, current_task),
        "freshness": calculate_freshness(historical_card),
        "feedback": calculate_user_feedback_score(historical_card),
        "layer_compatibility": check_layer_compatibility(historical_card, current_task)
    }
    
    # 加权计算适用性得分
    score = (
        factors["similarity"] * 0.4 +
        factors["relevance"] * 0.3 +
        factors["freshness"] * 0.2 +
        factors["feedback"] * 0.05 +
        factors["layer_compatibility"] * 0.05
    )
    
    return score
```

## 前后端数据接口

### 后端API设计

#### 1. 知识图谱数据接口

**获取知识图谱数据**
```python
# FastAPI路由示例
@app.get("/api/knowledge/graph")
async def get_knowledge_graph(
    filters: Optional[str] = None,
    limit: int = 100
):
    """
    获取知识图谱数据
    参数：
        filters: 过滤条件（JSON格式）
        limit: 返回节点数量限制
    返回：
        {
            "nodes": [...],
            "edges": [...]
        }
    """
    # 解析过滤条件
    filter_dict = json.loads(filters) if filters else {}
    
    # 从太史阁获取节点和边
    nodes, edges = await taishi_ge.get_graph_data(filter_dict, limit)
    
    return {
        "nodes": nodes,
        "edges": edges
    }
```

**前端调用示例**
```typescript
import { apiClient } from "./api-client";

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

const getKnowledgeGraph = async (filters?: string): Promise<KnowledgeGraph> => {
  const params = new URLSearchParams();
  if (filters) params.append("filters", filters);
  params.append("limit", "100");

  return apiClient.get<KnowledgeGraph>(`/knowledge/graph?${params}`);
};
```

#### 2. 卡片数据接口

**获取卡片列表**
```python
@app.get("/api/cards")
async def get_cards(
    card_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    获取卡片列表
    参数：
        card_type: 卡片类型（blue/green/yellow/red）
        limit: 返回数量限制
        offset: 偏移量
    返回：
        {
            "cards": [...],
            "total": 100
        }
    """
    # 从太史阁获取卡片
    cards, total = await taishi_ge.get_cards(card_type, limit, offset)
    
    return {
        "cards": cards,
        "total": total
    }
```

**创建新卡片**
```python
@app.post("/api/cards")
async def create_card(card: Card):
    """
    创建新卡片
    参数：
        card: 卡片数据（JSON格式）
    返回：
        {
            "card_id": "card_xxx",
            "status": "created"
        }
    """
    # 存储到太史阁
    card_id = await taishi_ge.create_card(card)
    
    return {
        "card_id": card_id,
        "status": "created"
    }
```

#### 3. 关联规则接口

**保存关联规则**
```python
@app.post("/api/rules")
async def save_rules(rules: List[Rule]):
    """
    保存关联规则
    参数：
        rules: 规则列表（JSON格式）
    返回：
        {
            "status": "saved",
            "count": 5
        }
    """
    # 存储到太史阁
    count = await taishi_ge.save_rules(rules)
    
    return {
        "status": "saved",
        "count": count
    }
```

**获取关联规则**
```python
@app.get("/api/rules")
async def get_rules(rule_type: Optional[str] = None):
    """
    获取关联规则
    参数：
        rule_type: 规则类型（explicit/implicit）
    返回：
        {
            "rules": [...]
        }
    """
    # 从太史阁获取规则
    rules = await taishi_ge.get_rules(rule_type)
    
    return {
        "rules": rules
    }
```

### GenieAPIService集成

#### NPU推理接口

**配置**
```python
# GenieAPIService配置
GENIE_API_BASE_URL = "http://localhost:8000"
MODEL_PATH = "C:/model/Qwen2.0-7B-SSD-8380-2.34/"

# HTTP客户端
import httpx

async def call_genie_api(prompt: str) -> str:
    """
    调用GenieAPIService进行NPU推理
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GENIE_API_BASE_URL}/generate",
            json={
                "model": MODEL_PATH,
                "prompt": prompt,
                "max_tokens": 1000,
                "temperature": 0.7
            },
            timeout=30.0
        )
        response.raise_for_status()
        result = response.json()
        return result["text"]
```

**FastAPI路由**
```python
@app.post("/api/generate-cards")
async def generate_cards(query: str):
    """
    生成四色卡片（使用NPU推理）
    """
    # 调用GenieAPIService
    prompt = f"""
    分析以下查询，生成四色卡片（事实/解释/风险/行动）：
    查询：{query}
    
    请输出JSON格式结果：
    {{
        "cards": [
            {{
                "type": "blue",
                "title": "...",
                "content": "..."
            }}
        ]
    }}
    """
    
    result = await call_genie_api(prompt)
    
    # 解析结果
    cards_data = json.loads(result)
    
    return cards_data
```

### 前端可视化集成

#### 知识图谱可视化组件

**使用Cytoscape.js**
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

export const KnowledgeGraphViz: React.FC<KnowledgeGraphProps> = ({ nodes, edges }) => {
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

**调用示例**
```tsx
import { useState, useEffect } from "react";
import { KnowledgeGraphViz } from "./KnowledgeGraphViz";
import { getKnowledgeGraph } from "./api-client";

export const KnowledgeGraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getKnowledgeGraph();
      setGraphData(data);
    };
    fetchData();
  }, []);

  if (!graphData) return <div>Loading...</div>;

  return (
    <div>
      <h1>知识图谱</h1>
      <KnowledgeGraphViz nodes={graphData.nodes} edges={graphData.edges} />
    </div>
  );
};
```

---

## 持续学习

### 学习机制

**1. 用户反馈学习**
```
收集用户对卡片质量的反馈
- 正面反馈：强化相似的卡片生成策略
- 负面反馈：避免类似的错误
```

**2. 成功案例学习**
```
识别高质量的分析案例
- 提取成功模式
- 应用到未来的分析任务
```

**3. 错误案例学习**
```
识别低质量的分析案例
- 分析错误原因
- 避免重复犯错
```

**4. 关联规则学习**
```
学习卡片间的关联模式
- 自动发现新的关联关系
- 优化关联策略
```

### 学习反馈循环

```
1. 生成新卡片
   ↓
2. 用户反馈
   ↓
3. 评估卡片质量
   ↓
4. 更新学习模型
   ↓
5. 优化生成策略
   ↓
6. 生成更好的卡片
```

### 知识图谱演进

**图谱版本管理**
```
每次重大更新创建新版本
保留历史版本，支持回滚
```

**图谱清理**
```
定期清理过期的节点和边
保留重要的历史节点
```

**图谱压缩**
```
对于相似度极高的节点进行合并
减少图谱规模，提高检索效率
```

## 注意事项

- 知识图谱存储在本地，确保数据隐私
- 向量检索使用轻量级模型，适配端侧资源
- 定期备份知识图谱，防止数据丢失
- 建立图谱质量监控机制
- 持续优化关联策略和检索效果
- 用户反馈是持续学习的重要来源
- 循环引用检测确保图谱逻辑一致性
- 权限控制保护敏感信息
- 引用标记方便追踪知识来源
- 跨色卡片引用实现多维知识整合
