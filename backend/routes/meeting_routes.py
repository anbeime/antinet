"""
8-Agent协作会议路由（VCP 增强版）
使用SSE流式推送，每个Agent通过LLM真实推理发言
支持：多 Agent 协作通讯、任务委派、跨域代理
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
import os
from config import settings
from routes.enhanced_chat_routes import search_cards_semantic, CardReference

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/meeting", tags=["8-Agent会议"])

_db_manager = None

def set_db_manager(db_manager):
    global _db_manager
    _db_manager = db_manager

def get_db_manager():
    if _db_manager is None:
        from database import DatabaseManager
        return DatabaseManager(settings.DB_PATH)
    return _db_manager


# ==================== VCP Agent协作增强功能 ====================

class AgentDelegateRequest(BaseModel):
    """任务委派请求 - VCP 风格"""
    from_agent: str
    to_agent: str
    task_description: str
    priority: str = "normal"  # low/normal/high/urgent
    context: Optional[Dict[str, Any]] = None


class AgentMessageRequest(BaseModel):
    """Agent 间通讯请求"""
    from_agent: str
    to_agent: str
    message: str
    message_type: str = "text"  # text/task/result/alert
    metadata: Optional[Dict[str, Any]] = None


class CollaborationTask(BaseModel):
    """协作任务"""
    id: str
    title: str
    description: str
    assignee: str
    status: str = "pending"  # pending/in_progress/completed/failed
    priority: str = "normal"
    created_at: str
    due_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None


# 任务存储 (内存中，可以持久化到数据库)
_collab_tasks: Dict[str, CollaborationTask] = {}
_agent_messages: List[Dict[str, Any]] = []
# 用户干预队列 - meeting_id → List[intervention]
_user_interventions: Dict[str, List[Dict[str, Any]]] = {}


@router.post("/delegate")
async def delegate_task(request: AgentDelegateRequest):
    """
    Agent 任务委派 - VCP AgentAssistant 风格
    
    支持 Agent 间任务分发、跨域代理
    """
    task_id = f"task_{int(time.time() * 1000)}"
    
    task = CollaborationTask(
        id=task_id,
        title=f"[委派] {request.task_description[:50]}",
        description=request.task_description,
        assignee=request.to_agent,
        priority=request.priority,
        created_at=datetime.now().isoformat()
    )
    
    _collab_tasks[task_id] = task
    
    # 记录消息
    _agent_messages.append({
        "type": "delegate",
        "from": request.from_agent,
        "to": request.to_agent,
        "task_id": task_id,
        "message": f"委派任务: {request.task_description}",
        "timestamp": datetime.now().isoformat()
    })
    
    return {
        "success": True,
        "task_id": task_id,
        "message": f"已向 {request.to_agent} 委派任务",
        "task": {
            "id": task.id,
            "title": task.title,
            "assignee": task.assignee,
            "status": task.status,
            "priority": task.priority
        }
    }


@router.post("/message")
async def send_agent_message(request: AgentMessageRequest):
    """Agent 间通讯 - VCP 分布式通讯"""
    
    _agent_messages.append({
        "type": request.message_type,
        "from": request.from_agent,
        "to": request.to_agent,
        "message": request.message,
        "metadata": request.metadata or {},
        "timestamp": datetime.now().isoformat()
    })
    
    return {
        "success": True,
        "message": f"消息已发送给 {request.to_agent}"
    }


@router.get("/tasks")
async def get_collaboration_tasks(
    status: Optional[str] = None,
    assignee: Optional[str] = None
):
    """获取协作任务列表"""
    tasks = list(_collab_tasks.values())
    
    if status:
        tasks = [t for t in tasks if t.status == status]
    if assignee:
        tasks = [t for t in tasks if t.assignee == assignee]
    
    return {
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "assignee": t.assignee,
                "status": t.status,
                "priority": t.priority,
                "created_at": t.created_at,
                "due_at": t.due_at,
                "result": t.result
            }
            for t in tasks
        ],
        "count": len(tasks)
    }


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, result: Dict[str, Any]):
    """完成任务"""
    if task_id not in _collab_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task = _collab_tasks[task_id]
    task.status = "completed"
    task.result = result
    
    # 通知原委派者
    _agent_messages.append({
        "type": "task_complete",
        "task_id": task_id,
        "result": result,
        "timestamp": datetime.now().isoformat()
    })
    
    return {"success": True, "message": "任务已完成"}


@router.get("/messages")
async def get_agent_messages(
    agent: Optional[str] = None,
    limit: int = 20
):
    """获取 Agent 通讯历史"""
    messages = _agent_messages
    
    if agent:
        messages = [m for m in messages if m.get("from") == agent or m.get("to") == agent]
    
    messages = messages[-limit:]
    
    return {"messages": messages, "count": len(messages)}


# ==================== 原有 Agent 映射 ====================
AGENT_MAPPING = {
    "taishige": {
        "backend_id": "memory",
        "name": "太史阁",
        "title": "历史记录与反思官",
        "avatar": "📚",
        "description": "负责记录所有操作、决策和结果，构建组织的集体记忆与经验库",
        "color": "from-blue-500 to-blue-600",
        "pixel_id": "taishige",
        "system_prompt": "你是「太史阁」，负责历史记录与反思。密卷房检索知识卡片后，你结合历史经验进行解读，为当前议题提供历史视角的参考。请基于【知识库参考卡片】提炼关键洞察。发言简洁有力，80字以内。"
    },
    "jinjiyu": {
        "backend_id": "risk_detector",
        "name": "锦衣卫",
        "title": "安全与情报收集官",
        "avatar": "🛡️",
        "description": "监控系统安全状态，识别潜在威胁和风险，收集内外部情报",
        "color": "from-red-500 to-red-600",
        "pixel_id": "xingyusi",
        "system_prompt": "你是「锦衣卫」，负责安全与情报收集。发言要简洁有力，80字以内。只输出风险点，禁止重复背景信息和角色描述。"
    },
    "tongzhengsi": {
        "backend_id": "fact_generator",
        "name": "通政司",
        "title": "信息与通讯中枢",
        "avatar": "📡",
        "description": "管理所有信息流，确保内外部通讯畅通，促进跨部门协作",
        "color": "from-green-500 to-green-600",
        "pixel_id": "tongzhengsi",
        "system_prompt": "你是「通政司」，负责信息与通讯中枢。密卷房和太史阁检索知识卡片后，你将卡片中的关键信息整理并传达给八府同仁，确保各部门掌握必要的知识背景。发言简洁有力，80字以内。"
    },
    "jianchayuan": {
        "backend_id": "interpreter",
        "name": "监察院",
        "title": "监督与审计官",
        "avatar": "🔍",
        "description": "监督各项操作和流程的执行情况，进行合规性审计",
        "color": "from-purple-500 to-purple-600",
        "pixel_id": "jianchayuan",
        "system_prompt": "你是「监察院」，负责监督与审计。你的职责是审视议题中的合规性、流程规范性，指出漏洞和改进空间。严格限制：必须用中文，60字以内，只说问题点，不要重复背景。"
    },
    "mijuanfang": {
        "backend_id": "preprocessor",
        "name": "密卷房",
        "title": "知识库与档案管理员",
        "avatar": "📂",
        "description": "专门负责非结构化知识的整理、归档、索引和检索",
        "color": "from-indigo-500 to-indigo-600",
        "pixel_id": "mijuanfang",
        "system_prompt": "你是「密卷房」，负责知识库与档案管理。你的职责是从知识库中检索相关资料，将检索到的卡片内容提炼后汇报给通政司分发。严格限制：必须用中文，60字以内，直接引用卡片中的关键事实。"
    },
    "chengxiangfu": {
        "backend_id": "action_advisor",
        "name": "丞相府",
        "title": "战略规划与决策官",
        "avatar": "🏛️",
        "description": "制定战略规划，提供高层决策建议，协调各方资源",
        "color": "from-yellow-500 to-yellow-600",
        "pixel_id": "canmousi",
        "system_prompt": "你是「丞相府」，负责战略规划与决策。你的职责是从战略高度分析议题，提出可执行的方案和建议。严格限制：必须用中文，60字以内，只说方案要点，不要重复背景。"
    },
    "junjichu": {
        "backend_id": "messenger",
        "name": "军机处",
        "title": "执行与协调官",
        "avatar": "⚔️",
        "description": "负责任务执行、跨部门协调和进度跟踪",
        "color": "from-orange-500 to-orange-600",
        "pixel_id": "yichuansi",
        "system_prompt": "你是「军机处」，负责执行与协调。你的职责是将讨论成果转化为具体执行计划，明确分工和时间节点。严格限制：必须用中文，60字以内，只说执行要点，不要重复背景。"
    },
    "zhihuishi": {
        "backend_id": "orchestrator",
        "name": "指挥使",
        "title": "总指挥与裁决官",
        "avatar": "👑",
        "description": "统筹全局，做出最终裁决，确保各方协同高效运转",
        "color": "from-teal-500 to-teal-600",
        "pixel_id": "orchestrator",
        "system_prompt": "你是「指挥使」，负责总指挥与最终裁决。你的职责是综合各方意见，做出最终决策，明确下一步行动方向。严格限制：必须用中文，60字以内，只说决策要点，不要重复背景。"
    }
}

import re

# ==================== 四色卡片提取函数 ====================

async def _extract_color_cards(agent_id: str, agent_name: str, speech: str, topic: str) -> list:
    """
    从 Agent 发言中提取四色卡片
    返回: [{card_type, title, content, explore_status}]
    """
    if not speech or len(speech) < 50:
        return []
    
    try:
        import re
        # 改进的 system_prompt，强调生成有意义的卡片
        system_prompt = """你是四色卡片分类专家。你的任务是从讨论发言中提炼出有价值的知识卡片。

【卡片类型定义】
- 蓝色(事实/Fact): 客观数据、历史案例、具体事件、定义、统计结果
- 绿色(解释/Explain): 原理说明、原因分析、背景知识、逻辑关系
- 黄色(风险/Risk): 潜在问题、隐患、失败案例、威胁因素
- 红色(行动/Action): 行动建议、解决方案、改进措施、决策结论

【核心要求】
1. 生成的卡片必须有实质内容，不能是单个词语
2. title 要简洁但有意义，15字以内
3. content 必须是完整的句子或段落，20字以上，表达一个完整的观点
4. 每个卡片必须包含具体的信息，不是泛泛而谈

【禁止】
- 单个词语或短语（如 "useEffect"、"IntersectionObserver"）
- 太宽泛的内容（如 "这是一个重要的问题"）
- 少于20字的内容

【正确示例】
[{"type": "blue", "title": "SSE断连恢复机制", "content": "通过meetingSessionId跟踪会议会话，页面返回时可从sessionStorage恢复状态"},
 {"type": "red", "title": "状态覆盖风险", "content": "服务端历史状态可能覆盖本地已恢复的数据，导致用户看到不一致的内容"}]

【错误示例 - 禁止】
[{"type": "blue", "title": "useEffect", "content": "React Hook"},
 {"type": "red", "title": "key", "content": "依赖数组"}]"""
        
        user_prompt = f"""从以下讨论发言中提炼出2-3个最有价值的知识卡片。

【会议主题】
{topic}

【{agent_name}的发言】
{speech[:600]}

【要求】
- 生成2-3张有实质内容的卡片
- 每张卡片要表达一个完整的观点
- title不超过15字，content不少于20字
- 严格按照JSON数组格式输出，只输出JSON"""

        logger.info(f"[_extract_color_cards] 开始提取 | agent={agent_name} | speech长度={len(speech)}")
        
        result = await call_llm(system_prompt, user_prompt, max_tokens=600, agent_id=agent_id)
        
        if not result:
            logger.warning(f"[_extract_color_cards] LLM返回为空")
            return []
        
        logger.info(f"[_extract_color_cards] LLM原始返回: {result[:500]}")
        
        import json
        cleaned = re.sub(r'^```json\s*', '', result.strip())
        cleaned = re.sub(r'\s*```$', '', cleaned)
        cleaned = cleaned.strip()
        
        # 尝试解析 JSON：支持多数组拼接 + 合并所有数组
        cards = None
        
        # 方法1：用 raw_decode 提取第一个完整 JSON 对象/数组
        try:
            parsed, idx = json.JSONDecoder().raw_decode(cleaned)
            if isinstance(parsed, list):
                cards = parsed
                # 如果 raw_decode 结束后还有剩余内容（多数组拼接），尝试提取剩余数组并合并
                remainder = cleaned[idx:].strip()
                while remainder.startswith('[') or remainder.startswith(','):
                    # 跳过可能的逗号/换行，找到下一个 [
                    next_arr_start = re.search(r'\[', remainder)
                    if not next_arr_start:
                        break
                    remainder = remainder[next_arr_start.start():]
                    try:
                        extra, idx2 = json.JSONDecoder().raw_decode(remainder)
                        if isinstance(extra, list):
                            cards.extend(extra)
                            remainder = remainder[idx2:].strip()
                        else:
                            break
                    except json.JSONDecodeError:
                        break
        except json.JSONDecodeError:
            cards = None
        
        # 方法2（备选）：正则精确提取 JSON 数组（处理多数组拼接情况）
        if cards is None:
            all_arrays = re.findall(r'\[\s*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[\s\S]*?\])\s*\]', cleaned)
            if all_arrays:
                merged = []
                for arr_str in all_arrays:
                    try:
                        merged.extend(json.loads(arr_str))
                    except json.JSONDecodeError:
                        pass
                if merged:
                    cards = merged
        
        # 方法3（兜底）：find + rfind 找最大 JSON 数组
        if cards is None:
            first = cleaned.find('[')
            last = cleaned.rfind(']')
            if first != -1 and last > first:
                try:
                    candidate = cleaned[first:last+1]
                    # 多数组拼接：提取所有 [...] 块分别解析再合并
                    parts = re.findall(r'\[[\s\S]*?\]', candidate)
                    merged = []
                    for p in parts:
                        try:
                            merged.extend(json.loads(p))
                        except json.JSONDecodeError:
                            pass
                    if merged:
                        cards = merged
                    else:
                        cards = json.loads(candidate)
                except json.JSONDecodeError:
                    pass
        
        if cards is None:
            logger.error(f"[_extract_color_cards] 未找到有效JSON数组或解析失败")
            logger.error(f"[_extract_color_cards] 清理后的内容: {cleaned[:200]}")
            return []
        
        # 验证格式是否正确
        if not isinstance(cards, list):
            logger.error(f"[_extract_color_cards] 解析结果不是数组，而是: {type(cards).__name__}")
            logger.error(f"[_extract_color_cards] 实际内容: {cards}")
            logger.error(f"[_extract_color_cards] 可能LLM返回了错误的JSON格式")
            return []
        
        # 验证每个卡片的字段
        valid_cards = []
        for i, card in enumerate(cards):
            if not isinstance(card, dict):
                logger.warning(f"[_extract_color_cards] 第{i+1}个元素不是对象: {type(card).__name__}")
                continue
            
# 类型标准化映射：中文 type → 英文 color；优先用 color 字段
            raw_type = card.get('type', '')
            raw_color = card.get('color', '')
            _TYPE_MAP = {'风险': 'red', '动力': 'red', '行动': 'red', '决策': 'red',
                         '解释': 'green', '分析': 'green', '背景': 'green',
                         '事实': 'blue', '数据': 'blue', '关键教训': 'blue',
                         '风险点': 'yellow', '警告': 'yellow', '隐患': 'yellow'}
            if raw_color in ('blue', 'green', 'yellow', 'red'):
                card_type = raw_color
            elif raw_type in ('blue', 'green', 'yellow', 'red'):
                card_type = raw_type
            elif raw_type in _TYPE_MAP:
                card_type = _TYPE_MAP[raw_type]
            else:
                card_type = ''
            card_title = card.get('title', '')
            card_content = card.get('content') or card.get('description') or card.get('text', '')

            if not card_type:
                # 根据 Agent 角色推断默认类型
                _AGENT_TYPE_FALLBACK = {
                    'mijuanfang': 'blue', 'taishige': 'blue',
                    'tongzhengsi': 'blue',
                    'jinjiyu': 'yellow', 'jianchayuan': 'yellow',
                    'chengxiangfu': 'red', 'junjichu': 'red', 'zhihuishi': 'red',
                }
                card_type = _AGENT_TYPE_FALLBACK.get(agent_id, 'blue')
                logger.warning(f"[_extract_color_cards] 第{i+1}个卡片缺少type/color，使用Agent默认类型: {card_type}")

            if card_type not in ('blue', 'green', 'yellow', 'red'):
                logger.warning(f"[_extract_color_cards] 第{i+1}个卡片type无效: {card_type}")
                continue

            if not card_content:
                logger.warning(f"[_extract_color_cards] 第{i+1}个卡片缺少content/description/text字段")
                continue

            # 过滤无效内容：太短或只有单词的卡片没有保存价值
            if len(card_content) < 15:
                logger.warning(f"[_extract_color_cards] 第{i+1}个卡片content太短: '{card_content[:30]}...'")
                continue
            if len(card_title) < 3:
                logger.warning(f"[_extract_color_cards] 第{i+1}个卡片title太短: '{card_title}'")
                continue
            # 过滤只有英文单词的标题（通常是关键词而非标题）
            if re.match(r'^[a-zA-Z\s]+$', card_title) and len(card_title) < 8:
                logger.warning(f"[_extract_color_cards] 第{i+1}个卡片title是英文单词: '{card_title}'")
                continue
            if not card_title:
                card_title = card_content[:15] + ('...' if len(card_content) > 15 else '')
            
            valid_cards.append({
                "type": card_type,
                "title": card_title,
                "content": card_content
            })
        
        if valid_cards:
            logger.info(f"[_extract_color_cards] 解析成功，有效卡片数量: {len(valid_cards)}")
            logger.info(f"[_extract_color_cards] 第一张卡片: {valid_cards[0]}")
            for card in valid_cards:
                card['explore_status'] = 'pending'
            return valid_cards
        else:
            logger.error(f"[_extract_color_cards] 所有卡片都无效，可能是LLM返回格式错误")
            return []
    except Exception as e:
        logger.error(f"提取四色卡片失败: {e}")
        import traceback
        logger.error(traceback.format_exc())
    
    return []


async def _analyze_consensus_divergence(all_speeches: list, topic: str) -> dict:
    """
    分析所有 Agent 发言，识别共识、分歧和独家观点
    返回: {consensus, divergence, unique, diagnosis_report}
    """
    if not all_speeches or len(all_speeches) < 3:
        return {"consensus": [], "divergence": [], "unique": [], "diagnosis_report": ""}
    
    # 构建分析文本
    speeches_text = "\n".join([
        f"【{s['agent_name']}】{s['speech'][:100]}" 
        for s in all_speeches
    ])
    
    system_prompt = """你是一个多视角分析系统，负责分析多个专家的观点并诊断。
你的任务：
1. 识别共识点（多数人认可的观点）
2. 识别分歧点（不同观点）
3. 识别独家观点（仅1-2人提出的独特洞察）

输出格式（严格按以下JSON）：
{
  "consensus": ["共识点1", "共识点2"],
  "divergence": [{"issue": "分歧问题", "views": {"角色1": "观点", "角色2": "观点"}}],
  "unique": [{"agent": "角色名", "insight": "独家洞察"}],
  "diagnosis_report": "结构化诊断报告，包含以上分析和建议"
}"""
    
    user_prompt = f"""分析以下{len(all_speeches)}位专家的发言：

{speeches_text}

主题：{topic}

请严格按JSON格式输出分析结果："""
    
    try:
        result = await call_llm(system_prompt, user_prompt, max_tokens=500, agent_id="zhihuishi")
        
        if result:
            import json
            import re
            # 移除 markdown 代码块
            cleaned = re.sub(r'^```json\s*', '', result.strip())
            cleaned = re.sub(r'\s*```$', '', cleaned)
            cleaned = cleaned.strip()
            
            start = cleaned.find('{')
            end = cleaned.rfind('}') + 1
            if start >= 0 and end > start:
                diagnosis = json.loads(cleaned[start:end])
                return diagnosis
    except Exception as e:
        logger.error(f"共识分歧分析失败: {e}")
    
    return {"consensus": [], "divergence": [], "unique": [], "diagnosis_report": ""}


# ==================== 工具函数 ====================

def _compress_round_discussion(speeches: list) -> str:
    """压缩一轮讨论，提炼关键信息供下一轮使用"""
    if not speeches or len(speeches) < 2:
        return ""
    
    # 只取最后8条发言
    recent = speeches[-8:]
    lines = []
    for s in recent:
        name = s.get("agent_name", "")
        speech = s.get("speech", "")[:80]
        if speech:
            lines.append(f"{name}: {speech}")
    
    if not lines:
        return ""
    
    # 用换行连接，每条不超过80字
    return " | ".join(lines[:4])


def _build_speeches_context(all_speeches: list, current_agent: str = None) -> str:
    """
    构建包含所有 Agent 发言的上下文，让每个 Agent 能看到其他人的发言
    用于让 Agent 基于自己的视角发表观点，而不是盲目重复
    """
    if not all_speeches:
        return ""
    
    # 按角色分组显示
    role_groups = {}
    for s in all_speeches:
        name = s.get("agent_name", "未知")
        speech = s.get("speech", "")
        if speech:
            role_groups[name] = speech
    
    if not role_groups:
        return ""
    
    lines = ["\n=== 本轮其他专家的观点 ==="]
    for name, speech in role_groups.items():
        # 跳过自己的发言
        if current_agent and current_agent.lower() in name.lower():
            continue
        # 只显示核心观点，避免重复
        core = speech[:100] + "..." if len(speech) > 100 else speech
        lines.append(f"【{name}】: {core}")
    
    return "\n".join(lines)


def clean_speech_text(text: str) -> str:
    """清理speech中的无意义标记和提示词残留"""
    if not text:
        return ""
    
    # 1. 移除HTML标签
    text = re.sub(r'<[^>]+>', '', text)
    
    # 2. 移除AI标记
    text = re.sub(r'<\|im_end\|>', '', text)
    text = re.sub(r'<\|im_start\|>[^<]*', '', text)
    
    # 3. 移除 "--- 讨论记录结束 ---" 之后的内容
    end_marker = "--- 讨论记录结束 ---"
    if end_marker in text:
        idx = text.find(end_marker)
        after = text[idx + len(end_marker):].strip()
        # 移除"重要："开头的提示
        if after.startswith("重要："):
            first_period = after.find("。")
            if first_period > 0:
                after = after[first_period + 1:].strip()
        text = after
    
    # 4. 移除 "_ assistant" 标记及其后内容
    if "_ assistant" in text:
        idx = text.find("_ assistant")
        text = text[:idx].strip()
    
    # 5. 移除角色描述（多智能体提示词残留）
    role_keywords = ["太史阁\n历史记录与反思官", "锦衣卫\n安全与情报收集官", 
                     "东厂\n信息分析与预警官", "西厂\n决策支持与建议官", "内阁\n统筹协调与决策官"]
    for keyword in role_keywords:
        if keyword in text:
            idx = text.find(keyword)
            text = text[:idx].strip()
    
    # 6. 移除 "你是「" 开头的角色描述
    if "你是「" in text:
        idx = text.find("你是「")
        prev_newline = text.rfind('\n', 0, idx)
        if prev_newline > 0:
            text = text[:prev_newline].strip()
        else:
            text = text[:idx].strip()
    
    # 7. 移除多余空白
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
    
    return text


def search_related_cards(query: str, limit: int = 10) -> tuple:
    """
    根据会议主题搜索相关知识卡片
    返回: (格式化字符串, 卡片列表)
    """
    try:
        from routes import vector_search
        vector_search.set_db_manager(get_db_manager())
        
        # 使用混合搜索
        results = vector_search.search_hybrid(query, limit=min(limit, 15))
        
        if not results:
            results = vector_search.fallback_keyword_search(query, limit=min(limit, 15))
        
        if not results:
            return "", []
        
        # 卡片列表，用于返回给前端
        card_list = []
        
        output = []
        output.append("\n\n=== 📚 相关知识库参考 ===")
        for i, r in enumerate(results, 1):
            card_id = f"db_{r.id}"
            card_list.append({
                "card_id": card_id,
                "id": r.id,
                "title": r.title,
                "card_type": r.card_type,
                "content": r.content[:200] if r.content else "",
                "similarity": r.score
            })
            content = r.content[:150] + '...' if len(r.content) > 150 else r.content
            output.append(f"【{i}】{r.title} (相似度: {r.score:.2f})")
            output.append(f"    📎 查看: http://localhost:3000/cards/{card_id}")
            if content:
                output.append(f"    摘要: {content}")
            output.append("")
        
        return "\n".join(output), card_list
        
    except Exception as e:
        logger.error(f"搜索失败: {e}")
        return "", []
        logger.warning(f"搜索知识库失败: {e}")
        return ""


# ==================== 视觉模型调用 ====================

async def _analyze_image_for_meeting(image_base64: str, topic: str) -> Optional[str]:
    """
    使用视觉模型分析图片，降级策略：
    外部视觉模型(8910) → 返回None
    
    注意：不调用自身的 HTTP 接口（会死锁），不在 async 中直接调用 NPU 推理。
    """
    import tempfile
    import base64 as b64mod
    
    # 保存临时文件
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            tmp_file.write(b64mod.b64decode(image_base64))
            tmp_file_path = tmp_file.name
    except Exception as e:
        logger.error(f"保存临时图片失败: {e}")
        return None
    
    try:
        # 方式1: 外部视觉模型服务（端口8910，独立进程）
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "http://127.0.0.1:8910/v1/chat/completions",
                    json={
                        "model": "qwen2.5vl3b-8380-2.42",
                        "messages": [
                            {"role": "user", "content": [
                                {"type": "text", "text": f"请详细描述这张图片的内容，重点关注与「{topic}」相关的信息，提取关键事实和数据。"},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                            ]}
                        ],
                        "size": 512,
                        "temp": 0.7,
                        "top_k": 40,
                        "top_p": 0.9
                    },
                    timeout=60.0
                )
                if response.status_code == 200:
                    result = response.json()
                    content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if content:
                        logger.info(f"[Meeting] 视觉模型(8910)分析成功: {len(content)}字")
                        return content.strip()
        except Exception as e:
            logger.debug(f"[Meeting] 外部视觉服务(8910)不可用: {e}")

            try:
                os.unlink(tmp_file_path)
            except Exception:
                pass

    except Exception:
        logger.debug("[Meeting] 视觉服务(8910)响应异常")

    logger.info("[Meeting] 视觉分析全部不可用")
    return None


# ==================== LLM 调用 ====================

# 全局降级状态：如果某层失败，标记时间戳，短时间内不再尝试
_degrade_state = {
    "vision_last_fail": 0,     # Genie 上次失败时间
    "skip_vision_until": 0,    # 跳过 Genie 直到该时间
}
_DEGRADE_COOLDOWN = 30  # 降级冷却时间（秒），失败后跳过该层这么久


def _is_valid_genie_content(content: str) -> bool:
    """验证Genie返回内容是否有效（排除错误响应）"""
    if not content or len(content) <= 5:
        return False
    _error_markers = ['[E]', '[ERROR]', '[error]', 'connection has been broken',
                      'ConnectionError', 'connection refused', 'Connection refused',
                      'Internal Server Error', '500', 'Bad Gateway', '502',
                      'Service Unavailable', '503']
    for marker in _error_markers:
        if marker in content:
            logger.warning(f"[Meeting] Genie内容包含错误标记'{marker}'，视为失败: {content[:100]}")
            return False
    return True


async def _call_genie(*, model_name: str, timeout_sec: float, max_chars: int,
                       system_prompt: str, user_prompt: str, max_tokens: int,
                       degrade_state: dict, scheduler, inference_start: float,
                       agent_id: str, layer: str) -> str | None:
    """调用 Genie HTTP（端口 8910），含速率控制 + 重试 + 冷却"""
    now = time.time()
    if not (now > degrade_state.get("skip_vision_until", 0)):
        logger.info(f"[Meeting] 层{layer} Genie({model_name}) 跳过（冷却中）")
        return None

    # 速率控制：至少间隔 1.2s
    _last = getattr(_call_genie, '_last_genie_call', 0.0)
    elapsed = now - _last
    if elapsed < 1.2:
        await asyncio.sleep(1.2 - elapsed)
    _call_genie._last_genie_call = time.time()

    # 连续失败计数器
    _consecutive_fails = getattr(_call_genie, '_consecutive_fails', 0)

    # 截断输入
    truncated_system = system_prompt[:300] if len(system_prompt) > 300 else system_prompt
    remaining = max_chars - len(truncated_system)
    truncated_user = user_prompt[:remaining] if len(user_prompt) > remaining else user_prompt
    if len(user_prompt) > remaining:
        logger.info(f"[Meeting] 层{layer} Genie输入截断({len(user_prompt)}→{remaining}字)")

    async def _do_call() -> str | None:
        async with httpx.AsyncClient(timeout=timeout_sec, limits=httpx.Limits(max_keepalive_connections=2, max_connections=4)) as client:
            response = await client.post(
                "http://127.0.0.1:8910/v1/chat/completions",
                json={
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": truncated_system},
                        {"role": "user", "content": truncated_user}
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.3,
                    "top_k": 40,
                    "top_p": 0.9
                }
            )
            response.raise_for_status()
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if _is_valid_genie_content(content):
                return content
            logger.warning(f"[Meeting] 层{layer} Genie响应无效: {repr(content[:80])}")
            return None

    # 首次请求
    genie_start = time.time()
    logger.info(f"[Meeting] 层{layer} Genie请求(model={model_name}, timeout={timeout_sec}s)")
    try:
        result = await _do_call()
        if result:
            elapsed = time.time() - genie_start
            logger.info(f"[Meeting] 层{layer} Genie({model_name}) 成功: {len(result)}字, 耗时{elapsed:.1f}s")
            _call_genie._consecutive_fails = 0  # 重置连续失败计数
            if scheduler:
                scheduler.record_inference(model_name, elapsed, True, agent_id=agent_id)
            return result
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 400:
            logger.warning(f"[Meeting] 层{layer} Genie 拒绝请求")
        elif e.response.status_code == 429:
            logger.warning(f"[Meeting] 层{layer} Genie 429限流，等待3秒重试...")
            await asyncio.sleep(3)
            try:
                result = await _do_call()
                if result:
                    elapsed = time.time() - genie_start
                    logger.info(f"[Meeting] 层{layer} Genie 重试成功: {len(result)}字, 耗时{elapsed:.1f}s")
                    if scheduler:
                        scheduler.record_inference(model_name, elapsed, True, agent_id=agent_id)
                    return result
            except Exception:
                pass
        else:
            logger.warning(f"[Meeting] 层{layer} Genie HTTP{e.response.status_code}: {e.response.text[:200]}")
    except httpx.ReadTimeout:
        logger.warning(f"[Meeting] 层{layer} Genie ReadTimeout(timeout={timeout_sec}s)，等待8秒重试...")
        await asyncio.sleep(8)
        try:
            result = await _do_call()
            if result:
                elapsed = time.time() - genie_start
                logger.info(f"[Meeting] 层{layer} Genie 超时重试成功: {len(result)}字, 耗时{elapsed:.1f}s")
                if scheduler:
                    scheduler.record_inference(model_name, elapsed, True, agent_id=agent_id)
                return result
        except httpx.HTTPStatusError as retry_e:
            if retry_e.response.status_code == 429:
                logger.warning(f"[Meeting] 层{layer} Genie 超时重试仍429，再等5秒最后尝试...")
                await asyncio.sleep(5)
                try:
                    result = await _do_call()
                    if result:
                        elapsed = time.time() - genie_start
                        logger.info(f"[Meeting] 层{layer} Genie 二次重试成功: {len(result)}字")
                        if scheduler:
                            scheduler.record_inference(model_name, elapsed, True, agent_id=agent_id)
                        return result
                except Exception:
                    pass
        except Exception:
            pass
    except Exception as e:
        logger.warning(f"[Meeting] 层{layer} Genie 不可用({type(e).__name__}): {e}")

    # 记录失败 + 连续失败冷却
    _consecutive_fails += 1
    _call_genie._consecutive_fails = _consecutive_fails
    degrade_state["vision_last_fail"] = time.time()
    if _consecutive_fails >= 2:
        degrade_state["skip_vision_until"] = time.time() + _DEGRADE_COOLDOWN
        logger.warning(f"[Meeting] 层{layer} Genie({model_name}) 连续失败{_consecutive_fails}次，进入冷却{_DEGRADE_COOLDOWN}s")
    if scheduler:
        scheduler.record_inference(model_name, time.time() - inference_start, False, agent_id=agent_id)
    return None


async def call_llm(system_prompt: str, user_prompt: str, timeout: float = 60.0, 
 agent_id: str = None, task_type: str = "analysis", max_tokens: int = 80, temperature: float = 0.7) -> str:
    """
    调用LLM生成回复，降级策略（按优先级排序）：
    层1: Genie HTTP qwen2.0-7b（中文最强）
    层2: Genie HTTP llama3.2-3b（快速备用）
    
    闭环三增强：集成智能资源调度器
    """
    _max_tokens = max_tokens  # 避免闭包捕获问题
    import time as _time
    now = _time.time()
    
    # 闭环三：尝试使用智能调度器选择模型
    scheduler = None
    try:
        from services.resource_scheduler import get_resource_scheduler
        scheduler = get_resource_scheduler()
    except ImportError:
        pass
    
    # 记录推理开始
    inference_start = _time.time()

    # ============ 层1: Genie HTTP qwen2.0-7b ============
    _genie_result = await _call_genie(
        model_name="qwen2.0-7b-ssd-8380-2.34",
        timeout_sec=120.0,
        max_chars=2000,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=_max_tokens,
        degrade_state=_degrade_state,
        scheduler=scheduler,
        inference_start=inference_start,
        agent_id=agent_id,
        layer="1"
    )
    if _genie_result is not None:
        return _genie_result

    # ============ 层2: Genie HTTP llama3.2-3b ============
    _genie_result = await _call_genie(
        model_name="llama3.2-3b-8380-qnn2.37",
        timeout_sec=90.0,
        max_chars=1000,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=_max_tokens,
        degrade_state=_degrade_state,
        scheduler=scheduler,
        inference_start=inference_start,
        agent_id=agent_id,
        layer="2"
    )
    if _genie_result is not None:
        return _genie_result

    logger.info("[Meeting] 所有LLM不可用，使用角色降级回复")
    
    # 闭环三：记录推理失败
    if scheduler:
        latency = _time.time() - inference_start
        scheduler.record_inference("fallback", latency, False, agent_id=agent_id)
    
    return ""


# ==================== 讨论模式 ====================
DISCUSSION_MODES = {
    "free": {
        "name": "自由讨论",
        "description": "各Agent自由发表观点，没有固定流程",
        "themes": [
            "问题分析与信息收集",
            "方案讨论与风险评估",
            "决策制定与行动计划",
            "深度论证与补充",
            "最终确认与总结"
        ]
    },
    "procon": {
        "name": "正反辩论",
        "description": "支持方vs反对方进行辩论",
        "themes": [
            "正方观点陈述",
            "反方观点陈述",
            "正方反驳",
            "反方反驳",
            "最终投票决策"
        ],
        "roles": ["pro", "con"]  # pro=支持, con=反对
    },
    "proscons": {
        "name": "利弊分析",
        "description": "分析议题的优点和缺点",
        "themes": [
            "优势分析",
            "劣势分析",
            "机会与威胁",
            "综合评估",
            "建议结论"
        ],
        "focus": ["advantage", "disadvantage", "opportunity", "threat", "summary"]
    },
    "expert": {
        "name": "专家会诊",
        "description": "不同专业角度分析",
        "themes": [
            "技术角度分析",
            "业务角度分析",
            "财务角度分析",
            "风险角度分析",
            "综合建议"
        ],
        "focus": ["technical", "business", "financial", "risk", "summary"]
    }
}


def _get_mode_themes(mode: str, round_num: int, total_rounds: int) -> tuple:
    """获取指定模式的讨论主题和焦点"""
    if mode not in DISCUSSION_MODES:
        mode = "free"
    
    mode_info = DISCUSSION_MODES[mode]
    themes = mode_info.get("themes", ["讨论"])
    
    theme = themes[min(round_num - 1, len(themes) - 1)]
    focus = mode_info.get("focus", [None])
    round_focus = focus[min(round_num - 1, len(focus) - 1)] if focus else None
    
    return theme, round_focus


def _build_agent_prompt(agent_info: dict, request_topic: str, context: str, 
                   mode: str, round_num: int, theme: str, round_focus: str,
                   all_speeches: list, compressed_summary: str) -> str:
    """根据讨论模式构建Agent的Prompt"""
    
    # 通用的上下文
    context_parts = [f"会议主题：{request_topic}"]
    if context:
        context_parts.append(f"背景信息：{context}")
    context_parts.append(f"当前是第{round_num}轮讨论，主题：{theme}")
    
    if compressed_summary:
        context_parts.append(f"\n--- 本轮讨论摘要（通政司整理）---")
        context_parts.append(compressed_summary)
        context_parts.append("--- 摘要结束 ---\n")
    
    # 添加模式特定的引导
    if mode == "procon":
        # 正反辩论模式
        if round_num % 2 == 1:
            context_parts.append("请从【支持方】角度分析，说明赞成的理由和优势。")
        else:
            context_parts.append("请从【反对方】角度分析，说明反对的理由和风险。")
    elif mode == "proscons":
        # 利弊分析模式
        if round_focus == "advantage":
            context_parts.append("请分析该议题的【优势/优点】，列出具体好处。")
        elif round_focus == "disadvantage":
            context_parts.append("请分析该议题的【劣势/缺点】，列出潜在问题。")
        elif round_focus == "opportunity":
            context_parts.append("请分析该议题的【机会】，列出可能的发展机遇。")
        elif round_focus == "threat":
            context_parts.append("请分析该议题的【威胁】，列出潜在风险。")
        elif round_focus == "summary":
            context_parts.append("请基于以上分析，给出【综合结论和建议】。")
    elif mode == "expert":
        # 专家会诊模式
        if round_focus == "technical":
            context_parts.append("请从【技术角度】分析，说明技术可行性和实现方案。")
        elif round_focus == "business":
            context_parts.append("请从【业务角度】分析，说明业务价值和用户需求。")
        elif round_focus == "financial":
            context_parts.append("请从【财务角度】分析，说明成本收益和投资回报。")
        elif round_focus == "risk":
            context_parts.append("请从【风险角度】分析，说明风险控制和应对措施。")
        elif round_focus == "summary":
            context_parts.append("请综合各专家意见，给出【最终建议】。")
    
    # 添加角色要求
    context_parts.append(f"\n请你以「{agent_info['name']}」的身份，针对当前议题发表观点。")
    context_parts.append("要求：简洁有力，100字以内，只输出观点，不要重复背景。")
    
    return "\n".join(context_parts)


# ==================== 请求/响应模型 ====================
class MeetingRequest(BaseModel):
    topic: str = Field(..., description="会议主题")
    context: str = Field(default="", description="背景信息")
    card_ids: List[str] = Field(default_factory=list, description="相关卡片ID")
    rounds: int = Field(default=3, ge=1, le=5, description="讨论轮数")
    image_data: Optional[str] = Field(default=None, description="Base64编码的图片数据（可选）")
    mode: str = Field(default="free", description="讨论模式: free/procon/proscons/expert")


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


# ==================== 人工干预混合查询模型 ====================

class HybridQuestionRequest(BaseModel):
    """人工干预：用户提问请求"""
    question: str = Field(..., description="用户问题")
    topic: str = Field(default="", description="会议主题（用于搜索上下文）")


class HybridQuestionResponse(BaseModel):
    """人工干预：混合查询响应（知识卡片 + LLM回答）"""
    answer: str
    cards: List[Dict[str, Any]] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)


class SaveCardRequest(BaseModel):
    """保存会议卡片到知识库的请求"""
    card: Dict[str, Any] = Field(..., description="卡片数据 {card_type, title, content}")
    meeting_id: str = Field(..., description="会议ID")
    topic: str = Field(default="", description="会议主题")


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


@router.get("/modes")
async def get_discussion_modes():
    """获取可用的讨论模式"""
    return {
        "modes": [
            {
                "id": mode_id,
                "name": mode_info["name"],
                "description": mode_info["description"],
                "themes": mode_info.get("themes", [])
            }
            for mode_id, mode_info in DISCUSSION_MODES.items()
        ],
        "default": "free"
    }


@router.get("/health")
async def meeting_health():
    """会议服务健康检查 - 使用 Genie LLM 真实响应"""
    llm_reply = None
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0, proxy=None) as client:
            resp = await client.post(
                "http://127.0.0.1:8910/v1/chat/completions",
                json={
                    "model": "qwen2.5vl3b-8380-2.42",
                    "messages": [{"role": "user", "content": "请回复OK"}],
                    "max_tokens": 5,
                    "temp": 0.1
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                llm_reply = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    except Exception as e:
        logger.warning(f"[Meeting] health LLM check failed: {e}")

    return {
        "status": "healthy",
        "llm_available": bool(llm_reply),
        "llm_reply": llm_reply,
        "agent_count": len(AGENT_MAPPING),
        "timestamp": datetime.now().isoformat()
    }


@router.get("/history")
async def get_meeting_history(limit: int = 50):
    """获取历史会议列表"""
    db = get_db_manager()
    meetings = db.get_all_meetings(limit=limit)
    return {
        "success": True,
        "count": len(meetings),
        "meetings": meetings
    }


@router.get("/history/{meeting_id}")
async def get_meeting_detail(meeting_id: str):
    """获取单个会议详情"""
    db = get_db_manager()
    meeting = db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="会议不存在")
    return {
        "success": True,
        "meeting": meeting
    }


@router.delete("/history/{meeting_id}")
async def delete_meeting_record(meeting_id: str):
    """删除会议记录"""
    db = get_db_manager()
    success = db.delete_meeting(meeting_id)
    if not success:
        raise HTTPException(status_code=404, detail="会议不存在")
    return {
        "success": True,
        "message": "会议记录已删除"
    }


# ==================== 闭环二：会议闭环API ====================

class MeetingLinkProjectRequest(BaseModel):
    """关联会议到专题"""
    meeting_id: str
    project_id: int


class MeetingExtractTasksRequest(BaseModel):
    """手动从会议提取任务"""
    meeting_id: str
    project_id: Optional[int] = None


class UserInterventionRequest(BaseModel):
    """用户干预请求 - 闭环二：增强会议交互"""
    meeting_id: str
    intervention_type: str = Field(..., description="干预类型: askFollowUp/provideAdditionalContext/adjustFocus/terminateBranch")
    content: str = Field(default="", description="干预内容")
    target_branch: Optional[str] = Field(default=None, description="终止分支: risk/explanation/action")


@router.post("/link-project")
async def link_meeting_to_project(request: MeetingLinkProjectRequest):
    """将会议关联到专题"""
    db = get_db_manager()
    meeting = db.get_meeting(request.meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="会议不存在")
    
    project = db.get_research_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="专题不存在")
    
    # 更新会议的 project_id
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE meetings SET project_id = ? WHERE meeting_id = ?", 
                         (request.project_id, request.meeting_id))
            conn.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"关联失败: {str(e)}")
    
    return {
        "success": True,
        "meeting_id": request.meeting_id,
        "project_id": request.project_id,
        "message": f"会议已关联到专题「{project['name']}」"
    }


@router.post("/intervene")
async def user_intervene(request: UserInterventionRequest):
    """闭环二：用户在会议中干预
    
    支持的干预类型：
    - askFollowUp: 追问某个问题
    - provideAdditionalContext: 提供额外上下文信息
    - adjustFocus: 调整分析方向
    - terminateBranch: 提前终止某个分析分支
    """
    valid_types = ['askFollowUp', 'provideAdditionalContext', 'adjustFocus', 'terminateBranch']
    if request.intervention_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"无效的干预类型，支持: {', '.join(valid_types)}")
    
    intervention = {
        "type": request.intervention_type,
        "content": request.content,
        "target_branch": request.target_branch,
        "timestamp": datetime.now().isoformat()
    }
    
    # 存储干预
    if request.meeting_id not in _user_interventions:
        _user_interventions[request.meeting_id] = []
    _user_interventions[request.meeting_id].append(intervention)
    
    # 记录到Agent通讯
    _agent_messages.append({
        "type": "user_intervention",
        "from": "user",
        "to": "all",
        "intervention": intervention,
        "timestamp": datetime.now().isoformat()
    })
    
    return {
        "success": True,
        "meeting_id": request.meeting_id,
        "intervention": intervention,
        "message": "干预已发送，将在下一轮讨论中生效"
    }


@router.get("/interventions/{meeting_id}")
async def get_meeting_interventions(meeting_id: str):
    """获取会议的用户干预历史"""
    interventions = _user_interventions.get(meeting_id, [])
    return {
        "meeting_id": meeting_id,
        "interventions": interventions,
        "total": len(interventions)
    }


@router.post("/extract-tasks")
async def extract_tasks_from_meeting(request: MeetingExtractTasksRequest):
    """手动从会议提取任务和卡片（如果自动提取失败或需要重新提取）"""
    db = get_db_manager()
    meeting = db.get_meeting(request.meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="会议不存在")
    
    action_items = meeting.get('action_items', [])
    if isinstance(action_items, str):
        try:
            action_items = json.loads(action_items)
        except:
            action_items = [action_items]
    
    summary = meeting.get('summary', '')
    decision = meeting.get('decision', '')
    topic = meeting.get('topic', '')
    
    created_tasks = _auto_create_tasks_from_meeting(db, request.meeting_id, action_items, request.project_id)
    created_cards = _auto_create_cards_from_meeting(db, request.meeting_id, topic, summary, decision, action_items, request.project_id)
    
    return {
        "success": True,
        "meeting_id": request.meeting_id,
        "created_tasks": len(created_tasks),
        "created_cards": len(created_cards),
        "tasks": [{"id": t.get("id"), "title": t.get("title", "")[:50]} for t in created_tasks if t],
        "cards": [{"id": c.get("id"), "title": c.get("title", "")[:50], "type": c.get("card_type", "")} for c in created_cards if c],
    }


@router.get("/history/{meeting_id}/autogen-status")
async def get_meeting_autogen_status(meeting_id: str):
    """查询会议的自动生成状态（已创建多少任务和卡片）"""
    db = get_db_manager()
    meeting = db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="会议不存在")
    
    # 查找来源于此会议的GTD任务
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, priority, is_completed FROM gtd_tasks 
            WHERE description LIKE ? AND source_type IN ('meeting', 'project')
        """, (f'%{meeting_id}%',))
        tasks = [dict(row) for row in cursor.fetchall()]
        
        # 查找来源于此会议的知识卡片
        cursor.execute("""
            SELECT id, title, card_type FROM knowledge_cards 
            WHERE category = '会议生成' AND title LIKE ?
        """, (f'%{meeting_id[:20]}%',))
        # 更宽松的搜索
        cursor.execute("""
            SELECT id, title, card_type FROM knowledge_cards 
            WHERE category = '会议生成'
        """)
        all_meeting_cards = [dict(row) for row in cursor.fetchall()]
    
    return {
        "meeting_id": meeting_id,
        "auto_generated_tasks": len(tasks),
        "auto_generated_cards": len(all_meeting_cards),
        "tasks": tasks[:10],
        "cards": all_meeting_cards[:10],
    }


# ==================== 闭环三：智能资源调度API ====================

@router.get("/resource/status")
async def get_resource_status():
    """获取NPU资源调度状态"""
    try:
        from services.resource_scheduler import get_resource_scheduler
        scheduler = get_resource_scheduler()
        return scheduler.get_npu_status()
    except ImportError:
        return {
            "is_available": True,
            "current_load": 0.0,
            "active_inferences": 0,
            "total_inferences": 0,
            "avg_latency": 0.0,
            "error_count": 0,
            "concurrency_limit": 4,
            "model_stats": {},
            "scheduler_available": False,
        }


@router.post("/resource/select-model")
async def select_optimal_model(
    task_type: str = "analysis",
    agent_id: Optional[str] = None,
    prompt_length: int = 0,
    has_image: bool = False,
    prefer_chinese: bool = True
):
    """智能选择最优模型"""
    try:
        from services.resource_scheduler import get_resource_scheduler
        scheduler = get_resource_scheduler()
        
        complexity = scheduler.estimate_complexity(
            task_type=task_type,
            agent_id=agent_id,
            prompt_length=prompt_length,
            has_image=has_image
        )
        
        model = scheduler.select_model(complexity, prefer_chinese=prefer_chinese)
        
        return {
            "selected_model": model.model_key,
            "complexity": complexity.value,
            "model_tier": model.tier.value,
            "max_tokens": model.max_tokens,
            "timeout": model.timeout,
            "concurrency_limit": scheduler.adjust_concurrency(),
        }
    except ImportError:
        return {
            "selected_model": "qwen2.0-7b",
            "complexity": "medium",
            "fallback": True,
        }


# ==================== 人工干预：混合查询（知识卡片 + LLM） ====================

@router.post("/hybrid-question", response_model=HybridQuestionResponse)
async def hybrid_question(request: HybridQuestionRequest):
    """
    人工干预时查询知识库卡片 + LLM 综合回答
    
    流程：
    1. 搜索知识库中与问题相关的卡片
    2. 将卡片内容作为知识上下文传递给 LLM
    3. LLM 综合生成回答，同时返回引用的卡片列表
    """
    answer = ""
    cards = []
    sources = []
    
    # 第一步：搜索相关知识卡片
    try:
        card_refs = search_cards_semantic(request.question, limit=5)
        
        if card_refs:
            # 构造 cards 列表（返回给前端展示）
            for ref in card_refs:
                cards.append({
                    "card_id": ref.card_id,
                    "card_type": ref.card_type,
                    "title": ref.title,
                    "content": ref.content,
                    "similarity": ref.similarity,
                    "color": ref.color
                })
                sources.append({
                    "card_id": ref.card_id,
                    "title": ref.title,
                    "similarity": ref.similarity
                })
            logger.info(f"[Meeting] 混合查询搜索到 {len(card_refs)} 张相关卡片")
    except Exception as e:
        logger.warning(f"[Meeting] 混合查询搜索卡片失败: {e}")
    
    # 第二步：使用 LLM 综合生成回答（将卡片内容作为知识上下文）
    try:
        # 构建知识上下文
        knowledge_context = ""
        if cards:
            knowledge_context = "\n\n参考知识库卡片内容：\n"
            for i, card in enumerate(cards, 1):
                knowledge_context += f"\n【{i}】{card['title']}\n{card['content']}\n"
        
        # LLM 系统提示
        system_prompt = """你是八府巡按的知识管理官。请根据提供的知识库卡片内容和会议主题，综合回答用户的问题。
要求：
1. 优先引用知识库中的事实和数据
2. 回答简洁有力，100字以内
3. 如果没有相关知识，如实告知并给出建议"""
        
        user_prompt = f"会议主题：{request.topic}\n\n用户问题：{request.question}{knowledge_context}"
        
        answer = await call_llm(system_prompt, user_prompt, max_tokens=150, agent_id="mijuanfang")
        
        if not answer:
            answer = f"关于「{request.question}」，目前知识库中暂无直接相关的卡片记录，建议补充相关知识后再讨论。"
    except Exception as e:
        logger.error(f"[Meeting] 混合查询LLM调用失败: {e}")
        answer = f"抱歉，处理您的问题时遇到技术问题。请稍后重试。"
    
    return HybridQuestionResponse(
        answer=answer,
        cards=cards,
        sources=sources
    )


@router.post("/cards/save")
async def save_meeting_card(request: SaveCardRequest):
    """将会议产出的卡片保存到知识库"""
    card = request.card
    card_type = card.get("card_type", "blue")
    title = card.get("title", "会议卡片")
    content = card.get("content", "")
    
    if not title.strip():
        raise HTTPException(status_code=400, detail="卡片标题不能为空")
    
    try:
        db = get_db_manager()
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO knowledge_cards (title, content, card_type, category, tags, related_cards, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                title[:100],
                content,
                card_type,
                '会议生成',
                json.dumps(['会议', request.topic[:20]]),
                json.dumps([]),
                datetime.now().isoformat()
            ))
            card_id = cursor.lastrowid
            conn.commit()
        
        logger.info(f"[Meeting] 会议卡片已保存: {title[:30]}... (id={card_id})")
        
        return {
            "success": True,
            "card_id": card_id,
            "message": f"卡片「{title}」已保存到知识库"
        }
    except Exception as e:
        logger.error(f"[Meeting] 保存会议卡片失败: {e}")
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")


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
        extracted_cards = []  # 累积所有提取的卡片，会议结束时统一保存

        for round_num in range(1, request.rounds + 1):
            theme = themes[min(round_num - 1, len(themes) - 1)]

            yield _sse_event("round_start", {
                "round": round_num,
                "theme": theme,
                "timestamp": datetime.now().isoformat()
            })
            await asyncio.sleep(0.1)

            round_speeches = []

            # ========== 每轮开始前：密卷房 + 太史阁 统一查询知识库卡片 ==========
            # 查询结果作为本轮所有 Agent 的共享背景信息，由通政司负责分发传达
            round_knowledge_context = ""
            try:
                db = get_db_manager()
                if db:
                    search_query = f"{request.topic} {request.context}" if request.context else request.topic
                    cards = db.search_cards(search_query, limit=8)
                    if cards:
                        lines = []
                        lines.append("【知识库参考卡片 — 密卷房/太史阁检索，通政司分发】")
                        lines.append(f"以下是与「{request.topic}」相关的知识卡片：")
                        for i, card in enumerate(cards, 1):
                            title = card.get('title', '无标题')
                            content = (card.get('content', '') or '')[:120]
                            card_type = card.get('card_type', '')
                            type_tag = {'blue': '事实', 'green': '解释', 'yellow': '风险', 'red': '行动'}.get(card_type, '')
                            lines.append(f"{i}. [{type_tag}] {title}：{content}...")
                        round_knowledge_context = "\n".join(lines)
                        logger.info(f"[Round {round_num}] 密卷房/太史阁检索到 {len(cards)} 条相关卡片，通政司即将分发")
            except Exception as e:
                logger.warning(f"[Round {round_num}] 知识库卡片检索失败: {e}")

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

                  # 构建上下文 — 使用完整人设提示词
                  role_question = {
                     "taishige": f"关于「{request.topic}」，从历史经验看最关键的教训是什么？",
                     "jinjiyu": f"关于「{request.topic}」，最大的风险点是什么？",
                     "tongzhengsi": f"关于「{request.topic}」，最值得通报的核心信息是什么？",
                     "jianchayuan": f"关于「{request.topic}」，流程中最大的漏洞是什么？",
                     "mijuanfang": f"关于「{request.topic}」，知识库中最重要的事实依据是什么？",
                     "chengxiangfu": f"关于「{request.topic}」，最可执行的战略建议是什么？",
                     "junjichu": f"基于以上知识库信息，关于「{request.topic}」的具体执行计划和分工是什么？",
                     "zhihuishi": f"关于「{request.topic}」，综合裁决和下一步行动是什么？",
                 }.get(agent_id, f"关于「{request.topic}」，你的观点是什么？")

                 context_parts = [
                     f"[{agent_info['name']}]{role_question}",
                     f"主题：{request.topic}",
                 ]
                 if request.context:
                     context_parts.append(f"背景：{request.context[:150]}")
                 context_parts.append(f"第{round_num}轮·{theme}")

                 # 注入知识库卡片背景信息
                 if round_knowledge_context:
                     context_parts.append(f"\n{round_knowledge_context}\n")

                 user_prompt = "\n".join(context_parts)

                 # 闭环二：注入用户干预
                 pending_interventions = _user_interventions.get(meeting_id, [])
                 if pending_interventions:
                     intervention_texts = []
                     for iv in pending_interventions:
                         if iv["type"] == "askFollowUp":
                             intervention_texts.append(f"【用户追问】{iv['content']}")
                         elif iv["type"] == "provideAdditionalContext":
                             intervention_texts.append(f"【用户提供额外信息】{iv['content']}")
                         elif iv["type"] == "adjustFocus":
                             intervention_texts.append(f"【用户调整方向】请将讨论重心转向：{iv['content']}")
                         elif iv["type"] == "terminateBranch":
                             branch_name = {"risk": "风险分析", "explanation": "深度解释", "action": "行动方案"}.get(iv.get("target_branch", ""), "该分支")
                             intervention_texts.append(f"【用户终止分支】请跳过{branch_name}的讨论，转向其他方面")
                     if intervention_texts:
                         user_prompt += "\n\n--- 用户干预 ---\n" + "\n".join(intervention_texts) + "\n--- 干预结束 ---\n"
                     # 清除已处理的干预
                     _user_interventions[meeting_id] = []

                 # 每个 Agent 的角色专属约束 — 只追加输出格式要求
                 role_hints = {
                     "taishige": "\n直接回答，50字以内。",
                     "jinjiyu": "\n只说风险点，50字以内。",
                     "tongzhengsi": "\n只说核心信息，50字以内。",
                     "jianchayuan": "\n只说漏洞，40字以内。",
                     "mijuanfang": "\n引用卡片事实，40字以内。",
                     "chengxiangfu": "\n只说建议，40字以内。",
                     "junjichu": "\n列出分工和时间，50字以内。",
                     "zhihuishi": "\n只说决策和下一步，60字以内。",
                 }
                 user_prompt += role_hints.get(agent_id, "\n直接回答，40字以内。")

                 # 如果有图片数据，仅密卷房使用视觉模型分析
                 if agent_id == "mijuanfang" and request.image_data:
                     try:
                         vision_result = await _analyze_image_for_meeting(request.image_data, request.topic)
                         if vision_result:
                             user_prompt += f"\n\n【图片分析结果】{vision_result}"
                             logger.info(f"密卷房视觉分析成功: {len(vision_result)}字")
                     except Exception as e:
                         logger.warning(f"密卷房视觉分析失败: {e}")

                  # 使用完整人设调用LLM
                  # 使用心跳包装：LLM等待期间每5秒发送心跳，防止连接超时断开
                  llm_task = asyncio.create_task(call_llm(agent_info["system_prompt"], user_prompt, max_tokens=150))
                 speech_content = None
                 try:
                     while not llm_task.done():
                         done, _ = await asyncio.wait({llm_task}, timeout=5.0)
                         if done:
                             speech_content = llm_task.result()
                             break
                         # LLM还在思考，发送心跳保持连接
                         yield _sse_heartbeat()
                 except Exception as e:
                     logger.warning(f"[Meeting] LLM调用异常: {e}")
                 finally:
                     if not llm_task.done():
                         llm_task.cancel()
                         try:
                             await llm_task
                         except asyncio.CancelledError:
                             pass

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
                 await asyncio.sleep(0.3)

                 # 提取四色卡片并推送前端（发言 > 30 字才提取）
                 if len(speech_content) > 30:
                      try:
                          extracted = await _extract_color_cards(
                              agent_id, agent_info["name"], speech_content, request.topic
                          )
                          if extracted:
                              # 收集卡片，后续统一保存
                              extracted_cards.extend(extracted)
                              
                              yield _sse_event("agent_cards", {
                                  "agent_id": agent_id,
                                  "agent_name": agent_info["name"],
                                  "round": round_num,
                                  "cards": [
                                      {
                                          "card_type": c.get("type", "blue"),
                                          "title": c.get("title", ""),
                                          "content": c.get("content", ""),
                                          "round": round_num
                                      }
                                      for c in extracted
                                  ]
                              })
                              logger.info(f"[Meeting] agent_cards: {agent_info['name']} → {len(extracted)}张卡片")
                      except Exception as e:
                          logger.error(f"[Meeting] agent_cards提取失败: {e}")

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
        # 决策生成也加心跳保护
        llm_task = asyncio.create_task(call_llm(decision_system, "\n".join(decision_prompt_parts)))
        decision_text = None
        try:
            while not llm_task.done():
                done, _ = await asyncio.wait({llm_task}, timeout=5.0)
                if done:
                    decision_text = llm_task.result()
                    break
                yield _sse_heartbeat()
        except Exception as e:
            logger.warning(f"[Meeting] 决策LLM调用异常: {e}")
        finally:
            if not llm_task.done():
                llm_task.cancel()

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

        # 分析共识/分歧/独家观点
        diagnosis = {"consensus": [], "divergence": [], "unique": [], "diagnosis_report": ""}
        try:
            diagnosis = await _analyze_consensus_divergence(all_speeches, request.topic)
            yield _sse_event("diagnosis", diagnosis)
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"共识分歧分析失败: {e}")

        end_time = time.time()
        duration = end_time - start_time

        # 保存会议记录到数据库
        try:
            db = get_db_manager()
            db.save_meeting(
                meeting_id=meeting_id,
                topic=request.topic,
                context=request.context,
                card_ids=request.card_ids,
                rounds=request.rounds,
                participants=[info["name"] for info in AGENT_MAPPING.values()],
                summary=summary,
                decision=decision,
                action_items=action_items,
                all_speeches=all_speeches,
                all_rounds=all_rounds,
                start_time=datetime.fromtimestamp(start_time).isoformat(),
                end_time=datetime.fromtimestamp(end_time).isoformat(),
                duration_seconds=round(duration, 2)
            )
            logger.info(f"会议记录已保存: {meeting_id}")
        except Exception as e:
            logger.error(f"保存会议记录失败: {e}")

        # 闭环零：保存会议过程中提取的卡片（agent_cards）
        if extracted_cards:
            try:
                saved_agent_cards = []
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    # 去重（根据 title 和 content）
                    seen = set()
                    for card in extracted_cards:
                        key = f"{card.get('title', '')}|{card.get('content', '')}"
                        if key in seen:
                            continue
                        seen.add(key)
                        
                        try:
                            cursor.execute("""
                                INSERT INTO knowledge_cards (title, content, card_type, category, project_id, tags, related_cards, explore_status, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                card.get('title', '无标题')[:100],
                                card.get('content', ''),
                                card.get('type', 'blue'),
                                '会议提取',
                                request.card_ids[0] if request.card_ids else None,
                                json.dumps(['会议', '自动提取', 'Agent生成']),
                                json.dumps([]),
                                'pending',
                                datetime.now().isoformat()
                            ))
                            saved_agent_cards.append(cursor.lastrowid)
                        except Exception as card_err:
                            logger.warning(f"保存Agent卡片失败: {card_err}")
                    
                    if saved_agent_cards:
                        conn.commit()
                        logger.info(f"[Meeting] 保存了 {len(saved_agent_cards)} 张Agent提取的卡片")
                        
                if saved_agent_cards:
                    yield _sse_event("meeting_agent_cards_saved", {
                        "meeting_id": meeting_id,
                        "card_count": len(saved_agent_cards),
                        "card_ids": saved_agent_cards,
                        "timestamp": datetime.now().isoformat()
                    })
            except Exception as e:
                logger.error(f"保存Agent提取卡片失败: {e}")

        # 闭环二：自动从会议行动项创建GTD任务和知识卡片
        try:
            created_tasks = _auto_create_tasks_from_meeting(db, meeting_id, action_items)
            created_cards = _auto_create_cards_from_meeting(db, meeting_id, request.topic, summary, decision, action_items)
            if created_tasks or created_cards:
                yield _sse_event("meeting_autogen", {
                    "meeting_id": meeting_id,
                    "created_tasks": len(created_tasks),
                    "created_cards": len(created_cards),
                    "task_ids": [t.get('id') for t in created_tasks if t],
                    "card_ids": [c.get('id') for c in created_cards if c],
                    "timestamp": datetime.now().isoformat()
                })
        except Exception as e:
            logger.error(f"会议自动闭环失败: {e}")

        # 会议结束
        yield _sse_event("meeting_end", {
            "meeting_id": meeting_id,
            "topic": request.topic,
            "duration_seconds": round(duration, 2),
            "total_speeches": len(all_speeches),
            "rounds_completed": request.rounds,
            "timestamp": datetime.now().isoformat()
        })

    async def safe_event_generator():
        """带异常捕获的SSE生成器包装"""
        try:
            async for event in event_generator():
                yield event
        except Exception as e:
            logger.error(f"[Meeting] SSE流异常: {e}", exc_info=True)
            yield _sse_event("meeting_error", {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })

    return StreamingResponse(
        safe_event_generator(),
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
    支持讨论模式：free/procon/proscons/expert
    """
    start_time = time.time()
    meeting_id = f"meeting_{int(start_time * 1000)}"
    
    # 使用讨论模式
    mode = getattr(request, 'mode', 'free')
    if mode not in DISCUSSION_MODES:
        mode = "free"
    mode_info = DISCUSSION_MODES[mode]
    
    all_speeches = []
    all_rounds = []
    
    for round_num in range(1, request.rounds + 1):
        theme, round_focus = _get_mode_themes(mode, round_num, request.rounds)
        # 记录本轮引用的卡片
        round_cards = []
        round_speeches = []
        
        for agent_id, agent_info in AGENT_MAPPING.items():
            # 密卷房：自动搜索知识库
            card_reference = ""
            cards_referenced = []
            if agent_id == "mijuanfang":
                search_query = f"{request.topic} {request.context}" if request.context else request.topic
                result = search_related_cards(search_query, limit=5)
                if isinstance(result, tuple):
                    card_reference, cards_referenced = result
                else:
                    card_reference = result
                round_cards.extend(cards_referenced)
            
            # 通政司每轮压缩讨论要点
            compressed_summary = ""
            if all_speeches and agent_id != "tongzhengsi":
                compressed_summary = _compress_round_discussion(all_speeches)
            
            # 添加其他 Agent 的发言上下文，让每个 Agent 能看到其他人的观点
            speeches_context = ""
            if all_speeches and agent_id != "tongzhengsi":
                speeches_context = _build_speeches_context(all_speeches, agent_id)
            
            # 构建Prompt
            context_parts = _build_agent_prompt(
                agent_info, 
                request.topic, 
                request.context,
                mode,
                round_num,
                theme,
                round_focus,
                all_speeches,
                compressed_summary
            )
            
            if speeches_context:
                context_parts.append(speeches_context)
            
            if card_reference and agent_id == "mijuanfang":
                context_parts.append(f"\n{card_reference}")
            
            speech_content = await call_llm(agent_info["system_prompt"], context_parts)

            if not speech_content:
                speech_content = _generate_role_based_fallback(
                    agent_info, request.topic, theme, round_num, round_speeches
                )

            # 提取四色卡片（异步，不阻塞会议流程）
            extracted_cards = []
            try:
                extracted_cards = await _extract_color_cards(agent_id, agent_info["name"], speech_content, request.topic)
                # 保存提取的卡片到数据库
                if extracted_cards:
                    for card in extracted_cards:
                        try:
                            db = get_db_manager()
                            cursor = db.get_connection().cursor()
                            cursor.execute("""
                                INSERT INTO knowledge_cards (title, content, card_type, category, project_id, tags, related_cards, explore_status, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                card.get('title', '无标题')[:100],
                                card.get('content', ''),
                                card.get('type', 'blue'),
                                '会议提取',
                                None,
                                json.dumps(['会议自动提取', request.topic[:20]]),
                                json.dumps([]),
                                'pending',
                                datetime.now().isoformat()
                            ))
                            db.get_connection().commit()
                            logger.info(f"[Meeting] 四色卡片已存储: {card.get('title', '')[:30]}...")
                        except Exception as card_err:
                            logger.error(f"存储卡片失败: {card_err}")
            except Exception as e:
                logger.error(f"提取四色卡片失败: {e}")

            speech_obj = AgentSpeech(
                agent_id=agent_id,
                agent_name=agent_info["name"],
                agent_title=agent_info["title"],
                avatar=agent_info["avatar"],
                system_prompt=agent_info["system_prompt"],
                speech=speech_content,
                timestamp=datetime.now().isoformat(),
                cards_referenced=[c.get("card_id", "") for c in cards_referenced] if cards_referenced else []
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

    # 生成决策/总结 - 根据模式不同
    mode = getattr(request, 'mode', 'free')
    
    if mode == "procon":
        # 正反辩论模式 - 投票决策
        decision_prompt_parts = [
            f"会议主题：{request.topic}",
            f"【正方观点】", "",
        ]
        for s in all_speeches[:4]:
            decision_prompt_parts.append(f"【{s['agent_name']}】：{s['speech']}")
        decision_prompt_parts.extend([
            "", "【反方观点】", "",
        ])
        for s in all_speeches[4:]:
            decision_prompt_parts.append(f"【{s['agent_name']}】：{s['speech']}")
        decision_prompt_parts.extend([
            "", "请分析以上正反双方观点，给出：",
            "1. 投票结果建议",
            "2. 胜负分析",
            "3. 最终建议",
            "请用以下格式输出：", "【投票结果】正方:X票 反方:Y票", "【分析】...", "【建议】..."
        ])
        decision_system = "你是辩论裁判，负责分析正反双方观点并给出裁决。请严格按照格式输出。"
    elif mode == "proscons":
        # 利弊分析模式
        decision_prompt_parts = [
            f"会议主题：{request.topic}",
            f"经过{request.rounds}轮利弊分析讨论，以下是所有观点：", ""
        ]
        for s in all_speeches:
            decision_prompt_parts.append(f"【{s['agent_name']}】：{s['speech']}")
        decision_prompt_parts.extend([
            "", "请综合以上利弊分析，生成：",
            "1. 优势总结（2-3点）",
            "2. 劣势总结（2-3点）",
            "3. 最终建议（是否推荐实施）",
            "请用以下格式输出：", "【优势】1. ... 2. ... 3. ...", "【劣势】1. ... 2. ... 3. ...", "【建议】..."
        ])
        decision_system = "你是决策顾问，负责综合利弊分析给出建议。请严格按照格式输出。"
    elif mode == "expert":
        # 专家会诊模式
        decision_prompt_parts = [
            f"会议主题：{request.topic}",
            f"经过{request.rounds}轮专家会诊，以下是各专家意见：", ""
        ]
        for s in all_speeches:
            decision_prompt_parts.append(f"【{s['agent_name']}】（{s['agent_title']}）：{s['speech']}")
        decision_prompt_parts.extend([
            "", "请综合各专家意见，生成：",
            "1. 技术可行性评估",
            "2. 业务价值评估",
            "3. 风险评估",
            "4. 综合建议",
            "请用以下格式输出：", "【技术】...", "【业务】...", "【风险】...", "【建议】..."
        ])
        decision_system = "你是首席专家，负责综合各专业意见给出会诊结论。请严格按照格式输出。"
    else:
        # 自由讨论模式 - 默认
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

    # 分析共识/分歧/独家观点（异步）
    diagnosis = {"consensus": [], "divergence": [], "unique": [], "diagnosis_report": ""}
    try:
        diagnosis = await _analyze_consensus_divergence(all_speeches, request.topic)
    except Exception as e:
        logger.error(f"共识分歧分析失败: {e}")

    summary, decision, action_items = _parse_decision(decision_text, request.topic)

    end_time = time.time()

    # 保存会议记录到数据库
    try:
        db = get_db_manager()
        db.save_meeting(
            meeting_id=meeting_id,
            topic=request.topic,
            context=request.context,
            card_ids=request.card_ids,
            rounds=request.rounds,
            participants=[info["name"] for info in AGENT_MAPPING.values()],
            summary=summary,
            decision=decision,
            action_items=action_items,
            all_speeches=[{
                "agent_name": s["agent_name"],
                "agent_title": s["agent_title"],
                "system_prompt": s.get("system_prompt", ""),
                "speech": s["speech"]
            } for s in all_speeches],
            all_rounds=[{
                "round": r.round,
                "theme": r.theme,
                "speeches": [{
                    "agent_id": s.agent_id,
                    "agent_name": s.agent_name,
                    "agent_title": s.agent_title,
                    "speech": s.speech
                } for s in r.speeches]
            } for r in all_rounds],
            start_time=datetime.fromtimestamp(start_time).isoformat(),
            end_time=datetime.fromtimestamp(end_time).isoformat(),
            duration_seconds=round(end_time - start_time, 2)
        )
        logger.info(f"会议记录已保存: {meeting_id}")
    except Exception as e:
        logger.error(f"保存会议记录失败: {e}")

    # 闭环二：自动从会议行动项创建GTD任务和知识卡片
    autogen_result = {"tasks": [], "cards": []}
    try:
        autogen_result["tasks"] = _auto_create_tasks_from_meeting(db, meeting_id, action_items)
        autogen_result["cards"] = _auto_create_cards_from_meeting(db, meeting_id, request.topic, summary, decision, action_items)
    except Exception as e:
        logger.error(f"会议自动闭环失败: {e}")

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
        duration_seconds=round(end_time - start_time, 2),
        diagnosis=diagnosis
    )


# ==================== 辅助函数 ====================

def _auto_create_tasks_from_meeting(db, meeting_id: str, action_items: list, project_id: int = None):
    """闭环二：会议结束后自动从行动项创建GTD任务
    
    - 从会议 action_items 中提取任务
    - 自动创建 GTD 任务并关联到来源会议
    - 如果指定了 project_id，任务同时关联到专题
    """
    created_tasks = []
    
    for item in action_items:
        if not item or not isinstance(item, str) or len(item.strip()) < 2:
            continue
        
        # 简单的任务标题提取：取第一句或前50字符
        task_title = item.strip().split('\n')[0][:100]
        if len(task_title) < 2:
            continue
        
        # 检查是否已存在相同标题的任务（避免重复创建）
        try:
            existing_tasks = db.get_gtd_tasks()
            if any(t.get('title', '').strip() == task_title and t.get('source_type') == 'meeting' for t in existing_tasks):
                continue
        except:
            pass
        
        # 根据关键词推断优先级
        priority = 'medium'
        high_keywords = ['紧急', '立即', '尽快', '关键', '重要', '优先']
        low_keywords = ['可选', '后续', '待定', '参考']
        if any(kw in item for kw in high_keywords):
            priority = 'high'
        elif any(kw in item for kw in low_keywords):
            priority = 'low'
        
        try:
            source_type = 'project' if project_id else 'meeting'
            source_id = project_id if project_id else 0
            
            task = db.add_gtd_task(
                title=task_title,
                description=f"来源会议: {meeting_id}\n\n{item}",
                priority=priority,
                category='inbox',
                source_type=source_type,
                source_id=source_id
            )
            created_tasks.append(task)
            logger.info(f"自动从会议创建GTD任务: {task_title[:30]}...")
        except Exception as e:
            logger.error(f"自动创建GTD任务失败: {e}")
    
    return created_tasks


def _auto_create_cards_from_meeting(db, meeting_id: str, topic: str, summary: str, decision: str, action_items: list, project_id: int = None):
    """闭环二：会议结束后自动从决策生成知识卡片
    
    - 从会议 summary 生成蓝色(事实)卡片
    - 从会议 decision 生成绿色(解释)卡片
    - 从 action_items 中的风险相关项生成黄色(风险)卡片
    - 从 action_items 中的行动项生成红色(行动)卡片
    """
    created_cards = []
    
    card_data = []
    
    # 决策概要 → 绿色解释卡片
    if summary and len(summary.strip()) > 5:
        card_data.append({
            'title': f'[会议纪要] {topic[:30]}',
            'content': summary,
            'card_type': 'green',
        })
    
    # 决策内容 → 蓝色事实卡片
    if decision and len(decision.strip()) > 5:
        card_data.append({
            'title': f'[会议决策] {topic[:30]}',
            'content': decision,
            'card_type': 'blue',
        })
    
    # 行动项 → 红色行动卡片
    for item in action_items:
        if not item or not isinstance(item, str) or len(item.strip()) < 5:
            continue
        
        # 判断是风险还是行动
        risk_keywords = ['风险', '隐患', '挑战', '问题', '威胁', '注意']
        if any(kw in item for kw in risk_keywords):
            card_type = 'yellow'  # 风险卡片
            title_prefix = '[风险识别]'
        else:
            card_type = 'red'  # 行动卡片
            title_prefix = '[行动项]'
        
        card_data.append({
            'title': f'{title_prefix} {item[:50]}',
            'content': item,
            'card_type': card_type,
        })
    
    # 创建卡片
    for data in card_data:
        try:
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO knowledge_cards (title, content, card_type, category, project_id, tags, related_cards, explore_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    data['title'],
                    data['content'],
                    data['card_type'],
                    '会议生成',
                    project_id,
                    json.dumps(['会议', '自动生成']),
                    json.dumps([]),
                    'pending'
                ))
                card_id = cursor.lastrowid
                conn.commit()
                created_cards.append({**data, 'id': card_id})
                logger.info(f"自动从会议创建知识卡片: {data['title'][:30]}...")
        except Exception as e:
            logger.error(f"自动创建知识卡片失败: {e}")
    
    # 如果创建了多张卡片，自动建立同专题链接
    if len(created_cards) > 1 and project_id:
        for i, card1 in enumerate(created_cards):
            for card2 in created_cards[i+1:]:
                try:
                    db.add_backlink(card1['id'], card2['id'], '同专题会议', 'same_project')
                    db.add_backlink(card2['id'], card1['id'], '同专题会议', 'same_project')
                except:
                    pass
    
    return created_cards


def _sse_event(event_type: str, data: dict) -> str:
    """构造SSE事件字符串"""
    json_data = json.dumps(data, ensure_ascii=False)
    return f"event: {event_type}\ndata: {json_data}\n\n"


def _sse_heartbeat() -> str:
    """构造SSE心跳注释（浏览器会忽略SSE注释，但保持连接活跃）"""
    return f": heartbeat {int(time.time())}\n\n"


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
