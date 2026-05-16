# backend/routes/image_routes.py - 图片管理API
"""
处理卡片图片的上传、存储和管理
"""
import os
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
import shutil

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/images", tags=["图片管理"])

# 图片存储目录
IMAGE_STORAGE_DIR = Path(__file__).parent.parent / "data" / "images" / "cards"
THUMBNAIL_DIR = IMAGE_STORAGE_DIR / "thumbnails"

# 确保目录存在
IMAGE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)

# 允许的图片格式
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def allowed_file(filename: str) -> bool:
    """检查文件扩展名是否允许"""
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)


def get_file_extension(filename: str) -> str:
    """获取文件扩展名"""
    return Path(filename).suffix.lower()


def generate_unique_filename(original_filename: str) -> str:
    """生成唯一的文件名"""
    ext = get_file_extension(original_filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"{timestamp}_{unique_id}{ext}"


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    card_id: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    上传单张图片
    
    Args:
        file: 图片文件
        card_id: 可选的关联卡片ID
    
    Returns:
        上传成功后的图片信息
    """
    logger.info(f"[IMAGE_UPLOAD] 收到上传请求: {file.filename}, card_id={card_id}")
    
    # 检查文件类型
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的图片格式。支持: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 检查文件大小
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset to start
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"图片大小超过限制 ({MAX_FILE_SIZE // 1024 // 1024}MB)"
        )
    
    try:
        # 生成唯一文件名
        new_filename = generate_unique_filename(file.filename)
        file_path = IMAGE_STORAGE_DIR / new_filename
        
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 构建返回信息
        relative_path = f"images/cards/{new_filename}"
        image_info = {
            "id": str(uuid.uuid4()),
            "filename": new_filename,
            "original_name": file.filename,
            "path": relative_path,
            "full_path": str(file_path),
            "size": size,
            "card_id": card_id,
            "url": f"/api/images/{new_filename}"  # 用于访问图片的URL
        }
        
        logger.info(f"[IMAGE_UPLOAD] 保存成功: {relative_path}")
        return image_info
        
    except Exception as e:
        logger.error(f"[IMAGE_UPLOAD] 保存失败: {e}")
        raise HTTPException(status_code=500, detail=f"图片保存失败: {str(e)}")


@router.post("/upload-multiple")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    card_id: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    批量上传多张图片
    
    Args:
        files: 多张图片文件
        card_id: 可选的关联卡片ID
    
    Returns:
        上传成功的图片列表
    """
    logger.info(f"[IMAGE_UPLOAD_MULTI] 收到 {len(files)} 张图片上传请求")
    
    results = []
    errors = []
    
    for i, file in enumerate(files):
        try:
            if not allowed_file(file.filename):
                errors.append({"index": i, "filename": file.filename, "error": "不支持的格式"})
                continue
            
            file.file.seek(0, 2)
            size = file.file.tell()
            file.file.seek(0)
            
            if size > MAX_FILE_SIZE:
                errors.append({"index": i, "filename": file.filename, "error": "文件过大"})
                continue
            
            new_filename = generate_unique_filename(file.filename)
            file_path = IMAGE_STORAGE_DIR / new_filename
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            results.append({
                "id": str(uuid.uuid4()),
                "filename": new_filename,
                "original_name": file.filename,
                "path": f"images/cards/{new_filename}",
                "size": size,
                "card_id": card_id,
                "url": f"/api/images/{new_filename}"
            })
            
        except Exception as e:
            errors.append({"index": i, "filename": file.filename, "error": str(e)})
    
    return {
        "success": len(results),
        "failed": len(errors),
        "images": results,
        "errors": errors
    }


@router.get("/{filename}")
async def get_image(filename: str):
    """
    获取图片文件
    
    Args:
        filename: 图片文件名
    """
    file_path = IMAGE_STORAGE_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="图片不存在")
    
    # 根据扩展名确定内容类型
    content_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp'
    }
    
    ext = get_file_extension(filename)
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return FileResponse(file_path, media_type=content_type)


@router.delete("/{filename}")
async def delete_image(filename: str) -> Dict[str, str]:
    """
    删除图片文件
    
    Args:
        filename: 图片文件名
    """
    file_path = IMAGE_STORAGE_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="图片不存在")
    
    try:
        os.remove(file_path)
        logger.info(f"[IMAGE_DELETE] 删除成功: {filename}")
        return {"status": "success", "message": f"图片 {filename} 已删除"}
    except Exception as e:
        logger.error(f"[IMAGE_DELETE] 删除失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.get("/list")
async def list_images(
    card_id: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    列出已上传的图片
    
    Args:
        card_id: 可选的卡片ID过滤
        limit: 返回数量限制
    """
    try:
        files = []
        for f in IMAGE_STORAGE_DIR.iterdir():
            if f.is_file() and allowed_file(f.name):
                stat = f.stat()
                files.append({
                    "filename": f.name,
                    "path": f"images/cards/{f.name}",
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "url": f"/api/images/{f.name}"
                })
        
        # 按创建时间排序（最新的在前）
        files.sort(key=lambda x: x["created"], reverse=True)
        
        # 应用限制
        files = files[:limit]
        
        return {
            "total": len(files),
            "images": files
        }
    except Exception as e:
        logger.error(f"[IMAGE_LIST] 列出失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取列表失败: {str(e)}")