#!/usr/bin/env python3
# backend/routes/genie_playground_routes.py - Genie 模型测试场地路由
"""
通过 GenieAPIService (端口8910) 调用多个端侧模型
不改动现有模型调用功能，独立测试页面
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import httpx
import json
import subprocess
import time
import os
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/genie-playground", tags=["Genie模型测试场"])

# GenieAPIService 地址
GENIE_SERVICE_URL = "http://127.0.0.1:8910"

# 429 不再重试（Genie 单请求槽，重试只会叠加压力导致后端崩溃）
# 遇到 429 立即失败，由各端点走 fallback 降级


async def _genie_post_no_retry(url: str, json_data: dict, timeout: float = 120.0) -> dict:
    """Genie POST 请求（429 立即返回，不重试以免恶性循环）"""
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=json_data)
        resp.raise_for_status()
        return resp.json()

# ==================== model_loader 直接调用 ====================
_model_loader = None

def get_model_loader():
    """获取 model_loader 实例（直接调用 NPU，更快）"""
    global _model_loader
    if _model_loader is None:
        try:
            from models.model_loader import get_model_loader
            _model_loader = get_model_loader("qwen2.0-7b")
        except Exception as e:
            logger.warning(f"model_loader 初始化失败: {e}")
    return _model_loader

def infer_with_model_loader(prompt: str, max_new_tokens: int = 512, temperature: float = 0.7) -> Optional[str]:
    """使用 model_loader 直接调用 NPU"""
    loader = get_model_loader()
    if loader and loader.is_loaded:
        try:
            return loader.infer(prompt=prompt, max_new_tokens=max_new_tokens, temperature=temperature)
        except Exception as e:
            logger.error(f"model_loader 推理失败: {e}")
    return None

# ==================== 动态获取真实可用的模型 ====================

async def get_genie_available_models() -> Dict[str, Dict]:
    """从 GenieAPIService (端口8910) 获取真正可用的模型"""
    models = {}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{GENIE_SERVICE_URL}/v1/models")
            if response.status_code == 200:
                data = response.json()
                for model in data.get("data", []):
                    model_id = model.get("id", "")
                    if model_id:
                        # 根据模型名称判断类型
                        model_type = "chat"
                        if "vl" in model_id.lower() or "vision" in model_id.lower():
                            model_type = "vision"
                        elif "embed" in model_id.lower():
                            model_type = "embedding"
                        
                        models[model_id] = {
                            "name": model_id,
                            "type": model_type,
                            "description": f"NPU 端侧模型 - 通过 GenieAPIService (8910) 调用",
                            "context_length": 4096,
                            "has_weights": True,
                            "service": "genie",
                            "root_url": GENIE_SERVICE_URL,
                        }
    except Exception as e:
        logger.warning(f"无法连接到 GenieAPIService: {e}")
    
    return models


async def get_available_models() -> Dict[str, Dict]:
    """获取所有可用模型（从 GenieAPIService 真实获取）"""
    # 从 GenieAPIService 获取真实可用的模型
    genie_models = await get_genie_available_models()
    
    if genie_models:
        logger.info(f"[GeniePlayground] 从8910获取到 {len(genie_models)} 个模型: {list(genie_models.keys())}")
        return genie_models
    
    logger.warning("[GeniePlayground] 无法从8910获取模型，返回空列表")
    return {}


# ==================== 旧版兼容 ====================
# 仅保留基础模型配置，实际可用模型由 get_available_models() 动态获取

AVAILABLE_MODELS = {}  # 动态获取，不使用静态配置


@router.get("/models")
async def list_genie_models():
    """列出所有可用模型（兼容前端 /models 接口）"""
    return await list_genie_models_v2()


# ==================== 数据模型 ====================

class GenieChatRequest(BaseModel):
    """Genie 聊天请求"""
    model: str = Field(default="qwen2.5vl3b-8380-2.42", description="模型ID")
    messages: List[Dict[str, Any]] = Field(..., description="消息列表")
    stream: bool = Field(default=False, description="是否流式输出")
    temperature: float = Field(default=0.7, description="温度参数")
    top_k: int = Field(default=1, description="Top-K")
    top_p: float = Field(default=1.0, description="Top-P")
    max_tokens: int = Field(default=2048, description="最大token数")


class GenieVisionChatRequest(BaseModel):
    """Genie 视觉聊天请求（前端传 base64 图片）"""
    model: str = Field(default="qwen2.5vl3b-8380-2.42", description="模型ID")
    text: str = Field(..., description="文本提示")
    image_base64: Optional[str] = Field(None, description="图片base64编码")
    image_mime: Optional[str] = Field(default="jpeg", description="图片MIME类型")
    stream: bool = Field(default=False, description="是否流式输出")
    temperature: float = Field(default=0.7, description="温度参数")
    top_k: int = Field(default=1, description="Top-K")
    top_p: float = Field(default=1.0, description="Top-P")
    max_tokens: int = Field(default=2048, description="最大token数")


@router.get("/models-v2")
async def list_genie_models_v2():
    """列出所有可用模型（从 GenieAPIService 真实获取）"""
    import time
    models = []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{GENIE_SERVICE_URL}/v1/models")
            if response.status_code == 200:
                data = response.json()
                for model in data.get("data", []):
                    model_id = model.get("id", "")
                    if model_id:
                        model_type = "chat"
                        if "vl" in model_id.lower() or "vision" in model_id.lower():
                            model_type = "vision"
                        elif "embed" in model_id.lower():
                            model_type = "embedding"
                        
                        models.append({
                            "id": model_id,
                            "name": model_id,
                            "type": model_type,
                            "description": f"NPU 端侧模型 - 通过 GenieAPIService (8910) 调用",
                            "context_length": 4096,
                            "has_weights": True,
                            "config_path": "",
                            "service": "genie",
                            "available": True,
                        })
    except Exception as e:
        logger.error(f"获取模型失败: {e}")
    
    return {"models": models, "total": len(models), "version": "v2", "timestamp": int(time.time())}


@router.get("/service-status")
async def check_genie_service():
    """检查各服务的可用状态"""
    # 检查 GenieAPIService (NPU)
    genie_available = False
    genie_loaded = []
    genie_current = ""
    try:
        async with httpx.AsyncClient(timeout=5.0, proxy=None) as client:
            response = await client.get(f"{GENIE_SERVICE_URL}/v1/models")
            if response.status_code == 200:
                data = response.json()
                loaded_models = [m.get("id", "") for m in data.get("data", [])]
                if loaded_models:
                    genie_available = True
                    genie_loaded = loaded_models
                    genie_current = loaded_models[0]
    except:
        pass
    
    is_vision = "vl" in genie_current.lower() or "vision" in genie_current.lower()
    
    # 获取从 GenieAPIService 真实获取的模型
    available = await get_available_models()
    
    # 检查 model_loader 状态
    loader = get_model_loader()
    model_loader_available = loader is not None and loader.is_loaded
    model_loader_model = loader.model_key if loader else None
    
    # 前端兼容字段（扁平化）
    return {
        "available": genie_available,
        "loaded_models": genie_loaded,
        "current_model": genie_current,
        "current_model_type": "vision" if is_vision else "chat",
        "model_count": len(genie_loaded),
        "model_loader_available": model_loader_available,
        "model_loader_model": model_loader_model,
        "services": {
            "genie": {
                "available": genie_available,
                "url": GENIE_SERVICE_URL,
                "loaded_models": genie_loaded,
                "current_model": genie_current,
                "current_model_type": "vision" if is_vision else "chat",
                "model_count": len(genie_loaded)
            },
            "model_loader": {
                "available": model_loader_available,
                "model": model_loader_model
            }
        },
        "available_models": list(available.keys()),
        "hint": f"请启动 GenieAPIService (端口 {GENIE_SERVICE_URL.replace('http://','')})" if not genie_available else ""
    }


async def get_loaded_model_name() -> str | None:
    """从 GenieAPIService 获取当前加载的模型名"""
    try:
        async with httpx.AsyncClient(timeout=5.0, proxy=None) as client:
            response = await client.get(f"{GENIE_SERVICE_URL}/v1/models")
            if response.status_code == 200:
                data = response.json()
                models = data.get("data", [])
                if models:
                    return models[0].get("id", None)
    except:
        pass
    return None


class ClassifyRequest(BaseModel):
    content: str = Field(..., description="待分类的文本内容")

# ========== 降级兜底：关键词规则分类 ==========

def _fallback_classify(content: str) -> list:
    """锦衣卫降级模式：当 Genie 不可用时，使用关键词规则分类兜底"""
    import re as _re

    paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
    if not paragraphs:
        paragraphs = [content.strip()]

    leak_patterns = ['System Information', 'Template', 'DeepSeek', 'You are a helpful',
                     'instruction', 'prompt', 'special token', '#### Instruction',
                     '#### Response', 'system', '<|assistant', '<|end',
                     'Ignore all previous']
    cards = []
    for idx, para in enumerate(paragraphs):
        if len(para) < 4:
            continue
        if any(pat.lower() in para.lower() for pat in leak_patterns):
            continue

        lower = para.lower()
        scores = {'blue': 0, 'green': 0, 'yellow': 0, 'red': 0}

        # 通政司（蓝·事实/核心概念）
        for kw in ['定义', '概念', '原理', '理论', '什么是', '是指', '含义', '本质',
                     '事实', '数据', '统计', '研究表明', '根据', '调查', '特征', '结构', '组成']:
            if kw in lower: scores['blue'] += 1

        # 监察院（绿·解释/关联分析）
        for kw in ['关联', '相关', '连接', '对比', '区别', '因为', '所以', '导致', '由于',
                     '因此', '从而', '关系', '解释', '原因', '影响', '作用']:
            if kw in lower: scores['green'] += 1
        if _re.search(r'与.*相比|不同于|相较于', para): scores['green'] += 2

        # 刑狱司（黄·风险/参考来源）
        for kw in ['来源', '出处', '引用', '参考文献', '风险', '隐患', '注意', '谨慎',
                     '可能', '潜在', '警告', '威胁', '漏洞']:
            if kw in lower: scores['yellow'] += 1
        if _re.search(r'https?://|www\.|\.com|\.org|\.cn', para):
            scores['yellow'] += 3

        # 参谋司（红·行动/索引）
        for kw in ['建议', '必须', '需要', '应该', '执行', '完成', '开始', '措施', '步骤',
                     '关键词', '标签', '索引', '行动', '计划', '目标', '方案']:
            if kw in lower: scores['red'] += 1
        if len(para) < 50: scores['red'] += 2
        if any(v in lower for v in ['建议', '应该', '必须', '需要', '执行']): scores['red'] += 2
        if len(para) > 200: scores['blue'] += 1

        best_color = max(scores, key=scores.get)
        max_score = scores[best_color]
        confidence = min(max_score / 5, 0.85) if max_score > 0 else 0.5

        title = para[:50] + '...' if len(para) > 50 else para
        if '\n' in title:
            title = title.split('\n')[0]
        title = _re.sub(r'^#+\s*', '', title).strip()

        cards.append({
            'title': title,
            'content': para,
            'card_type': best_color,
            'confidence': round(confidence, 2),
            'address': f"{best_color.upper()}{idx + 1}"
        })

    return cards


# ========== 8-智能体锦衣卫分类提示词 ==========

_JINYIWEI_CLASSIFY_SYSTEM = """你是「锦衣卫总指挥使」，统领四司进行知识卡片分类。你必须以JSON格式响应，不得输出任何其他文字。

## 四司分工

| 衙门 | 颜色 | 职责 | 适用内容特征 |
|------|------|------|-------------|
| 通政司 | blue | 事实/核心概念 | 定义、原理、数据事实、客观描述、结构组成 |
| 监察院 | green | 解释/关联分析 | 因果关系、对比分析、关联关系、影响作用 |
| 刑狱司 | yellow | 风险/参考来源 | 风险预警、引用出处、URL链接、安全隐患 |
| 参谋司 | red | 行动/索引关键词 | 行动建议、待办事项、关键词索引、行动指令 |

## 分类规则

1. 将输入文本按空行切分为段落
2. 每个段落判定一个最匹配的颜色
3. 提取段落的标题（取首行或前30字）
4. 置信度 0-1，表示分类确定性

## 响应格式

严格按以下JSON数组返回，不要添加任何前缀或后缀：

```json
[{"title":"段落标题","content":"原文段落","color":"blue|green|yellow|red","confidence":0.9}]
```"""


@router.post("/classify")
async def genie_classify(request: ClassifyRequest):
    """AI 精准分类：8-智能体锦衣卫全线 → Genie LLM → 降级兜底关键词规则"""
    content = request.content
    if not content or not content.strip():
        raise HTTPException(status_code=400, detail="内容不能为空")

    # 英文指令 + 中文内容（Genie 对英文指令遵循更好，避免锦衣卫上下文干扰）
    user_prompt = (
        "You are a knowledge card classifier. Classify each paragraph into one of 4 types. "
        "Return ONLY a valid JSON array, no other text.\n\n"
        "Types:\n"
        "- blue: core concepts, definitions, facts\n"
        "- green: relationships, comparisons, explanations\n"
        "- yellow: references, sources, URLs\n"
        "- red: keywords, actions, todo items\n\n"
        "Rules:\n"
        "1. Split text by blank lines into paragraphs\n"
        "2. Assign one color to each paragraph\n"
        "3. Extract a short title (first line or first 30 chars)\n"
        "4. confidence 0-1 indicates certainty\n\n"
        "Format: [{\"title\":\"...\",\"content\":\"...\",\"color\":\"blue\",\"confidence\":0.9}]\n\n"
        f"Text:\n{content}"
    )

    models_to_try = ["Qwen2.0-7B-SSD-8380-2.34", "qwen2.5vl3b-8380-2.42"]
    last_error = ""

    for model in models_to_try:
        try:
            result = await _genie_post_no_retry(
                f"{GENIE_SERVICE_URL}/v1/chat/completions",
                json_data={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": _JINYIWEI_CLASSIFY_SYSTEM},
                        {"role": "user", "content": user_prompt}
                    ],
                    "max_tokens": 2048,
                    "temperature": 0.3
                }
            )
            response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if response_text:
                    # 尝试解析 Genie 返回的 JSON
                    try:
                        json_match = response_text
                        # 清理可能的 markdown 代码块包装
                        if '```' in json_match:
                            json_match = json_match.split('```')[1]
                            if json_match.startswith('json'):
                                json_match = json_match[4:]
                        genie_cards = json.loads(json_match.strip())
                        if isinstance(genie_cards, list) and len(genie_cards) > 0:
                            # 规范化输出
                            normalized = []
                            for i, card in enumerate(genie_cards):
                                normalized.append({
                                    'title': card.get('title', card.get('content', '')[:30]),
                                    'content': card.get('content', ''),
                                    'card_type': card.get('color', card.get('card_type', 'blue')),
                                    'confidence': card.get('confidence', 0.9),
                                    'address': f"{card.get('color', card.get('card_type', 'blue')).upper()}{i + 1}"
                                })
                            return {
                                "success": True,
                                "source": "genie",
                                "model": model,
                                "cards": normalized,
                                "total": len(normalized)
                            }
                    except json.JSONDecodeError:
                        logger.warning(f"Genie 返回非标准JSON，回退到原文本: {response_text[:200]}")
                        return {
                            "success": True,
                            "source": "genie",
                            "model": model,
                            "response": response_text
                        }
        except httpx.HTTPStatusError as e:
            last_error = f"{model} HTTP {e.response.status_code}"
            try: last_error += ": " + e.response.text[:100]
            except: pass
        except Exception as e:
            last_error = f"{model}: {str(e)[:100]}"

    # ========== 降级兜底：Genie 全部失败 → 关键词规则分类 ==========
    logger.warning(f"Genie 分类全部失败 ({last_error})，降级为关键词规则分类")
    try:
        fallback_cards = _fallback_classify(content)
        if fallback_cards:
            return {
                "success": True,
                "source": "fallback",
                "fallback_reason": last_error,
                "cards": fallback_cards,
                "total": len(fallback_cards)
            }
    except Exception as fb_err:
        logger.error(f"降级分类也失败: {fb_err}")

    raise HTTPException(status_code=502, detail=f"Genie 分类失败（含降级）: {last_error}")

class AnalyzeRequest(BaseModel):
    card_title: str = Field(..., description="卡片标题")
    card_content: str = Field(..., description="卡片内容")
    related_titles: Optional[str] = Field("", description="关联卡片标题列表")

@router.post("/analyze")
async def genie_analyze(request: AnalyzeRequest):
    """AI 知识洞察：分析卡片并生成洞察"""
    related_part = f"\n关联卡片：{request.related_titles}" if request.related_titles else ""
    user_prompt = (
        f"你是一个知识管理专家。分析以下知识卡片，给出3个方面的洞察：\n\n"
        f"卡片标题：{request.card_title}\n"
        f"卡片内容：{request.card_content}{related_part}\n\n"
        f"请严格按照JSON格式返回，不要其他文字：\n"
        f"{{\n"
        f'  "summary": "一句话总结这张卡片在知识体系中的角色（30字内）",\n'
        f'  "importance": "重要性评分 0-100 的数字",\n'
        f'  "gap": "一个知识空白点（20字内）",\n'
        f'  "recommendations": [\n'
        f'    {{"title": "推荐主题", "reason": "推荐原因（10字内）"}}\n'
        f'  ]\n'
        f"}}"
    )

    models_to_try = ["Qwen2.0-7B-SSD-8380-2.34", "qwen2.5vl3b-8380-2.42"]
    last_error = ""
    for model in models_to_try:
        try:
            result = await _genie_post_no_retry(
                f"{GENIE_SERVICE_URL}/v1/chat/completions",
                json_data={
                    "model": model,
                    "messages": [{"role": "user", "content": user_prompt}],
                    "max_tokens": 1024,
                    "temperature": 0.5
                }
            )
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if content:
                return {"success": True, "response": content}
        except Exception as e:
            last_error = f"{model}: {str(e)[:100]}"
    raise HTTPException(status_code=502, detail=f"Genie 分析失败: {last_error}")

@router.post("/chat")
async def genie_chat(request: GenieChatRequest):
    """通过 model_loader 直接调用 NPU（优先）或 GenieAPIService"""
    available = await get_available_models()
    
    if request.model not in available:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {request.model}. 可用模型: {list(available.keys())}")

    # 优先使用 model_loader 直接调用 NPU（更快）
    loader = get_model_loader()
    if loader and loader.is_loaded:
        try:
            # 构建对话提示词
            messages = request.messages
            prompt_parts = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "system":
                    prompt_parts.append(f"System: {content}")
                elif role == "user":
                    prompt_parts.append(f"User: {content}")
                elif role == "assistant":
                    prompt_parts.append(f"Assistant: {content}")
            
            prompt = "\n".join(prompt_parts) + "\nAssistant:"
            
            result = loader.infer(prompt=prompt, max_new_tokens=request.max_tokens, temperature=request.temperature)
            if result:
                logger.info(f"[GeniePlayground] 使用 model_loader 直接推理成功")
                return {
                    "success": True,
                    "model": request.model,
                    "response": result.strip(),
                    "source": "model_loader"
                }
        except Exception as e:
            logger.warning(f"model_loader 推理失败，回退到 HTTP: {e}")

    # 回退：使用 GenieAPIService HTTP 调用
    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        raise HTTPException(status_code=503, detail="GenieAPIService 不可用，请确保服务已启动 (端口 8910)")

    request_data = {
        "model": loaded_model,
        "messages": request.messages,
        "stream": False,
        "size": request.max_tokens,
        "temp": request.temperature,
        "top_k": request.top_k,
        "top_p": request.top_p,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{GENIE_SERVICE_URL}/v1/chat/completions",
                json=request_data,
            )
            response.raise_for_status()
            result = response.json()

            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0].get("message", {}).get("content", "")
                return {
                    "success": True,
                    "model": request.model,
                    "response": content,
                }
            return {"success": True, "model": request.model, "response": str(result), "raw": result}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GenieAPIService 超时")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"GenieAPIService 错误: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调用失败: {str(e)}")


@router.post("/chat/stream")
async def genie_chat_stream(request: GenieChatRequest):
    """通过 model_loader 直接调用 NPU（优先）或 GenieAPIService（流式）"""
    available = await get_available_models()
    
    if request.model not in available:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {request.model}. 可用模型: {list(available.keys())}")

    # 优先使用 model_loader 直接调用 NPU（非流式，转为一次性返回）
    loader = get_model_loader()
    if loader and loader.is_loaded:
        try:
            messages = request.messages
            prompt_parts = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "system":
                    prompt_parts.append(f"System: {content}")
                elif role == "user":
                    prompt_parts.append(f"User: {content}")
                elif role == "assistant":
                    prompt_parts.append(f"Assistant: {content}")
            
            prompt = "\n".join(prompt_parts) + "\nAssistant:"
            
            result = loader.infer(prompt=prompt, max_new_tokens=request.max_tokens, temperature=request.temperature)
            if result:
                logger.info(f"[GeniePlayground] 使用 model_loader 直接推理（流式模拟）")
                
                async def model_loader_stream():
                    content = result.strip()
                    for i in range(0, len(content), 10):
                        chunk = content[i:i+10]
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                        await asyncio.sleep(0.05)
                    yield f"data: [DONE]\n\n"
                
                import asyncio
                return StreamingResponse(model_loader_stream(), media_type="text/event-stream")
        except Exception as e:
            logger.warning(f"model_loader 推理失败，回退到 HTTP: {e}")

    # 回退：使用 GenieAPIService HTTP 流式调用
    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        raise HTTPException(status_code=503, detail="GenieAPIService 不可用，请确保服务已启动 (端口 8910)")

    request_data = {
        "model": loaded_model,
        "messages": request.messages,
        "stream": True,
        "size": request.max_tokens,
        "temp": request.temperature,
        "top_k": request.top_k,
        "top_p": request.top_p,
    }

    async def event_generator():
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{GENIE_SERVICE_URL}/v1/chat/completions",
                    json=request_data,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                yield f"data: [DONE]\n\n"
                                break
                            try:
                                data = json.loads(data_str)
                                content = ""
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                if content:
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                            except json.JSONDecodeError:
                                pass
        except httpx.TimeoutException:
            yield f"data: {json.dumps({'error': 'GenieAPIService 超时'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield f"data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/vision-chat")
async def genie_vision_chat(request: GenieVisionChatRequest):
    """通过 GenieAPIService 进行视觉聊天（图文混合）"""
    available = await get_available_models()
    
    if request.model not in available:
        raise HTTPException(status_code=400, detail=f"不支持的模型: {request.model}. 可用模型: {list(available.keys())}")

    model_info = available[request.model]
    if model_info.get("type") != "vision":
        raise HTTPException(status_code=400, detail=f"模型 {request.model} 不支持视觉功能")

    # 通过 GenieAPIService 调用
    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        raise HTTPException(status_code=503, detail="GenieAPIService 不可用，请确保服务已启动 (端口 8910)")

    if "vl" not in loaded_model.lower() and "vision" not in loaded_model.lower():
        raise HTTPException(
            status_code=400,
            detail=f"当前加载的模型是 {loaded_model}，不是视觉模型。请重启 GenieAPIService 加载视觉模型(qwen2.5vl3b)。"
        )

    user_content = [
        {"type": "text", "text": request.text},
    ]
    
    if request.image_base64:
        user_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/{request.image_mime};base64,{request.image_base64}"
            }
        })

    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": user_content}
    ]

    request_data = {
        "model": loaded_model,
        "messages": messages,
        "stream": False,
        "size": request.max_tokens,
        "temp": request.temperature,
        "top_k": request.top_k,
        "top_p": request.top_p,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{GENIE_SERVICE_URL}/v1/chat/completions",
                json=request_data,
            )
            response.raise_for_status()
            result = response.json()

            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0].get("message", {}).get("content", "")
                return {
                    "success": True,
                    "model": request.model,
                    "response": content,
                    "has_image": request.image_base64 is not None,
                }
            return {"success": True, "model": request.model, "response": str(result)}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GenieAPIService 超时")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"GenieAPIService 错误: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调用失败: {str(e)}")


@router.post("/batch-test")
async def batch_test_models():
    """测试当前加载的模型是否可用"""
    # 获取当前加载的模型
    loaded_model = await get_loaded_model_name()
    if not loaded_model:
        return {"results": [{"model": "N/A", "name": "N/A", "status": "error", "error": "GenieAPIService 不可用"}], "total": 1}

    prompt = "Hello! Please introduce yourself in one sentence."
    results = []

    request_data = {
        "model": loaded_model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "size": 512,
        "temp": 0.7,
        "top_k": 1,
        "top_p": 1.0,
        
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{GENIE_SERVICE_URL}/v1/chat/completions",
                json=request_data,
            )
            if response.status_code == 200:
                result = response.json()
                content = ""
                if "choices" in result and len(result["choices"]) > 0:
                    content = result["choices"][0].get("message", {}).get("content", "")
                results.append({
                    "model": loaded_model,
                    "name": loaded_model,
                    "status": "success",
                    "response": content[:200],
                })
            else:
                results.append({
                    "model": loaded_model,
                    "name": loaded_model,
                    "status": "error",
                    "error": f"HTTP {response.status_code}",
                })
    except Exception as e:
        results.append({
            "model": loaded_model,
            "name": loaded_model,
            "status": "error",
            "error": str(e),
        })

    return {"results": results, "total": len(results)}
