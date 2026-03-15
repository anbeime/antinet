"""
Reranker 服务 - 基于 Qwen3-Reranker-0.6B 的 NPU 精排服务
使用 Qualcomm GenieContext 在骁龙 X Elite NPU 上运行

工作原理:
  1. GenieContext 加载 QNN 编译后的 Qwen3-Reranker 模型
  2. 构造 Qwen3 chat 格式的 Reranker prompt (query + document)
  3. 模型通过 Query(prompt, callback) 生成 "yes" / "no"
  4. 根据生成结果计算相关性分数，对候选文档重排序

API 说明 (qai_appbuilder 2.38):
  - GenieContext(config_path) — 加载模型
  - ctx.SetParams(max_len, temp, top_k, top_p) — 设置生成参数（全部字符串）
  - ctx.Query(prompt, callback) — 推理，callback(token) 返回 True 继续
  - ctx.Stop() — 停止生成
  - ctx.TokenLength(text) — 计算 token 长度
"""
import os
import sys
import time
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

# 全局 Reranker 实例
_reranker_service: Optional["RerankerService"] = None

# Reranker 模型默认路径
DEFAULT_RERANKER_PATH = "C:/model/models_2.38/qwen3-reranker-8380-2.38"


def _format_instruction(instruction, query, doc):
    """格式化 Reranker 的 Instruct/Query/Document 文本"""
    if instruction is None:
        instruction = "Given a web search query, retrieve relevant passages that answer the query"
    return f"<Instruct>: {instruction}\n<Query>: {query}\n<Document>: {doc}"


def build_reranker_prompt(query: str, document: str, instruction: str = None) -> str:
    """
    构造 Qwen3-Reranker prompt（与官方 demo.py 一致）

    包含 <think>\n\n</think>\n\n 跳过思考阶段，模型直接输出 yes/no
    """
    system_prompt = (
        'Judge whether the Document meets the requirements based on the '
        'Query and the Instruct provided. Note that the answer can only '
        'be "yes" or "no".'
    )
    user_content = _format_instruction(instruction, query, document)
    return (
        f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
        f"<|im_start|>user\n{user_content}<|im_end|>\n"
        f"<|im_start|>assistant\n<think>\n\n</think>\n\n"
    )


class RerankerService:
    """
    NPU Reranker 精排服务

    使用 Qwen3-Reranker-0.6B 对候选文档进行相关性精排。
    典型用法: 粗排(关键词/向量) -> 精排(Reranker) -> 返回 Top-K
    """

    def __init__(self, model_path: str = None):
        self.model_path = Path(model_path or DEFAULT_RERANKER_PATH)
        self.config_path = str(self.model_path / "config.json")
        self.dialog = None
        self.is_loaded = False
        self._load_time = 0.0
        self._original_cwd = None

        logger.info(f"[Reranker] 初始化, 模型路径: {self.model_path}")

    def load(self) -> bool:
        """加载 Reranker 模型到 NPU"""
        if self.is_loaded:
            logger.info("[Reranker] 模型已加载，跳过")
            return True

        try:
            start = time.time()
            
            # 0. 切换到模型目录（确保 QNN能找到资源）
            original_cwd = os.getcwd()
            os.chdir(self.model_path)
            logger.info(f"[Reranker] 切换工作目录: {self.model_path}")

            # 1. 添加模型自带的 qai_libs 到 PATH（优先级最高，避免 DLL 冲突）
            qai_libs_path = str(self.model_path / "qai_libs")
            if os.path.exists(qai_libs_path):
                current_path = os.environ.get("PATH", "")
                if qai_libs_path not in current_path:
                    os.environ["PATH"] = qai_libs_path + ";" + current_path
                try:
                    os.add_dll_directory(qai_libs_path)
                except Exception:
                    pass
                logger.info(f"[Reranker] 已添加 qai_libs: {qai_libs_path}")

            # 2. 导入 GenieContext
            from qai_appbuilder import GenieContext

            # 3. 加载模型
            logger.info(f"[Reranker] 正在加载模型: {self.config_path}")
            self.dialog = GenieContext(self.config_path)

            # 4. 设置生成参数：贪心解码，最大 10 tokens
            self.dialog.SetParams("10", "0.01", "1", "1.0")

            self._load_time = time.time() - start
            self.is_loaded = True
            logger.info(f"[Reranker] 模型加载成功, 耗时: {self._load_time:.2f}s")
            return True

        except ImportError as e:
            logger.error(f"[Reranker] qai_appbuilder 未安装: {e}")
            if self._original_cwd:
                os.chdir(self._original_cwd)
            return False
        except Exception as e:
            logger.error(f"[Reranker] 模型加载失败: {e}", exc_info=True)
            if self._original_cwd:
                try:
                    os.chdir(self._original_cwd)
                except Exception:
                    pass
            return False

    def unload(self):
        """卸载模型释放 NPU 资源"""
        if self.dialog is not None:
            try:
                del self.dialog
                self.dialog = None
                self.is_loaded = False
                logger.info("[Reranker] 模型已卸载")
            except Exception as e:
                logger.warning(f"[Reranker] 卸载异常: {e}")

    def score(self, query: str, document: str) -> float:
        """
        计算单个 query-document 对的相关性分数

        Args:
            query: 用户查询
            document: 候选文档文本

        Returns:
            相关性分数 (1.0=相关, 0.0=不相关, 0.5=不确定)
        """
        if not self.is_loaded:
            logger.warning("[Reranker] 模型未加载，返回默认分数 0.0")
            return 0.0

        try:
            # 构造 prompt（截断过长文档）
            prompt = build_reranker_prompt(query, document[:1500])

            # NPU 推理：通过 callback 收集 tokens
            response_parts = []

            def on_response(text):
                response_parts.append(text)
                return True  # 返回 True 继续生成

            self.dialog.Query(prompt, on_response)

            # 解析结果
            answer = "".join(response_parts).strip()
            answer_lower = answer.lower()

            if answer_lower.startswith("yes") or ("yes" in answer_lower and "no" not in answer_lower):
                return 1.0
            elif answer_lower.startswith("no") or ("no" in answer_lower and "yes" not in answer_lower):
                return 0.0
            else:
                return 0.5

        except Exception as e:
            logger.error(f"[Reranker] 推理失败: {e}")
            return 0.0

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        content_key: str = "content",
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        对候选文档列表进行精排

        Args:
            query: 用户查询
            candidates: 候选文档列表 (每个元素是 dict，包含 content 字段)
            content_key: 文档内容字段名
            top_k: 返回 Top-K 结果

        Returns:
            精排后的文档列表 (按相关性降序)
        """
        if not self.is_loaded:
            logger.warning("[Reranker] 模型未加载，返回原始排序")
            return candidates[:top_k]

        if not candidates:
            return []

        start = time.time()
        scored_candidates = []

        for candidate in candidates:
            # 提取文档文本
            content = candidate.get(content_key, "")
            if isinstance(content, dict):
                content = content.get("description", str(content))
            if not isinstance(content, str):
                content = str(content)

            # 拼接 title + content 作为文档
            title = candidate.get("title", "")
            doc_text = f"{title}\n{content}" if title else content

            # 计算相关性分数
            rerank_score = self.score(query, doc_text)

            scored_candidate = dict(candidate)
            scored_candidate["rerank_score"] = rerank_score
            scored_candidates.append(scored_candidate)

        # 按 rerank_score 降序排序，相同分数保持原始顺序（粗排分数）
        scored_candidates.sort(
            key=lambda x: (x.get("rerank_score", 0), x.get("similarity", 0)),
            reverse=True
        )

        elapsed = time.time() - start
        relevant_count = sum(1 for c in scored_candidates if c.get("rerank_score", 0) > 0)
        logger.info(
            f"[Reranker] 精排完成: {len(candidates)} 篇候选 -> "
            f"{relevant_count} 篇相关, 耗时 {elapsed:.2f}s"
        )

        return scored_candidates[:top_k]

    def get_status(self) -> Dict[str, Any]:
        """获取 Reranker 服务状态"""
        return {
            "model": "Qwen3-Reranker-0.6B",
            "is_loaded": self.is_loaded,
            "model_path": str(self.model_path),
            "load_time": f"{self._load_time:.2f}s",
            "qnn_version": "2.38",
            "backend": "QNN HTP (NPU)",
            "api": "GenieContext.Query(prompt, callback)"
        }


# ============================================================
# 模块级便捷函数
# ============================================================

def get_reranker_service(model_path: str = None) -> RerankerService:
    """获取全局 Reranker 服务实例（单例）"""
    global _reranker_service
    if _reranker_service is None:
        _reranker_service = RerankerService(model_path)
    return _reranker_service


def rerank_cards(
    query: str,
    cards: List[Dict[str, Any]],
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    便捷函数：对知识卡片进行精排

    如果 Reranker 未加载，直接返回原始列表（降级处理）。

    Args:
        query: 用户查询
        cards: 候选卡片列表
        top_k: 返回数量

    Returns:
        精排后的卡片列表
    """
    service = get_reranker_service()
    if not service.is_loaded:
        logger.debug("[Reranker] 服务未加载，跳过精排")
        return cards[:top_k]
    return service.rerank(query, cards, content_key="content", top_k=top_k)
