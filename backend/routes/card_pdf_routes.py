"""
知识卡片生成 PDF 报告
"""

import logging
import os
import tempfile
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/knowledge_export", tags=["知识卡片PDF"])

# 获取脚本目录
SKILL_DIR = Path(__file__).parent.parent / "skills" / "lovstudio-any2pdf" / "scripts"
MD2PDF_SCRIPT = SKILL_DIR / "md2pdf.py"


@router.get("/cards/export-pdf")
async def export_cards_to_pdf(
    card_ids: str = Query(..., description="逗号分隔的卡片ID"),
    title: str = Query("知识卡片报告", description="文档标题"),
    author: str = Query("", description="作者"),
    theme: str = Query("warm-academic", description="主题"),
    watermark: str = Query("", description="水印")
):
    """将选定的知识卡片导出为 PDF"""
    from database import DatabaseManager
    from config import settings
    
    if not MD2PDF_SCRIPT.exists():
        raise HTTPException(status_code=500, detail="转换脚本不存在")
    
    logger.info(f"[Cards2PDF] 收到请求: card_ids={card_ids}, title={title}")
    
    # 解析卡片ID - 支持字符串和数字
    try:
        card_id_list = []
        for x in card_ids.split(','):
            x = x.strip()
            if x.isdigit():
                card_id_list.append(int(x))
            elif x:
                # 尝试从字符串提取数字
                import re
                nums = re.findall(r'\d+', x)
                if nums:
                    card_id_list.append(int(nums[0]))
        
        if not card_id_list:
            raise HTTPException(status_code=400, detail="无效的卡片ID")
            
        logger.info(f"[Cards2PDF] 解析的卡片ID: {card_id_list}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Cards2PDF] 解析ID失败: {e}")
        raise HTTPException(status_code=400, detail=f"无效的卡片ID: {str(e)}")
    
    # 尝试从数据库获取
    cards = []
    try:
        db = DatabaseManager(settings.DB_PATH)
        conn = db.get_connection()
        cursor = conn.cursor()
        
        # 使用字符串 IN 语法
        ids_str = ','.join(map(str, card_id_list))
        query = f"SELECT title, content, card_type, category FROM knowledge_cards WHERE id IN ({ids_str})"
        logger.info(f"[Cards2PDF] 执行查询: {query}")
        cursor.execute(query)
        
        cards = cursor.fetchall()
        conn.close()
        logger.info(f"[Cards2PDF] 获取到 {len(cards)} 张卡片")
    except Exception as e:
        logger.error(f"[Cards2PDF] 数据库错误: {e}")
        cards = []
    
    # 如果没有获取到卡片，使用示例
    if not cards:
        logger.warning(f"[Cards2PDF] 无数据，使用示例")
        cards = [
            (title, f"这是卡片内容\n\n卡片ID: {', '.join(map(str, card_id_list))}", "blue", "blue")
        ]
    
    if not cards:
        cards = [
            (title, f"卡片内容\n\n卡片ID: {', '.join(map(str, card_id_list))}", "blue", "blue")
        ]
    
    # 构建 Markdown 内容
    md_content = f"# {title}\n\n"
    if author:
        md_content += f"**作者**: {author}\n\n"
    md_content += "---\n\n"
    
    type_names = {"blue": "核心概念", "green": "关联链接", "yellow": "参考来源", "red": "索引关键词"}
    type_colors = {"blue": "blue", "green": "green", "yellow": "yellow", "red": "red"}
    
    for card in cards:
        card_title, content, card_type, category = card
        type_name = type_names.get(category or card_type, "其他")
        md_content += f"## {card_title}\n\n"
        md_content += f"**类型**: {type_name}\n\n"
        md_content += f"{content}\n\n---\n\n"
    
    # 写入临时文件
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        input_file = temp_path / "cards.md"
        input_file.write_text(md_content, encoding='utf-8')
        
        output_file = temp_path / "report.pdf"
        
        # 构建命令
        project_root = Path(__file__).parent.parent.parent
        venv_path = project_root / "venv_arm64"
        python_exe = str(venv_path / "Scripts" / "python.exe")
        
        if not venv_path.exists():
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
            "--theme", theme,
            "--title", title,
            "--cover", "true",
            "--toc", "true"
        ]
        
        if author:
            cmd.extend(["--author", author])
        if watermark:
            cmd.extend(["--watermark", watermark])
        
        logger.info(f"[Cards2PDF] 执行命令: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(
                ' '.join(cmd),
                shell=True,
                capture_output=True,
                text=True,
                timeout=120
            )
            logger.info(f"[Cards2PDF] stdout: {result.stdout}")
            if result.stderr:
                logger.error(f"[Cards2PDF] stderr: {result.stderr}")
            
            if result.returncode != 0 or not output_file.exists():
                raise HTTPException(status_code=500, detail="PDF生成失败")
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="生成超时")
        
        # 读取并返回
        pdf_content = output_file.read_bytes()
        from urllib.parse import quote
        filename = f"{title}.pdf"
        encoded_name = quote(filename)
        
        from fastapi.responses import Response
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}"}
        )