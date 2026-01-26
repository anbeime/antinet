# 卡片规范

## 目录
- [四色卡片定义](#四色卡片定义)
- [卡片字段规范](#卡片字段规范)
- [跨色卡片引用规范](#跨色卡片引用规范)
- [卡片质量标准](#卡片质量标准)
- [卡片验证规则](#卡片验证规则)

## 四色卡片定义

### 蓝色卡片（事实层 Blue）

**目的**：呈现数据中的客观事实、关键指标、基础统计。

**典型内容**：
- 关键指标的量化描述（如总销售额、同比增长率）
- 时间范围（如“2024年全年”、“第三季度”）
- 地域范围（如“华北地区”、“全国”）
- 基础统计值（如平均值、最大值、最小值）
- 数据来源标注（如“来自销售管理系统”）

**结构示例**：
```json
{
  "card_id": "fact_20250121_001",
  "card_type": "blue",
  "layer": "fact",
  "title": "2024年12月销售数据总览",
  "content": {
    "total_sales": 1200000,
    "growth_rate": "15.3%",
    "time_range": "2024-12-01 to 2024-12-31",
    "region": "全国",
    "data_source": "销售管理系统",
    "metrics": {
      "total_orders": 5230,
      "avg_order_value": 229.4,
      "top_product": "智能音箱X5"
    }
  },
  "confidence": 0.98,
  "dimensions": {
    "time": ["2024-12-01", "2024-12-31"],
    "location": ["全国"],
    "metrics": ["sales", "growth_rate"]
  },
  "embedding": [0.123, 0.456, ...]
}
```

### 绿色卡片（解释层 Green）

**目的**：解释数据趋势、因果关系、影响分析。

**典型内容**：
- 上升/下降的原因（如“促销活动导致”、“竞品降价”）
- 内部因素（如“库存优化”、“团队培训”）
- 外部因素（如“经济环境变化”、“政策调整”）
- 数据驱动的逻辑推理
- 基于数据的分析结论

**结构示例**：
```json
{
  "card_id": "explanation_20250121_001",
  "card_type": "green",
  "layer": "analysis",
  "title": "销售增长15.3%的主要原因分析",
  "content": {
    "primary_causes": [
      {
        "cause": "双12促销活动成功",
        "impact": "贡献了8%的增长",
        "evidence": "活动期间订单量增加35%"
      },
      {
        "cause": "新产品线上市",
        "impact": "贡献了5%的增长",
        "evidence": "新产品销售额达到15万"
      },
      {
        "cause": "客户满意度提升",
        "impact": "贡献了2.3%的增长",
        "evidence": "复购率提升10%"
      }
    ],
    "internal_factors": [
      "库存周转优化",
      "销售团队培训",
      "客户服务改进"
    ],
    "external_factors": [
      "年末消费需求旺盛",
      "竞争对手缺货"
    ],
    "logic": "促销活动→流量增长→订单增长→销售增长",
    "confidence": 0.85
  },
  "references": [
    {
      "card_id": "fact_20250121_001",
      "card_type": "blue",
      "reference_type": "data_source",
      "context": "基于2024年12月销售数据分析"
    }
  ],
  "embedding": [0.234, 0.567, ...]
}
```

### 黄色卡片（创意层 Yellow）

**目的**：提供创新建议、机会发现、战略方向。

**典型内容**：
- 可落地的业务建议（如“增加会员积分活动”）
- 未被发现的机会（如“新兴市场的潜力”）
- 跨领域类比（如“借鉴竞品的成功模式”）
- 新产品/新渠道的思路
- 创新的营销策略

**结构示例**：
```json
{
  "card_id": "creative_20250121_001",
  "card_type": "yellow",
  "layer": "creative",
  "title": "2025年Q1业务增长机会建议",
  "content": {
    "opportunities": [
      {
        "opportunity": "拓展二三线城市市场",
        "potential_value": "预计新增销售额50-80万/季度",
        "actionability": "高",
        "reasoning": "二三线城市消费升级趋势明显"
      },
      {
        "opportunity": "开发企业定制服务",
        "potential_value": "预计新增销售额30-50万/季度",
        "actionability": "中",
        "reasoning": "企业客户采购需求稳定"
      }
    ],
    "innovations": [
      "推出订阅制服务模式",
      "开发智能推荐系统",
      "建立社区运营体系"
    ],
    "cross_domain_analogy": [
      {
        "source": "电商行业",
        "target": "当前业务",
        "pattern": "限时抢购活动",
        "adaptation": "每月28日举办会员日"
      }
    ],
    "confidence": 0.7
  },
  "references": [
    {
      "card_id": "fact_20250121_001",
      "card_type": "blue",
      "reference_type": "based_on",
      "context": "基于当前销售数据评估潜力"
    },
    {
      "card_id": "explanation_20250121_001",
      "card_type": "green",
      "reference_type": "related_to",
      "context": "结合增长原因分析机会"
    }
  ],
  "embedding": [0.345, 0.678, ...]
}
```

### 红色卡片（风险层 Red）

**目的**：预警潜在风险、识别问题、矛盾冲突。

**典型内容**：
- 潜在的业务风险（如“库存积压”、“客户流失”）
- 数据质量问题（如“缺失数据”、“异常值”）
- 矛盾冲突（如“销售额增长但利润下降”）
- 外部威胁（如“竞品降价”、“政策变化”）
- 内部问题（如“团队冲突”、“资源紧张”）

**结构示例**：
```json
{
  "card_id": "risk_20250121_001",
  "card_type": "red",
  "layer": "risk",
  "title": "库存周转风险预警",
  "content": {
    "risks": [
      {
        "risk_type": "库存积压",
        "severity": "high",
        "probability": 0.8,
        "impact": "预计造成15-20万的资金占用",
        "evidence": "库存周转天数从45天增加到60天"
      },
      {
        "risk_type": "客户流失",
        "severity": "medium",
        "probability": 0.5,
        "impact": "预计流失3-5%的客户",
        "evidence": "客户满意度下降2%"
      }
    ],
    "data_quality_issues": [
      "部分销售记录缺失客户信息",
      "订单时间存在异常值"
    ],
    "conflicts": [
      {
        "type": "metric_conflict",
        "description": "销售额增长15%但利润仅增长5%",
        "reasoning": "促销活动导致毛利率下降"
      }
    ],
    "external_threats": [
      "竞品计划推出类似产品",
      "上游原材料价格上涨"
    ],
    "risk_level": "high"
  },
  "references": [
    {
      "card_id": "fact_20250121_001",
      "card_type": "blue",
      "reference_type": "data_evidence",
      "context": "库存周转天数数据支撑风险判断"
    },
    {
      "card_id": "explanation_20250121_001",
      "card_type": "green",
      "reference_type": "conflict_with",
      "context": "利润增长低于预期的矛盾"
    }
  ],
  "embedding": [0.456, 0.789, ...]
}
```

## 卡片字段规范

### 必需字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `card_id` | string | 卡片唯一标识 | `"fact_20250121_001"` |
| `card_type` | string | 卡片类型：`blue`/`green`/`yellow`/`red` | `"blue"` |
| `layer` | string | 图谱层级：`fact`/`analysis`/`creative`/`risk` | `"fact"` |
| `title` | string | 卡片标题 | `"2024年12月销售数据总览"` |
| `content` | object | 卡片内容（不同类型结构不同） | `{"total_sales": 1200000, ...}` |
| `confidence` | float | 置信度（0-1之间） | `0.98` |

### 可选字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `dimensions` | object | 数据维度信息 | `{"time": [...], "location": [...]}` |
| `references` | array | 跨色卡片引用列表 | `[{...}, {...}]` |
| `embedding` | array | 向量表示（512维浮点数） | `[0.123, 0.456, ...]` |
| `metadata` | object | 元数据 | `{"created_by": "agent", "created_at": "..."}` |

## 跨色卡片引用规范

### 引用格式

每个卡片可以包含 `references` 字段，用于引用其他卡片。

**基本格式：**
```json
{
  "references": [
    {
      "card_id": "目标卡片ID",
      "card_type": "目标卡片类型",
      "reference_type": "引用类型",
      "context": "引用上下文说明",
      "created_at": "创建时间（ISO 8601）",
      "created_by": "创建方式（manual/rule_mapping/auto）",
      "confidence": "置信度（可选）"
    }
  ]
}
```

### 引用类型

| 引用类型 | 说明 | 适用场景 |
|----------|------|----------|
| `data_source` | 数据来源 | 绿色/黄色/红色卡片引用蓝色卡片（事实数据） |
| `related_risk` | 相关风险 | 任意卡片引用红色卡片（风险信息） |
| `supporting_analysis` | 支持性分析 | 黄色/红色卡片引用绿色卡片（分析结果） |
| `follow_up_action` | 后续行动 | 蓝色/绿色卡片引用红色卡片（风险预警） |
| `based_on` | 基于数据 | 黄色卡片引用蓝色/绿色卡片 |
| `conflict_with` | 矛盾冲突 | 红色卡片引用其他卡片（矛盾点） |
| `related_to` | 一般关联 | 任意卡片引用其他卡片（一般性关联） |

### 引用示例

**绿色卡片引用蓝色卡片**
```json
{
  "card_id": "explanation_20250121_001",
  "card_type": "green",
  "references": [
    {
      "card_id": "fact_20250121_001",
      "card_type": "blue",
      "reference_type": "data_source",
      "context": "基于2024年12月销售数据分析增长原因",
      "created_at": "2025-01-21T10:10:00Z",
      "created_by": "manual",
      "confidence": 0.95
    }
  ]
}
```

**黄色卡片引用蓝色和绿色卡片**
```json
{
  "card_id": "creative_20250121_001",
  "card_type": "yellow",
  "references": [
    {
      "card_id": "fact_20250121_001",
      "card_type": "blue",
      "reference_type": "based_on",
      "context": "基于当前销售数据评估市场潜力"
    },
    {
      "card_id": "explanation_20250121_001",
      "card_type": "green",
      "reference_type": "related_to",
      "context": "结合增长原因分析市场机会"
    }
  ]
}
```

**红色卡片引用蓝色和绿色卡片**
```json
{
  "card_id": "risk_20250121_001",
  "card_type": "red",
  "references": [
    {
      "card_id": "fact_20250121_001",
      "card_type": "blue",
      "reference_type": "data_evidence",
      "context": "库存周转天数数据支撑风险判断"
    },
    {
      "card_id": "explanation_20250121_001",
      "card_type": "green",
      "reference_type": "conflict_with",
      "context": "利润增长低于预期的矛盾点"
    }
  ]
}
```

### 引用限制

1. **循环引用检测**
   - 系统会自动检测并阻止循环引用
   - 示例：A→B→C→A 会被阻止

2. **引用权限控制**
   - 卡片可以设置引用权限级别
   - `public`：所有卡片可以引用
   - `restricted`：仅特定类型卡片可以引用
   - `private`：仅创建者可以引用

3. **引用数量限制**
   - 单张卡片最多引用20张其他卡片
   - 避免过度引用导致知识图谱过于复杂

4. **引用深度限制**
   - 引用深度最多3层
   - 示例：A引用B，B引用C，C引用D（A→B→C→D，共3层）

## 卡片质量标准

### 内容质量

**蓝色卡片（事实层）**
- 数据准确无误，来源于可靠数据源
- 指标定义清晰，无歧义
- 时间范围和地域范围明确
- 数据标注完整（单位、精度等）

**绿色卡片（解释层）**
- 因果关系逻辑清晰，证据充分
- 分析结论有数据支撑
- 避免过度推断或主观臆断
- 推理过程可追溯

**黄色卡片（创意层）**
- 建议具有可操作性和可行性
- 机会识别有数据依据或市场洞察
- 创新思路符合业务实际情况
- 跨领域类比合理且有说服力

**红色卡片（风险层）**
- 风险识别基于数据证据
- 风险评估客观，概率和影响量化
- 矛盾冲突识别准确
- 提供可操作的风险应对建议

### 结构质量

- 卡片字段完整，符合规范
- 卡片标题简洁明了（≤30字符）
- 卡片内容结构清晰，易于理解
- 引用关系准确，无循环引用

### 置信度标准

| 置信度范围 | 说明 | 适用场景 |
|------------|------|----------|
| 0.9 - 1.0 | 高度可信 | 基于完整准确的数据 |
| 0.7 - 0.9 | 较为可信 | 基于大部分数据，有少量推断 |
| 0.5 - 0.7 | 中等可信 | 基于部分数据，有较多推断 |
| 0.3 - 0.5 | 低可信 | 基于少量数据，主要是推断 |
| 0.0 - 0.3 | 不可信 | 缺乏数据支撑，仅是猜测 |

## 卡片验证规则

### 字段验证

**必需字段检查**
```python
def validate_required_fields(card):
    """
    验证必需字段
    """
    required_fields = ["card_id", "card_type", "layer", "title", "content", "confidence"]
    
    for field in required_fields:
        if field not in card:
            return False, f"缺少必需字段: {field}"
    
    return True, "必需字段完整"
```

**字段类型检查**
```python
def validate_field_types(card):
    """
    验证字段类型
    """
    type_mapping = {
        "card_id": str,
        "card_type": str,
        "layer": str,
        "title": str,
        "content": dict,
        "confidence": float
    }
    
    for field, expected_type in type_mapping.items():
        if field in card and not isinstance(card[field], expected_type):
            return False, f"字段 {field} 类型错误，应为 {expected_type}"
    
    return True, "字段类型正确"
```

**卡片类型检查**
```python
def validate_card_type(card):
    """
    验证卡片类型
    """
    valid_types = ["blue", "green", "yellow", "red"]
    valid_layers = ["fact", "analysis", "creative", "risk"]
    
    type_layer_mapping = {
        "blue": "fact",
        "green": "analysis",
        "yellow": "creative",
        "red": "risk"
    }
    
    if card["card_type"] not in valid_types:
        return False, f"卡片类型错误: {card['card_type']}"
    
    if card["layer"] not in valid_layers:
        return False, f"层级错误: {card['layer']}"
    
    if type_layer_mapping[card["card_type"]] != card["layer"]:
        return False, f"卡片类型与层级不匹配"
    
    return True, "卡片类型正确"
```

### 引用验证

**循环引用检测**
```python
def detect_circular_references(card_id, visited, all_cards):
    """
    检测循环引用
    """
    if card_id in visited:
        return True
    
    visited.add(card_id)
    
    card = get_card_by_id(card_id, all_cards)
    if not card:
        return False
    
    for ref in card.get("references", []):
        if detect_circular_references(ref["card_id"], visited.copy(), all_cards):
            return True
    
    return False
```

**引用完整性检查**
```python
def validate_references(card, all_cards):
    """
    验证引用完整性
    """
    if "references" not in card:
        return True, "无引用"
    
    card_ids = set(card["id"] for card in all_cards)
    
    for ref in card["references"]:
        if ref["card_id"] not in card_ids:
            return False, f"引用的卡片不存在: {ref['card_id']}"
    
    # 检测循环引用
    if detect_circular_references(card["card_id"], set(), all_cards):
        return False, "存在循环引用"
    
    # 检查引用数量
    if len(card["references"]) > 20:
        return False, "引用数量超过限制（最多20个）"
    
    return True, "引用验证通过"
```

### 内容验证

**置信度检查**
```python
def validate_confidence(card):
    """
    验证置信度
    """
    confidence = card.get("confidence", 0)
    
    if not isinstance(confidence, (int, float)):
        return False, "置信度必须是数字"
    
    if confidence < 0 or confidence > 1:
        return False, "置信度必须在0-1之间"
    
    return True, "置信度有效"
```

**标题长度检查**
```python
def validate_title_length(card):
    """
    验证标题长度
    """
    title = card.get("title", "")
    
    if len(title) > 30:
        return False, f"标题过长（{len(title)}字符，最多30字符）"
    
    return True, "标题长度合格"
```

### 完整验证流程

```python
def validate_card(card, all_cards):
    """
    完整卡片验证流程
    """
    validations = [
        validate_required_fields(card),
        validate_field_types(card),
        validate_card_type(card),
        validate_references(card, all_cards),
        validate_confidence(card),
        validate_title_length(card)
    ]
    
    for is_valid, message in validations:
        if not is_valid:
            return False, message
    
    return True, "卡片验证通过"
```

## 注意事项

- 卡片ID格式：`{类型}_{日期}_{序号}`，如 `fact_20250121_001`
- 卡片标题应简洁明了，避免冗余
- 卡片内容应结构化，便于检索和理解
- 引用关系应准确，避免过度引用
- 置信度应客观反映卡片内容的可靠性
- 跨色卡片引用时，应明确引用类型和上下文
- 遵守引用限制，避免循环引用和过度引用
