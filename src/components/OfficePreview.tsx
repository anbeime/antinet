import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, FileText, Loader, FileSpreadsheet, ExternalLink, Eye, Edit3 } from 'lucide-react';

interface OfficePreviewProps {
  file: Blob;
  fileName: string;
  fileType: 'pptx' | 'docx' | 'xlsx' | 'ppt';
  onClose: () => void;
  onDownload: () => void;
}

// 根据文件类型获取在线工具URL
const getOnlineToolUrl = (fileType: string): string => {
  switch (fileType) {
    case 'xlsx':
    case 'xls':
      return '/office-docs';
    case 'pptx':
    case 'ppt':
      return '/ppt-viewer';
    case 'docx':
    case 'doc':
      return '/pdf-viewer';
    default:
      return '/office-docs';
  }
};

const getOnlineToolName = (fileType: string): string => {
  switch (fileType) {
    case 'xlsx':
    case 'xls':
      return '在线表格';
    case 'pptx':
    case 'ppt':
      return 'PPT演示';
    case 'docx':
    case 'doc':
      return 'PDF查看器';
    default:
      return '在线工具';
  }
};

const OfficePreview: React.FC<OfficePreviewProps> = ({
  file,
  fileName,
  fileType,
  onClose,
  onDownload,
}) => {
  const [isLoading] = useState(false);
  const onlineToolUrl = getOnlineToolUrl(fileType);
  const onlineToolName = getOnlineToolName(fileType);

  const handleOpenOnline = () => {
    // 直接打开在线工具
    window.open(onlineToolUrl, '_blank');
    // 可选：延迟关闭预览窗口
    setTimeout(() => onClose(), 500);
  };

  // 获取文件图标和颜色
  const getFileIcon = () => {
    if (fileType === 'xlsx' || fileType === 'xls') {
      return <FileSpreadsheet size={64} className="mb-4 text-green-500" />;
    } else if (fileType === 'pptx' || fileType === 'ppt') {
      return <FileText size={64} className="mb-4 text-orange-500" />;
    } else {
      return <FileText size={64} className="mb-4 text-blue-500" />;
    }
  };

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
          <span className="px-2 py-1 text-xs bg-gray-700 rounded text-gray-400">
            .{fileType}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenOnline}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Eye size={18} />
            <span>{onlineToolName}</span>
          </button>
          
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download size={18} />
            <span>下载</span>
          </button>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
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
            <p>正在加载...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white">
            {getFileIcon()}
            <h3 className="text-xl font-semibold mb-2">{fileName}</h3>
            <p className="text-gray-400 mb-8">点击下方按钮在线查看或下载到本地</p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleOpenOnline}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <ExternalLink size={20} />
                <span>打开{onlineToolName}</span>
              </button>
              
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Download size={20} />
                <span>下载到本地</span>
              </button>
            </div>
            
            <p className="text-gray-500 text-sm mt-8">
              提示：在线工具无需安装Office，会员免费使用
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OfficePreview;