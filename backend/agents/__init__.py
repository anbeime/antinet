"""
8-Agent 锦衣卫多智能体系统（PPT生成版）
=======================================
完整的锦衣卫官署协作架构，面向PPT生成场景：

  官署           | 角色           | 职责
  ---------------|----------------|---------------------------------------
  指挥使         | 总编排器       | 意图识别、任务分发、结构设计
  锦衣卫         | 安全审查       | 安全黄卡：敏感词检测、合规评估
  密卷房         | 文档解析       | 多格式解析、OCR识别、结构化提取
  通政司         | 内容生成       | 事实蓝卡：内容生成与结构化
  监察院         | 质量审核       | 解释绿卡：逻辑审查、质量评估
  丞相府         | 视觉策略       | 行动红卡：视觉策略、配图方案
  太史阁         | 模板记忆       | 模板匹配、向量检索、最佳实践
  军机处         | 任务执行       | PPT生成、文件验证、输出管理
"""
from .orchestrator import OrchestratorAgent
from .jin_yi_wei import JinYiWeiAgent
from .mi_juan_fang import MiJuanFangAgent
from .tong_zheng_si import TongZhengSiAgent
from .jian_cha_yuan import JianChaYuanAgent
from .cheng_xiang_fu import ChengXiangFuAgent
from .tai_shi_ge import TaiShiGeAgent
from .jun_ji_chu import JunJiChuAgent

# 保持向后兼容 - 旧名称别名
from .risk_detector import RiskDetectorAgent
from .preprocessor import PreprocessorAgent
from .fact_generator import FactGeneratorAgent
from .interpreter import InterpreterAgent
from .action_advisor import ActionAdvisorAgent
from .memory import MemoryAgent
from .messenger import MessengerAgent

__all__ = [
    'OrchestratorAgent',   # 指挥使 — 总编排器
    'JinYiWeiAgent',       # 锦衣卫 — 安全审查
    'MiJuanFangAgent',     # 密卷房 — 文档解析
    'TongZhengSiAgent',    # 通政司 — 内容生成
    'JianChaYuanAgent',    # 监察院 — 质量审核
    'ChengXiangFuAgent',   # 丞相府 — 视觉策略
    'TaiShiGeAgent',       # 太史阁 — 模板记忆
    'JunJiChuAgent',       # 军机处 — 任务执行
    # 向后兼容名称
    'RiskDetectorAgent',
    'PreprocessorAgent',
    'FactGeneratorAgent',
    'InterpreterAgent',
    'ActionAdvisorAgent',
    'MemoryAgent',
    'MessengerAgent',
]
