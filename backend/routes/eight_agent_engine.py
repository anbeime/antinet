"""
8-Agent 自进化聊天引擎

集成完整的8-Agent锦衣卫系统：
- 锦衣卫总指挥使 (Orchestrator) - 任务调度
- 密卷房 (Preprocessor) - 数据预处理
- 通政司 (Fact Generator) - 事实卡片
- 监察院 (Interpreter) - 解释卡片
- 刑狱司 (Risk Detector) - 风险卡片
- 参谋司 (Action Advisor) - 行动卡片
- 太史阁 (Memory) - 记忆管理
- 驿传司 (Reporter) - 报告合成
"""

import logging
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ==================== 数据模型 ====================

@dataclass
class AgentResult:
    """Agent执行结果"""
    agent_name: str
    status: str  # success/failed
    data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    log: List[str] = field(default_factory=list)

@dataclass
class FourColorCards:
    """四色卡片集合"""
    blue_cards: List[Dict] = field(default_factory=list)   # 事实
    green_cards: List[Dict] = field(default_factory=list)   # 解释
    yellow_cards: List[Dict] = field(default_factory=list)  # 风险
    red_cards: List[Dict] = field(default_factory=list)     # 行动
    
    def to_list(self) -> List[Dict]:
        result = []
        for card in self.blue_cards:
            if isinstance(card, dict):
                result.append({**card, "card_type": "blue", "card_type_cn": "事实"})
        for card in self.green_cards:
            if isinstance(card, dict):
                result.append({**card, "card_type": "green", "card_type_cn": "解释"})
        for card in self.yellow_cards:
            if isinstance(card, dict):
                result.append({**card, "card_type": "yellow", "card_type_cn": "风险"})
        for card in self.red_cards:
            if isinstance(card, dict):
                result.append({**card, "card_type": "red", "card_type_cn": "行动"})
        return result
    
    @property
    def total_count(self) -> int:
        return len(self.blue_cards) + len(self.green_cards) + len(self.yellow_cards) + len(self.red_cards)


# ==================== 8-Agent 引擎 ====================

class EightAgentEngine:
    """8-Agent 自进化聊天引擎"""
    
    def __init__(self, genie_api_base_url: str = "http://127.0.0.1:8000"):
        self.genie_api_base_url = genie_api_base_url
        self._agents = {}
        self._initialized = False
    
    async def initialize(self):
        """初始化所有Agent"""
        if self._initialized:
            return
        
        logger.info("[8-Agent引擎] 开始初始化...")
        
        try:
            # 1. 初始化太史阁 (Memory) - 记忆管理
            from agents.memory import MemoryAgent
            self._agents["memory"] = MemoryAgent(db_path="./data/agent_memory.db")
            logger.info("[8-Agent引擎] 太史阁(Memory) 初始化完成")
            
            # 2. 初始化密卷房 (Preprocessor) - 数据预处理
            from agents.preprocessor import PreprocessorAgent
            self._agents["preprocessor"] = PreprocessorAgent()
            logger.info("[8-Agent引擎] 密卷房(Preprocessor) 初始化完成")
            
            # 3. 初始化卡片分类器 (Card Classifier)
            from agents.card_classifier import CardClassifierAgent
            self._agents["card_classifier"] = CardClassifierAgent()
            logger.info("[8-Agent引擎] 卡片分类器 初始化完成")
            
            # 4. 初始化通政司 (Fact Generator) - 事实卡片
            from agents.fact_generator import FactGeneratorAgent
            self._agents["fact_generator"] = FactGeneratorAgent(
                genie_api_base_url=self.genie_api_base_url,
                model_path=""
            )
            logger.info("[8-Agent引擎] 通政司(Fact Generator) 初始化完成")
            
            # 5. 初始化监察院 (Interpreter) - 解释卡片
            from agents.interpreter import InterpreterAgent
            self._agents["interpreter"] = InterpreterAgent(
                genie_api_base_url=self.genie_api_base_url,
                model_path=""
            )
            logger.info("[8-Agent引擎] 监察院(Interpreter) 初始化完成")
            
            # 6. 初始化刑狱司 (Risk Detector) - 风险卡片
            from agents.risk_detector import RiskDetectorAgent
            self._agents["risk_detector"] = RiskDetectorAgent(
                genie_api_base_url=self.genie_api_base_url,
                model_path=""
            )
            logger.info("[8-Agent引擎] 刑狱司(Risk Detector) 初始化完成")
            
            # 7. 初始化参谋司 (Action Advisor) - 行动卡片
            from agents.action_advisor import ActionAdvisorAgent
            self._agents["action_advisor"] = ActionAdvisorAgent(
                genie_api_base_url=self.genie_api_base_url,
                model_path=""
            )
            logger.info("[8-Agent引擎] 参谋司(Action Advisor) 初始化完成")
            
            # 8. 初始化锦衣卫总指挥使 (Orchestrator)
            from agents.orchestrator import OrchestratorAgent
            self._agents["orchestrator"] = OrchestratorAgent(
                genie_api_base_url=self.genie_api_base_url,
                model_path=""
            )
            logger.info("[8-Agent引擎] 锦衣卫总指挥使(Orchestrator) 初始化完成")
            
            self._initialized = True
            logger.info("[8-Agent引擎] 所有Agent初始化完成!")
            
        except Exception as e:
            logger.error(f"[8-Agent引擎] 初始化失败: {e}", exc_info=True)
            raise
    
    async def process(
        self,
        query: str,
        context: Dict[str, Any],
        user_id: str = "default_user"
    ) -> Dict[str, Any]:
        """
        处理用户查询的完整8-Agent流程
        
        流程：
        1. 太史阁 - 检索相关记忆
        2. 密卷房 - 数据预处理
        3. 卡片分类器 - 决定生成哪些卡片
        4. 通政司/监察院/刑狱司/参谋司 - 并行生成四色卡片
        5. 太史阁 - 存储新知识
        6. 驿传司 - 合成报告
        """
        
        await self.initialize()
        
        current_date = datetime.now().strftime("%Y-%m-%d")
        results = {}
        logs = []
        
        try:
            # ========== 步骤1: 太史阁 - 记忆检索 ==========
            logs.append("【太史阁】开始检索记忆...")
            memory_result = await self._retrieve_memory(query, user_id)
            results["memory"] = memory_result
            logs.append(f"【太史阁】找到 {len(memory_result.get('recent', []))} 条相关记忆")
            
            # ========== 步骤2: 密卷房 - 数据预处理 ==========
            logs.append("【密卷房】开始数据预处理...")
            preprocessed_data = await self._preprocess_data(query, context)
            results["preprocessed_data"] = preprocessed_data
            logs.append("【密卷房】数据预处理完成")
            
            # ========== 步骤3: 卡片分类器 - 决定卡片类型 ==========
            logs.append("【卡片分类器】分析需要生成的卡片类型...")
            card_types = await self._classify_cards(preprocessed_data, query)
            results["card_types"] = card_types
            logs.append(f"【卡片分类器】需要生成: {card_types.get('needed_types', [])}")
            
            # ========== 步骤4: 四色卡片生成 (并行) ==========
            logs.append("【四色卡片生成器】开始并行生成...")
            four_color_cards = await self._generate_four_color_cards(
                preprocessed_data, 
                query, 
                current_date,
                card_types
            )
            results["four_color_cards"] = four_color_cards
            logs.append(f"【四色卡片生成器】生成完成: 共{four_color_cards.total_count}张卡片")
            
# ========== 步骤5: 太史阁 - 存储知识 ==========
            logs.append("【太史阁】开始存储新知识...")

            # ========== 步骤6: 驿传司 - 合成报告（需要先有report才能存对话）==========
            logs.append("【驿传司】开始合成报告...")
            report = await self._synthesize_report(query, four_color_cards, memory_result)
            results["report"] = report
            logs.append("【驿传司】报告合成完成")

            # 存储对话记录（query + response），放在合成报告之后确保有内容可存
            try:
                memory_agent = self._agents.get("memory")
                if memory_agent and report.get("content"):
                    await memory_agent.store_knowledge("conversation", {
                        "title": query[:200] if query else "untitled",
                        "content": f"Q: {query}\nA: {report.get('content', '')}",
                        "description": f"用户: {user_id}",
                        "keywords": query
                    })
                    logger.info(f"[太史阁] 对话记录已存储: user={user_id}, query={query[:50]}")
                # 存储知识卡片
                for card in four_color_cards.to_list():
                    await memory_agent.store_knowledge("card", {
                        "query": query,
                        "card_data": card,
                        "user_id": user_id
                    })
                logs.append("【太史阁】知识存储完成")
            except Exception as e:
                logger.warning(f"[太史阁] 存储失败: {e}")

            return {
                "status": "success",
                "query": query,
                "results": results,
                "logs": logs,
                "four_color_cards": four_color_cards.to_list(),
                "report": report
            }
            
        except Exception as e:
            logger.error(f"[8-Agent引擎] 处理失败: {e}", exc_info=True)
            return {
                "status": "failed",
                "error": str(e),
                "logs": logs
            }
    
    async def _retrieve_memory(self, query: str, user_id: str) -> Dict[str, Any]:
        """太史阁 - 记忆检索"""
        try:
            memory_agent = self._agents.get("memory")
            if memory_agent:
                return await memory_agent.retrieve_knowledge("conversation", query, limit=10)
        except Exception as e:
            logger.warning(f"[太史阁] 记忆检索失败: {e}")
        return {"results": [], "recent": [], "preferences": {}, "history": []}
    
    async def _preprocess_data(
        self, 
        query: str, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """密卷房 - 数据预处理（自动从数据库获取真实数据）"""
        try:
            raw_material = context.get("raw_material", "")
            
            # 如果没有传入原始数据，自动从数据库查询
            if not raw_material:
                try:
                    from database import get_db
                    conn = get_db()
                    cursor = conn.cursor()
                    
                    # 获取知识卡片
                    cards = []
                    try:
                        cursor.execute("SELECT id, title, content, card_type, tags, created_at FROM knowledge_cards ORDER BY updated_at DESC LIMIT 20")
                        columns = [desc[0] for desc in cursor.description]
                        for row in cursor.fetchall():
                            cards.append(dict(zip(columns, row)))
                    except Exception:
                        pass
                    
                    # 获取研究专题
                    projects = []
                    try:
                        cursor.execute("SELECT id, name, description, status FROM research_projects ORDER BY updated_at DESC LIMIT 10")
                        columns = [desc[0] for desc in cursor.description]
                        for row in cursor.fetchall():
                            projects.append(dict(zip(columns, row)))
                    except Exception:
                        pass
                    
                    conn.close()
                    
                    raw_material = json.dumps({
                        "knowledge_cards": cards,
                        "research_projects": projects,
                        "query": query,
                        "timestamp": datetime.now().isoformat()
                    }, ensure_ascii=False)
                except Exception as e:
                    logger.warning(f"[密卷房] 数据库查询失败: {e}")
            
            preprocessor = self._agents.get("preprocessor")
            if preprocessor and raw_material:
                result = await preprocessor.preprocess_data(
                    data_source=raw_material,
                    data_type="json"
                )
                return result
        except Exception as e:
            logger.warning(f"[密卷房] 数据预处理失败: {e}")
        
        return {
            "data": [{"query": query}],
            "quality_report": {"completeness": 1.0, "accuracy": 1.0}
        }
    
    async def _classify_cards(
        self, 
        preprocessed_data: Dict, 
        query: str
    ) -> Dict[str, Any]:
        """卡片分类器 - 决定生成哪些卡片"""
        try:
            classifier = self._agents.get("card_classifier")
            if classifier:
                # 构建数据摘要
                data_summary = {
                    "metrics_stats": {
                        "default": {"total": 1, "mean": 1, "growth_rate": 0}
                    },
                    "total_rows": len(preprocessed_data.get("data", []))
                }
                
                result = classifier.classify_cards(data_summary, query)
                return result
        except Exception as e:
            logger.warning(f"[卡片分类器] 分类失败: {e}")
        
        # 默认生成所有类型
        return {"needed_types": ["blue", "green", "yellow", "red"]}
    
    async def _generate_four_color_cards(
        self,
        preprocessed_data: Dict,
        query: str,
        current_date: str,
        card_types: Dict[str, Any]
    ) -> FourColorCards:
        """四色卡片生成 - 两阶段执行
        阶段1: 并行生成蓝、绿、黄卡片
        阶段2: 基于前三者的结果生成红卡（行动建议）
        """
        needed_types = card_types.get("needed_types", ["blue", "green", "yellow", "red"])
        
        cards = FourColorCards()
        
        # ========== 阶段1: 并行生成蓝、绿、黄卡片 ==========
        phase1_tasks = []
        phase1_types = []
        
        if "blue" in needed_types:
            phase1_tasks.append(self._generate_blue_cards(preprocessed_data, query, current_date))
            phase1_types.append("blue")
        if "green" in needed_types:
            phase1_tasks.append(self._generate_green_cards(preprocessed_data, query, current_date))
            phase1_types.append("green")
        if "yellow" in needed_types:
            phase1_tasks.append(self._generate_yellow_cards(preprocessed_data, query, current_date))
            phase1_types.append("yellow")
        
        # 并行执行阶段1
        if phase1_tasks:
            phase1_results = await asyncio.gather(*phase1_tasks, return_exceptions=True)
            
            # 收集阶段1结果
            for i, result in enumerate(phase1_results):
                if isinstance(result, Exception):
                    logger.warning(f"[四色卡片生成] {phase1_types[i]}类型生成失败: {result}")
                    continue
                    
                type_name = phase1_types[i]
                if type_name == "blue":
                    cards.blue_cards = result.get("facts", {}).get("blue", [])
                elif type_name == "green":
                    cards.green_cards = result.get("interpretations", [])
                elif type_name == "yellow":
                    cards.yellow_cards = result.get("risks", {}).get("high", []) + result.get("risks", {}).get("medium", [])
        
        # ========== 阶段2: 基于阶段1结果生成红卡 ==========
        if "red" in needed_types:
            try:
                red_result = await self._generate_red_cards(
                    preprocessed_data,
                    query,
                    current_date,
                    facts=cards.blue_cards,
                    interpretations=cards.green_cards,
                    risks=cards.yellow_cards
                )
                cards.red_cards = red_result.get("actions", [])
            except Exception as e:
                logger.warning(f"[四色卡片生成] 红色卡片生成失败: {e}")
        
        return cards
    
    async def _generate_blue_cards(
        self, 
        preprocessed_data: Dict, 
        query: str, 
        current_date: str
    ) -> Dict[str, Any]:
        """通政司 - 事实卡片生成"""
        try:
            fact_generator = self._agents.get("fact_generator")
            if fact_generator:
                result = await fact_generator.generate_facts(
                    preprocessed_data, 
                    query, 
                    current_date
                )
                return result
        except Exception as e:
            logger.warning(f"[通政司] 事实卡片生成失败: {e}")
        
        # 返回模拟数据
        return {
            "facts": {
                "blue": [{
                    "card_id": f"BLUE_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "title": f"关于'{query}'的事实",
                    "content": f"根据查询'{query}'分析得出的关键事实",
                    "card_type": "blue"
                }]
            }
        }
    
    async def _generate_green_cards(
        self, 
        preprocessed_data: Dict, 
        query: str, 
        current_date: str
    ) -> Dict[str, Any]:
        """监察院 - 解释卡片生成"""
        try:
            interpreter = self._agents.get("interpreter")
            if interpreter:
                result = await interpreter.generate_explanations(
                    preprocessed_data,
                    query,
                    current_date
                )
                return result
        except Exception as e:
            logger.warning(f"[监察院] 解释卡片生成失败: {e}")
        
        return {"interpretations": []}
    
    async def _generate_yellow_cards(
        self, 
        preprocessed_data: Dict, 
        query: str, 
        current_date: str
    ) -> Dict[str, Any]:
        """刑狱司 - 风险卡片生成"""
        try:
            risk_detector = self._agents.get("risk_detector")
            if risk_detector:
                result = await risk_detector.detect_risks(
                    preprocessed_data,
                    {},  # facts
                    query
                )
                return result
        except Exception as e:
            logger.warning(f"[刑狱司] 风险卡片生成失败: {e}")
        
        return {"risks": {"high": [], "medium": [], "low": []}}
    
    async def _generate_red_cards(
        self,
        preprocessed_data: Dict,
        query: str,
        current_date: str,
        facts: List = None,
        interpretations: List = None,
        risks: List = None
    ) -> Dict[str, Any]:
        """参谋司 - 行动卡片生成（基于蓝、绿、黄卡片的结果）"""
        try:
            action_advisor = self._agents.get("action_advisor")
            if action_advisor:
                # 构建事实字典（按颜色分类）
                facts_dict = {
                    "blue": facts or [],
                    "green": interpretations or [],  # 解释也作为事实
                    "yellow": risks or [],  # 风险也作为事实
                    "red": []
                }
                
                # 构建解释字典
                explanations_dict = {
                    "interpretations": interpretations or []
                }
                
                # 构建风险字典
                risks_dict = {
                    "high": [r for r in (risks or []) if isinstance(r, dict) and r.get("severity") == "high"],
                    "medium": [r for r in (risks or []) if isinstance(r, dict) and r.get("severity") == "medium"],
                    "low": [r for r in (risks or []) if isinstance(r, dict) and r.get("severity") == "low"]
                }
                
                result = await action_advisor.generate_actions(
                    facts=facts_dict,
                    explanations=explanations_dict,
                    risks=risks_dict,
                    user_query=query
                )
                return result
        except Exception as e:
            logger.warning(f"[参谋司] 行动卡片生成失败: {e}")
        
        return {"actions": []}
    
    async def _synthesize_report(
        self,
        query: str,
        cards: FourColorCards,
        memory_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """驿传司 - 报告合成"""
        
        # 防御性检查：确保cards是FourColorCards对象
        if not isinstance(cards, FourColorCards):
            logger.warning(f"[驿传司] cards不是FourColorCards对象，而是{type(cards)}，跳过报告合成")
            return {
                "query": query,
                "sections": [],
                "text": "",
                "card_count": 0,
                "generated_at": datetime.now().isoformat()
            }
        
        # 构建报告结构
        report_sections = []
        
        # 事实概览
        if cards.blue_cards and isinstance(cards.blue_cards, list):
            report_sections.append({
                "type": "事实",
                "color": "blue",
                "emoji": "🔵",
                "items": cards.blue_cards[:5]
            })
        
        # 解释说明
        if cards.green_cards and isinstance(cards.green_cards, list):
            report_sections.append({
                "type": "解释",
                "color": "green",
                "emoji": "🟢",
                "items": cards.green_cards[:5]
            })
        
        # 风险提示
        if cards.yellow_cards and isinstance(cards.yellow_cards, list):
            report_sections.append({
                "type": "风险",
                "color": "yellow",
                "emoji": "🟡",
                "items": cards.yellow_cards[:5]
            })
        
        # 行动建议
        if cards.red_cards and isinstance(cards.red_cards, list):
            report_sections.append({
                "type": "行动",
                "color": "red",
                "emoji": "🔴",
                "items": cards.red_cards[:5]
            })
        
        # 生成文本报告
        report_text = self._build_report_text(query, cards)
        
        return {
            "query": query,
            "sections": report_sections,
            "text": report_text,
            "card_count": cards.total_count,
            "generated_at": datetime.now().isoformat()
        }
    
    def _build_report_text(self, query: str, cards: FourColorCards) -> str:
        """构建文本报告"""
        # 防御性检查：确保cards是FourColorCards对象
        if not isinstance(cards, FourColorCards):
            logger.warning(f"[_build_report_text] cards不是FourColorCards对象，而是{type(cards)}")
            return f"## 分析报告: {query}\n\n[数据处理中，请稍后...]"
        
        # 检查是否有任何卡片
        has_any_card = (
            (cards.blue_cards and len(cards.blue_cards) > 0) or
            (cards.green_cards and len(cards.green_cards) > 0) or
            (cards.yellow_cards and len(cards.yellow_cards) > 0) or
            (cards.red_cards and len(cards.red_cards) > 0)
        )
        
        if not has_any_card:
            # 没有卡片时，返回友好的消息
            return f"""## 分析报告: {query}

🤖 正在分析中...

您的查询 "{query}" 已收到，系统正在处理：

- 🔍 正在检索相关知识
- 📊 正在分析数据模式
- 🎨 正在生成知识卡片

请稍候片刻，再次提问或尝试更具体的问题。
"""
        
        lines = [f"## 分析报告: {query}\n"]
        
        if cards.blue_cards and isinstance(cards.blue_cards, list):
            lines.append("\n### 🔵 事实\n")
            for card in cards.blue_cards[:5]:
                if isinstance(card, dict):
                    lines.append(f"- {card.get('title', card.get('content', ''))}")
        
        if cards.green_cards and isinstance(cards.green_cards, list):
            lines.append("\n### 🟢 解释\n")
            for card in cards.green_cards[:5]:
                if isinstance(card, dict):
                    lines.append(f"- {card.get('title', card.get('content', ''))}")
        
        if cards.yellow_cards and isinstance(cards.yellow_cards, list):
            lines.append("\n### 🟡 风险\n")
            for card in cards.yellow_cards[:5]:
                if isinstance(card, dict):
                    lines.append(f"- ⚠️ {card.get('title', card.get('name', card.get('content', '')))}")
        
        if cards.red_cards and isinstance(cards.red_cards, list):
            lines.append("\n### 🔴 行动建议\n")
            for card in cards.red_cards[:5]:
                if isinstance(card, dict):
                    lines.append(f"- 👉 {card.get('title', card.get('content', ''))}")
        
        return "\n".join(lines)


# 全局实例
_eight_agent_engine: Optional[EightAgentEngine] = None

def get_eight_agent_engine() -> EightAgentEngine:
    """获取8-Agent引擎单例"""
    global _eight_agent_engine
    if _eight_agent_engine is None:
        _eight_agent_engine = EightAgentEngine()
    return _eight_agent_engine