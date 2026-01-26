"""
8-Agent 多智能体系统
完整的 Agent 协作架构
"""
from .orchestrator import OrchestratorAgent
from .memory import MemoryAgent
from .preprocessor import PreprocessorAgent
from .fact_generator import FactGeneratorAgent
from .interpreter import InterpreterAgent
from .risk_detector import RiskDetectorAgent
from .action_advisor import ActionAdvisorAgent
from .messenger import MessengerAgent

__all__ = [
    'OrchestratorAgent',  # 锦衣卫总指挥使
    'MemoryAgent',        # 太史阁
    'PreprocessorAgent',  # 密卷房
    'FactGeneratorAgent',  # 通政司
    'InterpreterAgent',    # 监察院
    'RiskDetectorAgent',   # 刑狱司
    'ActionAdvisorAgent',  # 参谋司
    'MessengerAgent',      # 驿传司
]
