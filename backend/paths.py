# backend/paths.py - 统一路径管理
"""
统一路径管理 - 兼容 PyInstaller 打包环境
打包后 BACKEND_DIR 指向 exe 所在目录下的 backend/
开发时 BACKEND_DIR 指向 backend/ 源码目录
"""

import sys
from pathlib import Path


def _get_backend_dir() -> Path:
    """获取后端根目录"""
    if getattr(sys, 'frozen', False):
        # PyInstaller 打包后，exe 已在 backend/ 目录下，直接用 exe 所在目录
        return Path(sys.executable).parent
    return Path(__file__).parent.absolute()


def _get_project_root() -> Path:
    """获取项目根目录"""
    if getattr(sys, 'frozen', False):
        # exe 在 backend/ 下，项目根目录是上一级
        return Path(sys.executable).parent.parent
    return Path(__file__).parent.parent.absolute()


BACKEND_DIR = _get_backend_dir()
PROJECT_ROOT = _get_project_root()

# 常用路径
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "antinet.db"
