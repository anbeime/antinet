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
import asyncio
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

BOOK_EXTRACTION_PROMPT = """你是一个专业的书籍方法论提取专家，精通从书籍内容中识别和提取可操作的核心方法论。

你的任务：从以下书籍内容中提取所有核心方法论、框架、原则、模型和可执行步骤。

【提取要求】
1. 识别书中明确提出的方法论/框架/原则/模型
2. 每个方法论必须有：
   - 清晰的中英文名称
   - 具体的触发场景（什么情况下使用）
   - 核心内容描述（100-200字）
   - 可操作的执行步骤（3-7步，每步具体说明）
   - 预期产出/输出格式
   - 书中提及的应用案例

3. 提取数量：尽最大可能提取，目标提取 5-20 个方法论
4. 如果书籍内容较少或不完整，至少提取 3 个方法论

【输出格式 - 严格 JSON 数组】
```json
[
  {{
    "name_en": "method-english-name-with-hyphens",
    "name_cn": "方法论中文名称（简洁，10字以内）",
    "trigger_scenario": "具体的触发场景描述，让读者知道何时使用（20-50字）",
    "description": "该方法论的核心思想和内容描述（100-200字）",
    "steps": [
      "步骤1：具体可操作的操作说明（20-50字）",
      "步骤2：具体可操作的操作说明（20-50字）",
      "步骤3：具体可操作的操作说明（20-50字）"
    ],
    "output_format": "使用此方法后应该产出的结果形式（如分析报告、行动计划、决策矩阵等）",
    "examples": "书中引用的具体案例或应用示例（30-100字）"
  }}
]
```

【重要提醒】
- 即使内容中没有明确标注"方法论"字样的框架和原则也要提取
- 每个步骤必须具体可操作，不能是空泛的建议
- 输出必须是纯 JSON 数组，不要包含其他文字

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
        """获取 AI 服务实例（sensenova > nim > NPU 兜底）"""
        try:
            from services.ai.factory import get_sensenova_service, get_ai_service
            
            # 优先使用 sensenova（专为方法论提取任务优化）
            sensenova = get_sensenova_service()
            if sensenova and sensenova.is_available:
                logger.info("[BookSkill] 使用 Sensenova 进行方法论提取")
                return sensenova
            
            # 其次使用 NVIDIA NIM（如果已注册）
            nim = get_ai_service('nim')
            if nim and nim.is_available:
                logger.info("[BookSkill] 使用 NVIDIA NIM 进行方法论提取")
                return nim
            
            # 兜底：本地模型（NPU）- 必须能实际使用
            npu = get_ai_service()  # 默认服务
            if npu and npu.is_available and npu.name != 'sensenova' and npu.name != 'nim':
                # 验证 NPU 是否已真正初始化
                try:
                    if getattr(npu, '_initialized', False) or getattr(npu, '_load_model', lambda: False)():
                        logger.info("[BookSkill] Sensenova 不可用，使用本地 NPU 模型")
                        return npu
                    else:
                        logger.warning("[BookSkill] NPU 模型加载失败")
                except Exception:
                    logger.warning("[BookSkill] NPU 初始化验证失败")
            
            logger.warning("[BookSkill] 所有 AI 服务均不可用")
            return None
        except Exception as e:
            logger.warning(f"[BookSkill] AI 服务获取失败: {e}")
            return None

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
        """基于规则的提取（AI 不可用时的降级方案）- 增强版结构分析"""
        methodologies = []
        
        # 策略1: 按章节/标题分割
        sections = re.split(r'\n\s*(?:第[一二三四五六七八九十\d]+[章节部]|[#]{1,3}\s+|(?:[一二三四五六七八九十\d]+)[.、)）]\s*[^\n]{2,30}(?:\n|$))', text)
        if len(sections) <= 1:
            # 策略2: 按空行分割为大段落
            sections = re.split(r'\n\s*\n', text)
        if len(sections) <= 1:
            # 策略3: 按数字序号分割
            sections = re.split(r'\n\s*(?:\d+[.、)）])\s*', text)
        if len(sections) <= 1:
            # 策略4: 按意义块分割（每3-8行为一组）
            lines = text.strip().split('\n')
            sections = []
            chunk_size = max(3, min(8, len(lines) // 3))
            for i in range(0, len(lines), chunk_size):
                chunk = '\n'.join(lines[i:i+chunk_size])
                if chunk.strip():
                    sections.append(chunk)
        
        for section in sections:
            section = section.strip()
            if len(section) < 30:
                continue
            
            # 尝试提取标题（第一行）
            section_lines = section.split('\n')
            title_candidate = section_lines[0].strip()
            
            # 提取方法论名称
            name_cn = self._extract_methodology_name(section, title_candidate)
            if not name_cn or len(name_cn) < 2:
                continue
            
            # 提取描述
            description = section[:300] if len(section) > 300 else section
            
            # 提取步骤
            steps = self._extract_steps_from_section(section)
            
            # 提取触发场景
            trigger = self._extract_trigger_scenario(section, name_cn)
            
            methodology = {
                "name_en": self._generate_en_name(name_cn),
                "name_cn": name_cn[:30],
                "trigger_scenario": trigger,
                "description": description,
                "steps": steps if steps else ["1. 理解" + name_cn + "的核心概念", "2. 在实践中应用并观察效果", "3. 根据反馈调整和优化"],
                "output_format": self._infer_output_format(section, name_cn),
                "examples": self._extract_examples(section)
            }
            methodologies.append(methodology)
        
        if not methodologies:
            methodologies = self._extract_methodologies_fallback(text)
        
        return methodologies
    
    def _extract_methodology_name(self, section: str, title: str) -> str:
        """从段落中提取方法论名称"""
        # 优先：清理后的标题作为名称
        cleaned_title = re.sub(r'^[#\d一二三四五六七八九十\s.、)）]+', '', title).strip()
        # 去掉过长的标题中的修饰词
        cleaned_title = re.sub(r'(什么是|如何|为什么|怎样|本书|本章|这一[章节部]|前面|下面|我们).{0,10}(讲述|介绍|讨论|探讨|分析|来看|总结)', '', cleaned_title)
        cleaned_title = cleaned_title.strip()
        
        if 2 <= len(cleaned_title) <= 30:
            return cleaned_title
        
        # 尝试从内容中提取方法论名称模式
        patterns = [
            r'[""]([^""]+?)[""]',  # 引号内的概念
            r'(?:核心|关键|重要)(?:的)?(?:方法|原则|定律|模型|框架|概念|理论)[是为]?[：:]\s*([^\n，。,\.]{3,30})',
            r'(?:所谓|即)?[“「]([^”」]{3,25})[”」]',
            r'(?:方法|原则|定律|模型|框架|概念|理论|公式)[：:\s]+([^\n，。,\.]{3,30})',
        ]
        for pattern in patterns:
            match = re.search(pattern, section)
            if match:
                name = match.group(1).strip()
                if 2 <= len(name) <= 30:
                    return name
        
        # 最后手段：取首句的前20个字作为名称
        first_sent = re.split(r'[。！？\n]', section)[0].strip()
        return first_sent[:25] if len(first_sent) > 2 else "关键概念"
    
    def _extract_steps_from_section(self, section: str) -> List[str]:
        """从段落中提取步骤列表"""
        steps = []
        
        # 模式1: 显式数字步骤 (1. xxx 2. xxx 或 1、xxx 2、xxx)
        numbered_steps = re.findall(r'(?:\n|^)\s*(\d+)[.、)）]\s*([^\n]{8,100})', section)
        if len(numbered_steps) >= 2:
            steps = [f"{num}. {step.strip()}" for num, step in numbered_steps[:7]]
            return steps
        
        # 模式2: 顿号/分号分隔的动作序列
        action_seq = re.findall(r'(?:首先|然后|接着|之后|最后|第一步|第二步|第三步|第四步|第五步|第六步|第七步)[：:\s]*([^。！？\n]{6,60})', section)
        if len(action_seq) >= 2:
            steps = [f"{i+1}. {s.strip()}" for i, s in enumerate(action_seq[:7])]
            return steps
        
        # 模式3: 基于标点的分割（分号或句号分隔的短句序列）
        sentences = re.split(r'[；;]', section)
        if 2 <= len(sentences) <= 7:
            short_sentences = [s.strip() for s in sentences if 8 <= len(s.strip()) <= 80]
            if len(short_sentences) >= 2:
                steps = [f"{i+1}. {s}" for i, s in enumerate(short_sentences[:7])]
                return steps
        
        # 模式4: 按句号分割取前几句
        period_sentences = re.split(r'[。]', section)
        meaningful = [s.strip() for s in period_sentences if len(s.strip()) >= 8]
        if len(meaningful) >= 2:
            steps = [f"{i+1}. {s}" for i, s in enumerate(meaningful[:5])]
        
        return steps
    
    def _extract_trigger_scenario(self, section: str, name_cn: str) -> str:
        """提取触发场景"""
        # 查找显式场景描述
        patterns = [
            r'(?:适用|适用场景|触发场景|使用场景|应用场景)[：:\s]*([^\n。]{10,60})',
            r'(?:当|遇到|面对|需要|想要|如果)[^，。,\.\n]{5,30}(?:时|的时候|情况下)',
            r'(?:用于|适用于|适合)[^，。,\.\n]{5,40}(?:的场景|的情况|时)',
        ]
        for pattern in patterns:
            match = re.search(pattern, section)
            if match:
                scenario = match.group(0).strip()
                if len(scenario) >= 6:
                    return scenario[:80]
        
        # 根据方法论名称构造触发场景
        return f"当你需要在{name_cn[:10]}方面做出决策或采取行动时"
    
    def _infer_output_format(self, section: str, name_cn: str) -> str:
        """推断输出格式"""
        format_patterns = [
            (r'(?:产出|输出|结果|生成|得到|形成)[^。]{5,40}(?:报告|方案|计划|分析|列表|矩阵|图表|地图|模型|策略|建议|评估)', None),
            (r'(?:报告|方案|计划|分析|列表|矩阵|图表|地图)', None),
        ]
        for pattern, _ in format_patterns:
            match = re.search(pattern, section)
            if match:
                return match.group(0).strip()[:60]
        
        # 根据内容关键词推断
        if '分析' in section or '诊断' in section or '评估' in section:
            return f"{name_cn[:8]}分析报告"
        elif '清单' in section or '列表' in section or '检查' in section:
            return f"{name_cn[:8]}检查清单"
        elif '计划' in section or '行动' in section or '执行' in section:
            return f"{name_cn[:8]}行动计划"
        elif '模型' in section or '框架' in section:
            return f"{name_cn[:8]}框架图"
        else:
            return f"结构化{name_cn[:8]}方案"
    
    def _extract_examples(self, section: str) -> str:
        """提取应用案例"""
        example_patterns = [
            r'(?:例如|比如|举例|案例|实例)[：:\s]*([^。！？\n]{10,150})',
            r'(?:以|拿)[^，]{3,20}(?:为例|来说明)[：:\s]*([^。！？\n]{10,100})',
        ]
        for pattern in example_patterns:
            match = re.search(pattern, section)
            if match:
                return match.group(0).strip()[:150]
        return ""

    def _extract_methodologies_fallback(self, text: str) -> List[Dict[str, Any]]:
        """终极兜底：基于段落结构和关键词密度提取方法论"""
        methodologies = []
        
        # 策略A: 按段落分割，寻找有方法论特征的段落
        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if len(p.strip()) > 50]
        
        # 强方法论信号词（权重更高）
        strong_signals = [
            '方法', '步骤', '原则', '定律', '模型', '框架', '流程',
            '策略', '技巧', '方法论', '系统', '公式', '法则', '规律',
            '核心', '关键', '重点', '本质', '根本',
        ]
        
        for para in paragraphs:
            # 计算信号分
            score = sum(3 if kw in para else 0 for kw in strong_signals)
            # 数字序号也加分（表示结构化内容）
            score += len(re.findall(r'(?:\n|^)\s*\d+[.、)）]', para)) * 2
            # 步骤词加分
            score += len(re.findall(r'(?:首先|然后|接着|之后|最后|第一|第二|第三)', para))
            # 长度合理加分
            if 60 <= len(para) <= 800:
                score += 1
            
            if score >= 2:
                # 这个段落有方法论潜力
                lines = para.split('\n')
                title = lines[0].strip()
                name_cn = self._extract_methodology_name(para, title)
                steps = self._extract_steps_from_section(para)
                trigger = self._extract_trigger_scenario(para, name_cn)
                
                methodologies.append({
                    "name_en": self._generate_en_name(name_cn),
                    "name_cn": name_cn[:30] if len(name_cn) >= 2 else "重要概念",
                    "trigger_scenario": trigger,
                    "description": para[:300],
                    "steps": steps if steps else [f"1. 理解{name_cn}的定义", f"2. 识别{name_cn}的应用场景", f"3. 实践并验证效果"],
                    "output_format": self._infer_output_format(para, name_cn),
                    "examples": self._extract_examples(para)
                })
        
        # 策略B: 如果段落分析不够，用句子级别提取
        if len(methodologies) < 2:
            sentences = re.split(r'[。！？\n]+', text)
            keyword_sentences = []
            for i, sent in enumerate(sentences):
                sent = sent.strip()
                if len(sent) < 8:
                    continue
                # 找包含关键概念词的句子
                concept_match = re.search(r'(?:是|指|即|——|:|：)\s*([^，。,\.\n；;]{4,40})', sent)
                if concept_match:
                    keyword_sentences.append((i, sent, concept_match.group(1)))
            
            # 将相邻的概念句子分组
            if keyword_sentences:
                groups = []
                current_group = [keyword_sentences[0]]
                for i in range(1, len(keyword_sentences)):
                    prev_idx, _, _ = keyword_sentences[i-1]
                    curr_idx, _, _ = keyword_sentences[i]
                    if curr_idx - prev_idx <= 3:  # 相邻3句内视为同组
                        current_group.append(keyword_sentences[i])
                    else:
                        groups.append(current_group)
                        current_group = [keyword_sentences[i]]
                groups.append(current_group)
                
                for group in groups:
                    if len(group) >= 1:
                        concept_name = group[0][2][:25]
                        group_text = '。'.join(s[1] for s in group)
                        
                        # 跳过已经提取过的
                        if any(concept_name in m.get("name_cn", "") for m in methodologies):
                            continue
                        
                        methods_needed = 5 - len(methodologies)
                        if methods_needed <= 0:
                            break
                        
                        methodologies.append({
                            "name_en": self._generate_en_name(concept_name),
                            "name_cn": concept_name[:30],
                            "trigger_scenario": f"当你需要理解和应用{concept_name[:10]}时",
                            "description": group_text[:300],
                            "steps": [f"1. 理解{concept_name[:15]}的核心定义", f"2. 分析{concept_name[:15]}的实际表现", f"3. 将{concept_name[:15]}应用于具体场景"],
                            "output_format": f"{concept_name[:8]}分析与应用方案",
                            "examples": ""
                        })
        
        # 最终保障：至少返回一个有意义的方法论
        if not methodologies:
            # 取全文前500字的核心摘要
            summary = text[:500].strip()
            first_meaningful_line = ""
            for line in summary.split('\n'):
                cleaned = line.strip()
                if len(cleaned) > 10 and not cleaned.startswith('#'):
                    first_meaningful_line = cleaned[:40]
                    break
            
            methodologies = [{
                "name_en": "core-insight",
                "name_cn": first_meaningful_line if first_meaningful_line else "全书核心观点",
                "trigger_scenario": "当你需要快速把握本书核心思想时",
                "description": summary,
                "steps": [
                    "1. 精读原文，标记核心概念和关键论据",
                    "2. 用自己的话复述每章核心观点",
                    "3. 找出不同观点之间的联系和矛盾",
                    "4. 结合自身经验，思考如何应用这些观点",
                    "5. 记录应用后的结果和反思"
                ],
                "output_format": "书籍核心要点总结与行动计划",
                "examples": ""
            }]
        
        return methodologies

    # ========================================================================
    # 八智能体（锦衣卫）提取：使用 8-Agent 流水线提取四色卡片
    # ========================================================================

    async def extract_via_agents(
        self,
        book_content: str,
        book_name: str = "",
        book_author: str = ""
    ) -> Dict[str, Any]:
        """
        使用 8 智能体（锦衣卫）流水线提取方法论和四色卡片：
        密卷房(预处理) → 通政司(蓝卡) ∥ 监察院(绿卡) ∥ 刑狱司(黄卡)
        → 参谋司(红卡) → 太史阁(存储) → 驿传司(报告)

        当 Sensenova/NPU 不可用时，这是比规则提取更强的降级方案。
        """
        try:
            from routes.eight_agent_engine import EightAgentEngine, FourColorCards

            engine = EightAgentEngine()
            await engine.initialize()

            # 构建查询：让 8-agent 理解这是一次书籍方法论提取任务
            query = f"从《{book_name}》提取核心方法论、关键事实、因果解释、风险警示和行动建议。作者：{book_author}"
            
            context = {
                "source": "book_skill_extraction",
                "book_name": book_name,
                "book_author": book_author,
                "raw_material": book_content[:15000],  # 限制长度给 agent
                "task_type": "book_methodology_extraction",
            }

            result = await engine.process(query, context, user_id="book_skill")

            if result.get("status") != "success":
                logger.warning(f"[BookSkill] 8-Agent 提取失败: {result.get('error')}")
                return {"status": "failed", "error": result.get("error", "agent pipeline failed")}

            # 解析四色卡片结果
            four_color_cards = result.get("four_color_cards", [])
            report = result.get("report", {})
            logs = result.get("logs", [])

            # 将四色卡片转为方法论 + 辅助卡片
            yellow_methods = []
            blue_cards = []
            green_cards = []
            red_cards = []

            for card in four_color_cards:
                ct = card.get("card_type", "")
                if ct == "yellow":
                    # 黄色卡片 → 方法论
                    name_cn = card.get("title", f"方法论-{len(yellow_methods)+1}")
                    content = card.get("content", "")
                    yellow_methods.append({
                        "name_en": self._generate_en_name(name_cn),
                        "name_cn": name_cn[:30],
                        "trigger_scenario": f"应用《{book_name}》中「{name_cn[:15]}」的场景",
                        "description": content[:500],
                        "steps": self._extract_steps_from_section(content),
                        "output_format": card.get("output_format", "分析与应用方案"),
                        "examples": card.get("examples", "")
                    })
                elif ct == "blue":
                    blue_cards.append(card)
                elif ct == "green":
                    green_cards.append(card)
                elif ct == "red":
                    red_cards.append(card)

            return {
                "status": "success",
                "methodologies_raw": yellow_methods,
                "blue_cards": blue_cards,
                "green_cards": green_cards,
                "red_cards": red_cards,
                "report": report.get("content", ""),
                "logs": logs,
                "ai_used": "8-agent-pipeline"
            }

        except ImportError:
            logger.warning("[BookSkill] 8-Agent 引擎未导入，无法使用智能体提取")
            return {"status": "failed", "error": "8-agent engine not available"}
        except Exception as e:
            logger.error(f"[BookSkill] 8-Agent 提取异常: {e}", exc_info=True)
            return {"status": "failed", "error": str(e)}

    # ====================================================================
    # 辅助四色卡片：从方法论内容中提取，而非全书所有句子
    # ====================================================================

    def _extract_cards_from_methodologies(
        self,
        methodologies: List[BookMethodology],
        book_name: str
    ) -> List[Dict[str, Any]]:
        """
        从方法论自身的描述、步骤、案例中提取辅助四色卡片。
        不对全书做句子级全量提取——那是会议纪要模式，不适合书籍长文本。

        每个方法论最多生成 3 张辅助卡片（蓝/绿/红各1），总数可控。
        """
        cards = []

        for m in methodologies:
            # 🔵 蓝色(事实)：从案例/示例中提取
            if m.examples and len(m.examples) > 10:
                cards.append({
                    "card_type": "blue",
                    "card_type_cn": "事实",
                    "title": f"[案例] {m.name_cn}",
                    "content": f"来源《{m.book_name}》，方法论「{m.name_cn}」的书中案例：{m.examples}",
                    "source": f"BookSkill - {book_name}",
                    "tags": ["案例", book_name[:10], m.name_cn[:10]]
                })

            # 🟢 绿色(解释)：从描述中提取核心原理
            if m.description and len(m.description) > 20:
                cards.append({
                    "card_type": "green",
                    "card_type_cn": "解释",
                    "title": f"[原理] {m.name_cn}",
                    "content": f"来源《{m.book_name}》，方法论「{m.name_cn}」的核心原理：{m.description[:300]}",
                    "source": f"BookSkill - {book_name}",
                    "tags": ["原理", "解释", book_name[:10], m.name_cn[:10]]
                })

            # 🔴 红色(行动)：从步骤中提取
            if m.steps and len(m.steps) > 0:
                # 只取前3步作为行动卡片
                action_steps = m.steps[:3]
                steps_text = "；".join(action_steps)
                if len(steps_text) > 10:
                    cards.append({
                        "card_type": "red",
                        "card_type_cn": "行动",
                        "title": f"[行动] {m.name_cn}",
                        "content": f"来源《{m.book_name}》，方法论「{m.name_cn}」的执行步骤：{steps_text}",
                        "source": f"BookSkill - {book_name}",
                        "tags": ["行动", "步骤", book_name[:10], m.name_cn[:10]]
                    })

        # 去重：按标题去重（同一个方法论名只保留一组卡片）
        seen = set()
        unique = []
        for c in cards:
            key = (c["card_type"], c["title"])
            if key not in seen:
                seen.add(key)
                unique.append(c)

        return unique

    def _build_book_card_relations(
        self,
        methodologies: List[BookMethodology],
        four_color_cards: List[Dict[str, Any]]
    ) -> List[Dict[str, str]]:
        """
        参照 FourColorCardExtractor.build_relations() 构建卡片关联：
        - 方法论(黄) ↔ 解释性卡片(绿)：方法论由哪些原理解释支撑
        - 方法论(黄) ↔ 行动卡片(红)：方法论如何落地为行动
        - 事实卡片(蓝) ↔ 解释卡片(绿)：事实如何被解释
        """
        relations = []
        method_names = {m.name_cn for m in methodologies}

        # 为每个方法论找到相关的绿色(解释)和红色(行动)卡片
        for m in methodologies:
            m_keywords = set(re.findall(r'[\u4e00-\u9fa5]+', m.name_cn + m.description))
            for card in four_color_cards:
                card_text = card.get("content", "")
                card_keywords = set(re.findall(r'[\u4e00-\u9fa5]+', card_text))
                overlap = len(m_keywords & card_keywords)

                if overlap >= 2:
                    if card.get("card_type") == "green":
                        relations.append({
                            "from_methodology": m.name_cn,
                            "to_card": card.get("title", ""),
                            "relation": "explained_by",
                            "label": "📘原理支撑",
                            "strength": min(overlap / 10, 1.0)
                        })
                    elif card.get("card_type") == "red":
                        relations.append({
                            "from_methodology": m.name_cn,
                            "to_card": card.get("title", ""),
                            "relation": "implemented_by",
                            "label": "🔴行动方案",
                            "strength": min(overlap / 10, 1.0)
                        })

        # 事实(蓝) ↔ 解释(绿) 关联：相邻且关键词重叠
        blue_indices = [i for i, c in enumerate(four_color_cards) if c.get("card_type") == "blue"]
        green_indices = [i for i, c in enumerate(four_color_cards) if c.get("card_type") == "green"]
        for bi in blue_indices:
            for gi in green_indices:
                if abs(bi - gi) <= 3:  # 位置相邻
                    b_text = four_color_cards[bi].get("content", "")
                    g_text = four_color_cards[gi].get("content", "")
                    b_kw = set(re.findall(r'[\u4e00-\u9fa5]+', b_text))
                    g_kw = set(re.findall(r'[\u4e00-\u9fa5]+', g_text))
                    overlap = len(b_kw & g_kw)
                    if overlap >= 2:
                        relations.append({
                            "from_card": four_color_cards[bi].get("title", ""),
                            "to_card": four_color_cards[gi].get("title", ""),
                            "relation": "explains",
                            "label": "🔵→🟢 事实解释",
                            "strength": min(overlap / 8, 1.0)
                        })
                        break  # 每个蓝卡只关联最近的绿卡

        # 去重 + 按强度排序
        seen = set()
        unique_relations = []
        for r in sorted(relations, key=lambda x: -x.get("strength", 0)):
            key = (r.get("from_methodology", r.get("from_card", "")),
                   r.get("to_card", ""), r.get("relation", ""))
            if key not in seen:
                seen.add(key)
                unique_relations.append(r)

        return unique_relations[:50]  # 最多50条关联

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
            lines = book_content.strip().split('\n')
            book_name = lines[0][:30] if lines else "未知书籍"
            if not book_author:
                book_author = lines[1][:20] if len(lines) > 1 else ""

        logger.info(f"[BookSkill] 开始提取方法论: {book_name}，内容长度: {len(book_content)} 字符")

        raw_methodologies = []
        ai_used = None
        ai_error = None
        agent_blue = []
        agent_green = []
        agent_red = []
        
        # 截断过长内容（保留前30000字符）
        trimmed_content = book_content[:30000]

        # 尝试1: Sensenova 云 AI 提取
        try:
            from services.ai.factory import get_sensenova_service
            sensenova = get_sensenova_service()
            if sensenova and sensenova.is_available:
                prompt = BOOK_EXTRACTION_PROMPT.format(book_content=trimmed_content)
                logger.info(f"[BookSkill] 尝试 Sensenova 云 AI 提取 ({len(trimmed_content)} 字符)")
                response = sensenova.chat(prompt)
                if response and not response.is_error and response.content:
                    raw_methodologies = self._parse_methodologies_from_ai_response(response.content)
                    if raw_methodologies:
                        ai_used = "sensenova"
                        logger.info(f"[BookSkill] Sensenova 成功提取 {len(raw_methodologies)} 个方法论")
                elif response and response.is_error:
                    ai_error = response.error
                    logger.warning(f"[BookSkill] Sensenova 返回错误: {ai_error}")
        except Exception as e:
            ai_error = str(e)
            logger.warning(f"[BookSkill] Sensenova 调用异常: {e}")

        # 尝试2: 如果 Sensenova 失败，尝试 NIM
        if not raw_methodologies:
            try:
                from services.ai.factory import get_ai_service
                nim = get_ai_service('nim')
                if nim and nim.is_available:
                    prompt = BOOK_EXTRACTION_PROMPT.format(book_content=trimmed_content)
                    logger.info(f"[BookSkill] 尝试 NVIDIA NIM 提取")
                    response = nim.chat(prompt)
                    if response and not response.is_error and response.content:
                        raw_methodologies = self._parse_methodologies_from_ai_response(response.content)
                        if raw_methodologies:
                            ai_used = "nim"
                            logger.info(f"[BookSkill] NIM 成功提取 {len(raw_methodologies)} 个方法论")
                    elif response and response.is_error:
                        ai_error = ai_error or response.error
                        logger.warning(f"[BookSkill] NIM 返回错误: {response.error}")
            except Exception as e:
                ai_error = ai_error or str(e)
                logger.warning(f"[BookSkill] NIM 调用异常: {e}")

        # 尝试3: 如果 NIM 也失败，尝试 NPU
        if not raw_methodologies:
            try:
                from services.ai.factory import get_ai_service
                npu = get_ai_service()  # 默认服务（NPU）
                if npu and npu.is_available and npu.name != 'sensenova' and npu.name != 'nim':
                    prompt = BOOK_EXTRACTION_PROMPT.format(book_content=trimmed_content)
                    logger.info(f"[BookSkill] 尝试 NPU ({npu.name}) 提取")
                    response = npu.chat(prompt)
                    if response and not response.is_error and response.content:
                        raw_methodologies = self._parse_methodologies_from_ai_response(response.content)
                        if raw_methodologies:
                            ai_used = npu.name
                            logger.info(f"[BookSkill] NPU 成功提取 {len(raw_methodologies)} 个方法论")
                    elif response and response.is_error:
                        ai_error = ai_error or response.error
                        logger.warning(f"[BookSkill] NPU 返回错误: {response.error}")
            except Exception as e:
                ai_error = ai_error or str(e)
                logger.warning(f"[BookSkill] NPU 调用异常: {e}")

        # 尝试3: 8-Agent 锦衣卫流水线（AI不可用时的强降级）
        if not raw_methodologies:
            logger.info(f"[BookSkill] 尝试 8-Agent 锦衣卫流水线提取...")
            try:
                agent_result = asyncio.run(
                    self.extract_via_agents(trimmed_content, book_name, book_author)
                )
                if agent_result.get("status") == "success" and agent_result.get("methodologies_raw"):
                    raw_methodologies = agent_result["methodologies_raw"]
                    ai_used = "8-agent-pipeline"
                    agent_blue = agent_result.get("blue_cards", [])
                    agent_green = agent_result.get("green_cards", [])
                    agent_red = agent_result.get("red_cards", [])
                    logger.info(f"[BookSkill] 8-Agent 成功提取 {len(raw_methodologies)} 方法论 + {len(agent_blue)+len(agent_green)+len(agent_red)} 辅助卡片")
                else:
                    ai_error = ai_error or agent_result.get("error", "8-agent no result")
                    logger.warning(f"[BookSkill] 8-Agent 未产生结果: {agent_result.get('error')}")
            except Exception as e:
                ai_error = ai_error or str(e)
                logger.warning(f"[BookSkill] 8-Agent 调用失败: {e}")

        # 尝试4: 规则提取（所有方案都不可用时的降级）
        if not raw_methodologies:
            logger.info(f"[BookSkill] AI 提取不可用 ({ai_error})，使用规则提取")
            raw_methodologies = self._rule_based_extraction(trimmed_content)
            if raw_methodologies:
                logger.info(f"[BookSkill] 规则提取获得 {len(raw_methodologies)} 个候选方法论")
            else:
                logger.info(f"[BookSkill] 规则提取无结果，使用最终兜底提取")

        # 最终兜底
        if not raw_methodologies:
            raw_methodologies = self._extract_methodologies_fallback(trimmed_content)
            logger.info(f"[BookSkill] 最终兜底提取获得 {len(raw_methodologies)} 个方法论")

        # 构造方法论对象（规则提取时限制数量，避免泛滥）
        max_methods = 20 if not ai_used else len(raw_methodologies)  # AI可用时全保留，规则提取限20
        raw_methodologies = raw_methodologies[:max_methods]
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

        # ====================================================================
        # 辅助四色卡片：优先使用 8-Agent 的蓝绿红卡片，否则从方法论内容提取
        # ====================================================================
        if ai_used == "8-agent-pipeline" and (agent_blue or agent_green or agent_red):
            # 使用 8-Agent 流水线直接生成的辅助卡片
            supplementary_cards = []
            for c in agent_blue:
                supplementary_cards.append({
                    "card_type": "blue", "card_type_cn": "事实",
                    "title": c.get("title", "事实")[:40],
                    "content": c.get("content", ""),
                    "source": f"8-Agent通政司 - {book_name}",
                    "tags": c.get("tags", ["事实", book_name[:10]])
                })
            for c in agent_green:
                supplementary_cards.append({
                    "card_type": "green", "card_type_cn": "解释",
                    "title": c.get("title", "解释")[:40],
                    "content": c.get("content", ""),
                    "source": f"8-Agent监察院 - {book_name}",
                    "tags": c.get("tags", ["解释", book_name[:10]])
                })
            for c in agent_red:
                supplementary_cards.append({
                    "card_type": "red", "card_type_cn": "行动",
                    "title": c.get("title", "行动")[:40],
                    "content": c.get("content", ""),
                    "source": f"8-Agent参谋司 - {book_name}",
                    "tags": c.get("tags", ["行动", book_name[:10]])
                })
            # 同时从方法论自身也提取一份（合并去重）
            extra_cards = self._extract_cards_from_methodologies(methodologies, book_name)
            seen_titles = {(c["card_type"], c["title"]) for c in supplementary_cards}
            for c in extra_cards:
                if (c["card_type"], c["title"]) not in seen_titles:
                    seen_titles.add((c["card_type"], c["title"]))
                    supplementary_cards.append(c)
        else:
            supplementary_cards = self._extract_cards_from_methodologies(methodologies, book_name)

        supp_stats = {"blue": 0, "green": 0, "red": 0, "total": 0}
        for c in supplementary_cards:
            ct = c.get("card_type", "blue")
            supp_stats[ct] = supp_stats.get(ct, 0) + 1
            supp_stats["total"] += 1

        # 合并统计
        cards_statistics = {
            "yellow": len(methodologies),
            "blue": supp_stats["blue"],
            "green": supp_stats["green"],
            "red": supp_stats["red"],
            "total": len(methodologies) + supp_stats["total"]
        }

        # 生成黄色卡片数据
        yellow_cards = []
        for m in methodologies:
            card = FourColorBridge.methodology_to_yellow_card(m)
            yellow_cards.append(card)
            m.related_four_color_card_ids.append(
                f"YL_{datetime.now().strftime('%Y%m%d')}_{m.name_en[:8]}"
            )

        # 构建关联（方法论 ↔ 辅助卡片）
        relations = self._build_book_card_relations(methodologies, supplementary_cards)

        # 创建书籍技能数据
        book_data = BookSkillData(
            book_name=book_name,
            book_author=book_author,
            methodologies=methodologies,
            source_type="text",
            total_cards_generated=cards_statistics
        )
        self._book_skills[book_data.book_id] = book_data

        # 同步到四色卡片系统
        synced_count = 0
        try:
            from skills.four_color_card_skill import get_four_color_card_skill
            four_color_skill = get_four_color_card_skill()
            # 同步方法论黄色卡片
            for card_data in yellow_cards:
                four_color_skill.extractor.extract_from_text(
                    card_data["content"],
                    source=card_data["source"]
                )
                synced_count += 1
            # 同步辅助卡片
            for card_info in supplementary_cards:
                four_color_skill.extractor.extract_from_text(
                    card_info["content"],
                    source=f"BookSkill - {book_name}"
                )
                synced_count += 1
            logger.info(f"[BookSkill] 已同步 {synced_count} 张卡片（方法论:{len(methodologies)} 辅助:{supp_stats['total']}）")
        except Exception as e:
            logger.warning(f"[BookSkill] 同步四色卡片失败: {e}")

        return {
            "status": "success",
            "book_skill": book_data.to_dict(),
            "methodologies": [m.to_dict() for m in methodologies],
            "yellow_cards_synced": len(yellow_cards),
            "ai_source": ai_used or "rule-based",
            "ai_error": ai_error,
            "cards_statistics": cards_statistics,
            "cards": supplementary_cards,
            "relations": relations,
            "message": f"成功从《{book_name}》提取 {len(methodologies)} 个核心方法论" +
                       (f"（AI: {ai_used}）" if ai_used else "（规则提取）") +
                       (f"，+{supp_stats['total']}张辅助卡片" if supp_stats['total'] > 0 else "") +
                       f"（蓝{supp_stats['blue']} 绿{supp_stats['green']} 红{supp_stats['red']}）"
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
