"""
Markdown 转 PDF API 路由
使用 reportlab 将 Markdown 转换为专业版式的 PDF
"""

import logging
import os
import tempfile
import subprocess
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, Response
from typing import Optional
import shutil
import json
from urllib.parse import quote

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/md2pdf", tags=["Markdown转PDF"])

# 获取脚本目录
SKILL_DIR = Path(__file__).parent.parent.parent / "skills" / "lovstudio-any2pdf" / "scripts"
MD2PDF_SCRIPT = SKILL_DIR / "md2pdf.py"

# 检查依赖
MD2PDF_AVAILABLE = False

def check_dependencies():
    """检查 MD2PDF 依赖是否可用"""
    global MD2PDF_AVAILABLE
    try:
        import reportlab
        MD2PDF_AVAILABLE = True
        logger.info("[MD2PDF] reportlab 已安装")
        return True
    except ImportError:
        logger.warning("[MD2PDF] reportlab 未安装，请运行: pip install reportlab")
        return False

# 延迟检查
try:
    import reportlab
    MD2PDF_AVAILABLE = True
except:
    pass


@router.get("/status")
async def get_md2pdf_status():
    """获取 MD2PDF 功能状态"""
    deps_ok = check_dependencies()
    script_exists = MD2PDF_SCRIPT.exists()
    
    return {
        "available": deps_ok and script_exists,
        "message": "MD转PDF功能可用" if (deps_ok and script_exists) else "依赖未安装",
        "dependencies": {
            "reportlab": MD2PDF_AVAILABLE,
            "script": script_exists
        }
    }


@router.post("/convert")
async def convert_md_to_pdf(
    file: UploadFile = File(...),
    title: str = Form(""),
    author: str = Form(""),
    theme: str = Form("warm-academic"),
    watermark: str = Form("")
):
    """
    将 Markdown 文件转换为 PDF
    
    参数:
    - file: Markdown 文件
    - title: 文档标题（可选，默认从文件名提取）
    - author: 作者（可选）
    - theme: 主题风格 (warm-academic, classic-thesis, tufte, ieee-journal, elegant-book, chinese-red, ink-wash, github-light, nord-frost, ocean-breeze)
    - watermark: 水印文字（可选）
    """
    if not MD2PDF_AVAILABLE:
        raise HTTPException(status_code=500, detail="reportlab 未安装")
    
    if not MD2PDF_SCRIPT.exists():
        raise HTTPException(status_code=500, detail=f"转换脚本不存在: {MD2PDF_SCRIPT}")
    
    # 验证文件类型
    if not file.filename.endswith('.md'):
        raise HTTPException(status_code=400, detail="只支持 .md 文件")
    
    # 创建临时目录
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # 保存上传的 Markdown 文件
        input_file = temp_path / file.filename
        content = await file.read()
        input_file.write_bytes(content)
        
        # 准备输出文件
        output_filename = file.filename.replace('.md', '.pdf')
        output_file = temp_path / output_filename
        
        # 构建命令 - 使用 venv 中的 python
        backend_dir = Path(__file__).parent.parent
        project_root = backend_dir.parent
        venv_path = project_root / "venv_arm64"
        python_exe = str(venv_path / "Scripts" / "python.exe")
        
        # 检查 venv 是否存在
        if not venv_path.exists():
            # 尝试其他可能的 venv 目录
            for venv_name in ["venv_x64", "venv"]:
                alt_venv = project_root / venv_name
                if alt_venv.exists():
                    python_exe = str(alt_venv / "Scripts" / "python.exe")
                    break
        
        cmd = [
            python_exe,
            str(MD2PDF_SCRIPT),
            "--input", str(input_file),
            "--output", str(output_file),
            "--theme", theme
        ]
        
        if title:
            cmd.extend(["--title", title])
        if author:
            cmd.extend(["--author", author])
        if watermark:
            cmd.extend(["--watermark", watermark])
        
        # 添加默认值
        cmd.extend(["--cover", "true", "--toc", "true"])
        
        logger.info(f"[MD2PDF] 执行命令: {' '.join(cmd)}")
        
        # 执行转换 - 使用 shell=True 来处理 Windows 路径
        try:
            result = subprocess.run(
                ' '.join(cmd),
                shell=True,
                capture_output=True,
                text=True,
                timeout=120
            )
            logger.info(f"[MD2PDF] stdout: {result.stdout}")
            if result.stderr:
                logger.error(f"[MD2PDF] stderr: {result.stderr}")
            return_code = result.returncode
            
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="转换超时")
        except Exception as e:
            logger.error(f"[MD2PDF] 执行异常: {e}")
            raise HTTPException(status_code=500, detail=f"转换异常: {str(e)}")
        
        if return_code != 0:
            logger.error(f"[MD2PDF] 转换失败，返回码: {return_code}")
            raise HTTPException(status_code=500, detail="PDF 转换失败")
        
        # 检查输出文件
        output_file = temp_path / output_filename
        if not output_file.exists():
            logger.error(f"[MD2PDF] 文件不存在: {output_file}")
            raise HTTPException(status_code=500, detail="PDF 文件未生成")
        
        # 读取 PDF 内容到内存后再返回
        pdf_content = output_file.read_bytes()
        
        # 使用 ASCII 安全的方式处理文件名
        safe_filename = output_filename.replace('.pdf', '') + '.pdf'
        # 仅保留 ASCII 字符
        ascii_filename = ''.join(c if ord(c) < 128 else '_' for c in safe_filename)
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={ascii_filename}"}
        )


@router.get("/themes")
async def get_available_themes():
    """获取可用的主题列表"""
    return {
        "themes": [
            {"id": "warm-academic", "name": "暖学术", "description": "陶土色调，温润典雅"},
            {"id": "classic-thesis", "name": "经典论文", "description": "棕色调，LaTeX风格"},
            {"id": "tufte", "name": "Tufte", "description": "极简留白，深红点缀"},
            {"id": "ieee-journal", "name": "期刊蓝", "description": "藏蓝严谨，IEEE风格"},
            {"id": "elegant-book", "name": "精装书", "description": "咖啡色调，书卷气"},
            {"id": "chinese-red", "name": "中国红", "description": "朱红配暖纸"},
            {"id": "ink-wash", "name": "水墨", "description": "纯灰黑，素雅克制"},
            {"id": "github-light", "name": "GitHub", "description": "蓝白极简"},
            {"id": "nord-frost", "name": "Nord冰霜", "description": "蓝灰北欧风"},
            {"id": "ocean-breeze", "name": "海洋", "description": "青绿色调，清新自然"}
        ]
    }