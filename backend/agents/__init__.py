"""
8-Agent 多智能体系统（锦衣卫）
==============================
完整的 Agent 协作架构，包含八个专业化 Agent：

  Agent              | 官职       | 职责
  -------------------|------------|---------------------------------------
  OrchestratorAgent  | 总指挥使   | 任务分解、状态监控、成果聚合
  MemoryAgent        | 太史阁     | 知识存储、检索、关联
  PreprocessorAgent  | 密卷房     | 数据预处理、清洗、标准化
  FactGeneratorAgent | 通政司     | 事实验证、核心事实提取
  InterpreterAgent   | 监察院     | 解释分析、因果推断
  RiskDetectorAgent  | 刑狱司     | 风险评估、异常检测
  ActionAdvisorAgent | 参谋司     | 行动建议、策略推荐
  MessengerAgent     | 驿传司     | 消息传递、Agent间通信
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
    'OrchestratorAgent',   # 锦衣卫总指挥使
    'MemoryAgent',         # 太史阁 — 记忆管理
    'PreprocessorAgent',   # 密卷房 — 数据预处理
    'FactGeneratorAgent',  # 通政司 — 事实生成
    'InterpreterAgent',    # 监察院 — 解释分析
    'RiskDetectorAgent',   # 刑狱司 — 风险检测
    'ActionAdvisorAgent',  # 参谋司 — 行动建议
    'MessengerAgent',      # 驿传司 — 消息传递
]
