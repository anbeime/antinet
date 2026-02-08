"""
BGE Embedding Service
Uses QAI AppBuilder Python API for BGE embedding
Reference: https://www.aidevhome.com/?id=54

Hardware: Snapdragon X Elite (X1E-84-100)
Software: QAI AppBuilder (qai_appbuilder)
Model: bge-base-zh-v1.5-qnn-8380
"""

import os
import sys
import logging
import numpy as np
from typing import List

logger = logging.getLogger(__name__)

# Model paths
MODEL_DIR = "C:/model/models_2.38/bge-base-zh-v1.5-qnn-8380"
MODEL_BIN = os.path.join(MODEL_DIR, "model.bin")

# QAI AppBuilder library path
QAI_LIBS_DIR = os.path.join(MODEL_DIR, "qai_libs")


class BGEEmbeddingService:
    """BGE Embedding Service (using QAI AppBuilder)"""

    def __init__(self, use_qnn=True):
        """
        Initialize

        Args:
            use_qnn: Whether to use QNN inference
        """
        self.use_qnn = use_qnn
        self.context = None
        self.tokenizer = None
        self.max_length = 512

        # Check model file
        if not os.path.exists(MODEL_BIN):
            logger.error(f"[ERROR] Model file not found: {MODEL_BIN}")
            logger.warning("Will use TF-IDF as fallback")
            self.use_qnn = False
        else:
            logger.info(f"[OK] Model file found: {MODEL_BIN}")

        # Check QAI AppBuilder
        try:
            self._init_qai_appbuilder()
        except ImportError:
            logger.warning("[WARNING] qai_appbuilder not installed, will use TF-IDF")
            self.use_qnn = False

    def _init_qai_appbuilder(self):
        """Initialize QAI AppBuilder"""
        # Add model directory to Python path
        if MODEL_DIR not in sys.path:
            sys.path.insert(0, MODEL_DIR)
        if os.path.join(MODEL_DIR, "python") not in sys.path:
            sys.path.insert(0, os.path.join(MODEL_DIR, "python"))

        try:
            from qai_appbuilder import QNNContext, Runtime, LogLevel, QNNConfig
            logger.info("[OK] QAI AppBuilder imported successfully")

            # Configure QNN
            QNNConfig.Config(QAI_LIBS_DIR, Runtime.HTP, LogLevel.WARN)
            logger.info(f"[OK] QNN configured: {QAI_LIBS_DIR}")

        except ImportError as e:
            logger.error(f"[ERROR] QAI AppBuilder import failed: {e}")
            raise

    def embed(self, text: str, max_length: int = 512) -> List[float]:
        """
        Convert text to vector

        Args:
            text: Input text
            max_length: Maximum length

        Returns:
            Vector list
        """
        if not self.use_qnn:
            # Use TF-IDF (fallback)
            return self._embed_with_tfidf(text, max_length)

        try:
            # Use QAI AppBuilder inference
            return self._embed_with_qai(text, max_length)
        except Exception as e:
            logger.error(f"[ERROR] QAI AppBuilder inference failed: {e}")
            # Fallback to TF-IDF
            logger.info("[INFO] Fallback to TF-IDF")
            return self._embed_with_tfidf(text, max_length)

    def encode_text(self, text: str, max_length: int = 512) -> List[float]:
        """
        Convert text to vector (compatible interface)

        Args:
            text: Input text
            max_length: Maximum length

        Returns:
            Vector list
        """
        return self.embed(text, max_length)

    def embed_batch(self, texts: List[str], max_length: int = 512) -> List[List[float]]:
        """
        Batch embedding

        Args:
            texts: Text list
            max_length: Maximum length

        Returns:
            Vector list
        """
        results = []
        for text in texts:
            result = self.embed(text, max_length)
            results.append(result)
        return results

    def _embed_with_qai(self, text: str, max_length: int = 512) -> List[float]:
        """Use QAI AppBuilder for inference"""
        from qai_appbuilder import QNNContext

        # Initialize Context
        if self.context is None:
            self.context = QNNContext("bge", MODEL_BIN)
            logger.info("[OK] BGE Context initialized")

        # Initialize Tokenizer
        if self.tokenizer is None:
            try:
                from transformers import AutoTokenizer
                self.tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-base-zh-v1.5")
                logger.info("[OK] Tokenizer loaded")
            except ImportError:
                logger.warning("[WARNING] transformers not installed, using simple tokenization")
                pass

        # Tokenize
        if self.tokenizer:
            inputs = self.tokenizer(
                text,
                padding="max_length",
                truncation=True,
                max_length=max_length,
                return_tensors="np"
            )
            input_ids = inputs["input_ids"].astype(np.int32)
            attention_mask = inputs["attention_mask"].astype(np.int32)
        else:
            # Fallback: Simple tokenization
            import jieba
            tokens = list(jieba.cut(text))
            # Simple token mapping
            token_lengths = [len(t) for t in tokens[:max_length]]
            input_ids = np.array([token_lengths], dtype=np.int32)
            attention_mask = np.ones((1, max_length), dtype=np.int32)

        # Generate position_ids
        position_ids = np.arange(max_length, dtype=np.int32).reshape(1, max_length)

        # Execute inference
        output_data = self.context.Inference(
            input_ids,
            attention_mask,
            position_ids
        )

        # Post-processing: Extract [CLS] vector
        embedding = output_data[0].astype(np.float32).flatten()

        # Normalize
        norm = np.linalg.norm(embedding)
        if norm > 1e-12:
            embedding = embedding / norm

        return embedding.tolist()

    def _embed_with_tfidf(self, text: str, max_length: int = 512) -> List[float]:
        """Use TF-IDF (fallback)"""
        try:
            import jieba
            from sklearn.feature_extraction.text import TfidfVectorizer

            # Chinese tokenization
            tokens = list(jieba.cut(text))
            tokenized_text = " ".join(tokens)

            # TF-IDF vectorization
            vectorizer = TfidfVectorizer(max_features=max_length, token_pattern=r"(?u)\b\w+\b")
            vector = vectorizer.fit_transform([tokenized_text])
            result = vector.toarray()[0].tolist()

            # Ensure correct dimension
            if len(result) < max_length:
                result.extend([0.0] * (max_length - len(result)))
            elif len(result) > max_length:
                result = result[:max_length]

            return result

        except ImportError:
            logger.error("[ERROR] sklearn/jieba not installed, cannot use TF-IDF")
            # Last fallback: Return zero vector
            return [0.0] * max_length


# Global service instance
_service = None


def get_embedding_service(use_qnn: bool = True):
    """Get embedding service instance"""
    global _service
    if _service is None:
        _service = BGEEmbeddingService(use_qnn=use_qnn)
    return _service


def embed_text(text: str, max_length: int = 512) -> List[float]:
    """Convenience function: Embed text"""
    service = get_embedding_service()
    return service.embed(text, max_length)


def embed_batch(texts: List[str], max_length: int = 512) -> List[List[float]]:
    """Convenience function: Batch embedding"""
    service = get_embedding_service()
    return service.embed_batch(texts, max_length)
