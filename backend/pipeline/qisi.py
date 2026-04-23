"""
七司编译流水线
"""
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


@dataclass
class CompilationResult:
    """编译结果"""
    doc_id: str
    stage: str
    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)


class TongzhengSi:
    """通政司 - 数据采集与预处理"""
    
    def process(self, doc: Dict) -> Dict:
        logger.info("[通政司] 处理文档...")
        
        content = doc.get('content', '')
        
        # 元数据提取
        fm = re.search(r'^---\n([\s\S]+?)\n---', content)
        metadata = {}
        if fm:
            for line in fm.group(1).split('\n'):
                if ':' in line:
                    k, v = line.split(':', 1)
                    metadata[k.strip()] = v.strip()
        
        doc['metadata'] = metadata
        doc['plain_content'] = content
        doc['stage'] = 'tongzheng'
        
        logger.info("[通政司] 完成")
        return doc


class Jianchayuan:
    """监察院 - 深度编译引擎"""
    
    def __init__(self):
        self.embedding_service = None
        self._init_llm()
    
    def _init_llm(self):
        try:
            from embeddings.bge_service import BGEEmbeddingService
            self.embedding_service = BGEEmbeddingService(use_qnn=False)
        except Exception as e:
            logger.warning(f"BGE 不可用: {e}")
    
    def process(self, doc: Dict) -> Dict:
        logger.info("[监察院] 深度编译...")
        
        content = doc.get('plain_content', '')
        
        # 1. 命名实体识别 (NER)
        doc['entities'] = self._ner(content)
        
        # 2. 关系抽取
        doc['relations'] = self._extract_relations(content)
        
        # 3. 概念聚类
        doc['concepts'] = self._cluster_concepts(content)
        
        # 4. 冲突检测
        doc['conflicts'] = self._detect_conflicts(doc.get('relations', []))
        
        # 5. 置信度评估
        doc['confidence'] = self._evaluate_confidence(doc)
        
        doc['stage'] = 'jianchayuan'
        logger.info("[监察院] 完成")
        return doc
    
    def _ner(self, text: str) -> List[Dict]:
        # 简单正则 NER - 实际可用 BGE/LLM
        entities = []
        for match in re.finditer(r'#{1,6}\s+(.+?)$', text, re.MULTILINE):
            entities.append({
                'name': match.group(1),
                'type': 'heading',
                'pos': match.start()
            })
        return entities
    
    def _extract_relations(self, text: str) -> List[Dict]:
        relations = []
        for match in re.finditer(r'\[\[([^\]|]+)(?:|([^\]]+))?\]\]', text):
            relations.append({
                'source': doc.get('doc_id', ''),
                'target': match.group(1),
                'type': 'links_to'
            })
        return relations
    
    def _cluster_concepts(self, text: str) -> List[str]:
        tags = re.findall(r'#(\w+)', text)
        return list(set(tags))
    
    def _detect_conflicts(self, relations: List[Dict]) -> List[Dict]:
        return []
    
    def _evaluate_confidence(self, doc: Dict) -> float:
        entity_count = len(doc.get('entities', []))
        return min(1.0, entity_count / 10)


class Xingyusi:
    """刑狱司 - 质量审查"""
    
    def process(self, doc: Dict) -> Dict:
        logger.info("[刑狱司] 质量审查...")
        
        # 事实核查
        doc['fact_check'] = self._verify_facts(doc.get('entities', []))
        
        # 逻辑一致性
        doc['logic_check'] = self._check_logic(doc.get('plain_content', ''))
        
        # 风险标记
        doc['risk_tags'] = self._mark_risks(doc)
        
        # 决定是否通过
        approved = (
            doc.get('fact_check', {}).get('passed', True) and
            doc.get('logic_check', {}).get('passed', True)
        )
        doc['approved'] = approved
        doc['rejected_reason'] = '' if approved else '未通过质量审查'
        
        doc['stage'] = 'xingyusi'
        logger.info(f"[刑狱司] {'通过' if approved else '拒绝'}")
        return doc
    
    def _verify_facts(self, entities: List[Dict]) -> Dict:
        return {'passed': True, 'issues': []}
    
    def _check_logic(self, text: str) -> Dict:
        return {'passed': True, 'issues': []}
    
    def _mark_risks(self, doc: Dict) -> List[str]:
        risks = []
        if doc.get('confidence', 1.0) < 0.5:
            risks.append('低置信度')
        return risks


class CanmouSi:
    """参谋司 - 知识整合"""
    
    def process(self, doc: Dict) -> Dict:
        logger.info("[参谋司] 知识整合...")
        
        # 更新现有页面
        doc['page_updates'] = self._find_page_updates(doc.get('entities', []))
        
        # 建立交叉链接
        doc['cross_links'] = self._build_links(doc.get('relations', []))
        
        # 生成摘要
        doc['summary'] = self._generate_summary(doc.get('plain_content', ''))
        
        # 生成索引
        doc['index'] = self._generate_index(doc.get('concepts', []), doc.get('metadata', {}))
        
        # 触发相关智能体
        doc['triggered_agents'] = self._find_agents(doc)
        
        doc['stage'] = 'canmou'
        logger.info("[参谋司] 完成")
        return doc
    
    def _find_page_updates(self, entities: List[Dict]) -> List[Dict]:
        return []
    
    def _build_links(self, relations: List[Dict]) -> List[str]:
        return [f"[[{r['target']}]]" for r in relations]
    
    def _generate_summary(self, text: str) -> str:
        sentences = text.split('。')
        return '。'.join(sentences[:3]) + '。'
    
    def _generate_index(self, concepts: List[str], metadata: Dict) -> Dict:
        return {
            'keywords': concepts[:5],
            'tags': metadata.get('tags', []),
            'category': metadata.get('type', 'note')
        }
    
    def _find_agents(self, doc: Dict) -> List[str]:
        return []


class Mijuanfang:
    """密卷房 - 持久化存储"""
    
    def process(self, doc: Dict) -> Dict:
        logger.info("[密卷房] 持久化存储...")
        
        wiki_root = PROJECT_ROOT / "data" / "wiki"
        wiki_root.mkdir(parents=True, exist_ok=True)
        
        # 写入文件系统
        doc_id = doc.get('doc_id', 'untitled')
        file_path = wiki_root / f"{doc_id}.md"
        
        content = f"""---
title: {doc.get('title', doc_id)}
type: {doc.get('index', {}).get('category', 'note')}
tags: {doc.get('index', {}).get('tags', [])}
created_at: {datetime.now().isoformat()}
---

# {doc.get('title', doc_id)}

{doc.get('plain_content', '')}

## 摘要

{doc.get('summary', '')}

## 关联

{doc.get('cross_links', [])}

## 风险

{doc.get('risk_tags', [])}
"""
        
        file_path.write_text(content, encoding='utf-8')
        doc['file_path'] = str(file_path)
        
        doc['stage'] = 'mijuanfang'
        logger.info(f"[密卷房] 已保存到 {file_path}")
        return doc


class Taishige:
    """太史阁 - 历史记录"""
    
    def process(self, doc: Dict) -> Dict:
        logger.info("[太史阁] 历史记录...")
        
        # 创建版本快照
        version_dir = PROJECT_ROOT / "data" / "wiki" / "versions"
        version_dir.mkdir(parents=True, exist_ok=True)
        
        import json
        version_file = version_dir / f"{doc.get('doc_id')}_{datetime.now().timestamp()}.json"
        
        snapshot = {
            'doc_id': doc.get('doc_id'),
            'timestamp': datetime.now().isoformat(),
            'entities': doc.get('entities', []),
            'relations': doc.get('relations', []),
            'metadata': doc.get('metadata', {})
        }
        
        version_file.write_text(json.dumps(snapshot, ensure_ascii=False), encoding='utf-8')
        doc['version_file'] = str(version_file)
        
        # 统计分析
        doc['stats'] = {
            'entity_count': len(doc.get('entities', [])),
            'relation_count': len(doc.get('relations', [])),
            'word_count': len(doc.get('plain_content', ''))
        }
        
        doc['stage'] = 'taishige'
        logger.info("[太史阁] 完成")
        return doc


class Yichuansi:
    """驿传司 - 通知与同步"""
    
    def process(self, doc: Dict) -> Dict:
        logger.info("[驿传司] 通知同步...")
        
        # 通知编译完成
        doc['notified'] = True
        doc['notification_message'] = f"文档 {doc.get('title', 'unnamed')} 编译完成"
        
        doc['stage'] = 'yichuansi'
        logger.info("[驿传司] 完成")
        return doc


class Pipeline:
    """七司编译流水线主控制器"""
    
    def __init__(self):
        self.stages = [
            TongzhengSi(),
            Jianchayuan(),
            Xingyusi(),
            CanmouSi(),
            Mijuanfang(),
            Taishige(),
            Yichuansi(),
        ]
        self.stage_names = ['通政司', '监察院', '刑狱司', '参谋司', '密卷房', '太史阁', '驿传司']
    
    def compile(self, doc: Dict) -> CompilationResult:
        """执行完整编译流程"""
        
        start_time = datetime.now()
        errors = []
        
        for i, stage in enumerate(self.stages):
            stage_name = self.stage_names[i]
            logger.info(f"[Pipeline] === 进入 {stage_name} ===")
            
            try:
                if stage_name == '刑狱司' and not doc.get('approved', True):
                    logger.warning("[Pipeline] 质量审查未通过，停止流水线")
                    break
                    
                doc = stage.process(doc)
                
            except Exception as e:
                logger.error(f"[Pipeline] {stage_name} 失败: {e}")
                errors.append(f"{stage_name}: {str(e)}")
                break
        
        success = len(errors) == 0 and doc.get('approved', True)
        
        return CompilationResult(
            doc_id=doc.get('doc_id', ''),
            stage=doc.get('stage', 'unknown'),
            success=success,
            data=doc,
            errors=errors
        )


# 便捷函数
_pipeline = None

def get_pipeline() -> Pipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = Pipeline()
    return _pipeline

def compile_document(doc: Dict) -> CompilationResult:
    """编译单个文档"""
    return get_pipeline().compile(doc)

def compile_batch(docs: List[Dict]) -> List[CompilationResult]:
    """批量编译"""
    return [compile_document(d) for d in docs]


if __name__ == "__main__":
    # 测试
    test_doc = {
        'doc_id': 'test_001',
        'title': '测试文档',
        'content': '''---
title: 测试
type: note
tags: [test]
---

# 测试文档

这是一篇测试文档。

## 概念

- 机器学习
- 深度学习
'''
    }
    
    result = compile_document(test_doc)
    print(f"结果: {result.success}, 阶段: {result.stage}")