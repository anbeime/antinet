"""
改进版的聊天回答生成函数
让回答更自然、更智能
"""

def _generate_response_improved(query: str, relevant_cards: List[Dict]) -> str:
    """
    生成改进的自然语言回复
    
    改进点：
    1. 根据问题类型调整回答风格
    2. 更自然的语言组织
    3. 智能摘要和整合
    4. 添加上下文理解
    """
    
    if not relevant_cards:
        return _generate_empty_response(query)
    
    # 分析问题类型
    question_type = _analyze_question_type(query)
    
    # 根据问题类型生成回答
    if question_type == "what":
        return _generate_what_answer(query, relevant_cards)
    elif question_type == "how":
        return _generate_how_answer(query, relevant_cards)
    elif question_type == "why":
        return _generate_why_answer(query, relevant_cards)
    else:
        return _generate_general_answer(query, relevant_cards)


def _analyze_question_type(query: str) -> str:
    """分析问题类型"""
    query_lower = query.lower()
    
    # What 类问题：是什么、有哪些
    what_keywords = ["是什么", "什么是", "有哪些", "包括", "功能", "特点"]
    if any(kw in query for kw in what_keywords):
        return "what"
    
    # How 类问题：如何、怎么
    how_keywords = ["如何", "怎么", "怎样", "方法", "步骤", "操作"]
    if any(kw in query for kw in how_keywords):
        return "how"
    
    # Why 类问题：为什么、原因
    why_keywords = ["为什么", "为何", "原因", "理由"]
    if any(kw in query for kw in why_keywords):
        return "why"
    
    return "general"


def _generate_what_answer(query: str, cards: List[Dict]) -> str:
    """生成 What 类问题的回答"""
    blue_cards = [c for c in cards if c.get("card_type") == "blue"]
    green_cards = [c for c in cards if c.get("card_type") == "green"]
    
    response = []
    
    # 开场白
    if blue_cards:
        response.append(f"根据知识库，我为您找到了以下信息：\n")
        
        # 列举要点
        for idx, card in enumerate(blue_cards[:3], 1):
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            
            response.append(f"{idx}. **{title}**")
            response.append(f"   {desc}\n")
    
    # 补充解释
    if green_cards:
        response.append("\n**补充说明：**")
        for card in green_cards[:2]:
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            response.append(f"• {desc}")
    
    # 总结
    response.append(f"\n以上信息来自知识库中的 {len(cards)} 张相关卡片。")
    
    return "\n".join(response)


def _generate_how_answer(query: str, cards: List[Dict]) -> str:
    """生成 How 类问题的回答"""
    red_cards = [c for c in cards if c.get("card_type") == "red"]
    green_cards = [c for c in cards if c.get("card_type") == "green"]
    blue_cards = [c for c in cards if c.get("card_type") == "blue"]
    
    response = []
    
    # 优先显示行动建议
    if red_cards:
        response.append("根据知识库，您可以按以下步骤操作：\n")
        
        for idx, card in enumerate(red_cards[:3], 1):
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            
            response.append(f"**步骤 {idx}：{title}**")
            response.append(f"{desc}\n")
    
    # 补充背景知识
    if blue_cards and not red_cards:
        response.append("关于您的问题，这里有一些相关信息：\n")
        for card in blue_cards[:2]:
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            response.append(f"• **{title}**：{desc}")
    
    # 补充原理解释
    if green_cards:
        response.append("\n**原理说明：**")
        for card in green_cards[:1]:
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            response.append(f"{desc}")
    
    return "\n".join(response)


def _generate_why_answer(query: str, cards: List[Dict]) -> str:
    """生成 Why 类问题的回答"""
    green_cards = [c for c in cards if c.get("card_type") == "green"]
    blue_cards = [c for c in cards if c.get("card_type") == "blue"]
    
    response = []
    
    # 优先显示解释类卡片
    if green_cards:
        response.append("让我为您解释一下：\n")
        
        for card in green_cards[:2]:
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            
            response.append(f"**{title}**")
            response.append(f"{desc}\n")
    
    # 补充事实依据
    if blue_cards:
        response.append("\n**相关事实：**")
        for card in blue_cards[:2]:
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            response.append(f"• {title}：{desc}")
    
    return "\n".join(response)


def _generate_general_answer(query: str, cards: List[Dict]) -> str:
    """生成通用回答"""
    response = []
    
    # 按卡片类型分组
    card_groups = {
        "blue": [c for c in cards if c.get("card_type") == "blue"],
        "green": [c for c in cards if c.get("card_type") == "green"],
        "yellow": [c for c in cards if c.get("card_type") == "yellow"],
        "red": [c for c in cards if c.get("card_type") == "red"]
    }
    
    # 开场白
    response.append(f"关于「{query}」，我为您找到了以下相关信息：\n")
    
    # 优先显示最相关的卡片（按相似度排序）
    sorted_cards = sorted(cards, key=lambda x: x.get("similarity", 0), reverse=True)
    
    for idx, card in enumerate(sorted_cards[:3], 1):
        title = card.get("title", "")
        content = card.get("content", {})
        desc = content.get("description", "") if isinstance(content, dict) else content
        card_type = card.get("card_type", "blue")
        
        # 根据卡片类型添加图标
        icon = {
            "blue": "📊",
            "green": "💡", 
            "yellow": "⚠️",
            "red": "🎯"
        }.get(card_type, "•")
        
        response.append(f"{icon} **{title}**")
        response.append(f"   {desc}\n")
    
    # 如果有风险提示
    if card_groups["yellow"]:
        response.append("\n⚠️ **注意事项：**")
        for card in card_groups["yellow"][:1]:
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            response.append(f"{desc}")
    
    return "\n".join(response)


def _generate_empty_response(query: str) -> str:
    """生成空结果回答"""
    suggestions = [
        "• 尝试使用不同的关键词",
        "• 简化您的问题",
        "• 查看推荐问题获取灵感"
    ]
    
    return f"""很抱歉，我在知识库中没有找到与「{query}」直接相关的信息。

您可以：
{chr(10).join(suggestions)}

我可以帮您解答关于 Antinet 系统功能、NPU 推理、团队协作、知识管理等方面的问题。"""


# 使用示例
if __name__ == "__main__":
    # 测试不同类型的问题
    test_cases = [
        ("Antinet系统有哪些功能", "what"),
        ("如何优化NPU性能", "how"),
        ("为什么要使用四色卡片", "why"),
        ("团队协作", "general")
    ]
    
    for query, expected_type in test_cases:
        qtype = _analyze_question_type(query)
        print(f"问题: {query}")
        print(f"类型: {qtype} (预期: {expected_type})")
        print(f"匹配: {'✓' if qtype == expected_type else '✗'}")
        print()
