"""
智能模型路由器
根据查询复杂度自动选择合适的模型
"""
import re
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def estimate_complexity(query: str) -> Dict[str, Any]:
    """
    估算查询复杂度

    返回:
        {
            'complexity': 'simple'|'medium'|'complex',
            'score': 0-100,
            'reasons': ['...']
        }
    """
    complexity_score = 0
    reasons = []

    # 1. 文本长度（最多30分）
    if len(query) < 20:
        complexity_score += 5
        reasons.append("短查询")
    elif len(query) < 50:
        complexity_score += 10
        reasons.append("中等长度")
    else:
        complexity_score += 25
        reasons.append("长查询")

    # 2. 关键词分析（最多40分）
    # 简单查询关键词
    simple_keywords = ['你好', '谢谢', '再见', '是什么', '怎么', '是什么', '怎么办', '多少', '几', '1+1', '2+2']
    for keyword in simple_keywords:
        if keyword in query:
            complexity_score -= 5
            reasons.append(f"包含简单词: {keyword}")
            break

    # 复杂查询关键词
    complex_keywords = ['分析', '评估', '建议', '优化', '比较', '原因', '影响', '策略', '方案', '详细说明', '总结']
    for keyword in complex_keywords:
        if keyword in query:
            complexity_score += 10
            reasons.append(f"包含复杂词: {keyword}")

    # 3. 问号数量（最多15分）
    question_marks = query.count('?') + query.count('？')
    if question_marks == 0:
        complexity_score += 10
        reasons.append("非问题句")
    elif question_marks == 1:
        complexity_score += 5
        reasons.append("单个问题")
    else:
        complexity_score += 15
        reasons.append(f"多个问题({question_marks}个)")

    # 4. 特殊字符和符号（最多10分）
    if re.search(r'[（.*）]', query):
        complexity_score += 5
        reasons.append("包含括号内容")

    # 5. 专业术语（最多20分）
    technical_terms = ['NPU', 'CPU', 'GPU', '模型', '推理', '量化', '部署', '架构', '性能', '延迟']
    tech_count = sum(1 for term in technical_terms if term.lower() in query.lower())
    if tech_count >= 2:
        complexity_score += 20
        reasons.append(f"包含{tech_count}个技术术语")

    # 评分范围：0-100
    complexity_score = max(0, min(100, complexity_score))

    # 确定复杂度级别
    if complexity_score < 30:
        complexity = 'simple'
    elif complexity_score < 60:
        complexity = 'medium'
    else:
        complexity = 'complex'

    return {
        'complexity': complexity,
        'score': complexity_score,
        'reasons': reasons
    }


def select_model(query: str) -> str:
    """
    根据查询复杂度选择模型

    策略：
    - simple (<30分): llama3.2-3b (<1秒)
    - medium (30-59分): llama3.1-8b (3-5秒)
    - complex (>=60分): qwen2-7b-ssd (20秒，中文最佳)
    """
    try:
        # 估算复杂度
        estimation = estimate_complexity(query)

        logger.info(f"[ModelRouter] 查询复杂度分析:")
        logger.info(f"  评分: {estimation['score']}/100")
        logger.info(f"  级别: {estimation['complexity']}")
        logger.info(f"  原因: {', '.join(estimation['reasons'])}")

        # 选择模型
        if estimation['complexity'] == 'simple':
            model_key = 'llama3.2-3b'
            model_reason = '简单查询，选择极速模型'
        elif estimation['complexity'] == 'medium':
            model_key = 'llama3.1-8b'
            model_reason = '中等复杂度，选择平衡模型'
        else:  # complex
            model_key = 'qwen2-7b-ssd'
            model_reason = '复杂查询，选择高质量中文模型'

        logger.info(f"[ModelRouter] 选择的模型: {model_key}")
        logger.info(f"[ModelRouter] 选择理由: {model_reason}")

        return model_key

    except Exception as e:
        logger.error(f"[ModelRouter] 模型选择失败: {e}", exc_info=True)
        # 出错时使用默认模型
        return 'qwen2-7b-ssd'


def get_model_info(model_key: str) -> Dict[str, str]:
    """获取模型信息"""
    from models.model_loader import ModelConfig

    models = ModelConfig.MODELS
    if model_key in models:
        return models[model_key]
    else:
        # 默认返回第一个
        return list(models.values())[0]
