"""
PPT Structure Draft Skill - MECE-based PPT Outline Generator

基于MECE原则的PPT结构草稿生成技能
帮助用户从杂乱的内容素材中梳理出清晰的PPT框架

MECE原则 (Mutually Exclusive, Collectively Exhaustive):
- 相互独立：每个板块内容不重复、不交叉
- 完全穷尽：所有内容都被覆盖，无遗漏

功能：
1. 拆分出3-5个互不重叠、覆盖完整的内容板块
2. 为每个板块起一个页面标题
3. 为每个板块列出3条要点（每条不超过20字）
4. 生成适合制作PPT的结构草稿
"""

import logging
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


# ============================================================================
# 数据模型
# ============================================================================

@dataclass
class PPTSection:
    """PPT板块数据模型"""
    section_id: str
    section_title: str
    key_points: List[str]
    content_summary: str
    order: int
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PPTStructureDraft:
    """PPT结构草稿数据模型"""
    draft_id: str
    topic: str
    sections: List[PPTSection]
    total_pages: int
    created_at: str
    mece_compliant: bool
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "draft_id": self.draft_id,
            "topic": self.topic,
            "sections": [s.to_dict() for s in self.sections],
            "total_pages": self.total_pages,
            "created_at": self.created_at,
            "mece_compliant": self.mece_compliant
        }


# ============================================================================
# MECE分析器
# ============================================================================

class MECEAnalyzer:
    """MECE原则分析器"""
    
    def __init__(self):
        self.common_structures = {
            "what": ["是什么", "定义", "概念", "概述", "背景"],
            "why": ["为什么", "原因", "目的", "意义", "价值"],
            "how": ["怎么做", "方法", "策略", "方案", "措施"],
            "result": ["结果", "效果", "成效", "成果", "收益"],
            "risk": ["风险", "问题", "挑战", "隐患", "困难"],
            "future": ["未来", "趋势", "展望", "规划", "发展"]
        }
    
    def identify_content_dimensions(self, text: str) -> List[str]:
        """识别内容维度"""
        text_lower = text.lower()
        dimensions = []
        
        for dim, keywords in self.common_structures.items():
            for kw in keywords:
                if kw in text_lower:
                    if dim not in dimensions:
                        dimensions.append(dim)
                    break
        
        # 如果没有识别到，使用默认维度
        if not dimensions:
            dimensions = ["what", "why", "how"]
        
        return dimensions
    
    def group_content_by_dimension(self, text: str, dimensions: List[str]) -> Dict[str, List[str]]:
        """按维度对内容进行分组"""
        # 简单的句子分割
        sentences = re.split(r'[。！？\n]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
        
        grouped = {dim: [] for dim in dimensions}
        grouped["other"] = []
        
        for sentence in sentences:
            assigned = False
            for dim, keywords in self.common_structures.items():
                if dim in dimensions:
                    for kw in keywords:
                        if kw in sentence.lower():
                            grouped[dim].append(sentence)
                            assigned = True
                            break
                if assigned:
                    break
            
            if not assigned:
                # 根据内容特征分配到最近的维度
                if any(w in sentence.lower() for w in ["如果", "当", "情况"]):
                    grouped.get(dimensions[-1], grouped["other"]).append(sentence)
                else:
                    grouped["other"].append(sentence)
        
        return grouped


# ============================================================================
# PPT结构草稿生成器
# ============================================================================

class PPTStructureGenerator:
    """PPT结构草稿生成器"""
    
    def __init__(self):
        self.analyzer = MECEAnalyzer()
        self.draft_counter = 0
    
    def _generate_draft_id(self) -> str:
        """生成草稿ID"""
        self.draft_counter += 1
        timestamp = datetime.now().strftime("%Y%m%d%H%M")
        return f"PPT_{timestamp}_{self.draft_counter:02d}"
    
    def _clean_text(self, text: str) -> str:
        """清理文本"""
        # 移除多余空白
        text = re.sub(r'\s+', ' ', text)
        # 移除特殊字符但保留中文和基本标点
        text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9，。！？、；：""''（）【】\\s]', '', text)
        return text.strip()
    
    def _extract_key_points(self, content: str, max_points: int = 3, max_length: int = 20) -> List[str]:
        """提取要点（每条不超过指定字数）"""
        # 分割句子
        sentences = re.split(r'[。！？\n]+', content)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 3]
        
        key_points = []
        for sentence in sentences:
            # 截断过长的内容
            if len(sentence) > max_length:
                # 尝试在标点处截断
                truncated = sentence[:max_length]
                # 不要在单词中间截断中文
                for i in range(len(truncated) - 1, 0, -1):
                    if '\u4e00' <= truncated[i] <= '\u9fa5':
                        truncated = truncated[:i + 1]
                        break
                sentence = truncated + "..."
            
            if sentence and sentence not in key_points:
                key_points.append(sentence)
                if len(key_points) >= max_points:
                    break
        
        # 确保至少有3个要点
        while len(key_points) < max_points:
            key_points.append("待补充内容")
        
        return key_points[:max_points]
    
    def _generate_section_title(self, content: str, index: int, total: int) -> str:
        """生成板块标题"""
        # 尝试从内容中提取关键词作为标题
        sentences = re.split(r'[。！？\n]+', content)
        first_meaningful = ""
        for s in sentences:
            s = s.strip()
            if len(s) > 3:
                first_meaningful = s
                break
        
        if first_meaningful and len(first_meaningful) <= 15:
            return first_meaningful
        
        # 根据位置和数量生成默认标题
        default_titles = {
            1: ["概述", "背景介绍", "项目简介", "前言"],
            2: ["核心内容", "主要部分", "详细说明", "内容分析"],
            3: ["实施方法", "具体方案", "操作步骤", "执行要点"],
            4: ["效果评估", "成果展示", "总结分析", "结论"],
            5: ["未来展望", "发展规划", "后续计划", "建议"]
        }
        
        titles = default_titles.get(total, default_titles[3])
        return titles[min(index, len(titles) - 1)]
    
    def _validate_mece(self, sections: List[PPTSection]) -> bool:
        """验证MECE原则"""
        if len(sections) < 2:
            return True
        
        # 检查是否有重复内容
        all_points = []
        for section in sections:
            all_points.extend(section.key_points)
        
        # 简单检查：是否有完全相同的要点
        if len(all_points) != len(set(all_points)):
            return False
        
        return True
    
    def generate_draft(
        self,
        topic: str,
        content: str,
        num_sections: int = 4
    ) -> PPTStructureDraft:
        """
        生成PPT结构草稿
        
        Args:
            topic: PPT主题
            content: 内容素材
            num_sections: 板块数量（默认4个）
        
        Returns:
            PPTStructureDraft: 结构草稿
        """
        try:
            # 清理文本
            content = self._clean_text(content)
            
            if not content:
                raise ValueError("内容素材不能为空")
            
            # 识别内容维度
            dimensions = self.analyzer.identify_content_dimensions(content)
            
            # 按维度分组内容
            grouped = self.analyzer.group_content_by_dimension(content, dimensions)
            
            # 计算实际板块数量
            actual_sections = min(num_sections, 5)
            actual_sections = max(actual_sections, 3)
            
            # 分配内容到各板块
            sections = []
            content_per_section = len(content) // actual_sections
            
            for i in range(actual_sections):
                start_pos = i * content_per_section
                end_pos = start_pos + content_per_section if i < actual_sections - 1 else len(content)
                section_content = content[start_pos:end_pos]
                
                # 提取要点
                key_points = self._extract_key_points(section_content)
                
                # 生成标题
                title = self._generate_section_title(section_content, i, actual_sections)
                
                section = PPTSection(
                    section_id=f"sec_{i + 1}",
                    section_title=title,
                    key_points=key_points,
                    content_summary=section_content[:100] + "..." if len(section_content) > 100 else section_content,
                    order=i + 1
                )
                sections.append(section)
            
            # 验证MECE
            mece_compliant = self._validate_mece(sections)
            
            draft = PPTStructureDraft(
                draft_id=self._generate_draft_id(),
                topic=topic,
                sections=sections,
                total_pages=len(sections),
                created_at=datetime.now().isoformat(),
                mece_compliant=mece_compliant
            )
            
            logger.info(f"[PPTStructureGenerator] 生成草稿: {draft.draft_id}, 板块数: {len(sections)}")
            
            return draft
            
        except Exception as e:
            logger.error(f"[PPTStructureGenerator] 生成草稿失败: {e}", exc_info=True)
            raise


# ============================================================================
# PPT结构草稿技能
# ============================================================================

class PPTStructureDraftSkill:
    """PPT结构草稿技能"""
    
    def __init__(self):
        self.name = "ppt_structure_draft"
        self.description = "PPT结构草稿：基于MECE原则，从杂乱内容中梳理出清晰的PPT框架"
        self.category = "内容创作"
        self.agent_name = "参谋司"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
        self.generator = PPTStructureGenerator()
        self.draft_storage: List[PPTStructureDraft] = []
    
    def get_info(self) -> Dict:
        """获取技能信息"""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "agent_name": self.agent_name,
            "enabled": self.enabled,
            "last_used": self.last_used,
            "usage_count": self.usage_count
        }
    
    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        return """# PPT结构草稿生成

你是PPT结构草稿生成专家，基于MECE原则帮助用户梳理内容框架。

## MECE原则
- Mutually Exclusive（相互独立）：每个板块内容不重复、不交叉
- Collectively Exhaustive（完全穷尽）：所有内容都被覆盖，无遗漏

## 输出格式
1. 拆分3-5个互不重叠、覆盖完整的内容板块
2. 每个板块有清晰的页面标题
3. 每个板块列出3条要点（每条不超过20字）
4. 最终生成适合制作PPT的结构草稿

## 交互流程
1. 用户提供主题或素材
2. AI拆解结构，生成框架，排除重复
3. 用户调整重点，补充内容
4. AI再次提炼要点，优化页面逻辑
"""
    
    async def execute(
        self,
        topic: str,
        content: str,
        num_sections: int = 4,
        **kwargs
    ) -> Dict[str, Any]:
        """
        执行PPT结构草稿生成
        
        Args:
            topic: PPT主题
            content: 内容素材（可以是文本摘要、数据要点、已有提纲等）
            num_sections: 板块数量（3-5，默认4）
        
        Returns:
            {
                "status": "success",
                "draft": PPTStructureDraft,
                "sections": [...],
                "total_pages": int,
                "mece_compliant": bool,
                "system_prompt": "..."
            }
        """
        try:
            self.usage_count += 1
            self.last_used = datetime.now().isoformat()
            
            logger.info(f"[{self.name}] 开始生成PPT结构草稿, 主题: {topic}")
            
            # 限制板块数量
            num_sections = max(3, min(5, num_sections))
            
            # 生成草稿
            draft = self.generator.generate_draft(
                topic=topic,
                content=content,
                num_sections=num_sections
            )
            
            # 存储草稿
            self.draft_storage.append(draft)
            
            # 格式化输出
            return {
                "status": "success",
                "draft": draft.to_dict(),
                "sections": [s.to_dict() for s in draft.sections],
                "total_pages": draft.total_pages,
                "mece_compliant": draft.mece_compliant,
                "system_prompt": self.get_system_prompt(),
                "total_drafts": len(self.draft_storage),
                "generated_at": draft.created_at
            }
            
        except Exception as e:
            logger.error(f"[{self.name}] 生成失败: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e),
                "draft": None,
                "sections": [],
                "total_pages": 0,
                "mece_compliant": False
            }
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """获取存储统计"""
        return {
            "total_drafts": len(self.draft_storage),
            "total_pages": sum(d.total_pages for d in self.draft_storage),
            "latest_draft": self.draft_storage[-1].to_dict() if self.draft_storage else None
        }
    
    def export_draft(self, draft_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """导出草稿"""
        if draft_id:
            for draft in self.draft_storage:
                if draft.draft_id == draft_id:
                    return draft.to_dict()
            return None
        elif self.draft_storage:
            return self.draft_storage[-1].to_dict()
        return None
    
    def clear_storage(self):
        """清空存储"""
        self.draft_storage.clear()
        logger.info(f"[{self.name}] 存储已清空")


# 全局实例
_ppt_structure_draft_skill: Optional[PPTStructureDraftSkill] = None


def get_ppt_structure_draft_skill() -> PPTStructureDraftSkill:
    """获取PPT结构草稿技能实例"""
    global _ppt_structure_draft_skill
    if _ppt_structure_draft_skill is None:
        _ppt_structure_draft_skill = PPTStructureDraftSkill()
    return _ppt_structure_draft_skill