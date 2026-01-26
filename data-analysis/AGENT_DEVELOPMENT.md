# 8-Agent开发文档

本文档提供Antinet智能知识管家8-Agent协作架构的完整开发指南。

## 核心前置说明

1. **所有Agent基于Python开发**（通用易落地），驿传司作为统一接口层，提供`send_task()`、`receive_result()`、`call_knowledge()`三个核心接口，所有Agent仅与驿传司交互；
2. **数据格式统一使用JSON**（跨模块兼容），可视化渲染基于`matplotlib`+`reportlab`（生成PDF/图片）；
3. **每个Agent的代码片段均为「可直接运行的最小单元」**，仅需补充业务细节即可落地。

## 架构分层

```
┌─────────────────────────────────────┐
│   锦衣卫总指挥使（总控层）          │
│   - 任务分解                        │
│   - 状态监控                        │
│   - 成果聚合                        │
│   - 可视化渲染                      │
│   - 异常处置                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   驿传司（接口层）                  │
│   - 指令转发                        │
│   - 成果接收                        │
│   - 知识检索代理                    │
│   - 日志记录                        │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┬──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼          ▼
┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
│密卷房  ││通政司  ││监察院  ││刑狱司  ││参谋司  ││太史阁  │
│预处理  ││事实    ││原因    ││风险    ││行动    ││知识    │
└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘
```

## 核心函数接口

### 1. 锦衣卫总指挥使（总控层）

| 函数名 | 功能描述 | 入参 | 出参 |
|--------|----------|------|------|
| `parse_user_request()` | 解析用户输入（素材+需求），生成标准化任务指令 | `user_input: dict`（含`raw_material`素材、`user_query`需求） | `task_instructions: dict`（含`task_id`、`sub_tasks`子任务列表、`priority`优先级） |
| `dispatch_task()` | 通过驿传司下发子任务至对应Agent | `task_instructions: dict` | `dispatch_result: dict`（含`dispatch_status`、`task_ids`） |
| `monitor_agent_status()` | 监控所有Agent执行状态，处理超时/失败 | `task_ids: list` | `status_report: dict`（含`agent_status`、`exception_tasks`） |
| `aggregate_results()` | 聚合所有Agent成果，生成报告初稿 | `all_agent_results: dict` | `report_draft: dict`（含所有模块原始内容） |
| `render_visualization()` | 渲染可视化报告（四色卡片+整体排版） | `report_draft: dict` | `final_report: dict`（含`pdf_path`、`img_paths`、`text_content`） |
| `handle_exception()` | 异常处置（重试/人工介入） | `exception_tasks: dict` | `exception_result: dict`（含`handle_status`、`retry_times`） |

**输入格式**：
```json
{
  "user_id": "U123456",
  "raw_material": "表格/文本/JSON格式的待分析素材",
  "user_query": "分析项目进度滞后的原因，生成可视化报告",
  "request_time": "2026-01-22 10:00:00"
}
```

**输出格式**：
```json
{
  "report_id": "R20260122001",
  "report_title": "项目进度滞后智能分析报告",
  "pdf_path": "/reports/R20260122001.pdf",
  "long_img_path": "/reports/R20260122001_long.png",
  "card_img_paths": {
    "blue": "/cards/blue_fact_20260122001.png",
    "green": "/cards/green_interpret_20260122001.png",
    "yellow": "/cards/yellow_risk_20260122001.png",
    "red": "/cards/red_action_20260122001.png"
  },
  "text_content": "报告纯文本内容（精简版）",
  "generate_time": "2026-01-22 10:05:00",
  "cost_time": "5分钟"
}
```

### 2. 驿传司（接口层）

| 函数名 | 功能描述 | 入参 | 出参 |
|--------|----------|------|------|
| `send_task()` | 接收总指挥使指令，转发至对应Agent | `task_instructions: dict` | `forward_status: dict` |
| `receive_result()` | 接收执行Agent成果，暂存并反馈给总指挥使 | `agent_result: dict` | `receive_status: dict` |
| `call_knowledge()` | 代理所有Agent的知识检索请求，调用太史阁接口 | `knowledge_request: dict` | `knowledge_result: dict` |
| `record_log()` | 记录全流程信息流转日志 | `log_info: dict` | `log_status: str` |

**启动命令**：
```bash
uvicorn agents.yichuansi:app --host 0.0.0.0 --port 8000
```

### 3. 密卷房（执行层：数据/信息预处理）

| 函数名 | 功能描述 | 入参 | 出参 |
|--------|----------|------|------|
| `parse_material()` | 解析任意格式素材（表格/文本/JSON），提取核心信息 | `raw_material: str` | `parsed_data: dict` |
| `clean_data()` | 清洗无效信息/缺失值，标准化数据格式 | `parsed_data: dict` | `cleaned_data: dict` |
| `evaluate_quality()` | 评估素材质量（优秀/良好/一般） | `cleaned_data: dict` | `quality_report: dict` |

**输出格式**：
```json
{
  "task_id": "T20260122100000_mijuanfang",
  "agent": "mijuanfang",
  "result": {
    "parsed_data": {
      "fields": ["项目阶段", "计划完成时间", "实际完成时间", "进度偏差", "资源投入"],
      "data": [
        {"项目阶段": "需求调研", "计划完成时间": "2026.01.10", "实际完成时间": "2026.01.15", "进度偏差": "+5天", "资源投入": "3人"},
        {"项目阶段": "方案设计", "计划完成时间": "2026.01.20", "实际完成时间": "未开始", "进度偏差": "滞后", "资源投入": "0人"}
      ]
    },
    "cleaned_data": {...},
    "quality_report": {
      "quality_level": "优秀",
      "missing_rate": "0%",
      "valid_rate": "100%",
      "format": "表格"
    }
  }
}
```

### 4. 通政司（执行层：事实生成/核心信息提炼）

| 函数名 | 功能描述 | 入参 | 出参 |
|--------|----------|------|------|
| `extract_facts()` | 从清洗后的数据中提取核心事实 | `cleaned_data: dict` | `core_facts: dict` |
| `structure_facts()` | 将事实按通用维度结构化（时间/指标/对比） | `core_facts: dict` | `structured_facts: dict` |

**输出格式**：
```json
{
  "task_id": "T20260122100000_tongzhengsi",
  "agent": "tongzhengsi",
  "result": {
    "core_facts": {
      "核心结论": "项目进度整体滞后，方案设计阶段未开始",
      "关键指标": [
        {"指标": "需求调研进度偏差", "值": "+5天", "影响": "基础环节延迟"},
        {"指标": "方案设计资源投入", "值": "0人", "影响": "无法启动"}
      ],
      "对比维度": []
    },
    "structured_facts": {...},
    "confidence": 0.98
  }
}
```

### 5. 监察院（执行层：原因/逻辑分析）

| 函数名 | 功能描述 | 入参 | 出参 |
|--------|----------|------|------|
| `analyze_causes()` | 归因核心原因，量化因素占比 | `core_facts: dict` | `cause_analysis: dict` |
| `build_logic_chain()` | 构建逻辑链路（原因→结果） | `cause_analysis: dict` | `logic_chain: list` |

**输出格式**：
```json
{
  "task_id": "T20260122100000_jianchayuan",
  "agent": "jianchayuan",
  "result": {
    "cause_analysis": {
      "primary_reason": {
        "factor": "资源投入不足",
        "impact": "70%",
        "details": "方案设计阶段资源投入为0人，无法启动核心环节"
      },
      "secondary_reasons": [
        {
          "factor": "需求调研延迟",
          "impact": "30%",
          "details": "需求调研滞后5天，导致方案设计无法按时启动"
        }
      ],
      "excluded_factors": ["外部依赖", "技术难题"]
    },
    "logic_chain": [
      {"node": "资源投入不足（0人）", "next_node": "方案设计未启动", "relation": "直接导致"},
      {"node": "需求调研延迟（+5天）", "next_node": "方案设计启动滞后", "relation": "间接影响"},
      {"node": "方案设计未启动", "next_node": "项目整体进度滞后", "relation": "核心原因"}
    ],
    "confidence": 0.88
  }
}
```

### 6. 刑狱司（执行层：风险/问题检测）

| 函数名 | 功能描述 | 入参 | 出参 |
|--------|----------|------|------|
| `detect_risk()` | 识别风险点，评级（高/中/低） | `cause_analysis: dict` | `risk_detection: dict` |
| `evaluate_impact()` | 量化风险影响（进度/成本/质量） | `risk_detection: dict` | `impact_evaluation: dict` |

**输出格式**：
```json
{
  "task_id": "T20260122100000_xingyusi",
  "agent": "xingyusi",
  "result": {
    "risk_detection": {
      "risk_type": "项目进度断层",
      "risk_level": "高",
      "risk_details": {
        "affected_stages": ["方案设计", "开发测试"],
        "time_period": "立即"
      },
      "risk_causes": {"factor": "资源投入不足", "impact": "70%", "details": "..."}
    },
    "impact_evaluation": {
      "financial_impact": "项目延期导致成本增加10%",
      "operational_impact": "整体交付时间滞后至少15天",
      "risk_matrix": {"probability": "高", "impact": "高", "level": "高"}
    },
    "confidence": 0.92
  }
}
```

### 7. 参谋司（执行层：行动/方案建议）

| 函数名 | 功能描述 | 入参 | 出参 |
|--------|----------|------|------|
| `generate_actions()` | 生成分级行动建议（高/中优先级） | `risk_detection: dict` | `action_suggestions: dict` |
| `build_timeline()` | 生成时间线路线图 | `action_suggestions: dict` | `timeline: list` |

**输出格式**：
```json
{
  "task_id": "T20260122100000_canmousi",
  "agent": "canmousi",
  "result": {
    "action_suggestions": {
      "actions": [
        {
          "step": 1,
          "action": "紧急调配资源",
          "details": "24小时内调配2名核心人员至方案设计阶段",
          "priority": "高",
          "expected_effect": "48小时内启动方案设计",
          "resources": {"人力": "2人", "预算": "0元"}
        },
        {
          "step": 2,
          "action": "优化需求调研成果",
          "details": "复盘需求调研延迟原因，压缩冗余环节",
          "priority": "中",
          "expected_effect": "后续阶段不再延迟",
          "resources": {"人力": "1人", "预算": "0元"}
        }
      ],
      "overall_priority": "高",
      "success_metrics": ["方案设计48小时内启动", "整体进度滞后控制在7天内"]
    },
    "timeline": [
      {"week": 1, "actions": ["紧急调配资源", "启动方案设计"]},
      {"week": 2, "actions": ["完成方案设计", "启动开发测试"]},
      {"week": 3, "actions": ["追平进度", "复盘优化"]}
    ],
    "confidence": 0.85
  }
}
```

### 8. 太史阁（执行层：知识存储/检索）

| 函数名 | 功能描述 | 入参 | 出参 |
|--------|----------|------|------|
| `store_knowledge()` | 存储Agent成果至知识库 | `all_results: dict` | `store_status: dict` |
| `retrieve_cases()` | 检索同类历史案例 | `keywords: list` | `related_cases: list` |

**输出格式**：
```json
{
  "task_id": "T20260122100000_taishige",
  "agent": "taishige",
  "result": {
    "store_result": {
      "store_status": "success",
      "knowledge_id": "KT20260122100000"
    },
    "related_cases": [
      {
        "case_id": "C001",
        "similarity": 0.9,
        "content": "2025年XX项目因资源不足导致进度滞后，解决方案：紧急调配人员+压缩环节",
        "tags": ["项目进度", "资源不足"]
      }
    ],
    "knowledge_graph": {
      "nodes": ["项目进度", "滞后", "资源"],
      "edges": ["资源不足→进度滞后"]
    }
  }
}
```

## 测试脚本

项目提供了完整的测试脚本 `scripts/test_agents.py`，包含：

1. **独立测试**：测试各个Agent的独立功能
2. **完整流程测试**：演示从用户输入到最终报告生成的完整流程

运行测试：
```bash
cd /workspace/projects/data-analysis-iteration
python scripts/test_agents.py
```

## 开发指南

### 添加新的业务逻辑

1. **修改Agent核心函数**：在对应Agent的文件中修改核心函数逻辑
2. **添加数据格式支持**：在密卷房的`parse_material()`中添加新的数据格式解析逻辑
3. **扩展风险评估规则**：在刑狱司的`detect_risk()`中添加新的风险检测规则
4. **定制行动建议**：在参谋司的`generate_actions()`中添加特定场景的行动建议

### 集成外部服务

1. **NPU推理**：修改锦衣卫总指挥使的`_call_genie_api()`方法，集成GenieAPIService
2. **向量检索**：在太史阁中集成BGE-M3和FAISS/Chroma，实现真实的向量检索
3. **可视化渲染**：在锦衣卫总指挥使的`render_visualization()`中集成matplotlib和reportlab

### 部署上线

1. **启动驿传司**：
   ```bash
   uvicorn agents.yichuansi:app --host 0.0.0.0 --port 8000
   ```

2. **启动后端服务**：
   ```bash
   python main.py
   ```

3. **启动前端服务**：
   ```bash
   cd frontend
   npm run dev
   ```

## 总结

1. **开发逻辑极简**：8个Agent按「总控（总指挥使）→接口（驿传司）→执行（6个业务Agent）」分层，仅需实现各自核心函数+对接驿传司统一接口，无复杂交互；
2. **代码可直接复用**：所有片段均为可运行的最小单元，仅需补充业务细节（如更多素材格式解析、行业适配逻辑）即可部署；
3. **协作链路闭环**：所有Agent仅通过驿传司交互，总指挥使统一聚合成果并渲染可视化，完全避免开发混乱。
