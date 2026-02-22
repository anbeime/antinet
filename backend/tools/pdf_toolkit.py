"""
PDF 工具集
整合各种 PDF 处理功能
"""

import os
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
import io
import zipfile

logger = logging.getLogger(__name__)

# 尝试导入依赖
try:
    from pypdf import PdfWriter, PdfReader
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False
    logger.warning("pypdf 未安装，PDF 合拆分功能不可用")

try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    logger.warning("pdf2image 未安装，PDF 转图片功能不可用")

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("PIL 未安装，图片处理功能受限")


class PDFToolkit:
    """PDF 工具集"""

    @staticmethod
    def merge_pdfs(input_files: List[str], output_file: str) -> Dict[str, Any]:
        """
        合并多个 PDF 文件

        Args:
            input_files: 输入 PDF 文件路径列表
            output_file: 输出 PDF 文件路径

        Returns:
            合并结果
        """
        result = {
            "success": False,
            "total_pages": 0,
            "file_count": 0,
            "output_path": output_file,
            "error": None
        }

        if not PYPDF_AVAILABLE:
            result["error"] = "pypdf 未安装，请运行: pip install pypdf"
            return result

        try:
            writer = PdfWriter()
            total_pages = 0
            valid_files = 0

            for input_file in input_files:
                input_path = Path(input_file)
                if not input_path.exists():
                    logger.warning(f"文件不存在: {input_file}")
                    continue

                if input_path.suffix.lower() != '.pdf':
                    logger.warning(f"非 PDF 文件: {input_file}，跳过")
                    continue

                try:
                    reader = PdfReader(str(input_path))
                    for page in reader.pages:
                        writer.add_page(page)
                    total_pages += len(reader.pages)
                    valid_files += 1
                    logger.info(f"添加文件: {input_file}, 页数: {len(reader.pages)}")
                except Exception as e:
                    logger.error(f"读取文件失败 {input_file}: {e}")
                    continue

            if valid_files == 0:
                result["error"] = "没有有效的 PDF 文件"
                return result

            # 确保输出目录存在
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, 'wb') as f:
                writer.write(f)

            result["success"] = True
            result["total_pages"] = total_pages
            result["file_count"] = valid_files
            logger.info(f"成功合并 {valid_files} 个文件，共 {total_pages} 页")

        except Exception as e:
            result["error"] = str(e)
            logger.error(f"合并 PDF 失败: {e}", exc_info=True)

        return result

    @staticmethod
    def split_pdf(input_file: str, output_dir: str, page_range: Optional[str] = None) -> Dict[str, Any]:
        """
        拆分 PDF 文件

        Args:
            input_file: 输入 PDF 文件路径
            output_dir: 输出目录
            page_range: 页码范围（如 "1,3,5-7"），None 表示拆分为单页

        Returns:
            拆分结果
        """
        result = {
            "success": False,
            "output_files": [],
            "total_pages": 0,
            "error": None
        }

        if not PYPDF_AVAILABLE:
            result["error"] = "pypdf 未安装，请运行: pip install pypdf"
            return result

        try:
            reader = PdfReader(input_file)
            total_pages = len(reader.pages)

            if total_pages == 0:
                result["error"] = "PDF 文件为空"
                return result

            # 确保输出目录存在
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)

            input_name = Path(input_file).stem
            output_files = []

            if page_range:
                # 按范围提取
                pages = PDFToolkit._parse_page_range(page_range, total_pages)
                if not pages:
                    result["error"] = f"无效的页码范围，PDF 总页数: {total_pages}"
                    return result

                writer = PdfWriter()
                for page_idx in pages:
                    writer.add_page(reader.pages[page_idx])

                output_file = output_path / f"{input_name}_extracted.pdf"
                with open(output_file, 'wb') as f:
                    writer.write(f)

                output_files.append(str(output_file))
                result["extracted_pages"] = [p + 1 for p in pages]
            else:
                # 拆分为单页
                for i in range(total_pages):
                    writer = PdfWriter()
                    writer.add_page(reader.pages[i])

                    output_file = output_path / f"{input_name}_page_{i+1:03d}.pdf"
                    with open(output_file, 'wb') as f:
                        writer.write(f)

                    output_files.append(str(output_file))

            result["success"] = True
            result["output_files"] = output_files
            result["total_pages"] = total_pages
            logger.info(f"成功拆分 PDF，生成 {len(output_files)} 个文件")

        except Exception as e:
            result["error"] = str(e)
            logger.error(f"拆分 PDF 失败: {e}", exc_info=True)

        return result

    @staticmethod
    def _parse_page_range(page_str: str, total_pages: int) -> List[int]:
        """
        解析页码范围字符串

        Args:
            page_str: 页码字符串，如 "1,3,5-7"
            total_pages: PDF 总页数

        Returns:
            页码列表（从 0 开始）
        """
        pages = []

        for part in page_str.split(','):
            part = part.strip()
            if '-' in part:
                start, end = map(int, part.split('-'))
                pages.extend(range(start - 1, min(end, total_pages)))
            else:
                page_num = int(part)
                if 1 <= page_num <= total_pages:
                    pages.append(page_num - 1)

        return sorted(list(set(pages)))

    @staticmethod
    def pdf_to_images(input_file: str, output_dir: str, format: str = 'jpg', dpi: int = 150,
                      pages: Optional[str] = None) -> Dict[str, Any]:
        """
        将 PDF 转换为图片

        Args:
            input_file: 输入 PDF 文件路径
            output_dir: 输出目录
            format: 输出格式（jpg/png）
            dpi: 图片分辨率
            pages: 页码范围（如 "1-3"），None 表示全部

        Returns:
            转换结果
        """
        result = {
            "success": False,
            "output_files": [],
            "total_pages": 0,
            "error": None
        }

        if not PDF2IMAGE_AVAILABLE:
            result["error"] = "pdf2image 未安装，请运行: pip install pdf2image"
            return result

        try:
            input_path = Path(input_file)
            if not input_path.exists():
                result["error"] = f"文件不存在: {input_file}"
                return result

            # 确保输出目录存在
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)

            input_name = input_path.stem
            fmt = 'JPEG' if format.lower() == 'jpg' else 'PNG'
            ext = '.jpg' if format.lower() == 'jpg' else '.png'

            # 解析页码范围
            first_page = None
            last_page = None

            if pages:
                if '-' in pages:
                    start, end = map(int, pages.split('-'))
                    first_page = start
                    last_page = end
                else:
                    first_page = int(pages)
                    last_page = int(pages)

            # 转换 PDF 为图片
            images = convert_from_path(
                str(input_path),
                dpi=dpi,
                first_page=first_page,
                last_page=last_page,
                fmt=fmt
            )

            output_files = []
            for i, image in enumerate(images):
                page_num = first_page + i if first_page else i + 1
                output_file = output_path / f"{input_name}_page_{page_num:03d}{ext}"
                image.save(str(output_file), fmt)
                output_files.append(str(output_file))

            result["success"] = True
            result["output_files"] = output_files
            result["total_pages"] = len(images)
            logger.info(f"成功转换 {len(images)} 页到图片")

        except Exception as e:
            result["error"] = str(e)
            logger.error(f"PDF 转图片失败: {e}", exc_info=True)

        return result

    @staticmethod
    def images_to_pdf(input_files: List[str], output_file: str) -> Dict[str, Any]:
        """
        将多张图片合并为 PDF

        Args:
            input_files: 输入图片文件路径列表
            output_file: 输出 PDF 文件路径

        Returns:
            合并结果
        """
        result = {
            "success": False,
            "image_count": 0,
            "output_path": output_file,
            "error": None
        }

        if not PIL_AVAILABLE:
            result["error"] = "PIL 未安装，请运行: pip install Pillow"
            return result

        try:
            # 验证输入文件
            valid_files = []
            supported_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}

            for img_file in input_files:
                img_path = Path(img_file)
                if not img_path.exists():
                    logger.warning(f"文件不存在: {img_file}")
                    continue

                if img_path.suffix.lower() not in supported_formats:
                    logger.warning(f"不支持的图片格式: {img_file}，跳过")
                    continue

                valid_files.append(img_file)

            if not valid_files:
                result["error"] = "没有有效的图片文件"
                return result

            # 确保输出目录存在
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # 使用 PIL 合并图片为 PDF
            images = []
            for img_file in valid_files:
                img = Image.open(img_file)
                # 转换为 RGB 模式（PDF 不支持 RGBA）
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                images.append(img)

            # 第一张图片保存为 PDF，其余追加
            if images:
                images[0].save(
                    output_file,
                    save_all=True,
                    append_images=images[1:],
                    resolution=100.0
                )

            result["success"] = True
            result["image_count"] = len(valid_files)
            logger.info(f"成功合并 {len(valid_files)} 张图片到 PDF")

        except Exception as e:
            result["error"] = str(e)
            logger.error(f"图片转 PDF 失败: {e}", exc_info=True)

        return result


# 便捷函数
def merge_pdfs(input_files: List[str], output_file: str) -> Dict[str, Any]:
    """便捷函数：合并多个 PDF"""
    return PDFToolkit.merge_pdfs(input_files, output_file)


def split_pdf(input_file: str, output_dir: str, page_range: Optional[str] = None) -> Dict[str, Any]:
    """便捷函数：拆分 PDF"""
    return PDFToolkit.split_pdf(input_file, output_dir, page_range)


def pdf_to_images(input_file: str, output_dir: str, format: str = 'jpg',
                  dpi: int = 150, pages: Optional[str] = None) -> Dict[str, Any]:
    """便捷函数：PDF 转图片"""
    return PDFToolkit.pdf_to_images(input_file, output_dir, format, dpi, pages)


def images_to_pdf(input_files: List[str], output_file: str) -> Dict[str, Any]:
    """便捷函数：图片转 PDF"""
    return PDFToolkit.images_to_pdf(input_files, output_file)
