#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
对话上下文链管理模块
管理多轮对话与知识库/知识图谱的关联
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import logging
import json
import os

logger = logging.getLogger(__name__)


@dataclass
class ContextLink:
    """上下文链接"""
    link_type: str  # "card" | "entity" | "relation"
    link_id: str
    title: str
    relevance: float  # 0-1
    quote: Optional[str] = None  # 引用的原文


@dataclass
class ConversationTurn:
    """对话轮次"""
    turn_id: str
    user_query: str
    assistant_response: str
    timestamp: str
    links: List[ContextLink] = field(default_factory=list)
    model: str = "unknown"


@dataclass
class ConversationChain:
    """对话链"""
    chain_id: str
    user_id: str
    turns: List[ConversationTurn]
    created_at: str
    updated_at: str
    summary: str = ""  # 对话摘要


class ConversationContextManager:
    """对话上下文链管理器"""
    
    def __init__(self, storage_dir: str = None):
        if storage_dir is None:
            storage_dir = os.path.join(
                os.path.dirname(__file__), '..', 'data', 'conversation_contexts'
            )
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        logger.info(f"[Context] 上下文链管理器初始化, 存储目录: {storage_dir}")
    
    def _get_chain_file(self, chain_id: str) -> str:
        """获取对话链文件路径"""
        return os.path.join(self.storage_dir, f"chain_{chain_id}.json")
    
    def create_chain(self, user_id: str) -> ConversationChain:
        """创建新对话链"""
        import uuid
        chain_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()
        
        chain = ConversationChain(
            chain_id=chain_id,
            user_id=user_id,
            turns=[],
            created_at=now,
            updated_at=now
        )
        
        self._save_chain(chain)
        logger.info(f"[Context] 创建对话链: {chain_id}")
        return chain
    
    def _load_chain(self, chain_id: str) -> Optional[ConversationChain]:
        """加载对话链"""
        filepath = self._get_chain_file(chain_id)
        if not os.path.exists(filepath):
            return None
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            turns = []
            for t in data.get('turns', []):
                links = [ContextLink(**l) for l in t.get('links', [])]
                turns.append(ConversationTurn(
                    turn_id=t['turn_id'],
                    user_query=t['user_query'],
                    assistant_response=t['assistant_response'],
                    timestamp=t['timestamp'],
                    links=links,
                    model=t.get('model', 'unknown')
                ))
            
            return ConversationChain(
                chain_id=data['chain_id'],
                user_id=data['user_id'],
                turns=turns,
                created_at=data['created_at'],
                updated_at=data['updated_at'],
                summary=data.get('summary', '')
            )
        except Exception as e:
            logger.error(f"加载对话链失败: {e}")
            return None
    
    def _save_chain(self, chain: ConversationChain):
        """保存对话链"""
        filepath = self._get_chain_file(chain.chain_id)
        chain.updated_at = datetime.now().isoformat()
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump({
                    'chain_id': chain.chain_id,
                    'user_id': chain.user_id,
                    'turns': [
                        {
                            'turn_id': t.turn_id,
                            'user_query': t.user_query,
                            'assistant_response': t.assistant_response,
                            'timestamp': t.timestamp,
                            'links': [l.__dict__ for l in t.links],
                            'model': t.model
                        }
                        for t in chain.turns
                    ],
                    'created_at': chain.created_at,
                    'updated_at': chain.updated_at,
                    'summary': chain.summary
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"保存对话链失败: {e}")
    
    def add_turn(
        self, 
        chain_id: str, 
        user_query: str, 
        assistant_response: str,
        links: List[ContextLink] = None,
        model: str = "unknown"
    ) -> Optional[ConversationTurn]:
        """添加对话轮次"""
        chain = self._load_chain(chain_id)
        if chain is None:
            return None
        
        import uuid
        turn_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()
        
        turn = ConversationTurn(
            turn_id=turn_id,
            user_query=user_query,
            assistant_response=assistant_response,
            timestamp=now,
            links=links or [],
            model=model
        )
        
        chain.turns.append(turn)
        
        # 保留最近 20 轮
        if len(chain.turns) > 20:
            chain.turns = chain.turns[-20:]
        
        self._save_chain(chain)
        return turn
    
    def get_chain(self, chain_id: str) -> Optional[ConversationChain]:
        """获取对话链"""
        return self._load_chain(chain_id)
    
    def get_recent_links(self, chain_id: str, limit: int = 10) -> List[ContextLink]:
        """获取最近的关联知识"""
        chain = self._load_chain(chain_id)
        if chain is None:
            return []
        
        links = []
        for turn in reversed(chain.turns):
            for link in turn.links:
                links.append(link)
                if len(links) >= limit:
                    break
            if len(links) >= limit:
                break
        
        return links
    
    def generate_context_for_llm(
        self, 
        chain_id: str, 
        current_query: str,
        max_turns: int = 5
    ) -> str:
        """生成用于 LLM 的上下文"""
        chain = self._load_chain(chain_id)
        if chain is None:
            return ""
        
        parts = []
        
        # 添加历史对话
        recent_turns = chain.turns[-max_turns:]
        for t in recent_turns:
            parts.append(f"用户: {t.user_query}")
            parts.append(f"小易: {t.assistant_response[:200]}")
        
        # 添加关联知识
        links = self.get_recent_links(chain_id, limit=5)
        if links:
            parts.append("\n相关知识:")
            for link in links:
                parts.append(f"- {link.title} ({link.link_type})")
        
        return "\n".join(parts)
    
    def summarize_chain(self, chain_id: str) -> str:
        """生成对话链摘要"""
        chain = self._load_chain(chain_id)
        if not chain or not chain.turns:
            return ""
        
        topics = []
        for t in chain.turns[-5:]:
            query = t.user_query[:30]
            if query not in topics:
                topics.append(query)
        
        summary = " | ".join(topics)
        
        # 更新并保存
        chain.summary = summary
        self._save_chain(chain)
        
        return summary
    
    def delete_chain(self, chain_id: str) -> bool:
        """删除对话链"""
        filepath = self._get_chain_file(chain_id)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                return True
            except:
                return False
        return False


# 全局管理器
context_manager = ConversationContextManager()