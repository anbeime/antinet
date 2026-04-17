"""
MinerU PDF 处理器 - 高质量 PDF 解析
基于 MinerU 3.x，支持:
  - VLM HTTP Client 模式 (调用外部 VLM API，无需本地GPU)
  - Pipeline 模式 (本地模型，需要 torch)
  - CLI 子进程降级 (环境隔离时的保底方案)

输出:
  - Markdown (保真公式/表格/阅读顺序)
  - content_list.json (结构化 JSON)
  - middle.json (中间语义层)
"""

import os
import sys
import json
import shutil
import tempfile
import logging
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# ============================================================
# 可用性检测
# ============================================================

MINERU_AVAILABLE = False
MINERU_VLM_CLIENT_AVAILABLE = False  # 纯 HTTP 客户端模式 (无需 torch)
MINERU_PIPELINE_AVAILABLE = False    # pipeline 模式 (需要 torch + 本地模型)
MINERU_VERSION = "unknown"
_MINERU_IMPORT_ERROR = ""

try:
    import mineru
    from mineru.version import __version__ as _mv
    MINERU_VERSION = _mv
    MINERU_AVAILABLE = True
    logger.info(f"[MinerU] 已加载 mineru {MINERU_VERSION}")
except ImportError as e:
    _MINERU_IMPORT_ERROR = str(e)
    logger.warning(f"[MinerU] mineru 未安装: {e}")

# 检测 VLM client 依赖 (只需 httpx / requests，无 torch)
if MINERU_AVAILABLE:
    try:
        from mineru.backend.vlm.vlm_analyze import doc_analyze as _vlm_analyze
        MINERU_VLM_CLIENT_AVAILABLE = True
        logger.info("[MinerU] VLM client 模式可用")
    except Exception as e:
        logger.debug(f"[MinerU] VLM client 不可用: {e}")

# 检测 pipeline 依赖 (需要 torch)
if MINERU_AVAILABLE:
    try:
        import torch  # noqa: F401
        from mineru.backend.pipeline.pipeline_analyze import doc_analyze_streaming  # noqa: F401
        MINERU_PIPELINE_AVAILABLE = True
        logger.info("[MinerU] Pipeline 模式可用")
    except Exception as e:
        logger.debug(f"[MinerU] Pipeline 不可用 (可能缺少 torch): {e}")


# ============================================================
# 工具函数
# ============================================================

def _find_mineru_cli() -> Optional[str]:
    """查找 mineru CLI 可执行文件路径"""
    candidates = [
        # 项目 venv_x64
        r"C:\D\zhiyi\venv_x64\Scripts\mineru.exe",
        r"C:\D\zhiyi\venv_x64\Scripts\mineru",
        # 系统 PATH
        shutil.which("mineru"),
    ]
    for c in candidates:
        if c and Path(c).exists():
            return c
    return None


def _find_python_exe() -> str:
    """返回 venv_x64 的 python 路径"""
    venv_py = Path(r"C:\D\zhiyi\venv_x64\Scripts\python.exe")
    if venv_py.exists():
        return str(venv_py)
    return sys.executable


# ============================================================
# 主处理器
# ============================================================

class MinerUProcessor:
    """
    MinerU PDF 处理器
    
    优先级:
    1. 直接 Python API 调用 (vlm-http-client → pipeline)
    2. CLI 子进程 (mineru 命令)
    3. 返回错误
    """

    def __init__(self):
        self.available = MINERU_AVAILABLE
        self.vlm_client_available = MINERU_VLM_CLIENT_AVAILABLE
        self.pipeline_available = MINERU_PIPELINE_AVAILABLE
        self.version = MINERU_VERSION

    # ----------------------------------------------------------
    # 核心解析入口
    # ----------------------------------------------------------

    def parse_pdf(
        self,
        pdf_path: str,
        output_dir: Optional[str] = None,
        backend: str = "auto",
        language: str = "ch",
        formula_enable: bool = True,
        table_enable: bool = True,
        vlm_server_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        解析 PDF，返回 Markdown + 结构化 JSON

        Args:
            pdf_path: PDF 文件路径
            output_dir: 输出目录（None 则使用临时目录，调用方负责清理）
            backend: "auto" | "vlm-http-client" | "pipeline" | "cli"
            language: 文档语言 ("ch" | "en")
            formula_enable: 是否识别公式
            table_enable: 是否识别表格
            vlm_server_url: VLM HTTP server 地址 (backend=vlm-http-client 时必填)

        Returns:
            {
              "success": bool,
              "markdown": str,          # Markdown 全文
              "content_list": list,     # 结构化 JSON
              "content_list_v2": list,  # 结构化 JSON v2
              "middle_json": dict,      # 中间语义层
              "output_dir": str,        # 输出目录
              "filename": str,
              "backend_used": str,
              "error": str | None,
            }
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            return self._err(f"文件不存在: {pdf_path}")

        # 选择 backend
        if backend == "auto":
            if self.vlm_client_available and vlm_server_url:
                backend = "vlm-http-client"
            elif self.pipeline_available:
                backend = "pipeline"
            else:
                backend = "cli"

        # 准备输出目录
        own_tmpdir = False
        if output_dir is None:
            output_dir = tempfile.mkdtemp(prefix="mineru_")
            own_tmpdir = True

        try:
            if backend in ("vlm-http-client", "pipeline") and self.available:
                return self._parse_via_python_api(
                    pdf_path, output_dir, backend,
                    language, formula_enable, table_enable,
                    vlm_server_url, own_tmpdir
                )
            else:
                return self._parse_via_cli(
                    pdf_path, output_dir, language,
                    formula_enable, table_enable, own_tmpdir
                )
        except Exception as e:
            if own_tmpdir and Path(output_dir).exists():
                shutil.rmtree(output_dir, ignore_errors=True)
            return self._err(str(e))

    # ----------------------------------------------------------
    # Python API 路径
    # ----------------------------------------------------------

    def _parse_via_python_api(
        self, pdf_path: Path, output_dir: str, backend: str,
        language: str, formula_enable: bool, table_enable: bool,
        vlm_server_url: Optional[str], own_tmpdir: bool
    ) -> Dict[str, Any]:
        from mineru.cli.common import do_parse, read_fn
        from mineru.utils.enum_class import MakeMode

        pdf_bytes = read_fn(pdf_path)
        pdf_name = pdf_path.stem

        do_parse(
            output_dir=output_dir,
            pdf_file_names=[pdf_name],
            pdf_bytes_list=[pdf_bytes],
            p_lang_list=[language],
            backend=backend,
            parse_method="auto",
            formula_enable=formula_enable,
            table_enable=table_enable,
            server_url=vlm_server_url,
            f_draw_layout_bbox=False,
            f_draw_span_bbox=False,
            f_dump_md=True,
            f_dump_middle_json=True,
            f_dump_model_output=False,
            f_dump_orig_pdf=False,
            f_dump_content_list=True,
            f_make_md_mode=MakeMode.MM_MD,
        )

        return self._collect_output(output_dir, pdf_name, backend, own_tmpdir)

    # ----------------------------------------------------------
    # CLI 子进程路径
    # ----------------------------------------------------------

    def _parse_via_cli(
        self, pdf_path: Path, output_dir: str, language: str,
        formula_enable: bool, table_enable: bool, own_tmpdir: bool
    ) -> Dict[str, Any]:
        cli = _find_mineru_cli()
        python_exe = _find_python_exe()

        if cli:
            cmd = [
                cli, "parse",
                str(pdf_path),
                "--output-dir", output_dir,
                "--lang", language,
            ]
            if not formula_enable:
                cmd.append("--no-formula")
            if not table_enable:
                cmd.append("--no-table")
        else:
            # 用 python -m mineru
            cmd = [
                python_exe, "-m", "mineru", "parse",
                str(pdf_path),
                "--output-dir", output_dir,
                "--lang", language,
            ]
            if not formula_enable:
                cmd.append("--no-formula")
            if not table_enable:
                cmd.append("--no-table")

        logger.info(f"[MinerU CLI] 执行: {' '.join(cmd)}")

        result = subprocess.run(
            cmd, capture_output=True, text=True, encoding="utf-8", timeout=300
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"MinerU CLI 失败 (exit={result.returncode}):\n"
                f"stdout: {result.stdout[-2000:]}\n"
                f"stderr: {result.stderr[-2000:]}"
            )

        return self._collect_output(output_dir, pdf_path.stem, "cli", own_tmpdir)

    # ----------------------------------------------------------
    # 收集输出文件
    # ----------------------------------------------------------

    def _collect_output(
        self, output_dir: str, pdf_name: str, backend_used: str, own_tmpdir: bool
    ) -> Dict[str, Any]:
        """扫描 output_dir，收集 Markdown / JSON 输出"""

        # MinerU 默认将结果放在 output_dir/<pdf_name>/<parse_method>/
        base = Path(output_dir)

        markdown_content = ""
        content_list = []
        content_list_v2 = []
        middle_json = {}

        # 递归搜索所有 .md 和 .json
        md_files = list(base.rglob(f"{pdf_name}.md"))
        cl_files = list(base.rglob(f"{pdf_name}_content_list.json"))
        cl2_files = list(base.rglob(f"{pdf_name}_content_list_v2.json"))
        mj_files = list(base.rglob(f"{pdf_name}_middle.json"))

        if md_files:
            markdown_content = md_files[0].read_text(encoding="utf-8", errors="replace")
        if cl_files:
            content_list = json.loads(cl_files[0].read_text(encoding="utf-8"))
        if cl2_files:
            content_list_v2 = json.loads(cl2_files[0].read_text(encoding="utf-8"))
        if mj_files:
            middle_json = json.loads(mj_files[0].read_text(encoding="utf-8"))

        if not markdown_content and not content_list:
            raise RuntimeError(
                f"MinerU 输出目录未找到结果文件，目录: {output_dir}"
            )

        return {
            "success": True,
            "markdown": markdown_content,
            "content_list": content_list,
            "content_list_v2": content_list_v2,
            "middle_json": middle_json,
            "output_dir": str(base),
            "filename": pdf_name,
            "backend_used": backend_used,
            "error": None,
        }

    # ----------------------------------------------------------
    # 辅助
    # ----------------------------------------------------------

    @staticmethod
    def _err(msg: str) -> Dict[str, Any]:
        logger.error(f"[MinerUProcessor] {msg}")
        return {
            "success": False,
            "markdown": "",
            "content_list": [],
            "content_list_v2": [],
            "middle_json": {},
            "output_dir": "",
            "filename": "",
            "backend_used": "none",
            "error": msg,
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "available": self.available,
            "version": self.version,
            "vlm_client_available": self.vlm_client_available,
            "pipeline_available": self.pipeline_available,
            "cli_path": _find_mineru_cli(),
            "import_error": _MINERU_IMPORT_ERROR if not self.available else None,
        }


# 全局单例
_mineru_processor: Optional[MinerUProcessor] = None


def get_mineru_processor() -> MinerUProcessor:
    global _mineru_processor
    if _mineru_processor is None:
        _mineru_processor = MinerUProcessor()
    return _mineru_processor
