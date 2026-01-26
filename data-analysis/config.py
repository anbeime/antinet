"""
应用配置管理
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


class Settings(BaseSettings):
    """应用配置"""
    
    # GenieAPIService配置
    genie_api_base_url: str = os.getenv("GENIE_API_BASE_URL", "http://localhost:8000")
    model_path: str = os.getenv("MODEL_PATH", "C:/model/Qwen2.0-7B-SSD-8380-2.34/")
    genie_api_key: str = os.getenv("GENIE_API_KEY", "")
    
    # QNN SDK配置
    qnn_sdk_root: str = os.getenv("QNN_SDK_ROOT", "")
    
    # 数据库配置
    database_path: str = os.getenv("DATABASE_PATH", "./data/knowledge.db")
    duckdb_path: str = os.getenv("DuckDB_PATH", "./data/analysis.db")
    
    # 向量检索配置
    vector_db_path: str = os.getenv("VECTOR_DB_PATH", "./data/vectors")
    bge_model_path: str = os.getenv("BGE_MODEL_PATH", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    
    # 应用配置
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # CORS配置
    cors_origins: List[str] = eval(os.getenv("CORS_ORIGINS", '["http://localhost:3000"]'))
    
    # 日志配置
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: str = os.getenv("LOG_FILE", "./logs/app.log")
    
    # 性能配置
    max_batch_size: int = int(os.getenv("MAX_BATCH_SIZE", "1000"))
    vector_search_top_k: int = int(os.getenv("VECTOR_SEARCH_TOP_K", "10"))
    npu_timeout: int = int(os.getenv("NPU_TIMEOUT", "30000"))
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# 全局配置实例
settings = Settings()
