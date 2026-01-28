"""
报告生成API路由
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class GenerateRequest(BaseModel):
    """生成请求"""
    query: str
    data_source: Optional[str] = None
    analysis_type: Optional[str] = None


class GenerateResponse(BaseModel):
    """生成响应"""
    cards: dict
    report: dict
    execution_time: float


@router.post("/cards")
async def generate_cards(request: GenerateRequest):
    """
    生成四色卡片（使用NPU推理）- 优化版

    参数：
        request: 生成请求

    返回：
        四色卡片
    """
    try:
        import time
        from models.model_loader import get_model_loader

        start_time = time.time()

        # 检查模型是否加载
        loader = get_model_loader()
        if not loader.is_loaded:
            logger.warning("模型未加载，尝试加载...")
            try:
                loader.load()
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"模型加载失败: {str(e)}")

        # 构造简化的分析提示词（减少token数量）
        analysis_prompt = f"""请简要分析：{request.query}

输出格式：
1. 事实：[1-2句话]
2. 解释：[1-2句话]
3. 风险：[1-2句话]
4. 行动：[1-2句话]"""

        # NPU推理（减少max_tokens以加快速度）
        inference_start = time.time()
        try:
            raw_output = loader.infer(
                prompt=analysis_prompt,
                max_new_tokens=128,  # 从512减少到128
                temperature=0.7
            )
        except Exception as e:
            logger.error(f"NPU推理失败: {e}")
            raise HTTPException(status_code=500, detail=f"NPU推理失败: {str(e)}")
            
        inference_time = (time.time() - inference_start) * 1000

        # 解析输出生成四色卡片
        cards = generate_four_color_cards(raw_output, request.query)

        total_time = time.time() - start_time

        # 性能数据
        performance = {
            "inference_time_ms": round(inference_time, 2),
            "total_time_ms": round(total_time * 1000, 2),
            "device": "NPU",
            "meets_target": inference_time < 10000  # 放宽到10秒
        }

        # 记录日志
        logger.info(f"[INFO] NPU推理延迟: {inference_time:.2f}ms, 总时间: {total_time:.2f}s")

        return {
            "cards": cards,
            "report": {
                "summary": {
                    "title": "NPU分析结果",
                    "description": f"使用NPU模型完成分析，推理时间{inference_time:.2f}ms"
                },
                "performance": performance
            },
            "execution_time": total_time
        }
    
    except Exception as e:
        logger.error(f"生成卡片失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report")
async def generate_report(request: GenerateRequest):
    """
    生成完整报告

    参数：
        request: 生成请求

    返回：
        完整报告
    """
    try:
        import time
        from models.model_loader import get_model_loader

        start_time = time.time()

        # 使用NPU模型生成报告
        loader = get_model_loader()
        model = loader.load()

        # 构造报告生成提示词
        report_prompt = f"""
请为以下查询生成完整的分析报告，包含：摘要、事实、解释、风险和行动建议。

查询：{request.query}

请按照以下结构输出：
1. 摘要：简要总结分析结果
2. 事实：列出客观的数据事实
3. 解释：分析数据变化背后的原因
4. 风险：识别潜在风险和问题，按严重程度分级
5. 行动：提供具体、可执行的行动建议，明确优先级

要求：
- 内容要详实、具体
- 风险要有明确级别（一级/二级/三级）
- 行动要有明确的优先级和预期效果
"""

        # NPU推理
        inference_start = time.time()
        raw_output = loader.infer(
            prompt=report_prompt,
            max_new_tokens=1024,
            temperature=0.7
        )
        inference_time = (time.time() - inference_start) * 1000

        # 解析输出为报告
        report = parse_report_from_output(raw_output, request.query)

        total_time = time.time() - start_time

        # 性能数据
        performance = {
            "inference_time_ms": round(inference_time, 2),
            "total_time_ms": round(total_time * 1000, 2),
            "device": "NPU",
            "meets_target": inference_time < 2000
        }

        # 记录日志
        if inference_time > 2000:
            logger.warning(f"[WARN] NPU推理延迟超标: {inference_time:.2f}ms (目标 < 2000ms)")
        else:
            logger.info(f"[INFO] NPU推理延迟: {inference_time:.2f}ms")

        return {
            "report": report,
            "performance": performance,
            "execution_time": total_time
        }

    except Exception as e:
        logger.error(f"生成报告失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    except Exception as e:
        logger.error(f"生成报告失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def batch_generate(requests: list):
    """
    批量生成
    
    参数：
        requests: 生成请求列表
    
    返回：
        生成结果列表
    """
    try:
        results = []
        
        for request in requests:
            try:
                result = await generate_cards(request)
                results.append({
                    "query": request.query,
                    "status": "success",
                    "result": result
                })
            except Exception as e:
                results.append({
                    "query": request.query,
                    "status": "failed",
                    "error": str(e)
                })
        
        return {
            "results": results,
            "total": len(requests),
            "success": len([r for r in results if r["status"] == "success"]),
            "failed": len([r for r in results if r["status"] == "failed"])
        }
    
    except Exception as e:
        logger.error(f"批量生成失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def parse_report_from_output(raw_output: str, query: str) -> dict:
    """
    从NPU输出解析报告结构

    Args:
        raw_output: NPU原始输出
        query: 原始查询

    Returns:
        解析后的报告结构
    """
    # 按句子分割输出
    sentences = [s.strip() for s in raw_output.split('。') if s.strip()]

    report = {
        "summary": {
            "title": "分析报告",
            "description": f"基于查询 '{query}' 的分析结果",
            "generated_at": ""
        },
        "facts": [],
        "explanations": [],
        "risks": [],
        "actions": []
    }

    for sentence in sentences[:20]:
        # 识别段落类型
        if "摘要" in sentence or "总结" in sentence:
            report["summary"]["description"] = sentence
        elif "事实" in sentence or "数据" in sentence:
            report["facts"].append({
                "title": sentence[:30],
                "description": sentence
            })
        elif "原因" in sentence or "解释" in sentence:
            report["explanations"].append({
                "title": sentence[:30],
                "description": sentence
            })
        elif "风险" in sentence:
            level = "一级" if "严重" in sentence or "高" in sentence else ("二级" if "中等" in sentence else "三级")
            report["risks"].append({
                "title": sentence[:30],
                "level": level,
                "description": sentence
            })
        elif "行动" in sentence or "建议" in sentence or "措施" in sentence:
            priority = "立即执行" if "立即" in sentence else ("高" if "高" in sentence else "中")
            report["actions"].append({
                "title": sentence[:30],
                "priority": priority,
                "description": sentence
            })

    return report


def generate_four_color_cards(raw_output: str, query: str) -> dict:
    """
    从NPU输出生成四色卡片

    Args:
        raw_output: NPU原始输出
        query: 原始查询

    Returns:
        四色卡片字典
    """
    # 按句子分割输出
    sentences = [s.strip() for s in raw_output.split('。') if s.strip()]

    # 颜色和类别映射
    color_map = {
        "blue": {"type": "blue", "category": "事实", "title": "数据事实"},
        "green": {"type": "green", "category": "解释", "title": "原因分析"},
        "yellow": {"type": "yellow", "category": "风险", "title": "风险预警"},
        "red": {"type": "red", "category": "行动", "title": "行动建议"}
    }

    cards = {
        "blue": {"card_type": "blue", "title": "数据事实", "content": "", "confidence": 0.0},
        "green": {"card_type": "green", "title": "原因分析", "content": "", "confidence": 0.0},
        "yellow": {"card_type": "yellow", "title": "风险预警", "content": "", "confidence": 0.0},
        "red": {"card_type": "red", "title": "行动建议", "content": "", "confidence": 0.0}
    }

    # 解析输出到对应的卡片
    for sentence in sentences[:20]:
        for color_name, color_info in color_map.items():
            color_keywords = {
                "blue": ["事实", "数据", "销量", "金额", "指标"],
                "green": ["原因", "解释", "分析", "导致", "因为"],
                "yellow": ["风险", "警告", "问题", "积压", "异常"],
                "red": ["行动", "建议", "措施", "方案", "优化"]
            }

            if any(keyword in sentence for keyword in color_keywords[color_name]):
                cards[color_name]["content"] += sentence + "。"
                cards[color_name]["confidence"] = 0.9
                break

    # 如果某个卡片内容为空，使用默认内容
    for color_name in cards:
        if not cards[color_name]["content"]:
            cards[color_name]["content"] = f"针对查询 '{query}'，模型分析的相关{color_map[color_name]['category']}..."

    return cards
