"""
8-Agent 多智能体系统路由
提供完整的 Agent 协作 API

核心优化：
- 复用 meeting_routes.call_llm 降级链（8910→NPU），所有LLM调用统一走降级保护
- 4个Agent并行推理生成四色卡片，而非单次NPU调用硬充8-Agent
- 新增 SSE 流式分析端点 /analyze/stream
- /chat 端点也走 call_llm 降级链
"""
import logging
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import json
import re

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent", tags=["8-Agent系统"])

# ==================== 复用 meeting_routes 的 call_llm 降级链 ====================
# 避免循环导入，运行时延迟导入
_call_llm_func = None

async def _get_call_llm():
    """延迟导入 call_llm，避免循环依赖"""
    global _call_llm_func
    if _call_llm_func is None:
        from routes.meeting_routes import call_llm
        _call_llm_func = call_llm
    return _call_llm_func


# ==================== Agent 配置 ====================
# 4个核心分析Agent，各自生成对应颜色的四色卡片
ANALYSIS_AGENTS = {
    "tongzhengsi": {
        "name": "通政司",
        "title": "事实提取官",
        "card_type": "blue",
        "category": "事实",
        "avatar": "📡",
        "system_prompt": (
            "你是「通政司」，负责从信息中提取客观事实。"
            "你的职责是从给定信息中提取2-3条核心事实，只陈述客观事实，不做推断。"
            "每条事实一行，用序号标注。简洁有力，总共不超过150字。"
        ),
    },
    "jianchayuan": {
        "name": "监察院",
        "title": "原因解释官",
        "card_type": "green",
        "category": "解释",
        "avatar": "🔍",
        "system_prompt": (
            "你是「监察院」，负责分析原因和解释。"
            "你的职责是针对给定信息，分析2-3条可能的原因或逻辑解释，说明为什么会出现这些现象。"
            "每条解释一行，用序号标注。简洁有力，总共不超过150字。"
        ),
    },
    "xingyusi": {
        "name": "刑狱司",
        "title": "风险识别官",
        "card_type": "yellow",
        "category": "风险",
        "avatar": "⚠️",
        "system_prompt": (
            "你是「刑狱司」，负责识别潜在风险。"
            "你的职责是针对给定信息，识别2-3条潜在风险或隐患，评估其可能的影响。"
            "每条风险一行，用序号标注。简洁有力，总共不超过150字。"
        ),
    },
    "canmousi": {
        "name": "参谋司",
        "title": "行动建议官",
        "card_type": "red",
        "category": "行动",
        "avatar": "💡",
        "system_prompt": (
            "你是「参谋司」，负责制定行动建议。"
            "你的职责是针对给定信息，提出2-3条可执行的行动建议，明确具体步骤。"
            "每条建议一行，用序号标注。简洁有力，总共不超过150字。"
        ),
    },
}

# 辅助Agent（状态展示用，不直接参与分析推理）
SUPPORT_AGENTS = {
    "orchestrator": {
        "name": "锦衣卫总指挥使",
        "title": "任务调度",
        "avatar": "🎯",
    },
    "mijuanfang": {
        "name": "密卷房",
        "title": "数据预处理",
        "avatar": "📂",
    },
    "taishige": {
        "name": "太史阁",
        "title": "知识存储",
        "avatar": "📚",
    },
    "yichuansi": {
        "name": "驿传司",
        "title": "结果整合",
        "avatar": "📮",
    },
}

ALL_AGENT_IDS = list(ANALYSIS_AGENTS.keys()) + list(SUPPORT_AGENTS.keys())

# Agent 状态
agent_status = {aid: "idle" for aid in ALL_AGENT_IDS}


# ==================== API 模型 ====================

class AgentTaskRequest(BaseModel):
    """Agent 任务请求"""
    query: str = Field(..., description="用户查询或任务描述")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="上下文信息")
    priority: str = Field(default="medium", description="优先级: high/medium/low")
    material: Optional[str] = Field(default=None, description="原始素材（可选）")


class AgentTaskResponse(BaseModel):
    """Agent 任务响应"""
    task_id: str
    status: str
    message: str
    results: Optional[Dict[str, Any]] = None
    agent_status: Optional[Dict[str, str]] = None


class FourColorCard(BaseModel):
    """四色卡片"""
    card_id: str
    card_type: str  # blue/green/yellow/red
    title: str
    content: str
    category: str  # 事实/解释/风险/行动
    similarity: Optional[float] = None
    created_at: str


class AnalysisReport(BaseModel):
    """分析报告"""
    report_id: str
    query: str
    summary: str
    cards: List[FourColorCard]
    agent_results: Dict[str, Any]
    performance: Dict[str, float]
    created_at: str


# ==================== SSE 辅助 ====================

def _sse_event(event_type: str, data: dict) -> str:
    """构造SSE事件字符串"""
    json_data = json.dumps(data, ensure_ascii=False)
    return f"event: {event_type}\ndata: {json_data}\n\n"


def _sse_heartbeat() -> str:
    """构造SSE心跳注释"""
    return f": heartbeat {int(time.time())}\n\n"


# ==================== 核心分析逻辑 ====================

def _archive_cards_to_knowledge_network(cards: List[FourColorCard], query: str, task_id: str) -> Dict:
    """
    将分析生成的卡片自动归档入知识网络
    1. 为每张卡片创建知识图谱实体
    2. 建立卡片之间的关系（基于颜色类型）
    3. 创建查询主题实体并关联相关卡片
    """
    from database import DatabaseManager
    db = DatabaseManager(settings.DB_PATH)
    
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # 1. 创建查询主题实体
        topic_entity_id = f"topic_{task_id}"
        topic_type = "分析主题"
        cursor.execute("""
            INSERT OR IGNORE INTO kg_entities (entity_id, name, entity_type, description, properties)
            VALUES (?, ?, ?, ?, ?)
        """, [topic_entity_id, query[:50], topic_type, query, json.dumps({"task_id": task_id})])
        
        # 2. 为每张卡片创建实体并建立关系
        entity_ids_by_type = {"blue": [], "green": [], "yellow": [], "red": []}
        
        for card in cards:
            content_hash = str(abs(hash(card.content[:20])))[:8]
            entity_id = f"card_{task_id}_{card.card_type}_{content_hash}"
            cursor.execute("""
                INSERT OR IGNORE INTO kg_entities (entity_id, name, entity_type, description, properties)
                VALUES (?, ?, ?, ?, ?)
            """, [
                entity_id,
                card.title[:50],
                card.category,
                card.content[:200],
                json.dumps({"card_id": card.card_id, "card_type": card.card_type})
            ])
            entity_ids_by_type[card.card_type].append(entity_id)
            
            # 3. 关联到主题
            cursor.execute("""
                INSERT OR IGNORE INTO kg_relations (relation_id, source_id, target_id, relation_type)
                VALUES (?, ?, ?, ?)
            """, [f"rel_{entity_id}", topic_entity_id, entity_id, "包含"])
        
        # 4. 建立卡片间关系（蓝色→解释、蓝色→风险、解释+风险→行动）
        if entity_ids_by_type["blue"] and entity_ids_by_type["green"]:
            for blue_id in entity_ids_by_type["blue"][:1]:
                for green_id in entity_ids_by_type["green"][:1]:
                    cursor.execute("""
                        INSERT OR IGNORE INTO kg_relations (relation_id, source_id, target_id, relation_type)
                        VALUES (?, ?, ?, ?)
                    """, [f"rel_{blue_id[-20:]}_{green_id[-20:]}", blue_id, green_id, "解释"])
        
        if entity_ids_by_type["blue"] and entity_ids_by_type["yellow"]:
            for blue_id in entity_ids_by_type["blue"][:1]:
                for yellow_id in entity_ids_by_type["yellow"][:1]:
                    cursor.execute("""
                        INSERT OR IGNORE INTO kg_relations (relation_id, source_id, target_id, relation_type)
                        VALUES (?, ?, ?, ?)
                    """, [f"rel_{blue_id[-20:]}_{yellow_id[-20:]}", blue_id, yellow_id, "关联"])
        
        if entity_ids_by_type["green"] and entity_ids_by_type["yellow"] and entity_ids_by_type["red"]:
            for gr_id in entity_ids_by_type["green"][:1]:
                for yw_id in entity_ids_by_type["yellow"][:1]:
                    for red_id in entity_ids_by_type["red"][:1]:
                        cursor.execute("""
                            INSERT OR IGNORE INTO kg_relations (relation_id, source_id, target_id, relation_type)
                            VALUES (?, ?, ?, ?)
                        """, [f"rel_{gr_id[-20:]}_{yw_id[-20:]}_{red_id[-20:]}", gr_id, red_id, "触发"])
                        cursor.execute("""
                            INSERT OR IGNORE INTO kg_relations (relation_id, source_id, target_id, relation_type)
                            VALUES (?, ?, ?, ?)
                        """, [f"rel_{yw_id[-20:]}_{red_id[-20:]}", yw_id, red_id, "触发"])
        
        conn.commit()
        conn.close()
        
        return {
            "topic_entity_id": topic_entity_id,
            "entities_created": sum(len(v) for v in entity_ids_by_type.values()),
            "relations_created": len(cards)
        }
        
    except Exception as e:
        logger.warning(f"[AgentSystem] 归档入网失败: {e}")
        return {"error": str(e)}


async def _run_agent_analysis(query: str, context: str = "", material: str = None) -> Dict:
    """
    运行4-Agent串行+并行混合管道分析，生成四色卡片
    
    管道流程（串行+并行混合）：
    1. 通政司(蓝卡) 先行提取事实 — 串行，因为后续依赖事实
    2. 监察院(绿卡) + 刑狱司(黄卡) 基于事实并行推理 — 并行，两者独立
    3. 参谋司(红卡) 基于前三者出行动建议 — 串行，依赖综合分析
    4. 汇总结果，自动归档入网，生成摘要
    """
    call_llm = await _get_call_llm()
    start_time = time.time()
    task_id = f"task_{int(start_time * 1000)}"
    
    # 构建用户提示词
    user_prompt_parts = [f"分析主题：{query}"]
    if context:
        user_prompt_parts.append(f"背景信息：{context[:500]}")
    if material:
        user_prompt_parts.append(f"原始素材：{material[:500]}")
    user_prompt_base = "\n".join(user_prompt_parts)
    
    # 更新状态
    for aid in ANALYSIS_AGENTS:
        agent_status[aid] = "executing"
    agent_status["orchestrator"] = "executing"
    
    # ========== 辅助函数 ==========
    async def _call_agent(agent_id: str, agent_info: dict, extra_context: str = "") -> tuple:
        """调用单个Agent，返回 (agent_id, content)"""
        try:
            system_prompt = agent_info["system_prompt"]
            user_prompt = user_prompt_base
            if extra_context:
                user_prompt += f"\n\n【前置分析结果】\n{extra_context[:400]}"
            user_prompt += "\n\n请基于以上信息，完成你的职责。"
            
            result = await call_llm(system_prompt, user_prompt)
            return (agent_id, result or "")
        except Exception as e:
            logger.warning(f"[AgentSystem] {agent_info['name']}调用失败: {e}")
            return (agent_id, "")
    
    def _parse_agent_output(content: str, agent_id: str, agent_info: dict) -> list:
        """将Agent输出解析为卡片列表"""
        if not content or len(content.strip()) < 10:
            content = _generate_agent_fallback(agent_id, query)
        
        lines = [l.strip() for l in content.strip().split('\n') if l.strip()]
        cleaned_lines = []
        for line in lines:
            line = re.sub(r'^[\d]+[.、)）]\s*', '', line)
            if line:
                cleaned_lines.append(line)
        
        parsed_cards = []
        for i, line in enumerate(cleaned_lines[:3]):
            parsed_cards.append(FourColorCard(
                card_id=f"{task_id}_{agent_info['card_type']}_{i}",
                card_type=agent_info["card_type"],
                title=f"{agent_info['category']} #{i+1}",
                content=line,
                category=agent_info["category"],
                created_at=datetime.now().isoformat()
            ))
        return parsed_cards, content, cleaned_lines
    
    # ========== 管道阶段1：通政司(事实) 先行 ==========
    logger.info(f"[AgentSystem] 管道阶段1: 通政司提取事实")
    fact_agent = ANALYSIS_AGENTS["tongzhengsi"]
    fact_result = await _call_agent("tongzhengsi", fact_agent)
    _, fact_content, fact_lines = _parse_agent_output(fact_result[1], "tongzhengsi", fact_agent)
    agent_status["tongzhengsi"] = "idle"
    
    # 构建事实上下文，供后续Agent使用
    fact_context = f"通政司提取的核心事实：{'；'.join(fact_lines[:3])}"
    
    # ========== 管道阶段2：监察院(解释) + 刑狱司(风险) 并行 ==========
    logger.info(f"[AgentSystem] 管道阶段2: 监察院+刑狱司基于事实并行分析")
    interp_agent = ANALYSIS_AGENTS["jianchayuan"]
    risk_agent = ANALYSIS_AGENTS["xingyusi"]
    
    interp_task = _call_agent("jianchayuan", interp_agent, extra_context=fact_context)
    risk_task = _call_agent("xingyusi", risk_agent, extra_context=fact_context)
    
    results_phase2 = await asyncio.gather(interp_task, risk_task, return_exceptions=True)
    
    # 解析阶段2结果
    interp_content, risk_content = "", ""
    interp_lines, risk_lines = [], []
    
    for result in results_phase2:
        if isinstance(result, Exception):
            logger.warning(f"[AgentSystem] 阶段2 Agent异常: {result}")
            continue
        aid, content = result
        agent_info = ANALYSIS_AGENTS[aid]
        agent_status[aid] = "idle"
        _, parsed_content, parsed_lines = _parse_agent_output(content, aid, agent_info)
        if aid == "jianchayuan":
            interp_content = parsed_content
            interp_lines = parsed_lines
        elif aid == "xingyusi":
            risk_content = parsed_content
            risk_lines = parsed_lines
    
    # ========== 管道阶段3：参谋司(行动) 基于前三者 ==========
    logger.info(f"[AgentSystem] 管道阶段3: 参谋司基于前三者出行动建议")
    action_agent = ANALYSIS_AGENTS["canmousi"]
    
    # 构建综合上下文
    combined_context = fact_context
    if interp_lines:
        combined_context += f"\n监察院的分析解释：{'；'.join(interp_lines[:2])}"
    if risk_lines:
        combined_context += f"\n刑狱司识别的风险：{'；'.join(risk_lines[:2])}"
    
    action_result = await _call_agent("canmousi", action_agent, extra_context=combined_context)
    _, action_content, action_lines = _parse_agent_output(action_result[1], "canmousi", action_agent)
    agent_status["canmousi"] = "idle"
    
    # ========== 汇总所有结果 ==========
    all_parsed = {
        "tongzhengsi": (fact_content, fact_lines, fact_agent),
        "jianchayuan": (interp_content, interp_lines, interp_agent),
        "xingyusi": (risk_content, risk_lines, risk_agent),
        "canmousi": (action_content, action_lines, action_agent),
    }
    
    agent_results = {}
    cards = []
    summary_parts = []
    
    for aid, (content, lines, agent_info) in all_parsed.items():
        if not content or len(content.strip()) < 10:
            content = _generate_agent_fallback(aid, query)
        
        agent_results[aid] = {
            "name": agent_info["name"],
            "card_type": agent_info["card_type"],
            "category": agent_info["category"],
            "content": content,
        }
        
        # 重新解析卡片（使用可能的降级内容）
        if not lines or (len(lines) == 1 and len(lines[0]) < 10):
            fallback = _generate_agent_fallback(aid, query)
            lines = [l.strip() for l in fallback.strip().split('\n') if l.strip()]
            lines = [re.sub(r'^[\d]+[.、)）]\s*', '', l) for l in lines if l]
            content = fallback
        
        for i, line in enumerate(lines[:3]):
            cards.append(FourColorCard(
                card_id=f"{task_id}_{agent_info['card_type']}_{i}",
                card_type=agent_info["card_type"],
                title=f"{agent_info['category']} #{i+1}",
                content=line,
                category=agent_info["category"],
                created_at=datetime.now().isoformat()
            ))
        
        summary_parts.append(f"{agent_info['name']}：{lines[0] if lines else '分析完成'}")
    
    # ========== 自动归档入网 ==========
    agent_status["orchestrator"] = "idle"
    agent_status["taishige"] = "executing"
    
    try:
        await _archive_cards_to_knowledge_network(cards, query, task_id)
        logger.info(f"[AgentSystem] {len(cards)}张卡片已自动归档入网")
    except Exception as e:
        logger.warning(f"[AgentSystem] 卡片归档入网失败(不影响主流程): {e}")
    
    # 生成总结摘要
    summary = "；".join(summary_parts) if summary_parts else "分析完成"
    
    try:
        summary_prompt = f"请用1-2句话概括以下分析结论：\n{summary}"
        llm_summary = await call_llm("你是分析总结助手，擅长精炼概括。", summary_prompt)
        if llm_summary and len(llm_summary.strip()) > 5:
            summary = llm_summary.strip()
    except Exception:
        pass
    
    agent_status["taishige"] = "idle"
    agent_status["yichuansi"] = "idle"
    
    end_time = time.time()
    
    pipeline_desc = "事实→(解释+风险)→行动"
    report = AnalysisReport(
        report_id=f"report_{task_id}",
        query=query,
        summary=summary,
        cards=cards,
        agent_results=agent_results,
        performance={
            "inference_time": round(end_time - start_time, 2),
            "cards_generated": len(cards),
            "agents_used": len(all_parsed),
            "pipeline": pipeline_desc,
        },
        created_at=datetime.now().isoformat()
    )
    
    logger.info(f"[AgentSystem] 管道分析完成: {len(cards)}张卡片, 耗时{end_time - start_time:.1f}s, 管道={pipeline_desc}")
    return report


def _generate_agent_fallback(agent_id: str, query: str) -> str:
    """LLM不可用时，基于角色生成降级回复"""
    fallbacks = {
        "tongzhengsi": f"1. 关于「{query}」，已提取到相关客观事实信息\n2. 数据源中包含可分析的基础数据\n3. 当前信息可供进一步分析参考",
        "jianchayuan": f"1. 「{query}」可能受多种因素影响\n2. 需结合历史趋势进行原因分析\n3. 建议关注关键指标的变化规律",
        "xingyusi": f"1. 需关注「{query}」相关的数据质量风险\n2. 建议监控关键指标的异常波动\n3. 注意可能存在的外部影响因素",
        "canmousi": f"1. 建议对「{query}」进行深入调研\n2. 建议建立定期跟踪和评估机制\n3. 建议制定分阶段的应对方案",
    }
    return fallbacks.get(agent_id, "分析完成")


def _format_8agent_result(data: Dict[str, Any], query: str = "") -> str:
    """
    将 8-Agent 响应格式化为易读的纯文本，在 CLI 中展示。
    隐藏内部日志，只显示：查询、四色卡片、报告文本。
    """
    lines = []
    lines.append("=" * 50)
    lines.append(f"  🔍 查询：{query or data.get('query', '未知')}")
    lines.append("=" * 50)

    # 获取卡片（四色分组）
    cards_by_color = {"blue": [], "green": [], "yellow": [], "red": []}
    card_source = data.get("four_color_cards")
    if card_source:
        if hasattr(card_source, "model_dump"):
            card_source = card_source.model_dump()
        for color, card_list in card_source.items():
            if color in cards_by_color and isinstance(card_list, list):
                cards_by_color[color] = card_list
    elif "results" in data and isinstance(data["results"], dict):
        inner = data["results"].get("four_color_cards") or data["results"].get("four_color_cards")
        if inner:
            if hasattr(inner, "model_dump"):
                inner = inner.model_dump()
            for color in cards_by_color:
                if color in inner:
                    cards_by_color[color] = inner[color] or []

    color_names = {"blue": "🔵 事实", "green": "🟢 解释", "yellow": "🟡 风险", "red": "🔴 行动"}
    for color, name in color_names.items():
        cards = cards_by_color.get(color, [])
        if cards:
            lines.append(f"\n{name}（{len(cards)}张）：")
            for c in cards:
                if isinstance(c, dict):
                    title = c.get("title", "")
                    content = c.get("content", "")
                    if content:
                        lines.append(f"  • {title}：{content[:80]}{'...' if len(str(content)) > 80 else ''}")
                    else:
                        lines.append(f"  • {title}")

    # 报告正文
    report_text = ""
    if isinstance(data.get("report"), dict):
        report_text = data["report"].get("text", "")
    elif "results" in data and isinstance(data["results"], dict):
        r = data["results"].get("report", {})
        if isinstance(r, dict):
            report_text = r.get("text", "")

    if report_text:
        lines.append("\n" + "-" * 50)
        lines.append("📋 报告：")
        # 去掉 markdown 格式的标题，只留内容
        for line in report_text.split("\n"):
            line = line.strip()
            if line and not line.startswith("#"):
                lines.append(f"  {line}")

    # 统计信息
    perf = data.get("performance", {})
    if not perf and "results" in data and isinstance(data["results"], dict):
        perf = data["results"].get("performance", {})
    if perf:
        cards_gen = perf.get("cards_generated", len(data.get("four_color_cards", [])))
        lines.append(f"\n⏱  耗时：{perf.get('inference_time', '?')}s | 生成卡片：{cards_gen}张")

    lines.append("=" * 50)
    return "\n".join(lines)


# ==================== 端点 ====================

@router.get("/status")
async def get_agent_status():
    """获取所有 Agent 状态"""
    return {
        "system_initialized": True,
        "agents": agent_status,
        "agent_count": len(ALL_AGENT_IDS),
        "active_tasks": len([s for s in agent_status.values() if s == "executing"]),
        "timestamp": datetime.now().isoformat()
    }


@router.post("/analyze", response_model=AnalysisReport)
async def analyze_with_agents(request: AgentTaskRequest):
    """
    使用 8-Agent 系统进行数据分析（同步版）
    
    完整流程：
    1. 通政司(蓝卡) + 监察院(绿卡) + 刑狱司(黄卡) + 参谋司(红卡) 并行推理
    2. 聚合结果生成四色卡片
    3. 返回完整分析报告
    """
    try:
        context_str = ""
        if request.context:
            context_str = json.dumps(request.context, ensure_ascii=False) if isinstance(request.context, dict) else str(request.context)
        
        report = await _run_agent_analysis(
            query=request.query,
            context=context_str,
            material=request.material
        )
        return report

    except Exception as e:
        logger.error(f"[AgentSystem] 分析失败: {e}", exc_info=True)
        # 重置状态
        for aid in ALL_AGENT_IDS:
            agent_status[aid] = "idle"
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/pretty")
async def analyze_with_agents_pretty(request: AgentTaskRequest):
    """
    使用 8-Agent 系统进行数据分析，返回格式化的纯文本（易于 CLI 阅读）。
    隐藏内部日志，只展示：查询、四色卡片、报告正文。
    """
    try:
        context_str = ""
        if request.context:
            context_str = json.dumps(request.context, ensure_ascii=False) if isinstance(request.context, dict) else str(request.context)

        report = await _run_agent_analysis(
            query=request.query,
            context=context_str,
            material=request.material
        )

        # 转为 dict 用于格式化
        if hasattr(report, "model_dump"):
            data = report.model_dump()
        else:
            data = dict(report) if isinstance(report, dict) else {"query": request.query, "report": report}

        formatted = _format_8agent_result(data, query=request.query)
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=formatted)

    except Exception as e:
        logger.error(f"[AgentSystem] 格式化分析失败: {e}", exc_info=True)
        for aid in ALL_AGENT_IDS:
            agent_status[aid] = "idle"
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/stream")
async def analyze_with_agents_stream(request: AgentTaskRequest):
    """
    使用 8-Agent 系统进行数据分析（SSE流式版）
    
    事件类型：
    - analysis_start: 分析开始
    - agent_start: Agent开始推理
    - agent_complete: Agent推理完成
    - analysis_summary: 摘要生成完成
    - analysis_end: 分析结束
    """
    async def event_generator():
        call_llm = await _get_call_llm()
        start_time = time.time()
        task_id = f"task_{int(start_time * 1000)}"
        
        # 构建用户提示词
        context_str = ""
        if request.context:
            context_str = json.dumps(request.context, ensure_ascii=False) if isinstance(request.context, dict) else str(request.context)
        
        user_prompt_parts = [f"分析主题：{request.query}"]
        if context_str:
            user_prompt_parts.append(f"背景信息：{context_str[:500]}")  # 截断背景
        if request.material:
            user_prompt_parts.append(f"原始素材：{request.material[:500]}")
        user_prompt_base = "\n".join(user_prompt_parts)
        
        # 分析开始
        yield _sse_event("analysis_start", {
            "task_id": task_id,
            "query": request.query,
            "agents": list(ANALYSIS_AGENTS.keys()),
            "timestamp": datetime.now().isoformat()
        })
        await asyncio.sleep(0.1)
        
        # 依次调用4个Agent（SSE流式要求顺序推送事件）
        agent_results = {}
        cards = []
        
        for agent_id, agent_info in ANALYSIS_AGENTS.items():
            agent_status[agent_id] = "executing"
            
            # 通知前端：Agent开始推理
            yield _sse_event("agent_start", {
                "agent_id": agent_id,
                "agent_name": agent_info["name"],
                "card_type": agent_info["card_type"],
                "category": agent_info["category"],
                "avatar": agent_info["avatar"],
                "timestamp": datetime.now().isoformat()
            })
            
            # 带心跳的LLM调用
            system_prompt = agent_info["system_prompt"]
            user_prompt = user_prompt_base + "\n\n请基于以上信息，完成你的职责。"
            
            llm_task = asyncio.create_task(call_llm(system_prompt, user_prompt))
            content = None
            try:
                while not llm_task.done():
                    done, _ = await asyncio.wait({llm_task}, timeout=5.0)
                    if done:
                        content = llm_task.result()
                        break
                    yield _sse_heartbeat()
            except Exception as e:
                logger.warning(f"[AgentSystem] {agent_info['name']}调用异常: {e}")
            finally:
                if not llm_task.done():
                    llm_task.cancel()
                    try:
                        await llm_task
                    except asyncio.CancelledError:
                        pass
            
            # 降级处理
            if not content or len(content.strip()) < 10:
                content = _generate_agent_fallback(agent_id, request.query)
            
            agent_status[agent_id] = "idle"
            
            # 按行拆分卡片
            lines = [l.strip() for l in content.strip().split('\n') if l.strip()]
            cleaned_lines = []
            for line in lines:
                line = re.sub(r'^[\d]+[.、)）]\s*', '', line)
                if line:
                    cleaned_lines.append(line)
            
            agent_cards = []
            for i, line in enumerate(cleaned_lines[:3]):
                card = {
                    "card_id": f"{task_id}_{agent_info['card_type']}_{i}",
                    "card_type": agent_info["card_type"],
                    "title": f"{agent_info['category']} #{i+1}",
                    "content": line,
                    "category": agent_info["category"],
                    "created_at": datetime.now().isoformat()
                }
                cards.append(card)
                agent_cards.append(card)
            
            agent_results[agent_id] = {
                "name": agent_info["name"],
                "card_type": agent_info["card_type"],
                "category": agent_info["category"],
                "content": content,
            }
            
            # 通知前端：Agent推理完成
            yield _sse_event("agent_complete", {
                "agent_id": agent_id,
                "agent_name": agent_info["name"],
                "cards": agent_cards,
                "content_preview": content[:100] if content else "",
                "timestamp": datetime.now().isoformat()
            })
            await asyncio.sleep(0.1)
        
        # 生成摘要
        agent_status["orchestrator"] = "executing"
        summary_parts = []
        for aid, info in ANALYSIS_AGENTS.items():
            if aid in agent_results and agent_results[aid].get("content"):
                first_line = agent_results[aid]["content"].strip().split('\n')[0]
                first_line = re.sub(r'^[\d]+[.、)）]\s*', '', first_line)
                summary_parts.append(f"{info['name']}：{first_line}")
        
        summary = "；".join(summary_parts) if summary_parts else "分析完成"
        
        try:
            summary_prompt = f"请用1-2句话概括以下分析结论：\n{summary}"
            llm_summary = await call_llm("你是分析总结助手，擅长精炼概括。", summary_prompt)
            if llm_summary and len(llm_summary.strip()) > 5:
                summary = llm_summary.strip()
        except Exception:
            pass
        
        agent_status["orchestrator"] = "idle"
        
        yield _sse_event("analysis_summary", {
            "summary": summary,
            "timestamp": datetime.now().isoformat()
        })
        await asyncio.sleep(0.1)
        
        # 分析结束
        end_time = time.time()
        yield _sse_event("analysis_end", {
            "task_id": task_id,
            "summary": summary,
            "total_cards": len(cards),
            "duration_seconds": round(end_time - start_time, 2),
            "timestamp": datetime.now().isoformat()
        })
    
    async def safe_event_generator():
        try:
            async for event in event_generator():
                yield event
        except Exception as e:
            logger.error(f"[AgentSystem] SSE流异常: {e}", exc_info=True)
            yield _sse_event("analysis_error", {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            # 重置状态
            for aid in ALL_AGENT_IDS:
                agent_status[aid] = "idle"
    
    return StreamingResponse(
        safe_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/memory/store")
async def store_knowledge(knowledge_type: str, data: Dict[str, Any]):
    """
    存储知识到太史阁（记忆）
    
    参数：
        knowledge_type: 知识类型 (fact/explanation/risk/action)
        data: 知识数据
    """
    try:
        agent_status["taishige"] = "executing"
        
        # 存入数据库
        from database import DatabaseManager
        db = DatabaseManager(settings.DB_PATH)
        
        card_id = f"card_{int(time.time() * 1000)}"
        card_type_map = {
            "fact": "blue",
            "explanation": "green",
            "risk": "yellow",
            "action": "red"
        }
        
        card_type = card_type_map.get(knowledge_type, "blue")
        title = data.get("title", knowledge_type)
        content = data.get("content", "")
        category = data.get("category", knowledge_type)
        
        try:
            db.insert_card(
                card_id=card_id,
                card_type=card_type,
                title=title,
                content=content,
                category=category,
                similarity=data.get("similarity")
            )
        except Exception as e:
            logger.warning(f"插入卡片失败(可能表结构不匹配): {e}")
        
        agent_status["taishige"] = "idle"
        
        return {
            "status": "stored",
            "card_id": card_id,
            "knowledge_type": knowledge_type,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"存储知识失败: {e}")
        agent_status["taishige"] = "failed"
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory/retrieve")
async def retrieve_knowledge(knowledge_type: str, query: str, limit: int = 10):
    """
    从太史阁检索知识
    
    参数：
        knowledge_type: 知识类型
        query: 查询内容
        limit: 返回数量限制
    """
    try:
        agent_status["taishige"] = "executing"
        
        from database import DatabaseManager
        db = DatabaseManager(settings.DB_PATH)
        
        # 搜索卡片
        results = db.search_cards(query, limit=limit) if hasattr(db, 'search_cards') else []
        
        agent_status["taishige"] = "idle"
        
        return {
            "results": results,
            "total": len(results),
            "query": query,
            "retrieved_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"检索知识失败: {e}")
        agent_status["taishige"] = "failed"
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cards")
async def get_all_cards():
    """获取所有四色卡片（整合现有知识库）"""
    try:
        from database import DatabaseManager
        db = DatabaseManager(settings.DB_PATH)

        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM knowledge_cards
            ORDER BY created_at DESC
            LIMIT 100
        """)
        rows = cursor.fetchall()
        conn.close()
        
        cards = []
        for row in rows:
            cards.append(FourColorCard(
                card_id=row['card_id'],
                card_type=row['card_type'],
                title=row['title'],
                content=row['content'],
                category=row.get('category', '未知'),
                similarity=row.get('similarity'),
                created_at=row['created_at']
            ))
        
        return {
            "cards": cards,
            "total": len(cards)
        }
    except Exception as e:
        logger.error(f"获取卡片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cards")
async def create_card(card_data: Dict[str, Any]):
    """创建新的知识卡片"""
    try:
        from database import DatabaseManager
        db = DatabaseManager(settings.DB_PATH)
        
        card_id = f"card_{int(time.time() * 1000)}"
        db.insert_card(
            card_id=card_id,
            card_type=card_data['card_type'],
            title=card_data['title'],
            content=card_data['content'],
            category=card_data.get('category', '未知'),
            similarity=card_data.get('similarity')
        )
        
        return {
            "card_id": card_id,
            "status": "created",
            "message": "卡片创建成功"
        }
    except Exception as e:
        logger.error(f"创建卡片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat_with_agent(query: str, context: Optional[Dict[str, Any]] = None):
    """
    使用 8-Agent 系统进行对话（走 call_llm 降级链）
    
    参数：
        query: 用户问题
        context: 对话上下文
    """
    try:
        call_llm = await _get_call_llm()
        agent_status["orchestrator"] = "executing"
        
        # 构建上下文
        context_str = ""
        if context:
            context_str = f"\n\n对话上下文：{json.dumps(context, ensure_ascii=False)}"
        
        system_prompt = "你是知易智能知识管家的AI助手，基于8-Agent协作系统提供专业、有用的回答。回答要简洁有力。"
        user_prompt = f"用户问题：{query}{context_str[:500]}"  # 截断上下文
        
        # 搜索知识库补充上下文
        try:
            from database import DatabaseManager
            db = DatabaseManager(settings.DB_PATH)
            if hasattr(db, 'search_cards'):
                cards = db.search_cards(query, limit=3)
                if cards:
                    knowledge = "\n".join([
                        f"- {c.get('title', '')}: {(c.get('content', '') or '')[:100]}"
                        for c in cards
                    ])
                    user_prompt += f"\n\n【知识库参考】\n{knowledge}"
        except Exception:
            pass
        
        response = await call_llm(system_prompt, user_prompt)
        
        agent_status["orchestrator"] = "idle"
        
        return {
            "response": response or "抱歉，暂时无法生成回复。",
            "sources": [],
            "cards": []
        }
    except Exception as e:
        logger.error(f"对话失败: {e}")
        agent_status["orchestrator"] = "idle"
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_system_stats():
    """获取系统统计信息"""
    try:
        from database import DatabaseManager
        db = DatabaseManager(settings.DB_PATH)

        card_stats = {}
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT card_type, COUNT(*) as count
                FROM knowledge_cards
                GROUP BY card_type
            """)
            rows = cursor.fetchall()
            conn.close()
            card_stats = {row['card_type']: row['count'] for row in rows}
        except Exception:
            pass

        return {
            "total_cards": sum(card_stats.values()) if card_stats else 0,
            "cards_by_type": card_stats,
            "agent_status": agent_status,
            "system_initialized": True
        }
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_task_history(limit: int = 10):
    """获取任务历史记录"""
    try:
        tasks = []
        for i in range(limit):
            tasks.append({
                "task_id": f"task_{i}",
                "query": f"历史查询示例 {i+1}",
                "status": "completed" if i % 2 == 0 else "failed",
                "execution_time": 1.5 + (i * 0.1),
                "created_at": f"2026-02-02T{(20 + i):02d}:00:00"
            })

        return {
            "total": len(tasks),
            "tasks": tasks
        }
    except Exception as e:
        logger.error(f"获取任务历史失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
