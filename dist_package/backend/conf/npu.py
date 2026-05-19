# backend/conf/npu.py - NPU 配置
"""
NPU 配置 - 参考 SiYuan 配置管理模式
集中管理 NPU/Qualcomm AI 运行时配置
"""

import os
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import Field
from .base import BaseConfig, get_settings


class NPUConfig(BaseConfig):
    """NPU 配置"""
    
    # QNN 后端配置
    QNN_BACKEND: str = Field(default="HTP", description="QNN后端: HTP(NPU), GPU, CPU")
    QNN_DEVICE: str = Field(default="NPU", description="设备类型")
    QNN_PERFORMANCE_MODE: str = Field(default="BURST", description="性能模式: BURST, DEFAULT, POWER_SAVER")
    QNN_LOG_LEVEL: str = Field(default="DEBUG", description="日志级别: DEBUG, TRACE, INFO, WARN, ERROR")
    
    # SDK 版本配置
    QNN_SDK_VERSION: str = Field(default="2.37", description="QNN SDK 版本")
    QNN_SDK_PATHS: Dict[str, str] = Field(default_factory=dict, description="各版本SDK路径")
    
    # 模型配置
    MODEL_BASE_DIRS: List[Path] = Field(default_factory=list, description="模型搜索目录")
    AUTO_LOAD_MODEL: bool = Field(default=False, description="启动时自动加载模型")
    
    class Config:
        env_prefix = "ZHIYI_QNN_"
    
    def __init__(self, **data):
        super().__init__(**data)
        self._init_sdk_paths()
        self._init_model_dirs()
    
    def _init_sdk_paths(self):
        """初始化 SDK 路径映射"""
        settings = get_settings()
        project_root = settings.PROJECT_ROOT
        
        # 版本号到目录名的映射（优先精确版本，然后 fallback 到兼容的新版本）
        version_dirs = {
            "2.34": ["2.34.0.250626", "2.45.40.260406", "2.42.0.251225"],
            "2.37": ["2.37.1.250807", "2.45.40.260406", "2.42.0.251225"],
            "2.42": ["2.42.0.251225", "2.45.40.260406"],
            "2.45": ["2.45.40.260406"],
        }
        
        for version, dirs in version_dirs.items():
            for vdir in dirs:
                # 优先 arm64x-windows-msvc（ARM64EC）
                p = project_root / "QAIRT" / vdir / "lib" / "arm64x-windows-msvc"
                if p.exists():
                    self.QNN_SDK_PATHS[version] = str(p)
                    break
                # 备选 aarch64-windows-msvc（原生 ARM64）
                p = project_root / "QAIRT" / vdir / "lib" / "aarch64-windows-msvc"
                if p.exists():
                    self.QNN_SDK_PATHS[version] = str(p)
                    break
    
    def _init_model_dirs(self):
        """初始化模型搜索目录"""
        settings = get_settings()
        project_root = settings.PROJECT_ROOT
        
        self.MODEL_BASE_DIRS = [
            project_root / "models",
        ]
    
    def get_sdk_path(self, version: Optional[str] = None) -> str:
        """获取指定版本的 SDK 路径"""
        if version is None:
            version = self.QNN_SDK_VERSION
        
        # 首先尝试精确版本
        if version in self.QNN_SDK_PATHS:
            sdk_path = self.QNN_SDK_PATHS[version]
            if Path(sdk_path).exists():
                return sdk_path
        
        # 默认返回 v2.45 路径
        default_path = str(
            get_settings().PROJECT_ROOT / "QAIRT" / "2.45.40.260406" / "lib" / "arm64x-windows-msvc"
        )
        if Path(default_path).exists():
            return default_path
        
        return default_path
    
    def get_libs_path(self) -> str:
        """获取当前版本的库路径"""
        return self.get_sdk_path(self.QNN_SDK_VERSION)
