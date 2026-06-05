"""
Book Skill Generator - 书籍方法论提取与四色知识管理系统集成

将书籍内容转化为可交互的 AI Skill，打通"知识分类存储"与"实际问题解决"。

四色集成：
  - 🔵 蓝色(案例): 使用方法论解决问题的真实案例
  - 🟢 绿色(解释): 书籍背景、原理说明
  - 🟡 黄色(方法论): 从书籍提取的核心方法论（主角）
  - 🔴 红色(行动): 方法论对应的行动计划

核心流程：
  书籍输入 → AI提取方法论(黄色) → 生成可对话Skill → 问题匹配方法论
  → AI引导解决问题 → 案例回填四色系统(蓝色)
"""

import logging
import json
import re
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict, field

logger = logging.getLogger(__name__)

# ============================================================================
# 数据模型
# ============================================================================

@dataclass
class BookMethodology:
    """书籍方法论数据模型"""
    methodology_id: str
    book_name: str
    book_author: str = ""
    name_en: str = ""
    name_cn: str = ""
    trigger_scenario: str = ""
    description: str = ""
    steps: List[str] = field(default_factory=list)
    output_format: str = ""
    examples: str = ""
    related_four_color_card_ids: List[str] = field(default_factory=list)
    created_at: str = ""
    usage_count: int = 0

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @property
    def command_name(self) -> str:
        """生成斜杠命令名"""
        short_book = re.sub(r'[《》\s]', '', self.book_name)[:4]
        return f"/book-{short_book}-{self.name_en}"


@dataclass
class BookSkillData:
    """单本书的技能数据"""
    book_name: str
    book_author: str = ""
    book_id: str = ""
    methodologies: List[BookMethodology] = field(default_factory=list)
    extracted_at: str = ""
    total_cards_generated: Dict[str, int] = field(default_factory=lambda: {"blue": 0, "green": 0, "yellow": 0, "red": 0})
    source_type: str = "text"  # text / url / file / notes

    def __post_init__(self):
        if not self.book_id:
            self.book_id = hashlib.md5(self.book_name.encode()).hexdigest()[:12]
        if not self.extracted_at:
            self.extracted_at = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "book_name": self.book_name,
            "book_author": self.book_author,
            "book_id": self.book_id,
            "methodologies": [m.to_dict() for m in self.methodologies],
            "extracted_at": self.extracted_at,
            "total_cards_generated": self.total_cards_generated,
            "source_type": self.source_type,
            "methodology_count": len(self.methodologies)
        }


@dataclass
class BookCaseStudy:
    """案例研究（蓝色卡片数据）"""
    case_id: str
    book_name: str
    methodology_name: str
    problem: str
    solution: str
    outcome: str = ""
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ============================================================================
# 四色卡片转换器 - 将BookSkill数据转换为四色卡片
# ============================================================================

class FourColorBridge:
    """BookSkill 与 四色卡片系统之间的桥梁"""

    @staticmethod
    def methodology_to_yellow_card(methodology: BookMethodology) -> Dict[str, Any]:
        """将方法论转换为四色黄色卡片"""
        steps_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(methodology.steps)])
        return {
            "card_type": "yellow",
            "card_type_cn": "风险",
            "title": f"[方法论] {methodology.name_cn}",
            "content": (
                f"书籍来源：{methodology.book_name} {methodology.book_author}\n"
                f"方法论：{methodology.name_cn} ({methodology.name_en})\n"
                f"适用场景：{methodology.trigger_scenario}\n"
                f"核心内容：{methodology.description}\n"
                f"执行步骤：\n{steps_text}\n"
                f"输出格式：{methodology.output_format}"
            ),
            "source": f"BookSkill - {methodology.book_name}",
            "tags": ["方法论", methodology.book_name, methodology.name_cn],
            "explore_status": "已探索"
        }

    @staticmethod
    def case_to_blue_card(case: BookCaseStudy) -> Dict[str, Any]:
        """将案例研究转换为四色蓝色卡片"""
        return {
            "card_type": "blue",
            "card_type_cn": "事实",
            "title": f"[案例] {case.methodology_name} - {case.problem[:20]}",
            "content": (
                f"书籍来源：{case.book_name}\n"
                f"使用方法论：{case.methodology_name}\n"
                f"遇到问题：{case.problem}\n"
                f"解决方案：{case.solution}\n"
                f"最终结果：{case.outcome}"
            ),
            "source": "四色系统 - 案例回填",
            "tags": ["案例", case.book_name, case.methodology_name],
            "explore_status": "已探索"
        }


# ============================================================================
# AI 提示词模板
# ============================================================================

BOOK_EXTRACTION_PROMPT = """你是四色知识管理系统的 Book Skill 专家。
请从以下书籍内容中提取核心方法论，并按照 JSON 格式输出。

【四色知识管理映射规则】
- 🟡 黄色(方法论): 提取书中的核心方法论、框架、步骤、流程
- 每种方法论需要有：名称、触发场景、执行步骤、输出格式

【输出格式】
请输出一个 JSON 数组，每个方法论一个对象：
[
  {{
    "name_en": "methodology-english-name",
    "name_cn": "方法论中文名称",
    "trigger_scenario": "什么情况下触发这个方法",
    "description": "方法论的详细描述",
    "steps": ["步骤1详细说明", "步骤2详细说明", "步骤3详细说明"],
    "output_format": "使用此方法后的预期产出格式",
    "examples": "一个具体的应用案例"
  }}
]

【书籍内容】
{book_content}
"""

PROBLEM_MATCHING_PROMPT = """你是四色知识管理系统的 AI 顾问。
用户遇到了一个实际问题，请在已提取的书籍方法论库中找到最匹配的方法论，并引导用户解决问题。

【方法论库存】
{methodologies_json}

【用户问题】
{problem}

请按以下格式回复：
1. 匹配的方法论名称和来源书籍
2. 为什么这个方法论适合当前问题
3. 按照方法论的步骤逐步引导用户
4. 给出具体的行动建议

注意：用中文回复，要像一位经验丰富的教练一样引导用户。
"""


# ============================================================================
# Book Skill 核心实现
# ============================================================================

class BookSkillGenerator:
    """Book Skill 生成器 - 核心实现"""

    def __init__(self):
        self.name = "book_skill"
        self.description = "Book Skill Generator：从书籍提取方法论并生成可交互 AI Skill，集成四色知识管理系统"
        self.category = "知识管理"
        self.agent_name = "太史阁"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0

        # 存储
        self._book_skills: Dict[str, BookSkillData] = {}
        self._methodologies: Dict[str, BookMethodology] = {}
        self._case_studies: List[BookCaseStudy] = []

        # AI 服务引用 (懒加载)
        self._ai_service = None

    def _get_ai_service(self):
        """获取 AI 服务实例（sensenova 优先用于方法论提取，NPU 兜底）"""
        if self._ai_service is None:
            try:
                from services.ai import get_ai_service, get_sensenova_service
                # 优先使用 sensenova（专为方法论提取任务优化）
                sensenova = get_sensenova_service()
                if sensenova and sensenova.is_available:
                    self._ai_service = sensenova
                    logger.info("[BookSkill] 使用 Sensenova 进行方法论提取")
                else:
                    # 兜底：本地模型（NPU）- 验证能否实际使用
                    npu = get_ai_service()
                    if npu and npu.is_available:
                        # 验证 NPU 是否已初始化
                        if npu._initialized or npu._load_model():
                            self._ai_service = npu
                            logger.info("[BookSkill] Sensenova 不可用，使用本地 NPU 模型")
                        else:
                            self._ai_service = None
                            logger.warning("[BookSkill] NPU 模型加载失败，无法使用")
                    else:
                        self._ai_service = None
                        logger.warning("[BookSkill] 所有 AI 服务均不可用")
            except Exception as e:
                logger.warning(f"[BookSkill] AI 服务获取失败: {e}")
        return self._ai_service

    def _call_ai(self, system_prompt: str, user_message: str) -> Optional[str]:
        """调用 AI 服务"""
        ai = self._get_ai_service()
        if ai is None:
            logger.warning("[BookSkill] AI 服务不可用，使用规则提取")
            return None

        try:
            context = [{"role": "system", "content": system_prompt}]
            response = ai.chat(user_message, context)
            if response and not response.is_error:
                return response.content
        except Exception as e:
            logger.error(f"[BookSkill] AI 调用失败: {e}")

        return None

    def _parse_methodologies_from_ai_response(self, response: str) -> List[Dict[str, Any]]:
        """从 AI 回复中解析方法论列表"""
        # 尝试提取 JSON
        json_match = re.search(r'\[.*?\]', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # 尝试提取被 ```json ``` 包裹的 JSON
        json_block = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', response, re.DOTALL)
        if json_block:
            try:
                return json.loads(json_block.group(1))
            except json.JSONDecodeError:
                pass

        # 规则提取 - 从非结构化文本中提取方法论
        return self._rule_based_extraction(response)

    def _rule_based_extraction(self, text: str) -> List[Dict[str, Any]]:
        """基于规则的提取（AI 不可用时的降级方案）"""
        methodologies = []
        # 按数字序号分割
        sections = re.split(r'\n\s*(?:\d+[.、])\s*', text)
        for section in sections:
            if len(section) < 20:
                continue
            lines = [l.strip() for l in section.split('\n') if l.strip()]
            if not lines:
                continue

            methodology = {
                "name_en": self._generate_en_name(lines[0]),
                "name_cn": lines[0][:20],
                "trigger_scenario": f"遇到与{lines[0][:10]}相关的问题时",
                "description": lines[0] if len(lines) > 0 else "",
                "steps": lines[1:4] if len(lines) > 1 else ["参考原文相关章节"],
                "output_format": "结构化分析报告",
                "examples": ""
            }
            methodologies.append(methodology)

        if not methodologies:
            # 兜底：从文本中提取所有可能的方法论
            methodologies = self._extract_methodologies_fallback(text)

        return methodologies

    def _extract_methodologies_fallback(self, text: str) -> List[Dict[str, Any]]:
        """兜底提取方法"""
        candidate_keywords = [
            "方法", "步骤", "原则", "定律", "模型", "框架",
            "流程", "策略", "技巧", "方法论", "系统"
        ]
        methodologies = []
        sentences = re.split(r'[。！？\n]+', text)
        current_method = {"steps": [], "name_en": "method-1", "name_cn": "方法"}

        for sent in sentences:
            sent = sent.strip()
            if not sent or len(sent) < 5:
                continue
            for kw in candidate_keywords:
                if kw in sent:
                    if current_method["steps"]:
                        methodologies.append(current_method)
                    current_method = {
                        "name_en": self._generate_en_name(sent[:15]),
                        "name_cn": sent[:20],
                        "trigger_scenario": f"需要{sent[:10]}时",
                        "description": sent,
                        "steps": [],
                        "output_format": "分析结果",
                        "examples": ""
                    }
                    break
            else:
                if current_method["steps"] and len(current_method["steps"]) < 5:
                    current_method["steps"].append(sent)

        if current_method["steps"] and current_method not in methodologies:
            methodologies.append(current_method)

        return methodologies if methodologies else [{
            "name_en": "default-method",
            "name_cn": "核心方法",
            "trigger_scenario": "应用本书核心方法时",
            "description": text[:200],
            "steps": ["阅读原文相关章节"],
            "output_format": "行动方案",
            "examples": ""
        }]

    def _generate_en_name(self, text: str) -> str:
        """生成英文名称"""
        # 提取核心关键词
        chars = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', text)[:10]
        return f"method-{hashlib.md5(chars.encode()).hexdigest()[:6]}"

    # ========================================================================
    # 公开 API
    # ========================================================================

    def extract_from_text(self, book_content: str, book_name: str = "", book_author: str = "", llm_model: Optional[str] = None) -> Dict[str, Any]:
        """
        从文本内容提取方法论

        Args:
            book_content: 书籍文本内容
            book_name: 书籍名称
            book_author: 书籍作者

        Returns:
            包含方法论列表和四色卡片数据的字典
        """
        self.usage_count += 1
        self.last_used = datetime.now().isoformat()

        if not book_name:
            # 从内容推断书名
            lines = book_content.strip().split('\n')
            book_name = lines[0][:30] if lines else "未知书籍"
            if not book_author:
                book_author = lines[1][:20] if len(lines) > 1 else ""

        logger.info(f"[BookSkill] 开始提取方法论: {book_name}")

        raw_methodologies = []

        # 尝试 AI 提取
        ai = self._get_ai_service()
        if ai:
            prompt = BOOK_EXTRACTION_PROMPT.format(
                book_content=book_content[:30000]  # 限制长度
            )
            try:
                response = ai.chat(prompt)
                if response and not response.is_error and response.content:
                    raw_methodologies = self._parse_methodologies_from_ai_response(response.content)
            except Exception as e:
                logger.warning(f"[BookSkill] AI 提取失败，使用规则提取: {e}")

        # AI 失败或返回空时的降级
        if not raw_methodologies:
            raw_methodologies = self._extract_methodologies_fallback(book_content[:30000])

        # 构造方法论对象
        methodologies = []
        for i, raw in enumerate(raw_methodologies):
            m = BookMethodology(
                methodology_id=f"BM_{datetime.now().strftime('%Y%m%d')}_{i+1:03d}",
                book_name=book_name,
                book_author=book_author,
                name_en=raw.get("name_en", f"method-{i+1}"),
                name_cn=raw.get("name_cn", f"方法论{i+1}"),
                trigger_scenario=raw.get("trigger_scenario", ""),
                description=raw.get("description", ""),
                steps=raw.get("steps", []),
                output_format=raw.get("output_format", ""),
                examples=raw.get("examples", "")
            )
            methodologies.append(m)
            self._methodologies[m.methodology_id] = m

        # 创建书籍技能数据
        book_data = BookSkillData(
            book_name=book_name,
            book_author=book_author,
            methodologies=methodologies,
            source_type="text",
            total_cards_generated={
                "yellow": len(methodologies),
                "blue": 0,
                "green": 0,
                "red": 0
            }
        )
        self._book_skills[book_data.book_id] = book_data

        # **关键改动**: 将方法论作为四色黄色卡片存入四色系统
        yellow_cards = []
        for m in methodologies:
            card = FourColorBridge.methodology_to_yellow_card(m)
            yellow_cards.append(card)
            m.related_four_color_card_ids.append(
                f"YL_{datetime.now().strftime('%Y%m%d')}_{m.name_en[:8]}"
            )

        # 尝试写入四色卡片系统
        if yellow_cards:
            try:
                from skills.four_color_card_skill import get_four_color_card_skill
                four_color_skill = get_four_color_card_skill()
                # 为每个方法论生成四色卡片
                for card_data in yellow_cards:
                    four_color_skill.extractor.extract_from_text(
                        card_data["content"],
                        source=card_data["source"]
                    )
                logger.info(f"[BookSkill] 已同步 {len(yellow_cards)} 个方法论到四色卡片系统")
            except Exception as e:
                logger.warning(f"[BookSkill] 同步四色卡片失败: {e}")

        return {
            "status": "success",
            "book_skill": book_data.to_dict(),
            "methodologies": [m.to_dict() for m in methodologies],
            "yellow_cards_synced": len(yellow_cards),
            "message": f"成功从《{book_name}》提取 {len(methodologies)} 个核心方法论"
        }

    def extract_from_notes(self, notes: str, book_name: str = "", book_author: str = "") -> Dict[str, Any]:
        """
        从用户笔记/总结中提取方法论
        笔记通常是用户自己总结的四色笔记
        """
        return self.extract_from_text(notes, book_name or "用户笔记", book_author)

    def query_methodology(self, problem: str, book_name: Optional[str] = None) -> Dict[str, Any]:
        """
        根据问题匹配方法论

        Args:
            problem: 用户遇到的问题描述
            book_name: 可选，限定书籍范围

        Returns:
            匹配的方法论和引导方案
        """
        self.usage_count += 1
        self.last_used = datetime.now().isoformat()

        # 获取可用的方法论
        if book_name:
            matching = [m for m in self._methodologies.values() if m.book_name == book_name]
        else:
            matching = list(self._methodologies.values())

        if not matching:
            return {
                "status": "no_methodologies",
                "message": "当前没有已提取的方法论，请先使用书籍提取功能",
                "methodology": None,
                "guide": None
            }

        # 尝试 AI 匹配
        ai = self._get_ai_service()
        if ai:
            methods_json = json.dumps([m.to_dict() for m in matching], ensure_ascii=False, indent=2)
            prompt = PROBLEM_MATCHING_PROMPT.format(
                methodologies_json=methods_json,
                problem=problem
            )
            try:
                response = ai.chat(prompt)
                if response and not response.is_error and response.content:
                    return {
                        "status": "success",
                        "guide": response.content,
                        "matched_methodologies": [m.to_dict() for m in matching[:3]],
                        "book_skills_used": list(set(m.book_name for m in matching[:3]))
                    }
            except Exception as e:
                logger.warning(f"[BookSkill] AI 匹配失败，使用规则匹配: {e}")

        # AI 不可用时基于关键词的规则匹配
        matched = self._keyword_match(problem, matching)

        if matched:
            return {
                "status": "success",
                "guide": self._generate_guide(matched, problem),
                "matched_methodologies": [matched.to_dict()],
                "book_skills_used": [matched.book_name]
            }
        else:
            return {
                "status": "no_match",
                "message": f"未找到匹配的方法论，建议先提取相关书籍",
                "methodology": None,
                "guide": None
            }

    def _keyword_match(self, problem: str, methodologies: List[BookMethodology]) -> Optional[BookMethodology]:
        """基于关键词匹配方法论"""
        problem_lower = problem.lower()
        # 提取关键词
        problem_keywords = set(re.findall(r'[\u4e00-\u9fa5a-zA-Z]+', problem_lower))

        best_match = None
        best_score = 0

        for m in methodologies:
            score = 0
            # 检查触发场景
            trigger_keywords = set(re.findall(r'[\u4e00-\u9fa5a-zA-Z]+', m.trigger_scenario.lower()))
            score += len(problem_keywords & trigger_keywords) * 3

            # 检查描述
            desc_keywords = set(re.findall(r'[\u4e00-\u9fa5a-zA-Z]+', m.description.lower()))
            score += len(problem_keywords & desc_keywords)

            # 检查名称
            name_keywords = set(re.findall(r'[\u4e00-\u9fa5a-zA-Z]+', (m.name_cn + m.name_en).lower()))
            score += len(problem_keywords & name_keywords) * 2

            if score > best_score:
                best_score = score
                best_match = m

        return best_match if best_score > 0 else None

    def _generate_guide(self, methodology: BookMethodology, problem: str) -> str:
        """生成引导说明"""
        steps_text = "\n".join([f"**步骤{i+1}**：{s}" for i, s in enumerate(methodology.steps)])
        return (
            f"## 📖 匹配到《{methodology.book_name}》中的方法论\n"
            f"**「{methodology.name_cn}」**\n\n"
            f"**触发场景**：{methodology.trigger_scenario}\n\n"
            f"**核心内容**：{methodology.description}\n\n"
            f"**执行步骤**：\n{steps_text}\n\n"
            f"**你的问题**：{problem}\n\n"
            f"**💡 建议**：请按照上述步骤逐一操作，如需要可继续深入讨论。"
        )

    def save_case_study(self, book_name: str, methodology_name: str, problem: str, solution: str, outcome: str = "") -> Dict[str, Any]:
        """
        保存案例研究（回填蓝色卡片）

        Args:
            book_name: 书籍名称
            methodology_name: 方法论名称
            problem: 遇到的问题
            solution: 解决方案
            outcome: 结果

        Returns:
            包含蓝色卡片信息的字典
        """
        case = BookCaseStudy(
            case_id=f"CS_{datetime.now().strftime('%Y%m%d')}_{len(self._case_studies)+1:03d}",
            book_name=book_name,
            methodology_name=methodology_name,
            problem=problem,
            solution=solution,
            outcome=outcome
        )
        self._case_studies.append(case)

        # 尝试写入四色系统（蓝色案例卡片）
        try:
            blue_card = FourColorBridge.case_to_blue_card(case)
            from skills.four_color_card_skill import get_four_color_card_skill
            four_color_skill = get_four_color_card_skill()
            four_color_skill.extractor.extract_from_text(
                blue_card["content"],
                source=blue_card["source"]
            )
            logger.info(f"[BookSkill] 案例已同步到四色卡片系统: {case.case_id}")
        except Exception as e:
            logger.warning(f"[BookSkill] 同步案例到四色卡片失败: {e}")

        return {
            "status": "success",
            "case_study": case.to_dict(),
            "message": f"✅ 案例已记录，已生成蓝色卡片：「{methodology_name} - {problem[:20]}...」"
        }

    def get_book_skill(self, book_name: str) -> Optional[Dict[str, Any]]:
        """获取指定书籍的技能数据"""
        book_id = hashlib.md5(book_name.encode()).hexdigest()[:12]
        if book_id in self._book_skills:
            return self._book_skills[book_id].to_dict()
        # 模糊匹配
        for skill in self._book_skills.values():
            if book_name in skill.book_name:
                return skill.to_dict()
        return None

    def list_book_skills(self) -> Dict[str, Any]:
        """列出所有已提取的书籍技能"""
        books = []
        for skill in self._book_skills.values():
            books.append({
                "book_name": skill.book_name,
                "book_author": skill.book_author,
                "book_id": skill.book_id,
                "methodology_count": len(skill.methodologies),
                "extracted_at": skill.extracted_at
            })
        return {
            "total_books": len(books),
            "total_methodologies": len(self._methodologies),
            "total_case_studies": len(self._case_studies),
            "books": books
        }

    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            "name": self.name,
            "description": self.description,
            "enabled": self.enabled,
            "usage_count": self.usage_count,
            "last_used": self.last_used,
            "total_books": len(self._book_skills),
            "total_methodologies": len(self._methodologies),
            "total_case_studies": len(self._case_studies),
            "books": [
                {
                    "book_name": s.book_name,
                    "methodology_count": len(s.methodologies)
                }
                for s in self._book_skills.values()
            ]
        }

    def get_info(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "agent_name": self.agent_name,
            "enabled": self.enabled,
            "last_used": self.last_used,
            "usage_count": self.usage_count
        }


# ============================================================================
# 全局单例
# ============================================================================

_book_skill_generator: Optional[BookSkillGenerator] = None


def get_book_skill_generator() -> BookSkillGenerator:
    """获取 Book Skill 生成器单例"""
    global _book_skill_generator
    if _book_skill_generator is None:
        _book_skill_generator = BookSkillGenerator()
        logger.info("[BookSkill] BookSkillGenerator 初始化完成")
    return _book_skill_generator
