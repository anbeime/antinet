"""
PPT 路由
提供 PowerPoint 文档生成和处理的 API
"""
import logging
import json
import re
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from pathlib import Path
import tempfile
from datetime import datetime

logger = logging.getLogger(__name__)

# 数据库管理器（在main.py中设置）
_db_manager = None


def set_db_manager(manager):
    """设置数据库管理器"""
    global _db_manager
    _db_manager = manager


def get_db_manager():
    """获取数据库管理器"""
    if _db_manager is None:
        raise HTTPException(status_code=500, detail="数据库未初始化")
    return _db_manager


try:
    from skills.pptx.ppt_processor_enhanced import EnhancedPPTProcessor, PPTX_AVAILABLE
    USE_ENHANCED = True
except ImportError:
    from tools.ppt_processor import PPTProcessor, PPTX_AVAILABLE
    USE_ENHANCED = False
    logger.warning("增强版 PPT 处理器不可用，使用基础版本")

router = APIRouter(prefix="/api/ppt", tags=["PPT"])

# ==================== API 模型 ====================

class CardData(BaseModel):
    """卡片数据模型"""
    type: str = Field(..., description="卡片类型: fact/interpret/risk/action")
    title: str = Field(..., description="卡片标题")
    content: str | List[str] = Field(..., description="卡片内容")
    tags: Optional[List[str]] = Field(default=None, description="标签")
    created_at: Optional[str] = Field(default=None, description="创建时间")


class ExportCardsRequest(BaseModel):
    """导出卡片请求"""
    cards: List[CardData] = Field(..., description="卡片列表")
    title: str = Field(default="Antinet 四色卡片分析报告", description="演示文稿标题")
    include_summary: bool = Field(default=True, description="是否包含总结页")
    filename: Optional[str] = Field(default=None, description="输出文件名")


class ChartData(BaseModel):
    """图表数据模型"""
    title: str = Field(..., description="图表标题")
    data: Dict[str, Any] = Field(..., description="图表数据")


class AnalysisReportRequest(BaseModel):
    """分析报告请求"""
    title: str = Field(default="Antinet 智能分析报告", description="报告标题")
    cards: List[CardData] = Field(default_factory=list, description="卡片列表")
    charts: Optional[List[ChartData]] = Field(default=None, description="图表列表")
    summary: Optional[Dict[str, Any]] = Field(default=None, description="总结数据")
    filename: Optional[str] = Field(default=None, description="输出文件名")


class TextToPPTRequest(BaseModel):
    """文本转PPT请求"""
    text: str = Field(..., description="Markdown格式的文本内容")
    title: str = Field(default="演示文稿", description="PPT标题")
    theme: str = Field(default="professional", description="主题: professional/creative/minimal")


class ThemeResponse(BaseModel):
    """主题信息响应"""
    id: str
    name: str
    description: str
    preview_colors: List[str]


# ==================== API 端点 ====================

@router.get("/status")
async def get_ppt_status():
    """获取 PPT 服务状态"""
    return {
        "available": PPTX_AVAILABLE,
        "enhanced": USE_ENHANCED,
        "message": "PPT 服务正常运行" if PPTX_AVAILABLE else "PPT 功能不可用，请安装 python-pptx"
    }


@router.get("/themes", response_model=List[ThemeResponse])
async def get_themes():
    """获取可用的 PPT 主题列表"""
    themes = [
        ThemeResponse(
            id="professional",
            name="Professional",
            description="专业商务风格，适合正式场合",
            preview_colors=["#1C2833", "#3498DB", "#F1C40F"]
        ),
        ThemeResponse(
            id="creative",
            name="Creative",
            description="创意活泼风格，适合创意展示",
            preview_colors=["#9B59B6", "#3498DB", "#E67E22"]
        ),
        ThemeResponse(
            id="minimal",
            name="Minimal",
            description="简约现代风格，适合简洁演示",
            preview_colors=["#2C3E50", "#95A5A6", "#3498DB"]
        ),
    ]
    return themes


@router.post("/generate/from-text")
async def generate_ppt_from_text(request: TextToPPTRequest):
    """从文本生成 PPT"""
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用，请安装 python-pptx")
    
    try:
        # 保存到服务端目录供预览使用
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        saved_filename = f"{request.title.replace(' ', '_')}_{int(datetime.now().timestamp())}.pptx"
        saved_path = output_dir / saved_filename
        
        # 使用 PPT 处理器生成
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        # 解析 Markdown 并生成 PPT
        from tools.ppt_processor import parse_markdown_content
        slides_data = parse_markdown_content(request.text)
        
        # 根据主题生成 PPT
        processor.create_presentation_from_slides(
            slides_data=slides_data,
            title=request.title,
            output_path=str(saved_path),
            theme=request.theme
        )
        
        # 返回文件名和路径供预览使用
        return {
            "success": True,
            "filename": saved_filename,
            "title": request.title
        }
        
    except Exception as e:
        logger.error(f"生成 PPT 失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成 PPT 失败: {str(e)}")


async def export_cards_to_ppt_internal(cards: List[Dict], title: str = "智能分析报告", include_summary: bool = True) -> Dict:
    """内部函数：将卡片导出为 PPT，返回文件路径（供其他模块调用）"""
    try:
        if not PPTX_AVAILABLE:
            return {"success": False, "error": "PPT 功能不可用"}
        
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"{title[:20].replace(' ', '_')}_{int(datetime.now().timestamp())}.pptx"
        output_path = output_dir / filename
        
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        processor.create_presentation_from_cards(
            cards=cards,
            title=title,
            output_path=str(output_path),
            include_summary=include_summary
        )
        
        return {
            "success": True,
            "output_path": str(output_path),
            "filename": filename,
            "preview_url": f"/ppt-viewer?file={filename}"
        }
    except Exception as e:
        logger.error(f"导出卡片到 PPT 失败: {e}")
        return {"success": False, "error": str(e)}


@router.get("/file")
async def get_ppt_file(filename: str):
    """获取已生成的PPT文件"""
    try:
        output_dir = Path("C:/D/zhiyi/generated")
        file_path = output_dir / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
    except Exception as e:
        logger.error(f"获取PPT文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/cards")
async def export_cards_to_ppt(request: ExportCardsRequest):
    """将卡片导出为 PPT"""
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用，请安装 python-pptx")
    
    try:
        # 保存到服务端目录
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        saved_filename = f"{request.title.replace(' ', '_')}_cards_{int(datetime.now().timestamp())}.pptx"
        saved_path = output_dir / saved_filename
        
        # 使用 PPT 处理器
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        # 转换卡片数据
        cards_data = []
        for card in request.cards:
            # 清理Markdown标记
            raw_content = card.content if isinstance(card.content, list) else [card.content]
            clean_content = []
            for c in raw_content:
                if isinstance(c, str):
                    # 清理Markdown
                    c = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', c)  # 链接
                    c = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', c)  # 图片
                    c = re.sub(r'`([^`]+)`', r'\1', c)  # 代码
                    c = re.sub(r'\*\*([^*]+)\*\*', r'\1', c)  # 加粗
                    c = re.sub(r'\*([^*]+)\*', r'\1', c)  # 斜体
                    c = re.sub(r'~~([^~]+)~~', r'\1', c)  # 删除线
                    clean_content.append(c.strip())
                else:
                    clean_content.append(str(c))
            
            cards_data.append({
                'type': card.type,
                'title': card.title,
                'content': clean_content,
                'tags': card.tags or [],
                'created_at': card.created_at or datetime.now().isoformat()
            })
        
        # 生成 PPT
        processor.create_presentation_from_cards(
            cards=cards_data,
            title=request.title,
            output_path=str(saved_path),
            include_summary=request.include_summary
        )
        
        # 返回文件名供预览使用
        return {
            "success": True,
            "filename": saved_filename,
            "title": request.title
        }
        
    except Exception as e:
        logger.error(f"导出卡片到 PPT 失败: {e}")
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/export/analysis-report")
async def export_analysis_report(request: AnalysisReportRequest):
    """导出分析报告为 PPT"""
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用，请安装 python-pptx")
    
    try:
        # 保存到服务端目录
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        saved_filename = f"{request.title.replace(' ', '_')}_report_{int(datetime.now().timestamp())}.pptx"
        saved_path = output_dir / saved_filename
        
        # 使用 PPT 处理器
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        # 转换数据
        cards_data = []
        for card in request.cards:
            cards_data.append({
                'type': card.type,
                'title': card.title,
                'content': card.content if isinstance(card.content, list) else [card.content],
                'tags': card.tags or [],
                'created_at': card.created_at or datetime.now().isoformat()
            })
        
        charts_data = []
        if request.charts:
            for chart in request.charts:
                charts_data.append({
                    'title': chart.title,
                    'data': chart.data
                })
        
        # 生成报告
        processor.create_analysis_report(
            title=request.title,
            cards=cards_data,
            charts=charts_data,
            summary=request.summary,
            output_path=str(saved_path)
        )
        
        # 返回文件名
        return {
            "success": True,
            "filename": saved_filename,
            "title": request.title
        }
        
    except Exception as e:
        logger.error(f"导出分析报告失败: {e}")
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/process")
async def process_ppt_file(file: UploadFile = File(...)):
    """处理上传的 PPT 文件"""
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用，请安装 python-pptx")
    
    try:
        # 保存上传的文件
        with tempfile.NamedTemporaryFile(suffix='.pptx', delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            input_path = tmp.name
        
        # 处理 PPT
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        result = processor.process_ppt(input_path)
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"处理 PPT 文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


# ========== PPT 转 PDF ==========

@router.post("/convert/to-pdf")
async def convert_ppt_to_pdf(file: UploadFile = File(...)):
    """将 PPT 转换为 PDF"""
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用")
    
    input_path = None
    try:
        # 保存上传的 PPT 文件
        with tempfile.NamedTemporaryFile(suffix='.pptx', delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            input_path = tmp.name
        
        output_path = input_path.replace('.pptx', '.pdf')
        
        # 尝试方法1: 使用 LibreOffice (Linux/Windows)
        import subprocess
        import os
        
        # 查找 LibreOffice
        libreoffice_paths = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            r"C:\Users\topgo\Downloads\LibreOffice_26.2.2_Win_aarch64\program\soffice.exe",
            "/usr/bin/soffice",
            "/usr/local/bin/soffice"
        ]
        
        libreoffice = None
        for path in libreoffice_paths:
            if os.path.exists(path):
                libreoffice = path
                break
        
        if libreoffice:
            # 使用 LibreOffice 转换
            cmd = [
                libreoffice,
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                os.path.dirname(output_path),
                input_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            
            if os.path.exists(output_path):
                filename = os.path.basename(output_path)
                return FileResponse(output_path, media_type="application/pdf", filename=filename)
        
        # 尝试方法2: 使用 comtypes (Windows + MS Office)
        try:
            import comtypes.client
            import os
            
            powerpoint = comtypes.client.CreateObject("Powerpoint.Application")
            powerpoint.Visible = 1
            
            # 打开 PPT
            presentation = powerpoint.Presentations.Open(input_path)
            
            # 导出为 PDF
            presentation.SaveAs(output_path, 32)  # 32 = ppSaveAsPDF
            
            # 关闭
            presentation.Close()
            powerpoint.Quit()
            
            if os.path.exists(output_path):
                filename = os.path.basename(output_path)
                return FileResponse(output_path, media_type="application/pdf", filename=filename)
        except ImportError:
            pass
        
        # 尝试方法3: 使用 pdf2go API (云端转换) - 需要网络
        # 这里作为最后的回退方案
        
        raise HTTPException(status_code=501, detail="PPT 转 PDF 需要 LibreOffice 或 Microsoft Office。请安装 LibreOffice 后重试，或手动另存为 PDF。")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PPT 转 PDF 失败: {e}")
        raise HTTPException(status_code=500, detail=f"转换失败: {str(e)}")
    finally:
        if input_path and os.path.exists(input_path):
            try:
                os.unlink(input_path)
            except:
                pass


# ========== 专题到PPT闭环 ==========

class NarrativeTemplateConfig(BaseModel):
    """叙事逻辑模板配置"""
    template: str = Field(default="problem-analysis-solution", description="叙事模板: problem-analysis-solution/timeline/compare-contrast/swot-analysis/custom")
    generate_transitions: bool = Field(default=True, description="生成过渡页")
    polish_language: bool = Field(default=True, description="润色语言")
    generate_conclusions: bool = Field(default=True, description="生成总结页")
    extract_key_points: bool = Field(default=True, description="提取核心观点作为标题")


class ExportCollectionPPTRequest(BaseModel):
    """从专题导出PPT请求"""
    project_id: int = Field(..., description="专题ID")
    title: Optional[str] = Field(default=None, description="PPT标题，不填则使用专题名称")
    narrative: NarrativeTemplateConfig = Field(default_factory=NarrativeTemplateConfig, description="叙事逻辑配置")
    theme: str = Field(default="professional", description="PPT主题: professional/creative/minimal")
    include_summary: bool = Field(default=True, description="包含总结页")
    include_backlinks: bool = Field(default=False, description="包含关联卡片信息")


def _organize_cards_by_narrative(cards: List[Dict], template: str) -> List[Dict]:
    """按叙事逻辑模板组织卡片顺序和分组
    
    四色工作流：事实(蓝) → 解释(绿) → 风险(黄) → 行动(红)
    """
    type_order = {'blue': 0, 'green': 1, 'yellow': 2, 'red': 3}
    type_names = {'blue': '事实', 'green': '解释', 'yellow': '风险', 'red': '行动'}
    
    # 按卡片类型排序
    sorted_cards = sorted(cards, key=lambda c: type_order.get(c.get('card_type', c.get('type', 'blue')), 0))
    
    organized = []
    
    if template == 'problem-analysis-solution':
        # 问题→分析→解决方案模式
        # 蓝=问题背景, 绿=分析, 黄=风险/挑战, 红=解决方案
        groups = {
            'blue': {'title': '问题与背景', 'cards': []},
            'green': {'title': '深度分析', 'cards': []},
            'yellow': {'title': '风险与挑战', 'cards': []},
            'red': {'title': '行动方案', 'cards': []},
        }
        for card in sorted_cards:
            ct = card.get('card_type', card.get('type', 'blue'))
            if ct in groups:
                groups[ct]['cards'].append(card)
        
        for ct in ['blue', 'green', 'yellow', 'red']:
            if groups[ct]['cards']:
                organized.append({
                    'section_title': groups[ct]['title'],
                    'section_type': ct,
                    'cards': groups[ct]['cards']
                })
    
    elif template == 'timeline':
        # 时间线模式：按创建时间排列
        timeline_cards = sorted(cards, key=lambda c: c.get('created_at', ''))
        organized.append({
            'section_title': '时间线',
            'section_type': 'timeline',
            'cards': timeline_cards
        })
    
    elif template == 'compare-contrast':
        # 对比模式：事实+解释 vs 风险+行动
        organized.append({
            'section_title': '机遇与优势',
            'section_type': 'positive',
            'cards': [c for c in sorted_cards if c.get('card_type', c.get('type', '')) in ('blue', 'green')]
        })
        organized.append({
            'section_title': '挑战与对策',
            'section_type': 'negative',
            'cards': [c for c in sorted_cards if c.get('card_type', c.get('type', '')) in ('yellow', 'red')]
        })
    
    elif template == 'swot-analysis':
        # SWOT分析模式
        organized = [
            {'section_title': '优势 (Strengths)', 'section_type': 'blue', 
             'cards': [c for c in sorted_cards if c.get('card_type', c.get('type', '')) == 'blue']},
            {'section_title': '劣势 (Weaknesses)', 'section_type': 'yellow',
             'cards': [c for c in sorted_cards if c.get('card_type', c.get('type', '')) == 'yellow']},
            {'section_title': '机会 (Opportunities)', 'section_type': 'green',
             'cards': [c for c in sorted_cards if c.get('card_type', c.get('type', '')) == 'green']},
            {'section_title': '威胁 (Threats) & 对策', 'section_type': 'red',
             'cards': [c for c in sorted_cards if c.get('card_type', c.get('type', '')) == 'red']},
        ]
        organized = [s for s in organized if s['cards']]
    
    else:
        # custom / 默认：四色分组
        for ct in ['blue', 'green', 'yellow', 'red']:
            ct_cards = [c for c in sorted_cards if c.get('card_type', c.get('type', '')) == ct]
            if ct_cards:
                organized.append({
                    'section_title': type_names.get(ct, ct),
                    'section_type': ct,
                    'cards': ct_cards
                })
    
    return organized


def _build_ppt_slides_from_organized(organized: List[Dict], request: ExportCollectionPPTRequest, project_name: str) -> List[Dict]:
    """将组织好的卡片数据转换为PPT幻灯片数据"""
    slides = []
    type_colors = {'blue': '#3b82f6', 'green': '#22c55e', 'yellow': '#eab308', 'red': '#ef4444'}
    
    # 封面页
    slides.append({
        'type': 'title',
        'title': request.title or project_name,
        'subtitle': f'基于四色卡片的{request.narrative.template}分析',
        'background': type_colors.get(organized[0]['section_type'], '#3b82f6') if organized else '#3b82f6',
    })
    
    # 目录页
    if len(organized) > 1:
        toc_items = [f"{i+1}. {section['section_title']} ({len(section['cards'])}张卡片)" 
                     for i, section in enumerate(organized)]
        slides.append({
            'type': 'content',
            'title': '目录',
            'content': '\n'.join(toc_items),
        })
    
    # 各章节
    for i, section in enumerate(organized):
        # 章节分隔页（过渡页）
        if request.narrative.generate_transitions and len(organized) > 1:
            slides.append({
                'type': 'section',
                'title': section['section_title'],
                'subtitle': f'第{i+1}部分 · {len(section["cards"])}张卡片',
                'background': type_colors.get(section['section_type'], '#3b82f6'),
            })
        
        # 卡片内容页
        for card in section['cards']:
            title = card.get('title', '无标题')
            if request.narrative.extract_key_points:
                # 尝试提取核心观点作为标题（取第一行或前20字）
                content = card.get('content', '')
                first_line = content.split('\n')[0] if content else title
                if len(first_line) > 40:
                    title = first_line[:40] + '...'
                elif first_line and first_line != title:
                    title = first_line
            
            content_text = card.get('content', '')
            if isinstance(content_text, list):
                content_text = '\n'.join(content_text)
            
            # 清理Markdown标记
            content_text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', content_text)
            content_text = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', content_text)
            content_text = re.sub(r'`([^`]+)`', r'\1', content_text)
            content_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', content_text)
            content_text = re.sub(r'\*([^*]+)\*', r'\1', content_text)
            content_text = re.sub(r'~~([^~]+)~~', r'\1', content_text)
            
            # 添加关联信息
            backlink_info = ''
            if request.include_backlinks and card.get('related_cards'):
                backlink_info = f'\n\n关联卡片: {", ".join(str(rid) for rid in card["related_cards"])}'
            
            slides.append({
                'type': 'content',
                'title': f'[{section["section_title"]}] {title}',
                'content': content_text + backlink_info,
                'tags': card.get('tags', []),
                'card_type': card.get('card_type', card.get('type', '')),
            })
    
    # 总结页
    if request.narrative.generate_conclusions:
        summary_points = []
        for section in organized:
            if section['cards']:
                # 每个章节取第一张卡片的核心内容作为总结要点
                first_card = section['cards'][0]
                content = first_card.get('content', '')
                if isinstance(content, list):
                    content = content[0] if content else ''
                point = content[:80] + '...' if len(content) > 80 else content
                summary_points.append(f"• {section['section_title']}: {point}")
        
        slides.append({
            'type': 'content',
            'title': '总结与展望',
            'content': '\n\n'.join(summary_points) if summary_points else '暂无总结内容',
        })
    
    return slides


@router.post("/export/collection")
async def export_collection_to_ppt(request: ExportCollectionPPTRequest):
    """从专题导出PPT — 闭环一核心接口
    
    工作流：专题卡片 → 叙事逻辑组织 → PPT生成
    """
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用，请安装 python-pptx")
    
    try:
        # 获取专题数据 - 使用共享数据库管理器
        db = get_db_manager()
        
        # 获取专题信息
        project = db.get_research_project(request.project_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"专题 {request.project_id} 不存在")
        
        # 获取专题下所有卡片
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT k.id, k.title, k.content, k.card_type, k.category, k.type,
                       k.tags, k.related_cards, k.created_at
                FROM knowledge_cards k
                WHERE k.project_id = ?
                ORDER BY k.created_at ASC
            """, (request.project_id,))
            cards = [dict(row) for row in cursor.fetchall()]
        
        if not cards:
            raise HTTPException(status_code=404, detail="该专题下没有卡片，无法生成PPT")
        
        # 解析JSON字段
        for card in cards:
            for field in ['tags', 'core_tags', 'related_cards']:
                if card.get(field) and isinstance(card[field], str):
                    try:
                        card[field] = json.loads(card[field])
                    except:
                        card[field] = []
            # 统一字段名
            if 'card_type' not in card and 'type' in card:
                card['card_type'] = card['type']
        
        # 按叙事逻辑组织卡片
        organized = _organize_cards_by_narrative(cards, request.narrative.template)
        
        # 构建PPT幻灯片数据
        slides = _build_ppt_slides_from_organized(organized, request, project['name'])
        
        # 保存到服务端目录
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        saved_filename = f"{(request.title or project['name']).replace(' ', '_')}_{int(datetime.now().timestamp())}.pptx"
        saved_path = output_dir / saved_filename
        
        # 使用PPT处理器生成
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        # 将slides转为Markdown格式再生成PPT
        md_content = _slides_to_markdown(slides)
        
        from tools.ppt_processor import parse_markdown_content
        slides_data = parse_markdown_content(md_content)
        
        processor.create_presentation_from_slides(
            slides_data=slides_data,
            title=request.title or project['name'],
            output_path=str(saved_path),
            theme=request.theme
        )
        
        # 返回文件名
        return {
            "success": True,
            "filename": saved_filename,
            "title": request.title or project['name']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"从专题导出PPT失败: {e}")
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


def _slides_to_markdown(slides: List[Dict]) -> str:
    """将幻灯片数据转换为Markdown格式供PPT处理器使用"""
    lines = []
    for slide in slides:
        if slide.get('type') == 'title':
            lines.append(f"# {slide.get('title', '')}")
            if slide.get('subtitle'):
                lines.append(f"\n{slide['subtitle']}")
        elif slide.get('type') == 'section':
            lines.append(f"\n---\n\n## {slide.get('title', '')}")
            if slide.get('subtitle'):
                lines.append(f"\n{slide['subtitle']}")
        else:
            lines.append(f"\n### {slide.get('title', '')}")
            content = slide.get('content', '')
            if content:
                # 按行拆分内容，添加要点标记
                for line in content.split('\n'):
                    line = line.strip()
                    if line:
                        if not line.startswith(('-', '*', '•', '1.', '2.', '3.')):
                            lines.append(f"- {line}")
                        else:
                            lines.append(line)
            if slide.get('tags'):
                lines.append(f"\n标签: {', '.join(slide['tags'])}")
        lines.append("")
    
    return '\n'.join(lines)
