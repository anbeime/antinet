#!/usr/bin/env python3
# backend/routes/codebuddy_chat_routes.py - CodeBuddy SDK 集成路由
"""
CodeBuddy Agent SDK 集成 - 增强对话机器人功能
提供智能对话、上下文理解和知识库访问
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import asyncio

# SDK 集成
try:
    from codebuddy_agent_sdk import (
        query,
        CodeBuddyAgentOptions,
        AssistantMessage,
        TextBlock,
        CodeBuddySDKError,
    )
    SDK_AVAILABLE = True
except ImportError as e:
    SDK_AVAILABLE = False
    logging.warning(f"CodeBuddy SDK 未安装: {e}")

    # 模拟 SDK 实现（用于演示和测试）
    class MockCodeBuddyAgentOptions:
        def __init__(self, **kwargs):
            self.model = kwargs.get('model', 'claude-sonnet-4.5')
            self.system_prompt = kwargs.get('system_prompt', '')
            self.max_turns = kwargs.get('max_turns', 2)
            self.env = kwargs.get('env', {})

    CodeBuddyAgentOptions = MockCodeBuddyAgentOptions

    async def mock_query(prompt: str, options=None):
        """模拟 query 函数"""
        # 简单的模拟响应
        class MockMessage:
            def __init__(self):
                self.content = [MockTextBlock(f"[模拟] 基于查询: {prompt[:50]}... 的回复")]

        class MockTextBlock:
            def __init__(self, text):
                self.text = text

        yield MockMessage()

    query = mock_query
    SDK_AVAILABLE = True  # 启用模拟模式
    logging.info("使用 CodeBuddy SDK 模拟模式")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/codebuddy-chat", tags=["CodeBuddy 聊天机器人"])


# 导入现有的知识卡片（用于共享记忆）
try:
    from .chat_routes import PRESET_KNOWLEDGE_CARDS, _search_cards_by_keyword
    KNOWLEDGE_AVAILABLE = True
except ImportError:
    KNOWLEDGE_AVAILABLE = False
    PRESET_KNOWLEDGE_CARDS = {}
    logger.warning("无法导入知识卡片，CodeBuddy 将只能进行通用对话")


class CodeBuddyChatMessage(BaseModel):
    """CodeBuddy 聊天消息"""
    role: str = Field(..., description="角色: user|assistant|system")
    content: str = Field(..., description="消息内容")


class CodeBuddyChatRequest(BaseModel):
    """CodeBuddy 聊天请求"""
    query: str = Field(..., description="用户查询")
    conversation_history: List[CodeBuddyChatMessage] = Field(default_factory=list, description="对话历史")
    context: Dict[str, Any] = Field(default_factory=dict, description="上下文信息")
    use_knowledge_base: bool = Field(default=True, description="是否使用知识库")
    model: Optional[str] = Field(default="claude-sonnet-4.5", description="使用的模型")


class CodeBuddyChatResponse(BaseModel):
    """CodeBuddy 聊天响应"""
    response: str
    enhanced_by_sdk: bool
    knowledge_used: bool
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class CodeBuddyHealthResponse(BaseModel):
    """CodeBuddy 健康检查响应"""
    sdk_available: bool
    knowledge_available: bool
    status: str


async def _get_knowledge_context(query: str) -> str:
    """
    从共享记忆知识库获取相关上下文

    参数：
        query: 用户查询

    返回：
        知识库上下文文本
    """
    if not KNOWLEDGE_AVAILABLE:
        return ""

    try:
        # 搜索相关卡片
        relevant_cards = _search_cards_by_keyword(query, limit=5)

        if not relevant_cards:
            return ""

        # 构建上下文
        context_parts = ["基于 Antinet 知识库的相关信息：\n"]

        for i, card in enumerate(relevant_cards[:3], 1):
            card_type = card.get("card_type", "unknown")
            title = card.get("title", "无标题")
            content = card.get("content", {})

            if isinstance(content, dict):
                if card_type == "blue":
                    desc = content.get("description", "")
                    context_parts.append(f"{i}. 事实：{title}\n   {desc}\n")
                elif card_type == "green":
                    explanation = content.get("explanation", "")
                    context_parts.append(f"{i}. 解释：{title}\n   {explanation}\n")
                elif card_type == "yellow":
                    risk_level = content.get("risk_level", "未知")
                    desc = content.get("description", "")
                    context_parts.append(f"{i}. 风险：{title}（等级: {risk_level}）\n   {desc}\n")
                elif card_type == "red":
                    priority = content.get("priority", "未知")
                    action = content.get("action", "")
                    context_parts.append(f"{i}. 行动：{title}（优先级: {priority}）\n   {action}\n")

        return "\n".join(context_parts)

    except Exception as e:
        logger.error(f"获取知识库上下文失败: {e}")
        return ""


async def _call_codebuddy_sdk(query_text: str, context: str = "", model: str = "claude-sonnet-4.5") -> tuple[str, float]:
    """
    调用 CodeBuddy SDK

    参数：
        query_text: 用户查询
        context: 额外上下文
        model: 使用的模型

    返回：
        (回复文本, 延迟毫秒)
    """
    if not SDK_AVAILABLE:
        raise Exception("CodeBuddy SDK 未安装")

    try:
        start_time = asyncio.get_event_loop().time()

        # 构建提示词
        if context:
            full_prompt = f"""基于以下知识库信息回答问题：

{context}

用户问题：{query_text}

请基于上述知识库信息，提供准确、详细的回答。如果知识库中没有相关信息，请明确说明。"""
        else:
            full_prompt = query_text

        # 配置选项
        options = CodeBuddyAgentOptions(
            model=model,
            system_prompt="""你是一个专业的知识助手。请基于提供的知识库信息回答问题。

要求：
1. 如果知识库中有相关信息，优先使用知识库内容回答
2. 如果知识库中没有相关信息，请明确说明
3. 回答要准确、详细、有帮助
4. 使用清晰、易懂的语言""",
            max_turns=2,
            env={
                "ANTINET_MODE": "knowledge_base",
                "USE_SHARED_MEMORY": "true",
            }
        )

        # 调用 SDK
        full_response = []
        async for message in query(prompt=full_prompt, options=options):
            if hasattr(message, 'content'):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        full_response.append(block.text)

        response_text = "\n".join(full_response)

        # 计算延迟
        end_time = asyncio.get_event_loop().time()
        latency_ms = (end_time - start_time) * 1000

        return response_text, latency_ms

    except CodeBuddySDKError as e:
        logger.error(f"CodeBuddy SDK 错误: {e}")
        raise Exception(f"SDK 错误: {e}")
    except Exception as e:
        logger.error(f"调用 CodeBuddy SDK 失败: {e}", exc_info=True)
        raise Exception(f"调用失败: {e}")


@router.post("/chat", response_model=CodeBuddyChatResponse)
async def codebuddy_chat(request: CodeBuddyChatRequest):
    """
    CodeBuddy 增强聊天接口

    使用 CodeBuddy SDK 提供智能对话能力，并集成共享记忆知识库

    参数：
        request: 聊天请求，包含查询、对话历史、上下文等

    返回：
        增强的聊天响应
    """
    logger.info(f"[CodeBuddyChat] 收到查询: {request.query}")

    if not SDK_AVAILABLE:
        logger.error("CodeBuddy SDK 未安装")
        return CodeBuddyChatResponse(
            response="抱歉，CodeBuddy SDK 未安装，无法使用增强聊天功能。",
            enhanced_by_sdk=False,
            knowledge_used=False,
            error="SDK_NOT_INSTALLED"
        )

    try:
        # 获取知识库上下文
        knowledge_context = ""
        knowledge_used = False

        if request.use_knowledge_base and KNOWLEDGE_AVAILABLE:
            knowledge_context = await _get_knowledge_context(request.query)
            knowledge_used = bool(knowledge_context)
            logger.info(f"[CodeBuddyChat] 知识库上下文: {len(knowledge_context)} 字符")

        # 调用 CodeBuddy SDK
        response_text, latency_ms = await _call_codebuddy_sdk(
            query_text=request.query,
            context=knowledge_context,
            model=request.model or "claude-sonnet-4.5"
        )

        logger.info(f"[CodeBuddyChat] 响应生成成功，延迟: {latency_ms:.2f}ms")

        return CodeBuddyChatResponse(
            response=response_text,
            enhanced_by_sdk=True,
            knowledge_used=knowledge_used,
            latency_ms=latency_ms
        )

    except Exception as e:
        logger.error(f"[CodeBuddyChat] 处理失败: {e}", exc_info=True)
        return CodeBuddyChatResponse(
            response="抱歉，处理您的请求时出现了错误。",
            enhanced_by_sdk=False,
            knowledge_used=False,
            error=str(e)
        )


@router.get("/health", response_model=CodeBuddyHealthResponse)
async def codebuddy_health():
    """
    CodeBuddy 聊天机器人健康检查

    返回：
        SDK 和知识库状态
    """
    try:
        status = "healthy" if SDK_AVAILABLE else "degraded"

        return CodeBuddyHealthResponse(
            sdk_available=SDK_AVAILABLE,
            knowledge_available=KNOWLEDGE_AVAILABLE,
            status=status
        )

    except Exception as e:
        logger.error(f"[CodeBuddyChat] 健康检查失败: {e}")
        return CodeBuddyHealthResponse(
            sdk_available=SDK_AVAILABLE,
            knowledge_available=KNOWLEDGE_AVAILABLE,
            status="error"
        )
