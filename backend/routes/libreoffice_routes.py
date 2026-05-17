"""
LibreOffice 文档转换服务
支持 Word/Excel/PPT 与 PDF 之间的转换
"""

import logging
import os
import subprocess
import tempfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/libreoffice", tags=["LibreOffice文档转换"])

# LibreOffice 安装路径
LIBREOFFICE_PATHS = [
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    "soffice"  # 如果在 PATH 中
]

def find_libreoffice() -> str:
    """查找 LibreOffice 可执行文件"""
    for path in LIBREOFFICE_PATHS:
        if os.path.exists(path):
            return path
    # 尝试从 PATH 获取
    import shutil
    return shutil.which("soffice") or "soffice"


@router.get("/status")
async def get_libreoffice_status():
    """检查 LibreOffice 状态"""
    try:
        lo_path = find_libreoffice()
        # 尝试运行 --version
        result = subprocess.run(
            [lo_path, "--version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        version = result.stdout.strip() if result.stdout else "Unknown"
        return {
            "available": True,
            "path": lo_path,
            "version": version
        }
    except Exception as e:
        return {
            "available": False,
            "error": str(e)
        }


@router.post("/convert")
async def convert_document(
    file: UploadFile = File(...),
    output_format: str = Form("pdf")
):
    """使用 LibreOffice 转换文档格式"""
    lo_path = find_libreoffice()
    
    # 验证文件扩展名
    ext = file.filename.split('.')[-1].lower()
    
    # MD文件回退到any2pdf
    if ext == 'md':
        from routes.md2pdf_routes import convert_md_to_pdf
        logger.info("[LibreOffice] MD文件，回退到any2pdf")
        return await convert_md_to_pdf(file, output_format)
    
    # 不支持的文件格式
    if ext not in ['doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'ods', 'csv', 'ppt', 'pptx', 'odp']:
        raise HTTPException(status_code=400, detail=f"不支持的文件格式: .{ext}")
    
    # 创建临时目录
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # 保存上传的文件
        input_file = temp_path / file.filename
        content = await file.read()
        input_file.write_bytes(content)
        
        # 输出文件
        output_ext = output_format.lower()
        output_file = temp_path / f"output.{output_ext}"
        
        # 构建命令
        cmd = [
            lo_path,
            "--headless",
            "--convert-to", output_format,
            "--outdir", str(temp_dir),
            str(input_file)
        ]
        
        logger.info(f"[LibreOffice] 执行命令: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            logger.info(f"[LibreOffice] stdout: {result.stdout}")
            if result.stderr:
                logger.warning(f"[LibreOffice] stderr: {result.stderr}")
            
            if result.returncode != 0:
                raise HTTPException(status_code=500, detail=f"转换失败: {result.stderr}")
            
            # 查找输出文件
            output_files = list(temp_path.glob(f"output.*"))
            if not output_files:
                raise HTTPException(status_code=500, detail="未生成输出文件")
            
            output_file = output_files[0]
            
            # 读取内容
            file_content = output_file.read_bytes()
            
            # 返回文件
            media_types = {
                "pdf": "application/pdf",
                "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "odt": "application/vnd.oasis.opendocument.text",
                "ods": "application/vnd.oasis.opendocument.spreadsheet",
                "odp": "application/vnd.oasis.opendocument.presentation"
            }
            
            return Response(
                content=file_content,
                media_type=media_types.get(output_ext, "application/octet-stream"),
                headers={"Content-Disposition": f"attachment; filename={output_file.name}"}
            )
            
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="转换超时")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[LibreOffice] 转换异常: {e}")
            raise HTTPException(status_code=500, detail=f"转换异常: {str(e)}")


@router.post("/to-pdf")
async def document_to_pdf(
    file: UploadFile = File(...),
):
    """将文档转换为 PDF（通用接口）"""
    return await convert_document(file, output_format="pdf")


@router.post("/word-to-pdf")
async def word_to_pdf(file: UploadFile = File(...)):
    """Word 转 PDF"""
    return await convert_document(file, output_format="pdf")


@router.post("/excel-to-pdf")
async def excel_to_pdf(file: UploadFile = File(...)):
    """Excel 转 PDF"""
    return await convert_document(file, output_format="pdf")


@router.post("/ppt-to-pdf")
async def ppt_to_pdf(file: UploadFile = File(...)):
    """PPT 转 PDF"""
    return await convert_document(file, output_format="pdf")


@router.get("/formats")
async def get_supported_formats():
    """获取支持的格式"""
    return {
        "input": {
            "word": ["doc", "docx", "odt", "rtf"],
            "excel": ["xls", "xlsx", "ods", "csv"],
            "powerpoint": ["ppt", "pptx", "odp"]
        },
        "output": {
            "pdf": "PDF 文档",
            "docx": "Word 文档",
            "xlsx": "Excel 工作簿",
            "pptx": "PowerPoint 演示文稿",
            "odt": "OpenDocument 文本",
            "ods": "OpenDocument 电子表格",
            "odp": "OpenDocument 演示文稿"
        }
    }


# 文档存储路径
DOCUMENT_STORE = Path(os.environ.get('DOCUMENT_STORE', r"C:\D\zhiyi\documents"))
DOCUMENT_STORE.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """上传文档到知识库"""
    # 保存文件
    file_path = DOCUMENT_STORE / file.filename
    content = await file.read()
    file_path.write_bytes(content)
    
    # 提取文本（简化版，实际可用 python-docx, pdfplumber 等）
    text_content = ""
    ext = file.filename.split('.')[-1].lower()
    
    try:
        if ext == 'txt':
            text_content = content.decode('utf-8', errors='ignore')
        # 可以添加更多格式的文本提取
    except Exception as e:
        logger.warning(f"提取文本失败: {e}")
    
    return {
        "success": True,
        "filename": file.filename,
        "path": str(file_path),
        "size": len(content)
    }


@router.get("/search")
async def search_documents(q: str = Query(..., description="搜索关键词")):
    """全文搜索文档内容"""
    results = []
    q_lower = q.lower()
    
    # 搜索文档目录
    for doc_path in DOCUMENT_STORE.glob("*"):
        if doc_path.is_file():
            try:
                content = ""
                ext = doc_path.suffix.lower()
                
                # 读取文本内容
                if ext in ['.txt', '.md']:
                    content = doc_path.read_text(encoding='utf-8', errors='ignore')
                elif ext == '.pdf':
                    # PDF 搜索需要额外库
                    content = ""
                elif ext in ['.docx', '.doc']:
                    content = ""
                elif ext in ['.xlsx', '.xls']:
                    content = ""
                
                # 简单关键词匹配
                if q_lower in content.lower():
                    # 找到匹配位置
                    lines = content.split('\n')
                    matches = []
                    for i, line in enumerate(lines):
                        if q_lower in line.lower():
                            matches.append({
                                "line": i + 1,
                                "text": line.strip()[:200]
                            })
                    
                    results.append({
                        "filename": doc_path.name,
                        "path": str(doc_path),
                        "size": doc_path.stat().st_size,
                        "matches": matches[:5],  # 最多5条匹配
                        "score": content.lower().count(q_lower)
                    })
            except Exception as e:
                logger.warning(f"搜索文件失败 {doc_path}: {e}")
    
    # 按匹配分数排序
    results.sort(key=lambda x: x['score'], reverse=True)
    
    return {"results": results[:20]}


@router.get("/list")
async def list_documents():
    """列出知识库中的所有文档"""
    docs = []
    for doc_path in DOCUMENT_STORE.glob("*"):
        if doc_path.is_file():
            docs.append({
                "filename": doc_path.name,
                "path": str(doc_path),
                "size": doc_path.stat().st_size,
                "modified": doc_path.stat().st_mtime
            })
    return {"documents": docs}


@router.delete("/delete")
async def delete_document(filename: str = Query(...)):
    """删除文档"""
    file_path = DOCUMENT_STORE / filename
    if file_path.exists():
        file_path.unlink()
        return {"success": True}
    raise HTTPException(status_code=404, detail="文件不存在")