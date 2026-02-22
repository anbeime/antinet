import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, FileText, Loader, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileSpreadsheet } from 'lucide-react';

interface OfficePreviewProps {
  file: Blob;
  fileName: string;
  fileType: 'pptx' | 'docx' | 'xlsx' | 'ppt';
  onClose: () => void;
  onDownload: () => void;
}

interface PPTSlide {
  index: number;
  shapes: any[];
  background?: string;
}

interface PPTData {
  filename: string;
  total_slides: number;
  slide_width: number;
  slide_height: number;
  slides: PPTSlide[];
}

// PPT下载提示组件（内嵌模式，非弹窗）
export const PPTDownloadPrompt: React.FC<{
  fileName: string;
  onDownload: () => void;
}> = ({ fileName, onDownload }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl text-white">
      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
        <svg className="w-12 h-12 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
      </div>
      <h3 className="text-xl font-bold mb-2">PowerPoint 演示文稿</h3>
      <p className="text-white/80 mb-6 text-center max-w-sm">{fileName}</p>
      <p className="text-white/60 text-sm mb-6 text-center">
        PPT文件已生成，点击下方按钮下载查看
      </p>
      <button
        onClick={onDownload}
        className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-white/90 transition-colors shadow-lg"
      >
        <Download size={20} />
        立即下载
      </button>
    </div>
  );
};

const OfficePreview: React.FC<OfficePreviewProps> = ({
  file,
  fileName,
  fileType,
  onClose,
  onDownload,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pptData, setPptData] = useState<PPTData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

  useEffect(() => {
    // PPT类型：直接显示下载提示，不尝试预览
    if (fileType === 'pptx' || fileType === 'ppt') {
      setIsLoading(false);
      // 可选：尝试后台加载预览数据但不显示弹窗
      loadPPTPreviewBackground();
    } else {
      loadPreview();
    }
  }, [file, fileType]);

  // 后台加载PPT预览（不阻塞UI）
  const loadPPTPreviewBackground = async () => {
    try {
      const formData = new FormData();
      formData.append('file', file, fileName);

      const response = await fetch('http://localhost:8000/api/ppt/preview/extract', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPptData(data);
      }
    } catch (err) {
      // 后台加载失败不影响主流程
      console.log('PPT预览数据加载失败:', err);
    }
  };

  const loadPreview = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setError(null);

    try {
      if (fileType === 'xlsx' || fileType === 'xls') {
        await loadExcelPreview();
      } else if (fileType === 'docx' || fileType === 'doc') {
        await loadWordPreview();
      } else {
        setError('暂不支持此格式预览');
      }
    } catch (err) {
      console.error('预览加载失败:', err);
      setError('文件预览失败');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExcelPreview = async () => {
    // Excel预览逻辑（保持原有）
    setError('Excel预览功能开发中，请下载查看');
  };

  const loadWordPreview = async () => {
    // Word预览逻辑（保持原有）
    setError('Word预览功能开发中，请下载查看');
  };

  // PPT类型：直接显示下载界面，不打开弹窗
  if (fileType === 'pptx' || fileType === 'ppt') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-md w-full"
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <PPTDownloadPrompt fileName={fileName} onDownload={onDownload} />
          
          {/* 如果有预览数据，显示缩略图提示 */}
          {pptData && (
            <div className="mt-4 text-center">
              <p className="text-white/60 text-sm">
                共 {pptData.total_slides} 页幻灯片
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // 其他类型文件：显示完整预览弹窗
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-gray-900"
    >
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">{fileName}</h3>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download size={18} />
            <span>下载</span>
          </button>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 预览内容区域 */}
      <div className="flex-1 overflow-auto p-8 bg-gray-900">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <Loader size={48} className="animate-spin mb-4" />
            <p>正在加载预览...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <FileSpreadsheet size={64} className="mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">文件预览</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download size={20} />
              <span>下载文件查看</span>
            </button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default OfficePreview;
