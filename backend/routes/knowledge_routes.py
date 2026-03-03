"""
知识管理路由
提供知识库的 CRUD 接口
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
import tempfile
import os

from config import settings
from database import DatabaseManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/knowledge", tags=["知识管理"])


# 创建数据库管理器实例
db_manager = DatabaseManager(settings.DB_PATH)


class SearchRequest(BaseModel):
    """知识库搜索请求"""
    keyword: str = Field(..., description="搜索关键词")
    limit: int = Field(10, description="返回数量限制")


@router.get("/graph")
async def get_knowledge_graph(
    card_type: Optional[str] = None,
    limit: int = 100
):
    """
    获取知识图谱数据
    
    参数：
        card_type: 卡片类型过滤（可选）
        limit: 节点数量限制
    
    返回：
        知识图谱数据（节点+边）
    """
    try:
        from services.skill_system import get_skill_registry
        
        # 获取技能注册表
        registry = get_skill_registry()
        
        # 获取所有卡片
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM knowledge_cards WHERE 1=1"
        params = []
        
        if card_type:
            query += " AND card_type = ?"
            params.append(card_type)
        
        query += " LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        # 转换为字典列表
        cards = [dict(row) for row in rows]
        
        # 调用知识图谱可视化技能
        result = await registry.execute_skill(
            "knowledge_graph_visualization",
            cards=cards
        )
        
        return result.get("result", {})
        
    except Exception as e:
        logger.error(f"获取知识图谱失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class KnowledgeCard(BaseModel):
    """知识卡片模型"""
    id: Optional[int] = None
    type: str  # 使用 type 与数据库一致
    title: str
    content: str
    source: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    project_id: Optional[int] = None  # 关联的专题ID


class KnowledgeSource(BaseModel):
    """知识来源模型"""
    id: Optional[int] = None
    source_path: str
    source_type: str
    total_cards: int = 0


@router.get("/cards")
async def get_cards(
    card_type: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    获取知识卡片列表

    Args:
        card_type: 卡片类型过滤（blue/green/yellow/red）
        category: 分类过滤
        limit: 返回数量限制
        offset: 偏移量

    Returns:
        卡片列表
    """
    conn = db_manager.get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM knowledge_cards WHERE 1=1"
    params = []

    if card_type:
        query += " AND card_type = ?"
        params.append(card_type)

    if category:
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    cards = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return cards


@router.get("/cards/{card_id}")
async def get_card(card_id: int):
    """
    获取单个知识卡片

    Args:
        card_id: 卡片ID

    Returns:
        卡片详情
    """
    conn = db_manager.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
    card = cursor.fetchone()

    conn.close()

    if not card:
        raise HTTPException(status_code=404, detail="卡片不存在")

    return dict(card)


@router.post("/cards")
async def create_card(card: KnowledgeCard):
    """
    创建新的知识卡片

    Args:
        card: 卡片数据

    Returns:
        创建的卡片
    """
    logger.info(f"[CREATE_CARD] 收到创建卡片请求: {card.dict()}")

    conn = db_manager.get_connection()
    cursor = conn.cursor()

    try:
        logger.info(f"[CREATE_CARD] 准备插入数据库，type={card.type}")

        # 使用正确的字段名 card_type（与数据库表结构一致）
        cursor.execute('''
            INSERT INTO knowledge_cards (card_type, title, content, category, project_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            card.type,
            card.title,
            card.content,
            card.category,
            card.project_id
        ))

        conn.commit()

        logger.info(f"[CREATE_CARD] 插入成功，lastrowid={cursor.lastrowid}")

        # 获取新插入的卡片
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (cursor.lastrowid,))
        new_card = dict(cursor.fetchone())

        conn.close()
        logger.info(f"[CREATE_CARD] 返回新卡片: {new_card}")
        return new_card

    except Exception as e:
        logger.error(f"[CREATE_CARD] 创建失败: {e}", exc_info=True)
        conn.close()
        raise HTTPException(status_code=400, detail=f"创建失败: {str(e)}")


@router.put("/cards/{card_id}")
async def update_card(card_id: int, card: KnowledgeCard):
    """
    更新知识卡片

    Args:
        card_id: 卡片ID
        card: 更新的卡片数据

    Returns:
        更新后的卡片
    """
    logger.info(f"[UPDATE_CARD] 收到更新卡片请求: id={card_id}, data={card.dict()}")

    conn = db_manager.get_connection()
    cursor = conn.cursor()

    try:
        # 检查卡片是否存在
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        existing_card = cursor.fetchone()
        
        if not existing_card:
            conn.close()
            raise HTTPException(status_code=404, detail="卡片不存在")

        # 更新卡片
        cursor.execute('''
            UPDATE knowledge_cards 
            SET card_type = ?, title = ?, content = ?, category = ?, project_id = ?
            WHERE id = ?
        ''', (
            card.type,
            card.title,
            card.content,
            card.category,
            card.project_id,
            card_id
        ))

        conn.commit()

        # 获取更新后的卡片
        cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
        updated_card = dict(cursor.fetchone())

        conn.close()
        logger.info(f"[UPDATE_CARD] 更新成功: {updated_card}")
        return updated_card

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[UPDATE_CARD] 更新失败: {e}", exc_info=True)
        conn.close()
        raise HTTPException(status_code=400, detail=f"更新失败: {str(e)}")


@router.delete("/cards/{card_id}")
async def delete_card(card_id: int):
    """
    删除知识卡片

    Args:
        card_id: 卡片ID

    Returns:
        删除结果
    """
    conn = db_manager.get_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM knowledge_cards WHERE id = ?", (card_id,))
    conn.commit()

    conn.close()

    return {"success": True, "message": "卡片已删除"}


@router.get("/stats")
async def get_stats():
    """
    获取知识库统计信息

    Returns:
        统计信息
    """
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        # 总卡片数
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        total_cards = cursor.fetchone()[0]

        # 按类型分组 - 使用 card_type 字段（数据库字段名）
        cursor.execute("SELECT card_type, COUNT(*) as count FROM knowledge_cards WHERE card_type IS NOT NULL GROUP BY card_type")
        cards_by_type = {row[0]: row[1] for row in cursor.fetchall() if row[0] is not None}

        # 按分类分组
        cursor.execute("SELECT category, COUNT(*) as count FROM knowledge_cards WHERE category IS NOT NULL GROUP BY category")
        cards_by_category = {row[0]: row[1] for row in cursor.fetchall() if row[0] is not None}

        conn.close()

        return {
            "total_cards": total_cards,
            "cards_by_type": cards_by_type,
            "cards_by_category": cards_by_category
        }
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_cards(request: SearchRequest):
    """
    搜索知识卡片

    Args:
        request: 搜索请求（包含关键词和限制）

    Returns:
        匹配的卡片列表
    """
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        keyword = request.keyword
        limit = request.limit

        cursor.execute('''
            SELECT * FROM knowledge_cards
            WHERE title LIKE ? OR content LIKE ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (f'%{keyword}%', f'%{keyword}%', limit))

        cards = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return cards
    except Exception as e:
        logger.error(f"搜索失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")


@router.get("/sources")
async def get_sources():
    """
    获取知识来源列表

    Returns:
        来源列表
    """
    conn = db_manager.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM knowledge_sources ORDER BY last_imported DESC")
    sources = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return sources


class ImportAnalyzeRequest(BaseModel):
    """导入分析请求"""
    content: str = Field(..., description="要分析的内容")
    auto_save: bool = Field(default=False, description="是否自动保存")


@router.post("/import/analyze")
async def import_analyze(request: ImportAnalyzeRequest):
    """
    智能分析导入内容，自动分类为四色卡片
    
    Args:
        request: 包含content和auto_save的请求体
        
    Returns:
        分析结果，包含分类后的卡片列表
    """
    try:
        content = request.content
        cards = []
        
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        if not paragraphs:
            paragraphs = [p.strip() for p in content.split('\n') if p.strip()]
        
        for idx, para in enumerate(paragraphs):
            if len(para) < 10:
                continue
            
            lower_para = para.lower()
            
            card_type = 'blue'
            confidence = 0.5
            
            if any(kw in lower_para for kw in ['定义', '概念', '原理', '理论', '什么是']):
                card_type = 'blue'
                confidence = 0.8
            elif any(kw in lower_para for kw in ['关联', '相关', '连接', '对比', '区别']):
                card_type = 'green'
                confidence = 0.8
            elif any(kw in lower_para for kw in ['来源', '参考', '引用', 'http', 'www']):
                card_type = 'yellow'
                confidence = 0.8
            elif any(kw in lower_para for kw in ['关键词', '标签', '索引', '注意', '重要']):
                card_type = 'red'
                confidence = 0.8
            
            title = para[:50] + '...' if len(para) > 50 else para
            if '\n' in title:
                title = title.split('\n')[0]
            
            card = {
                'title': title,
                'content': para,
                'card_type': card_type,
                'confidence': confidence,
                'address': f"{card_type.upper()}{idx + 1}"
            }
            cards.append(card)
        
        if request.auto_save:
            conn = db_manager.get_connection()
            cursor = conn.cursor()
            for card in cards:
                cursor.execute('''
                    INSERT INTO knowledge_cards (card_type, title, content, category)
                    VALUES (?, ?, ?, ?)
                ''', (card['card_type'], card['title'], card['content'], card['card_type']))
            conn.commit()
            conn.close()
        
        return {
            'success': True,
            'cards': cards,
            'total': len(cards)
        }
        
    except Exception as e:
        logger.error(f"导入分析失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.post("/import/file")
async def import_file(file: UploadFile = File(...)):
    """
    导入文件并解析为知识卡片

    支持格式：PDF, TXT, MD, DOCX, XLSX, 图片
    """
    try:
        # 获取文件扩展名
        filename = file.filename or ""
        file_ext = os.path.splitext(filename)[1].lower()

        # 如果没有文件扩展名，尝试从content_type推断
        if not file_ext and file.content_type:
            content_type = file.content_type.lower()
            if 'pdf' in content_type:
                file_ext = '.pdf'
            elif 'text' in content_type or 'markdown' in content_type:
                file_ext = '.txt'
            elif 'word' in content_type or 'document' in content_type:
                file_ext = '.docx'
            elif 'excel' in content_type or 'spreadsheet' in content_type:
                file_ext = '.xlsx'
            elif 'image' in content_type:
                # Try to determine specific image format from content
                # Parse image subtype from content_type
                img_subtype = content_type.split('/')[-1].replace('jpeg', 'jpg')
                file_ext = f'.{img_subtype}' if img_subtype in ('jpg','png','gif','bmp','webp') else '.jpg'  # default to jpg

        # 如果仍然没有扩展名，尝试从文件内容检测（读取前几个字节）
        if not file_ext:
            # 保存上传的文件到临时目录以检测类型
            with tempfile.NamedTemporaryFile(delete=False) as tmp_check:
                content_preview = await file.read(1024)  # Read first 1024 bytes
                tmp_check.write(content_preview)
                tmp_check_path = tmp_check.name

            try:
                # Check file magic numbers
                with open(tmp_check_path, 'rb') as f:
                    header = f.read(8)

                if header.startswith(b'%PDF'):
                    file_ext = '.pdf'
                elif header.startswith((b'\xff\xd8\xff', b'\x89PNG', b'GIF8', b'BM')):
                    # Image formats
                    if header.startswith(b'\xff\xd8\xff'):
                        file_ext = '.jpg'
                    elif header.startswith(b'\x89PNG'):
                        file_ext = '.png'
                    elif header.startswith(b'GIF8'):
                        file_ext = '.gif'
                    elif header.startswith(b'BM'):
                        file_ext = '.bmp'
                elif b'\x00\x00\x00\x0c' in header[:4] or b'ftyp' in header:
                    # MP4/HEIC等格式
                    pass  # Unknown format, will be handled below
                else:
                    # Assume text file if no binary signature
                    file_ext = '.txt'  # fallback to text
            except Exception as e:
                logger.warning(f"无法检测文件类型: {e}")
                file_ext = '.txt'  # fallback to text
            finally:
                os.unlink(tmp_check_path)
                # Reset file pointer since we read some content
                await file.seek(0)

        # 验证支持的文件格式
        supported_extensions = {'.pdf', '.txt', '.md', '.docx', '.doc', '.xlsx', '.xls',
                              '.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'}
        if file_ext not in supported_extensions:
            raise HTTPException(status_code=400, detail=f"请确保文件有正确的扩展名。检测到的格式: {file_ext}。支持的格式: {', '.join(supported_extensions)}")

        # 保存上传的文件到临时目录
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        extracted_text = ""

        # 根据文件类型解析
        if file_ext == '.pdf':
            from tools.pdf_processor import SimplePDFProcessor
            processor = SimplePDFProcessor()
            result = processor.extract_text(tmp_path)
            extracted_text = result.get('full_text', '')

        elif file_ext in ['.txt', '.md']:
            with open(tmp_path, 'r', encoding='utf-8') as f:
                extracted_text = f.read()

        elif file_ext in ['.docx', '.doc']:
            try:
                from docx import Document
                doc = Document(tmp_path)
                extracted_text = '\n'.join([p.text for p in doc.paragraphs if p.text])
            except ImportError:
                raise HTTPException(status_code=503, detail="Word解析未安装，请运行: pip install python-docx")

        elif file_ext in ['.xlsx', '.xls']:
            try:
                import pandas as pd
                df = pd.read_excel(tmp_path)
                extracted_text = df.to_string()
            except ImportError:
                raise HTTPException(status_code=503, detail="Excel解析未安装，请运行: pip install pandas openpyxl")

        elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp']:
            # 图片需要OCR或视觉模型
            try:
                import base64
                with open(tmp_path, 'rb') as f:
                    img_data = base64.b64encode(f.read()).decode('utf-8')

                # 调用视觉模型
                import httpx
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        "http://127.0.0.1:8910/v1/chat/completions",
                        json={
                            "model": "qwen2.5vl3b-8380-2.42",
                            "messages": [{"role": "user", "content": "placeholder"}],
                            "extra_body": {
                                "messages": [
                                    {"role": "system", "content": "You are a helpful assistant."},
                                    {"role": "user", "content": {"question": "请提取图片中的所有文字内容", "image": img_data}}
                                ]
                            }
                        }
                    )
                    if response.status_code == 200:
                        result = response.json()
                        extracted_text = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            except Exception as e:
                logger.warning(f"图片OCR失败: {e}")
                extracted_text = f"[图片文件: {filename}]"

        # 分析提取的文本
        cards = []
        paragraphs = [p.strip() for p in extracted_text.split('\n\n') if p.strip()]
        if not paragraphs:
            paragraphs = [p.strip() for p in extracted_text.split('\n') if p.strip()]
        
        for idx, para in enumerate(paragraphs):
            if len(para) < 10:
                continue
            
            lower_para = para.lower()
            card_type = 'blue'
            confidence = 0.5
            
            if any(kw in lower_para for kw in ['定义', '概念', '原理', '理论', '什么是']):
                card_type = 'blue'
                confidence = 0.8
            elif any(kw in lower_para for kw in ['关联', '相关', '连接', '对比', '区别']):
                card_type = 'green'
                confidence = 0.8
            elif any(kw in lower_para for kw in ['来源', '参考', '引用', 'http', 'www']):
                card_type = 'yellow'
                confidence = 0.8
            elif any(kw in lower_para for kw in ['关键词', '标签', '索引', '注意', '重要']):
                card_type = 'red'
                confidence = 0.8
            
            title = para[:50] + '...' if len(para) > 50 else para
            if '\n' in title:
                title = title.split('\n')[0]
            
            cards.append({
                'title': title,
                'content': para,
                'card_type': card_type,
                'confidence': confidence,
                'address': f"{card_type.upper()}{idx + 1}"
            })

        return {
            'success': True,
            'filename': filename,
            'file_type': file_ext,
            'extracted_length': len(extracted_text),
            'cards': cards,
            'total': len(cards)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件导入失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


@router.post("/import")
async def import_knowledge(html_dir: str):
    """
    导入知识库

    Args:
        html_dir: HTML 文件目录

    Returns:
        导入结果
    """
    try:
        # 添加项目路径到 sys.path
        import sys
        from pathlib import Path
        project_root = Path(__file__).parent.parent.parent
        if str(project_root) not in sys.path:
            sys.path.insert(0, str(project_root))

        # 动态导入批量导入工具
        import importlib
        import os

        # 设置 PYTHONPATH 环境变量
        os.environ['PYTHONPATH'] = str(project_root)

        # 导入批量导入模块
        spec = importlib.util.spec_from_file_location(
            "import_knowledge_batch",
            str(project_root / "backend" / "tools" / "import_knowledge_batch.py")
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # 执行批量导入
        module.batch_import(html_dir)

        return {
            "success": True,
            "message": "知识库导入成功",
            "html_dir": html_dir
        }
    except Exception as e:
        import traceback
        logger.error(f"导入失败: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=f"导入失败: {str(e)}")
