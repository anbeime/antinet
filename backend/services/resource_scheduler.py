"""
智能资源调度服务 — 闭环三核心组件

功能：
1. 根据任务复杂度选择最优模型
2. NPU负载均衡与并发控制
3. 模型预热与缓存策略
4. 基于使用模式的智能预测
"""
import logging
import time
import threading
from typing import Dict, Optional, Any, List
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)


class TaskComplexity(Enum):
    """任务复杂度等级"""
    LOW = "low"           # 简单查询、关键词提取
    MEDIUM = "medium"     # 一般分析、摘要生成
    HIGH = "high"         # 深度推理、多角度分析
    CRITICAL = "critical" # 关键决策、综合研判


class ModelTier(Enum):
    """模型层级"""
    LIGHT = "light"       # 轻量模型 (llama3.2-3b)
    BALANCED = "balanced" # 平衡模型 (qwen2.0-7b)
    HEAVY = "heavy"       # 重量模型 (qwen2.5-vl-3b, 视觉模型)


@dataclass
class ModelConfig:
    """模型配置"""
    model_key: str
    tier: ModelTier
    max_tokens: int
    temperature: float
    timeout: float
    supports_chinese: bool = True
    supports_vision: bool = False


@dataclass
class NPUStatus:
    """NPU状态"""
    is_available: bool = True
    current_load: float = 0.0        # 0.0 ~ 1.0
    active_inferences: int = 0
    total_inferences: int = 0
    last_inference_time: float = 0.0
    avg_latency: float = 0.0
    error_count: int = 0
    last_error_time: float = 0.0


# 预定义模型配置
MODEL_CONFIGS: Dict[str, ModelConfig] = {
    "qwen2.0-7b": ModelConfig(
        model_key="qwen2.0-7b",
        tier=ModelTier.BALANCED,
        max_tokens=512,
        temperature=0.3,
        timeout=60.0,
        supports_chinese=True,
        supports_vision=False,
    ),
    "llama3.2-3b": ModelConfig(
        model_key="llama3.2-3b",
        tier=ModelTier.LIGHT,
        max_tokens=256,
        temperature=0.3,
        timeout=30.0,
        supports_chinese=False,
        supports_vision=False,
    ),
    "qwen2.5-vl-3b": ModelConfig(
        model_key="qwen2.5-vl-3b",
        tier=ModelTier.HEAVY,
        max_tokens=512,
        temperature=0.3,
        timeout=90.0,
        supports_chinese=True,
        supports_vision=True,
    ),
}

# 复杂度→模型层级映射
COMPLEXITY_TIER_MAP = {
    TaskComplexity.LOW: ModelTier.LIGHT,
    TaskComplexity.MEDIUM: ModelTier.BALANCED,
    TaskComplexity.HIGH: ModelTier.BALANCED,
    TaskComplexity.CRITICAL: ModelTier.HEAVY,
}

# Agent角色→默认复杂度映射
AGENT_COMPLEXITY_MAP = {
    "taishige": TaskComplexity.HIGH,        # 太史阁 - 历史分析
    "jinyiwei": TaskComplexity.HIGH,        # 锦衣卫 - 安全审计
    "tongzhengsi": TaskComplexity.MEDIUM,   # 通政司 - 信息整理
    "jianchayuan": TaskComplexity.HIGH,     # 监察院 - 风险审计
    "mijuanfang": TaskComplexity.LOW,       # 密卷房 - 知识检索
    "canmousi": TaskComplexity.CRITICAL,    # 参谋司 - 战略决策
    "chengxiangfu": TaskComplexity.CRITICAL, # 丞相府 - 综合研判
    "junjichu": TaskComplexity.HIGH,        # 军机处 - 执行规划
}


class ResourceScheduler:
    """智能资源调度器"""
    
    def __init__(self):
        self._npu_status = NPUStatus()
        self._lock = threading.Lock()
        self._inference_history: List[Dict] = []
        self._model_cache: Dict[str, Any] = {}
        self._concurrency_semaphore = threading.Semaphore(4)  # 最大并发4个推理
        self._usage_stats = defaultdict(lambda: {"count": 0, "total_time": 0.0, "errors": 0})
    
    def estimate_complexity(self, task_type: str, agent_id: str = None, 
                           prompt_length: int = 0, has_image: bool = False) -> TaskComplexity:
        """估算任务复杂度
        
        参数:
            task_type: 任务类型 (analysis/summary/retrieval/decision/generation)
            agent_id: Agent角色ID
            prompt_length: 提示词长度
            has_image: 是否包含图片
        """
        # 图片任务至少是HIGH
        if has_image:
            return TaskComplexity.CRITICAL
        
        # 根据Agent角色推断
        if agent_id and agent_id in AGENT_COMPLEXITY_MAP:
            base_complexity = AGENT_COMPLEXITY_MAP[agent_id]
        else:
            # 根据任务类型推断
            type_map = {
                "retrieval": TaskComplexity.LOW,
                "summary": TaskComplexity.MEDIUM,
                "analysis": TaskComplexity.HIGH,
                "generation": TaskComplexity.HIGH,
                "decision": TaskComplexity.CRITICAL,
            }
            base_complexity = type_map.get(task_type, TaskComplexity.MEDIUM)
        
        # 根据提示词长度调整
        if prompt_length > 2000:
            if base_complexity.value < TaskComplexity.HIGH.value:
                base_complexity = TaskComplexity.HIGH
        elif prompt_length < 200:
            if base_complexity.value > TaskComplexity.MEDIUM.value:
                base_complexity = TaskComplexity.MEDIUM
        
        return base_complexity
    
    def select_model(self, complexity: TaskComplexity, prefer_chinese: bool = True) -> ModelConfig:
        """根据复杂度选择最优模型
        
        考虑因素：
        1. 任务复杂度→模型层级
        2. NPU当前负载
        3. 中文能力需求
        4. 最近错误率
        """
        target_tier = COMPLEXITY_TIER_MAP.get(complexity, ModelTier.BALANCED)
        
        # 获取NPU负载
        load = self._npu_status.current_load
        
        # 高负载时降级
        if load > 0.8 and target_tier == ModelTier.BALANCED:
            logger.info(f"[Scheduler] NPU负载{load:.1%}过高，降级到轻量模型")
            target_tier = ModelTier.LIGHT
        elif load > 0.9 and target_tier == ModelTier.HEAVY:
            logger.info(f"[Scheduler] NPU负载{load:.1%}过高，降级到平衡模型")
            target_tier = ModelTier.BALANCED
        
        # 从匹配层级的模型中选择
        candidates = [m for m in MODEL_CONFIGS.values() if m.tier == target_tier]
        
        if not candidates:
            candidates = [m for m in MODEL_CONFIGS.values() if m.tier == ModelTier.BALANCED]
        
        # 优先选择支持中文的模型
        if prefer_chinese:
            chinese_candidates = [m for m in candidates if m.supports_chinese]
            if chinese_candidates:
                candidates = chinese_candidates
        
        # 选择错误率最低的
        def error_rate(model: ModelConfig) -> float:
            stats = self._usage_stats.get(model.model_key, {"count": 1, "errors": 0})
            return stats["errors"] / max(stats["count"], 1)
        
        candidates.sort(key=error_rate)
        
        selected = candidates[0] if candidates else MODEL_CONFIGS["qwen2.0-7b"]
        logger.info(f"[Scheduler] 复杂度={complexity.value}, 负载={load:.1%}, 选择模型={selected.model_key}")
        return selected
    
    def adjust_concurrency(self) -> int:
        """根据NPU负载调整并发度
        
        返回:
            建议的并发推理数
        """
        load = self._npu_status.current_load
        
        if load < 0.3:
            return 4  # 低负载，高并行
        elif load < 0.5:
            return 3
        elif load < 0.7:
            return 2  # 中等负载，正常并行
        else:
            return 1  # 高负载，顺序执行
    
    def acquire_inference_slot(self) -> bool:
        """获取推理槽位（并发控制）
        
        返回:
            True 如果可以开始推理
        """
        acquired = self._concurrency_semaphore.acquire(blocking=False)
        if acquired:
            with self._lock:
                self._npu_status.active_inferences += 1
                self._npu_status.current_load = self._npu_status.active_inferences / 4.0
        return acquired
    
    def release_inference_slot(self):
        """释放推理槽位"""
        with self._lock:
            self._npu_status.active_inferences = max(0, self._npu_status.active_inferences - 1)
            self._npu_status.current_load = self._npu_status.active_inferences / 4.0
        self._concurrency_semaphore.release()
    
    def record_inference(self, model_key: str, latency: float, success: bool, 
                         complexity: TaskComplexity = None, agent_id: str = None):
        """记录推理结果（用于后续优化）"""
        with self._lock:
            stats = self._usage_stats[model_key]
            stats["count"] += 1
            stats["total_time"] += latency
            if not success:
                stats["errors"] += 1
                self._npu_status.error_count += 1
                self._npu_status.last_error_time = time.time()
            else:
                # 更新平均延迟
                total = stats["total_time"]
                count = stats["count"]
                self._npu_status.avg_latency = total / max(count, 1)
            
            self._npu_status.total_inferences += 1
            self._npu_status.last_inference_time = time.time()
        
        # 记录历史（保留最近100条）
        self._inference_history.append({
            "model_key": model_key,
            "latency": latency,
            "success": success,
            "complexity": complexity.value if complexity else None,
            "agent_id": agent_id,
            "timestamp": time.time(),
        })
        if len(self._inference_history) > 100:
            self._inference_history = self._inference_history[-100:]
    
    def get_npu_status(self) -> Dict[str, Any]:
        """获取当前NPU状态"""
        with self._lock:
            return {
                "is_available": self._npu_status.is_available,
                "current_load": round(self._npu_status.current_load, 2),
                "active_inferences": self._npu_status.active_inferences,
                "total_inferences": self._npu_status.total_inferences,
                "avg_latency": round(self._npu_status.avg_latency, 2),
                "error_count": self._npu_status.error_count,
                "concurrency_limit": self.adjust_concurrency(),
                "model_stats": {
                    key: {
                        "count": stats["count"],
                        "avg_latency": round(stats["total_time"] / max(stats["count"], 1), 2),
                        "error_rate": round(stats["errors"] / max(stats["count"], 1), 3),
                    }
                    for key, stats in self._usage_stats.items()
                }
            }
    
    def should_preheat(self, model_key: str) -> bool:
        """判断是否需要预热模型
        
        基于使用频率和时间模式：
        - 如果最近10分钟内使用过3次以上，保持热加载
        - 如果即将进入高频时段（基于历史模式），提前预热
        """
        recent = [h for h in self._inference_history 
                  if h["model_key"] == model_key and time.time() - h["timestamp"] < 600]
        return len(recent) >= 3


# 全局单例
_scheduler: Optional[ResourceScheduler] = None


def get_resource_scheduler() -> ResourceScheduler:
    """获取全局资源调度器"""
    global _scheduler
    if _scheduler is None:
        _scheduler = ResourceScheduler()
    return _scheduler
