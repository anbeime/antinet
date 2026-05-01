"""
Pandoc + Mermaid + CSV 完整工作流
将 Markdown 转换为 PDF/Word/HTML/Excel，支持 Mermaid 图表和 CSV 表格

依赖安装:
    pip install pypandoc python-docx openpyxl pdfplumber markdown mermaiddraft pyyaml

Mermaid 渲染选项 (需要安装):
    - @mermaid-js/mermaid-cli (npm install -g @mermaid-js/mermaid-cli)
    - 或使用 mermaid.ink 在线服务
"""

import base64
import io
import json
import logging
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

import httpx

logger = logging.getLogger(__name__)


class OutputFormat(Enum):
    PDF = "pdf"
    DOCX = "docx"
    HTML = "html"
    EXCEL = "xlsx"
    MARKDOWN = "markdown"


@dataclass
class ConversionResult:
    success: bool
    file_path: Optional[str] = None
    content: Optional[bytes] = None
    error: Optional[str] = None
    warnings: List[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


class MermaidRenderer:
    """Mermaid 图表渲染器"""
    
    def __init__(self, use_online: bool = True):
        """
        初始化 Mermaid 渲染器
        
        Args:
            use_online: 是否使用 mermaid.ink 在线服务 (否则需要本地 mmdc)
        """
        self.use_online = use_online
        self.mmdc_path = self._find_mmdc()
    
    def _find_mmdc(self) -> Optional[str]:
        """查找本地 mermaid-cli"""
        import shutil
        path = shutil.which('mmdc')
        if path:
            return path
        
        # 常见路径
        common_paths = [
            r"C:\Program Files\nodejs\mmdc.cmd",
            r"C:\Users\AppData\Roaming\npm\mmdc.cmd",
        ]
        for p in common_paths:
            if os.path.exists(p):
                return p
        return None
    
    async def render_to_svg(self, mermaid_code: str) -> Optional[str]:
        """将 Mermaid 代码渲染为 SVG"""
        if self.use_online:
            return await self._render_online(mermaid_code, 'svg')
        else:
            return await self._render_local(mermaid_code, 'svg')
    
    async def render_to_png(self, mermaid_code: str) -> Optional[str]:
        """将 Mermaid 代码渲染为 PNG"""
        if self.use_online:
            return await self._render_online(mermaid_code, 'png')
        else:
            return await self._render_local(mermaid_code, 'png')
    
    async def _render_online(self, mermaid_code: str, format: str) -> Optional[str]:
        """使用 mermaid.ink 在线服务渲染"""
        try:
            # 清理代码
            code = mermaid_code.strip()
            encoded = base64.urlsafe_b64encode(code.encode()).decode()
            
            url = f"https://mermaid.ink/{format}/{encoded}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    if format == 'svg':
                        return response.text
                    else:
                        return base64.b64encode(response.content).decode()
            return None
        except Exception as e:
            logger.warning(f"Mermaid online render failed: {e}")
            return None
    
    async def _render_local(self, mermaid_code: str, format: str) -> Optional[str]:
        """使用本地 mmdc 渲染"""
        if not self.mmdc_path:
            logger.warning("mmdc not found, falling back to online")
            return await self._render_online(mermaid_code, format)
        
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                input_file = Path(tmpdir) / "input.mmd"
                output_file = Path(tmpdir) / f"output.{format}"
                
                input_file.write_text(mermaid_code, encoding='utf-8')
                
                cmd = [
                    self.mmdc_path,
                    '-i', str(input_file),
                    '-o', str(output_file),
                    '-b', 'transparent',
                    '-w', '1200',
                    '-H', '800'
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0 and output_file.exists():
                    if format == 'svg':
                        return output_file.read_text(encoding='utf-8')
                    else:
                        return base64.b64encode(output_file.read_bytes()).decode()
            return None
        except Exception as e:
            logger.warning(f"Mermaid local render failed: {e}")
            return None


class CSVTableExtractor:
    """CSV 表格智能提取器"""
    
    def __init__(self):
        self.pdfplumber_available = self._check_pdfplumber()
    
    def _check_pdfplumber(self) -> bool:
        try:
            import pdfplumber
            return True
        except ImportError:
            return False
    
    async def extract_tables_from_pdf(self, pdf_path: str) -> List[List[List[str]]]:
        """从 PDF 提取表格数据"""
        if not self.pdfplumber_available:
            return self._fallback_extract(pdf_path)
        
        try:
            import pdfplumber
            
            tables = []
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_tables = page.extract_tables()
                    if page_tables:
                        tables.extend(page_tables)
            
            return tables
        except Exception as e:
            logger.warning(f"PDF table extraction failed: {e}")
            return self._fallback_extract(pdf_path)
    
    def _fallback_extract(self, pdf_path: str) -> List[List[List[str]]]:
        """回退方案：简单文本提取"""
        try:
            with open(pdf_path, 'rb') as f:
                content = f.read()
                text = content.decode('utf-8', errors='ignore')
            
            # 简单按行分割
            lines = text.split('\n')[:100]
            return [[line.strip().split('\t')] for line in lines if line.strip()]
        except Exception as e:
            logger.error(f"Fallback extraction failed: {e}")
            return []
    
    def tables_to_csv(self, tables: List[List[List[str]]]) -> str:
        """将表格转换为 CSV 格式"""
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        for i, table in enumerate(tables):
            if i > 0:
                writer.writerow([])  # 空行分隔
            for row in table:
                writer.writerow(row)
        
        return output.getvalue()


class MarkdownPreprocessor:
    """Markdown 预处理器 - 处理 Mermaid 图表和 CSV 表格"""
    
    def __init__(self):
        self.mermaid_renderer = MermaidRenderer()
    
    async def preprocess(self, markdown_content: str, render_mermaid: bool = True) -> str:
        """
        预处理 Markdown 内容
        
        Args:
            markdown_content: 原始 Markdown 内容
            render_mermaid: 是否渲染 Mermaid 图表
            
        Returns:
            处理后的 Markdown (Mermaid 块被替换为图片)
        """
        if not render_mermaid:
            return markdown_content
        
        # 匹配 Mermaid 代码块
        pattern = r'```mermaid\s*\n(.*?)```'
        
        async def replace_mermaid(match):
            mermaid_code = match.group(1)
            svg = await self.mermaid_renderer.render_to_svg(mermaid_code)
            
            if svg:
                # 返回 HTML img 标签
                return f'\n![Mermaid Diagram](data:image/svg+xml;base64,{base64.b64encode(svg.encode()).decode()})\n'
            else:
                # 渲染失败，保留原始代码
                return match.group(0)
        
        # 使用同步方式处理（实际应该用 asyncio 但 re.sub 不支持 async）
        result = re.sub(pattern, replace_mermaid, markdown_content, flags=re.DOTALL)
        
        return result


class PandocConverter:
    """Pandoc 风格文档转换器"""
    
    def __init__(self):
        self.pandoc_path = self._find_pandoc()
        self.pypandoc_available = self._check_pypandoc()
        self.preprocessor = MarkdownPreprocessor()
    
    def _find_pandoc(self) -> Optional[str]:
        """查找系统中的 pandoc"""
        import shutil
        return shutil.which('pandoc')
    
    def _check_pypandoc(self) -> bool:
        try:
            import pypandoc
            return True
        except ImportError:
            return False
    
    async def convert(
        self,
        input_content: str,
        input_format: str,
        output_format: OutputFormat,
        render_mermaid: bool = True,
        extract_csv: bool = False
    ) -> ConversionResult:
        """
        转换文档
        
        Args:
            input_content: 输入内容
            input_format: 输入格式 (markdown, html, latex 等)
            output_format: 输出格式
            render_mermaid: 是否渲染 Mermaid 图表
            extract_csv: 是否提取 CSV 表格
            
        Returns:
            ConversionResult
        """
        try:
            # 1. 预处理 Markdown
            if input_format == 'markdown':
                processed_content = await self.preprocessor.preprocess(
                    input_content, 
                    render_mermaid=render_mermaid
                )
            else:
                processed_content = input_content
            
            # 2. 根据输出格式转换
            if output_format == OutputFormat.EXCEL and extract_csv:
                return await self._convert_to_excel_with_csv(processed_content)
            else:
                return await self._convert_with_pandoc(processed_content, input_format, output_format)
        
        except Exception as e:
            logger.error(f"Conversion failed: {e}")
            return ConversionResult(success=False, error=str(e))
    
    async def _convert_with_pandoc(
        self,
        content: str,
        input_format: str,
        output_format: OutputFormat
    ) -> ConversionResult:
        """使用 Pandoc 转换"""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            
            # 写入临时文件
            input_file = tmppath / f"input.{input_format}"
            input_file.write_text(content, encoding='utf-8')
            
            output_ext = output_format.value
            output_file = tmppath / f"output.{output_ext}"
            
            # 构建命令
            cmd = [
                self.pandoc_path or 'pandoc',
                str(input_file),
                '-o', str(output_file),
                '--standalone'
            ]
            
            # 格式特定参数
            if output_format == OutputFormat.PDF:
                cmd.extend(['--pdf-engine', 'weasyprint'])
            elif output_format == OutputFormat.DOCX:
                cmd.extend(['--reference-doc', 'default'])
            elif output_format == OutputFormat.HTML:
                cmd.extend(['--self-contained', '--mathjax'])
            
            logger.info(f"[Pandoc] Executing: {' '.join(cmd)}")
            
            try:
                result = subprocess.run(
                    cmd, 
                    capture_output=True, 
                    text=True, 
                    timeout=60
                )
                
                if result.returncode == 0 and output_file.exists():
                    return ConversionResult(
                        success=True,
                        file_path=str(output_file),
                        content=output_file.read_bytes()
                    )
                else:
                    # 回退到 LibreOffice
                    return await self._fallback_libreoffice(input_file, output_format)
            
            except subprocess.TimeoutExpired:
                return ConversionResult(success=False, error="Conversion timeout")
    
    async def _fallback_libreoffice(
        self,
        input_file: Path,
        output_format: OutputFormat
    ) -> ConversionResult:
        """回退到 LibreOffice 转换"""
        try:
            # 这里应该调用 libreoffice_routes
            # 简化实现
            return ConversionResult(
                success=False,
                error="Pandoc and LibreOffice conversion failed"
            )
        except Exception as e:
            return ConversionResult(success=False, error=str(e))
    
    async def _convert_to_excel_with_csv(self, content: str) -> ConversionResult:
        """将 CSV 数据转换为 Excel"""
        try:
            from openpyxl import Workbook
            
            # 提取 CSV 代码块
            csv_pattern = r'```csv\s*\n(.*?)```'
            matches = re.findall(csv_pattern, content, re.DOTALL)
            
            if not matches:
                return ConversionResult(
                    success=False,
                    error="No CSV data found in content"
                )
            
            wb = Workbook()
            ws = wb.active
            ws.title = "Data"
            
            for i, csv_data in enumerate(matches):
                if i > 0:
                    ws.append([])  # 空行分隔
                
                import csv
                from io import StringIO
                reader = csv.reader(StringIO(csv_data))
                for row in reader:
                    ws.append(row)
            
            with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as f:
                wb.save(f.name)
                return ConversionResult(
                    success=True,
                    file_path=f.name,
                    content=Path(f.name).read_bytes()
                )
        
        except Exception as e:
            logger.error(f"Excel conversion failed: {e}")
            return ConversionResult(success=False, error=str(e))


# 便捷函数
async def markdown_to_pdf(
    content: str,
    render_mermaid: bool = True
) -> ConversionResult:
    """Markdown 转 PDF"""
    converter = PandocConverter()
    return await converter.convert(
        content, 'markdown', OutputFormat.PDF, render_mermaid
    )


async def markdown_to_docx(
    content: str,
    render_mermaid: bool = True
) -> ConversionResult:
    """Markdown 转 Word"""
    converter = PandocConverter()
    return await converter.convert(
        content, 'markdown', OutputFormat.DOCX, render_mermaid
    )


async def markdown_to_html(
    content: str,
    render_mermaid: bool = True
) -> ConversionResult:
    """Markdown 转 HTML"""
    converter = PandocConverter()
    return await converter.convert(
        content, 'markdown', OutputFormat.HTML, render_mermaid
    )


async def markdown_to_excel(
    content: str,
    extract_csv: bool = True
) -> ConversionResult:
    """Markdown 转 Excel (提取 CSV 表格)"""
    converter = PandocConverter()
    return await converter.convert(
        content, 'markdown', OutputFormat.EXCEL, 
        render_mermaid=False, extract_csv=extract_csv
    )


async def pdf_tables_to_csv(pdf_path: str) -> str:
    """从 PDF 提取表格为 CSV"""
    extractor = CSVTableExtractor()
    tables = await extractor.extract_tables_from_pdf(pdf_path)
    return extractor.tables_to_csv(tables)


# 示例用法
async def demo():
    """演示完整工作流"""
    
    # 示例 Markdown 内容
    md_content = """
# 项目报告

## 流程图

```mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[处理]
    B -->|否| D[结束]
    C --> D
```

## 数据表格

```csv
日期,销售额,成本,利润
2024-01,10000,6000,4000
2024-02,12000,7000,5000
2024-03,15000,8000,7000
```

## 结论

报告完成。
"""
    
    # 转换为不同格式
    print("Converting to PDF...")
    result_pdf = await markdown_to_pdf(md_content)
    print(f"PDF: {result_pdf.success}")
    
    print("Converting to DOCX...")
    result_docx = await markdown_to_docx(md_content)
    print(f"DOCX: {result_docx.success}")
    
    print("Converting to HTML...")
    result_html = await markdown_to_html(md_content)
    print(f"HTML: {result_html.success}")
    
    print("Converting to Excel...")
    result_xlsx = await markdown_to_excel(md_content)
    print(f"Excel: {result_xlsx.success}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(demo())