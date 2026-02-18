import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, File, Presentation, FileSpreadsheet, FileText, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface OfficePreviewProps {
  file: Blob;
  fileName: string;
  fileType: 'pptx' | 'docx' | 'xlsx';
  onClose: () => void;
  onDownload: () => void;
}

const OfficePreview: React.FC<OfficePreviewProps> = ({
  file,
  fileName,
  fileType,
  onClose,
  onDownload,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  React.useEffect(() => {
    const convertToPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file, fileName);

        const endpointMap = {
          pptx: 'http://localhost:8000/api/office/convert/pptx-to-pdf',
          docx: 'http://localhost:8000/api/office/convert/docx-to-pdf',
          xlsx: 'http://localhost:8000/api/office/convert/xlsx-to-pdf',
        };

        const response = await fetch(endpointMap[fileType], {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('转换失败');
        }

        const pdfBlob = await response.blob();
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
      } catch (err) {
        console.error('PDF conversion error:', err);
        setError('无法预览此文件，请下载后查看');
      } finally {
        setIsLoading(false);
      }
    };

    if (file && fileName) {
      convertToPdf();
    }

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [file, fileName, fileType]);

  const getFileIcon = () => {
    switch (fileType) {
      case 'pptx':
        return <Presentation className="w-16 h-16 text-orange-500" />;
      case 'xlsx':
        return <FileSpreadsheet className="w-16 h-16 text-green-500" />;
      case 'docx':
        return <FileText className="w-16 h-16 text-blue-500" />;
      default:
        return <File className="w-16 h-16 text-gray-500" />;
    }
  };

  const getFileTypeName = () => {
    switch (fileType) {
      case 'pptx':
        return 'PowerPoint 演示文稿';
      case 'xlsx':
        return 'Excel 工作簿';
      case 'docx':
        return 'Word 文档';
      default:
        return 'Office 文档';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-500 to-red-500">
          <div className="flex items-center gap-3 text-white">
            {getFileIcon()}
            <div>
              <h3 className="font-semibold">{fileName}</h3>
              <p className="text-sm text-white/80">{getFileTypeName()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              下载
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">正在转换文件...</p>
                <p className="text-sm text-gray-400">请稍候</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <button
                  onClick={onDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors mx-auto"
                >
                  <Download className="w-4 h-4" />
                  下载文件
                </button>
              </div>
            </div>
          )}

          {pdfUrl && !isLoading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full min-h-[600px] rounded-lg"
              title="文件预览"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OfficePreview;
