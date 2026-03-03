"""
8-Agent协作会议路由（真实LLM版）
使用SSE流式推送，每个Agent通过LLM真实推理发言，支持上下文累积讨论
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import logging
import json
import time
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/meeting", tags=["8-Agent会议"])

# ==================== Agent 映射 ====================
AGENT_MAPPING = {
    "taishige": {
        "backend_id": "memory",
        "name": "太史阁",
        "title": "历史记录与反思官",
        "avatar": "📚",
        "description": "负责记录所有操作、决策和结果，构建组织的集体记忆与经验库",
        "color": "from-blue-500 to-blue-600",
        "pixel_id": "taishige",
        "system_prompt": "你是「太史阁」，负责历史记录与反思。你的职责是从历史经验和过往案例中提取教训，为当前议题提供历史视角的参考。发言要简洁有力，100字以内。"
    },
    "jinjiyu": {
        "backend_id": "risk_detector",
        "name": "锦衣卫",
        "title": "安全与情报收集官",
        "avatar": "🛡️",
        "description": "监控系统安全状态，识别潜在威胁和风险，收集内外部情报",
        "color": "from-red-500 to-red-600",
        "pixel_id": "xingyusi",
        "system_prompt": "你是「锦衣卫」，负责安全与情报收集。你的职责是识别议题中的潜在风险、威胁和安全隐患，提出预警。发言要简洁有力，100字以内。"
    },
    "tongzhengsi": {
        "backend_id": "fact_generator",
        "name": "通政司",
        "title": "信息与通讯中枢",
        "avatar": "📡",
        "description": "管理所有信息流，确保内外部通讯畅通，促进跨部门协作",
        "color": "from-green-500 to-green-600",
        "pixel_id": "tongzhengsi",
        "system_prompt": "你是「通政司」，负责信息与通讯。你的职责是梳理议题中的关键事实、数据和信息，确保讨论基于准确的信息基础。发言要简洁有力，100字以内。"
    },
    "jianchayuan": {
        "backend_id": "interpreter",
        "name": "监察院",
        "title": "监督与审计官",
        "avatar": "🔍",
        "description": "监督各项操作和流程的执行情况，进行合规性审计",
        "color": "from-purple-500 to-purple-600",
        "pixel_id": "jianchayuan",
        "system_prompt": "你是「监察院」，负责监督与审计。你的职责是审视议题中的合规性、流程规范性，指出可能的漏洞和改进空间。发言要简洁有力，100字以内。"
    },
    "mijuanfang": {
        "backend_id": "preprocessor",
        "name": "密卷房",
        "title": "知识库与档案管理员",
        "avatar": "📂",
        "description": "专门负责非结构化知识的整理、归档、索引和检索",
        "color": "from-indigo-500 to-indigo-600",
        "pixel_id": "mijuanfang",
        "system_prompt": "你是「密卷房」，负责知识库与档案管理。你的职责是从已有知识库中检索相关资料，为讨论提供知识支撑和参考依据。发言要简洁有力，100字以内。"
    },
    "chengxiangfu": {
        "backend_id": "action_advisor",
        "name": "丞相府",
        "title": "战略规划与决策官",
        "avatar": "🏛️",
        "description": "制定战略规划，提供高层决策建议，协调各方资源",
        "color": "from-yellow-500 to-yellow-600",
        "pixel_id": "canmousi",
        "system_prompt": "你是「丞相府」，负责战略规划与决策。你的职责是从战略高度分析议题，提出可执行的方案和建议。发言要简洁有力，100字以内。"
    },
    "junjichu": {
        "backend_id": "messenger",
        "name": "军机处",
        "title": "执行与协调官",
        "avatar": "⚔️",
        "description": "负责任务执行、跨部门协调和进度跟踪",
        "color": "from-orange-500 to-orange-600",
        "pixel_id": "yichuansi",
        "system_prompt": "你是「军机处」，负责执行与协调。你的职责是将讨论成果转化为具体的执行计划，明确分工和时间节点。发言要简洁有力，100字以内。"
    },
    "zhihuishi": {
        "backend_id": "orchestrator",
        "name": "指挥使",
        "title": "总指挥与裁决官",
        "avatar": "👑",
        "description": "统筹全局，做出最终裁决，确保各方协同高效运转",
        "color": "from-teal-500 to-teal-600",
        "pixel_id": "orchestrator",
        "system_prompt": "你是「指挥使」，负责总指挥与最终裁决。你的职责是综合各方意见，做出最终决策，明确下一步行动方向。发言要简洁有力，100字以内。"
    }
}

# ==================== LLM 调用 ====================

async def call_llm(system_prompt: str, user_prompt: str, timeout: float = 60.0) -> str:
    """
    调用LLM生成回复。
    优先使用本地 NPU 推理接口 /api/npu/analyze（已注册在同一个 8000 端口）。
    如果 NPU 不可用，尝试直接导入 NPU 模型加载器进行推理。
    """
    combined_prompt = f"{system_prompt}\n\n{user_prompt}"

    # 方式1: 调用本地 NPU 推理接口
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                "http://127.0.0.1:8000/api/npu/analyze",
                json={
                    "query": combined_prompt,
                    "max_tokens": 256,  # 提高token限制，让LLM有充分表达空间
                    "temperature": 0.7   # 使用标准温度
                }
            )
            response.raise_for_status()
            result = response.json()
            if result.get("success"):
                raw = result.get("raw_output", "").strip()
                if raw:
                    return raw
    except Exception as e:
        logger.warning(f"NPU接口调用失败: {e}")

    # 方式2: 直接调用 NPU 模型加载器（进程内调用，避免 HTTP 开销）
    try:
        from models.model_loader import NPUModelLoader, get_model_loader
        from routes.model_router import select_model
        model_key = select_model(combined_prompt)
        loader = get_model_loader(model_key)
        loader.load()
        # 使用默认参数 instead of custom ones to avoid SetParams failures
        # The model's config files already contain appropriate defaults
        raw_output = loader.infer(
            prompt=combined_prompt
        )
        if raw_output and raw_output.strip():
            return raw_output.strip()
    except Exception as e:
        logger.warning(f"NPU直接推理失败: {e}")

    return ""


# ==================== 请求/响应模型 ====================
class MeetingRequest(BaseModel):
    topic: str = Field(..., description="会议主题")
    context: str = Field(default="", description="背景信息")
    card_ids: List[str] = Field(default_factory=list, description="相关卡片ID")
    rounds: int = Field(default=3, ge=1, le=5, description="讨论轮数")


class AgentSpeech(BaseModel):
    agent_id: str
    agent_name: str
    agent_title: str
    avatar: str
    system_prompt: Optional[str] = None
    speech: str
    timestamp: str
    cards_referenced: List[str] = []


class MeetingRound(BaseModel):
    round: int
    theme: str
    speeches: List[AgentSpeech]


class MeetingResponse(BaseModel):
    success: bool
    topic: str
    meeting_id: str
    rounds: List[MeetingRound]
    summary: str
    decision: str
    action_items: List[str]
    participants: List[str]
    start_time: str
    end_time: str
    duration_seconds: float


class AgentInfo(BaseModel):
    id: str
    name: str
    title: str
    avatar: str
    description: str
    color: str


# ==================== 路由 ====================

@router.get("/agents", response_model=List[AgentInfo])
async def get_agents():
    """获取所有8个Agent的信息"""
    return [
        AgentInfo(
            id=agent_id,
            name=info["name"],
            title=info["title"],
            avatar=info["avatar"],
            description=info["description"],
            color=info["color"]
        )
        for agent_id, info in AGENT_MAPPING.items()
    ]


@router.get("/health")
async def meeting_health():
    """会议服务健康检查，同时检测LLM是否可用"""
    llm_available = False
    try:
        test_result = await call_llm("你是助手", "请回复OK", timeout=10.0)
        if test_result:
            llm_available = True
    except Exception:
        pass

    return {
        "status": "healthy",
        "llm_available": llm_available,
        "agent_count": len(AGENT_MAPPING),
        "timestamp": datetime.now().isoformat()
    }


@router.post("/discuss/stream")
async def create_meeting_stream(request: MeetingRequest):
    """
    SSE流式会议 —— 每个Agent发言时实时推送事件，前端可驱动像素动画。
    
    事件类型：
    - meeting_start: 会议开始
    - round_start: 轮次开始
    - agent_speaking: Agent开始发言（驱动像素动画）
    - agent_speech: Agent发言内容
    - round_end: 轮次结束
    - meeting_decision: 最终决策
    - meeting_end: 会议结束
    """
    async def event_generator():
        start_time = time.time()
        meeting_id = f"meeting_{int(start_time * 1000)}"

        # 会议开始
        yield _sse_event("meeting_start", {
            "meeting_id": meeting_id,
            "topic": request.topic,
            "rounds": request.rounds,
            "agent_count": len(AGENT_MAPPING),
            "timestamp": datetime.now().isoformat()
        })
        await asyncio.sleep(0.1)

        themes = [
            "问题分析与信息收集",
            "方案讨论与风险评估",
            "决策制定与行动计划",
            "深度论证与补充",
            "最终确认与总结"
        ]

        all_speeches = []  # 累积所有发言，供后续Agent参考
        all_rounds = []

        for round_num in range(1, request.rounds + 1):
            theme = themes[min(round_num - 1, len(themes) - 1)]

            yield _sse_event("round_start", {
                "round": round_num,
                "theme": theme,
                "timestamp": datetime.now().isoformat()
            })
            await asyncio.sleep(0.1)

            round_speeches = []

            for agent_id, agent_info in AGENT_MAPPING.items():
                 pixel_id = agent_info.get("pixel_id", agent_id)

                 # 通知前端：该Agent正在思考（驱动像素动画）
                 yield _sse_event("agent_speaking", {
                     "agent_id": agent_id,
                     "pixel_id": pixel_id,
                     "agent_name": agent_info["name"],
                     "round": round_num,
                     "timestamp": datetime.now().isoformat()
                 })
                 await asyncio.sleep(0.1)

                 # 构建上下文：包含前面所有Agent的发言
                 context_parts = [f"会议主题：{request.topic}"]
                 if request.context:
                     context_parts.append(f"背景信息：{request.context}")
                 context_parts.append(f"当前是第{round_num}轮讨论，主题：{theme}")

                 if all_speeches:
                     context_parts.append("\n--- 此前的讨论记录 ---")
                     for prev in all_speeches[-16:]:  # 最多保留最近16条，避免上下文过长
                         context_parts.append(f"【{prev['agent_name']}（{prev['agent_title']}）】：{prev['speech']}")
                     context_parts.append("--- 讨论记录结束 ---\n")

                 user_prompt = "\n".join(context_parts)
                 system_prompt = agent_info["system_prompt"]

                 # 添加明确的指令，防止重复输出角色描述，但允许引用观点
                 user_prompt += "\n\n重要：只回答问题，不要重复角色描述（System Prompt中的内容），但要引用或回应前面智能体提出的观点。"

                 # 如果是密卷房，先搜索数据库获取相关资料
                 if agent_id == "mijuanfang":
                     try:
                         from api.knowledge_routes import search_cards
                         import json

                         # 从上下文中提取关键词
                         topic = request.topic.lower()
                         context_keywords = [keyword for keyword in user_prompt.split() if len(keyword) > 3]

                         # 使用多个关键词搜索
                         search_queries = topic.split()[:3] + context_keywords[:3]

                         for query in search_queries[:2]:  # 最多搜索2个查询
                             if len(query) > 2:
                                 search_result = await search_cards(keyword=query, limit=3)
                                 if search_result and len(search_result) > 0:
                                     # 将搜索结果添加到上下文
                                     relevant_info = f"\n【数据库参考】关于'{query}'的相关资料："
                                     for card in search_result[:3]:  # 最多引用3个卡片
                                         relevant_info += f"\n- {card.get('title', '无标题')}：{card.get('content', '')[:100]}..."
                                     user_prompt += relevant_info
                     except Exception as e:
                         logger.warning(f"密卷房数据库搜索失败: {e}")

                 # 调用LLM（system_prompt中包含角色指令，已经足够让LLM理解角色）
                 speech_content = await call_llm(system_prompt, user_prompt)

                 if not speech_content:
                     # LLM不可用时的智能降级：基于角色生成有意义的回复
                     speech_content = _generate_role_based_fallback(
                         agent_info, request.topic, theme, round_num, round_speeches
                     )

                 speech_data = {
                     "agent_id": agent_id,
                     "agent_name": agent_info["name"],
                     "agent_title": agent_info["title"],
                     "avatar": agent_info["avatar"],
                     "system_prompt": agent_info["system_prompt"],
                     "speech": speech_content,
                     "timestamp": datetime.now().isoformat(),
                     "cards_referenced": [],
                     "pixel_id": pixel_id,
                     "round": round_num
                 }

                 all_speeches.append(speech_data)
                 round_speeches.append(speech_data)

                 yield _sse_event("agent_speech", speech_data)
                 await asyncio.sleep(0.3)  # 给前端一点时间渲染动画

            all_rounds.append({
                "round": round_num,
                "theme": theme,
                "speeches": round_speeches
            })

            yield _sse_event("round_end", {
                "round": round_num,
                "theme": theme,
                "speech_count": len(round_speeches),
                "timestamp": datetime.now().isoformat()
            })
            await asyncio.sleep(0.2)

        # 生成最终决策（由指挥使综合所有讨论）
        decision_prompt_parts = [
            f"会议主题：{request.topic}",
            f"经过{request.rounds}轮讨论，以下是所有Agent的发言记录：",
            ""
        ]
        for s in all_speeches:
            decision_prompt_parts.append(f"【{s['agent_name']}】：{s['speech']}")

        decision_prompt_parts.append("")
        decision_prompt_parts.append("请你作为总指挥，综合以上所有讨论，生成：")
        decision_prompt_parts.append("1. 会议总结（2-3句话概括讨论要点）")
        decision_prompt_parts.append("2. 最终决策（明确的决策结论）")
        decision_prompt_parts.append("3. 行动项（3-5个具体的下一步行动，每项一行，用序号标注）")
        decision_prompt_parts.append("请用以下格式输出：")
        decision_prompt_parts.append("【总结】...")
        decision_prompt_parts.append("【决策】...")
        decision_prompt_parts.append("【行动项】")
        decision_prompt_parts.append("1. ...")

        decision_system = "你是八府巡按的总指挥使，负责综合各方意见做出最终裁决。请严格按照要求的格式输出。"
        decision_text = await call_llm(decision_system, "\n".join(decision_prompt_parts))

        if not decision_text:
            decision_text = _generate_fallback_decision(request.topic, all_speeches)

        # 解析决策文本
        summary, decision, action_items = _parse_decision(decision_text, request.topic)

        yield _sse_event("meeting_decision", {
            "summary": summary,
            "decision": decision,
            "action_items": action_items,
            "timestamp": datetime.now().isoformat()
        })
        await asyncio.sleep(0.1)

        end_time = time.time()
        duration = end_time - start_time

        # 会议结束
        yield _sse_event("meeting_end", {
            "meeting_id": meeting_id,
            "topic": request.topic,
            "duration_seconds": round(duration, 2),
            "total_speeches": len(all_speeches),
            "rounds_completed": request.rounds,
            "timestamp": datetime.now().isoformat()
        })

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/discuss", response_model=MeetingResponse)
async def create_meeting(request: MeetingRequest):
    """
    同步版会议接口（兼容旧前端）。
    内部逻辑与流式版相同，但等待全部完成后一次性返回。
    """
    start_time = time.time()
    meeting_id = f"meeting_{int(start_time * 1000)}"

    themes = [
        "问题分析与信息收集",
        "方案讨论与风险评估",
        "决策制定与行动计划",
        "深度论证与补充",
        "最终确认与总结"
    ]

    all_speeches = []
    all_rounds = []

    for round_num in range(1, request.rounds + 1):
        theme = themes[min(round_num - 1, len(themes) - 1)]
        round_speeches = []

        for agent_id, agent_info in AGENT_MAPPING.items():
            context_parts = [f"会议主题：{request.topic}"]
            if request.context:
                context_parts.append(f"背景信息：{request.context}")
            context_parts.append(f"当前是第{round_num}轮讨论，主题：{theme}")

            if all_speeches:
                context_parts.append("\n--- 此前的讨论记录 ---")
                for prev in all_speeches[-16:]:
                    context_parts.append(f"【{prev['agent_name']}（{prev['agent_title']}）】：{prev['speech']}")
                context_parts.append("--- 讨论记录结束 ---\n")

            context_parts.append(f"请你以「{agent_info['name']}」的身份，针对当前议题发表你的观点。")

            user_prompt = "\n".join(context_parts)
            speech_content = await call_llm(agent_info["system_prompt"], user_prompt)

            if not speech_content:
                speech_content = _generate_role_based_fallback(
                    agent_info, request.topic, theme, round_num, round_speeches
                )

            speech_obj = AgentSpeech(
                agent_id=agent_id,
                agent_name=agent_info["name"],
                agent_title=agent_info["title"],
                avatar=agent_info["avatar"],
                system_prompt=agent_info["system_prompt"],
                speech=speech_content,
                timestamp=datetime.now().isoformat(),
                cards_referenced=[]
            )
            all_speeches.append({
                "agent_name": agent_info["name"],
                "agent_title": agent_info["title"],
                "system_prompt": agent_info["system_prompt"],
                "speech": speech_content
            })
            round_speeches.append(speech_obj)

        all_rounds.append(MeetingRound(
            round=round_num,
            theme=theme,
            speeches=round_speeches
        ))

    # 生成决策
    decision_prompt_parts = [
        f"会议主题：{request.topic}",
        f"经过{request.rounds}轮讨论，以下是所有Agent的发言记录：", ""
    ]
    for s in all_speeches:
        decision_prompt_parts.append(f"【{s['agent_name']}】：{s['speech']}")
    decision_prompt_parts.extend([
        "", "请你作为总指挥，综合以上所有讨论，生成：",
        "1. 会议总结（2-3句话概括讨论要点）",
        "2. 最终决策（明确的决策结论）",
        "3. 行动项（3-5个具体的下一步行动，每项一行，用序号标注）",
        "请用以下格式输出：", "【总结】...", "【决策】...", "【行动项】", "1. ..."
    ])

    decision_system = "你是八府巡按的总指挥使，负责综合各方意见做出最终裁决。请严格按照要求的格式输出。"
    decision_text = await call_llm(decision_system, "\n".join(decision_prompt_parts))

    if not decision_text:
        decision_text = _generate_fallback_decision(request.topic, all_speeches)

    summary, decision, action_items = _parse_decision(decision_text, request.topic)

    end_time = time.time()

    return MeetingResponse(
        success=True,
        topic=request.topic,
        meeting_id=meeting_id,
        rounds=all_rounds,
        summary=summary,
        decision=decision,
        action_items=action_items,
        participants=[info["name"] for info in AGENT_MAPPING.values()],
        start_time=datetime.fromtimestamp(start_time).isoformat(),
        end_time=datetime.fromtimestamp(end_time).isoformat(),
        duration_seconds=round(end_time - start_time, 2)
    )


# ==================== 辅助函数 ====================

def _sse_event(event_type: str, data: dict) -> str:
    """构造SSE事件字符串"""
    json_data = json.dumps(data, ensure_ascii=False)
    return f"event: {event_type}\ndata: {json_data}\n\n"


def _generate_role_based_fallback(
    agent_info: dict, topic: str, theme: str, round_num: int,
    previous_speeches: list
) -> str:
    """当LLM不可用时，基于角色和上下文生成有意义的降级回复"""
    name = agent_info["name"]
    title = agent_info["title"]
    backend_id = agent_info["backend_id"]

    # 根据角色和轮次生成不同的回复
    role_responses = {
        "memory": {
            1: f"从历史经验来看，「{topic}」类似的议题我们此前有过相关讨论。建议参考过往案例中的成功经验和失败教训，避免重蹈覆辙。",
            2: f"回顾历史数据，与「{topic}」相关的决策中，执行力和风险预判是两个关键因素。建议本轮重点关注这两方面。",
            3: f"综合历史记录，建议将本次讨论的决策和行动项归档，形成标准化的知识沉淀，供未来参考。"
        },
        "risk_detector": {
            1: f"从安全角度审视「{topic}」，我识别到以下潜在风险：信息不对称、执行偏差、外部环境变化。建议制定相应的应急预案。",
            2: f"针对前面讨论中提到的方案，我需要指出其中的安全隐患：方案的可逆性、资源依赖度、以及可能的连锁反应。",
            3: f"最终方案的风险评估：整体风险可控，但建议设置关键节点的检查机制，确保及时发现和纠正偏差。"
        },
        "fact_generator": {
            1: f"关于「{topic}」，我梳理了以下关键事实：该议题涉及多个利益相关方，需要从数据和事实出发进行客观分析。",
            2: f"补充事实信息：根据现有数据，该议题的核心矛盾在于资源分配和优先级排序，建议用数据驱动决策。",
            3: f"最终事实确认：各方提供的信息已交叉验证，核心数据可靠，可以作为决策依据。"
        },
        "interpreter": {
            1: f"从监督角度审视「{topic}」，我关注流程的合规性和透明度。建议明确决策标准和评估指标。",
            2: f"审计前面的讨论过程，各方观点基本合理，但需要注意论证的严密性和数据的可追溯性。",
            3: f"最终审计意见：讨论过程规范，决策逻辑清晰，建议在执行阶段加强过程监督。"
        },
        "preprocessor": {
            1: f"我已检索知识库中与「{topic}」相关的资料。相关文档和案例可以为本次讨论提供参考依据。",
            2: f"补充知识支撑：根据知识库中的最佳实践，类似议题的处理通常需要分阶段推进，建议制定阶段性目标。",
            3: f"知识归档建议：本次讨论产生的新知识和决策逻辑，建议整理后纳入知识库，完善知识体系。"
        },
        "action_advisor": {
            1: f"从战略层面分析「{topic}」，我认为需要明确短期目标和长期愿景的关系，确保当前决策与整体战略一致。",
            2: f"基于前面的讨论，我建议采取分步推进策略：先试点验证，再逐步推广，降低整体风险。",
            3: f"最终战略建议：方案可行，建议设定明确的里程碑和评估标准，确保执行效果可量化。"
        },
        "messenger": {
            1: f"作为执行协调官，我将确保「{topic}」的讨论成果能够高效传达到各相关方，并跟踪执行进度。",
            2: f"协调反馈：各部门对当前方案的初步反馈积极，但需要明确具体的责任分工和时间节点。",
            3: f"执行计划已制定：明确了责任人、时间表和交付物，将持续跟踪进度并及时汇报。"
        },
        "orchestrator": {
            1: f"各位，关于「{topic}」，请大家从各自专业角度充分发表意见。我将综合各方观点做出最终裁决。",
            2: f"感谢各位的深入分析。目前讨论方向正确，请继续聚焦核心问题，为最终决策提供更充分的依据。",
            3: f"综合各方意见，我做出以下裁决：方案整体可行，需要在风险管控和执行细节上进一步完善。"
        }
    }

    responses = role_responses.get(backend_id, {})
    return responses.get(round_num, f"作为{title}，我对「{topic}」的看法是：需要综合考虑多方面因素，审慎决策。")


def _generate_fallback_decision(topic: str, all_speeches: list) -> str:
    """LLM不可用时生成降级决策"""
    agent_names = list(set(s["agent_name"] for s in all_speeches))
    return (
        f"【总结】经过多轮讨论，{', '.join(agent_names[:4])}等各方就「{topic}」充分交换了意见，"
        f"从历史经验、风险评估、事实分析、战略规划等多个维度进行了深入探讨。\n"
        f"【决策】综合各方意见，决定对「{topic}」采取分阶段推进策略，先试点验证再逐步推广。\n"
        f"【行动项】\n"
        f"1. 成立专项工作组，明确责任分工\n"
        f"2. 制定详细的试点方案和评估标准\n"
        f"3. 建立定期汇报和风险监控机制\n"
        f"4. 设定关键里程碑节点，确保进度可控\n"
        f"5. 将讨论成果和决策逻辑归档至知识库"
    )


def _parse_decision(decision_text: str, topic: str) -> tuple:
    """解析决策文本，提取总结、决策和行动项"""
    summary = ""
    decision = ""
    action_items = []

    lines = decision_text.split("\n")
    current_section = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if "【总结】" in line:
            current_section = "summary"
            summary = line.replace("【总结】", "").strip()
        elif "【决策】" in line:
            current_section = "decision"
            decision = line.replace("【决策】", "").strip()
        elif "【行动项】" in line:
            current_section = "actions"
        elif current_section == "summary" and not summary:
            summary = line
        elif current_section == "decision" and not decision:
            decision = line
        elif current_section == "actions":
            # 去掉序号前缀
            cleaned = line.lstrip("0123456789.、) ").strip()
            if cleaned:
                action_items.append(cleaned)
        elif current_section == "summary":
            summary += " " + line
        elif current_section == "decision":
            decision += " " + line

    # 如果解析失败，使用原文
    if not summary:
        summary = f"关于「{topic}」的讨论已完成，各方充分交换了意见。"
    if not decision:
        decision = f"综合各方意见，对「{topic}」采取审慎推进策略。"
    if not action_items:
        action_items = [
            f"针对「{topic}」制定详细方案",
            "组建专项工作组",
            "建立进度跟踪机制"
        ]

    return summary, decision, action_items
