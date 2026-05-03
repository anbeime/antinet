# backend/services/__init__.py - 服务模块
"""
知易智能知识管家 - 后端服务模块
包含技能系统、AI服务、知识图谱等多种服务
"""

from services.skill_system import get_skill_registry, Skill, SkillRegistry

__all__ = [
    'get_skill_registry',
    'Skill',
    'SkillRegistry',
]