import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  X, 
  Upload, 
  FileText, 
  FileSpreadsheet,
  File,
  Check,
  Brain,
  Network,
  Database,
  Search,
  AlertCircle,
  Clipboard,
  Loader2
} from 'lucide-react';

// 定义卡片类型
type CardColor = 'blue' | 'green' | 'yellow' | 'red';

// 卡片类型映射
const cardTypeMap = {
  blue: { 
    name: '核心概念', 
    icon: <Brain size={18} />,
    gtdCategory: 'projects' // 对应专题研究
  },
  green: { 
    name: '关联链接', 
    icon: <Network size={18} />,
    gtdCategory: 'today'
  },
  yellow: { 
    name: '参考来源', 
    icon: <Database size={18} />,
    gtdCategory: 'inbox'
  },
  red: { 
    name: '索引关键词', 
    icon: <Search size={18} />,
    gtdCategory: 'archive'
  }
};

// 定义GTD类别类型
type GTDCategory = 'inbox' | 'today' | 'later' | 'archive' | 'projects';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedCards: Array<{
    title: string;
    content: string;
    color: CardColor;
    address: string;
    gtdCategory: GTDCategory; // 新增GTD类别字段
  }>) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ 
  isOpen, 
  onClose, 
  onImport 
}) => {
  const [importType, setImportType] = useState<'paste' | 'upload'>('paste');
  const [importContent, setImportContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<Array<{
    title: string;
    content: string;
    color: CardColor;
    confidence: number;
    address: string;
    gtdCategory: GTDCategory; // 新增GTD类别字段
  }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // AI分类逻辑 - 需要后端支持
  const autoClassifyContent = (content: string): Array<{
    title: string;
    content: string;
    color: CardColor;
    confidence: number;
    address: string;
    gtdCategory: GTDCategory;
  }> => {
    // 分割文本为段落
    const paragraphs = content.split('\n\n')
      .filter(para => para.trim().length > 0)
      .map(para => para.trim());

    if (paragraphs.length === 0) {
      throw new Error('未找到有效内容，请确保文本包含完整的知识记录');
    }

    // 分类功能需要后端API支持
    throw new Error('文本分类功能需要后端服务支持。请确保后端服务已启动，并调用NPU进行真实推理。');
  };

  // PDF文件解析功能需要后端支持
  const parsePDFFile = (_file: File): Promise<string> => {
    return Promise.reject(new Error('PDF解析功能需要后端服务支持。请确保后端服务已启动，并实现相应的文件解析API。'));
  };

  // Excel文件解析功能需要后端支持
  const parseExcelFile = (_file: File): Promise<string> => {
    return Promise.reject(new Error('Excel解析功能需要后端服务支持。请确保后端服务已启动，并实现相应的文件解析API。'));
  };

  // Word文件解析功能需要后端支持
  const parseWordFile = (_file: File): Promise<string> => {
    return Promise.reject(new Error('Word文档解析功能需要后端服务支持。请确保后端服务已启动，并实现相应的文件解析API。'));
  };

  // 图片文件解析功能需要后端支持
  const parseImageFile = (_file: File): Promise<string> => {
    return Promise.reject(new Error('图片OCR解析功能需要后端服务支持。请确保后端服务已启动，并实现相应的文件解析API。'));
  };

  // Markdown文件解析 - 直接读取文本内容
  const parseMarkdownFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => {
        reject(new Error('读取Markdown文件失败'));
      };
      reader.readAsText(file);
    });
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['txt', 'pdf', 'md', 'xls', 'xlsx', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
      
      if (!validExtensions.includes(fileExtension || '')) {
        toast('请上传支持的文件格式：.txt、.pdf、.md、.xls、.xlsx、.doc、.docx、.jpg、.jpeg、.png', {
          icon: <AlertCircle size={16} />,
          className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
        });
        return;
      }
      
      setSelectedFile(file);
      
      try {
        setIsProcessing(true);
        
           // 根据文件类型选择不同的解析方法
          if (fileExtension === 'pdf') {
            toast('正在解析PDF文件，请稍候...', {
              icon: <Loader2 size={16} className="animate-spin" />,
              className: 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
            });
            const content = await parsePDFFile(file);
            setImportContent(content);
          } else if (fileExtension && ['doc', 'docx'].includes(fileExtension)) {
            toast('正在解析Word文档，请稍候...', {
              icon: <Loader2 size={16} className="animate-spin" />,
              className: 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
            });
            const content = await parseWordFile(file);
            setImportContent(content);
          } else if (fileExtension === 'md') {
            toast('正在解析Markdown文件，请稍候...', {
              icon: <Loader2 size={16} className="animate-spin" />,
              className: 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
            });
            const content = await parseMarkdownFile(file);
            setImportContent(content);
          } else if (fileExtension && ['jpg', 'jpeg', 'png'].includes(fileExtension)) {
            toast('正在解析图片文件，请稍候...', {
              icon: <Loader2 size={16} className="animate-spin" />,
              className: 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
            });
            const content = await parseImageFile(file);
            setImportContent(content);
          } else if (fileExtension && ['xls', 'xlsx'].includes(fileExtension)) {
            toast('正在解析Excel文件，请稍候...', {
              icon: <Loader2 size={16} className="animate-spin" />,
              className: 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
            });
            const content = await parseExcelFile(file);
            setImportContent(content);
          } else {
          // 文本文件直接读取
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            setImportContent(content);
          };
          reader.readAsText(file);
        }
      } catch (error) {
        toast('文件解析失败，请尝试其他文件', {
          icon: <AlertCircle size={16} />,
          className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // 处理导入
  const handleImport = async () => {
    setErrors([]);
    setIsProcessing(true);
    
    try {
      // 处理延迟（UI反馈）
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const content = importType === 'paste' ? importContent : importContent;
      
      if (!content.trim()) {
        throw new Error('请输入或上传要导入的知识内容');
      }
      
      const classifiedResults = autoClassifyContent(content);
      setImportResults(classifiedResults);
      setShowResults(true);
      
      toast(`成功识别并分类了 ${classifiedResults.length} 条知识记录`, {
        icon: <Check size={16} />,
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入过程中发生错误';
      setErrors([errorMessage]);
      toast(errorMessage, {
        icon: <AlertCircle size={16} />,
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理最终确认导入
  const handleConfirmImport = () => {
    onImport(importResults.map(result => ({
      title: result.title,
      content: result.content,
      color: result.color,
      address: result.address,
      gtdCategory: result.gtdCategory // 传递GTD类别
    })));
    
    onClose();
    
    toast(`${importResults.length} 条知识记录已成功导入并分类`, {
      icon: <Check size={16} />,
      className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
    });
  };

  // 重置表单
  const resetForm = () => {
    setImportContent('');
    setSelectedFile(null);
    setShowResults(false);
    setImportResults([]);
    setErrors([]);
  };

  // 当模态框关闭时重置表单
  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // 当导入类型改变时清除内容
  React.useEffect(() => {
    resetForm();
  }, [importType]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">导入知识记录</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>
        
        {!showResults ? (
          <div className="p-6 flex-1 overflow-y-auto">
            {/* 导入方式选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">选择导入方式</label>
              <div className="flex space-x-4">
                <button 
                  type="button"
                  onClick={() => setImportType('paste')}
                  className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center space-x-2 ${
                    importType === 'paste' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Clipboard size={18} />
                  <span>粘贴文本</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setImportType('upload')}
                  className={`flex-1 py-3 rounded-lg border transition-colors flex items-center justify-center space-x-2 ${
                    importType === 'upload' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Upload size={18} />
                  <span>上传文件</span>
                </button>
              </div>
            </div>
            
            {/* 导入内容输入 */}
            <div className="mb-6">
              {importType === 'paste' ? (
                <div>
                  <label htmlFor="import-content" className="block text-sm font-medium mb-2">
                    粘贴知识记录内容
                  </label>
                  <textarea
                    id="import-content"
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                    placeholder="请粘贴要导入的知识记录内容，每条记录请用空行分隔..."
                    rows={10}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none resize-none dark:bg-gray-700 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    提示：请确保每条知识记录之间用空行分隔，以便系统正确识别和分类。
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileUpload}
                    accept=".txt,.pdf,.md,.xls,.xlsx"
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2 transition-colors">
                    <FileText size={16} />
                    <span>选择文件</span>
                  </label>
                  
                       {selectedFile && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 inline-flex items-center">
                       {selectedFile.name.endsWith('.pdf') ? (
                        <File size={20} className="text-red-500 mr-3" />
                      ) : selectedFile.name.endsWith('.md') ? (
                        <FileText size={20} className="text-purple-500 mr-3" />
                      ) : ['xls', 'xlsx'].some(ext => selectedFile.name.endsWith(ext)) ? (
                        <FileSpreadsheet size={20} className="text-green-500 mr-3" />
                      ) : ['doc', 'docx'].some(ext => selectedFile.name.endsWith(ext)) ? (
                        <FileText size={20} className="text-blue-700 mr-3" />
                      ) : ['jpg', 'jpeg', 'png'].some(ext => selectedFile.name.endsWith(ext)) ? (
                        <FileText size={20} className="text-amber-600 mr-3" />
                      ) : (
                        <FileText size={20} className="text-blue-500 mr-3" />
                      )}
                      <div className="text-left mr-4">
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  
                     <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 justify-center">
                      <div className="flex flex-col items-center p-2">
                        <FileText size={24} className="text-blue-500 mb-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">文本文档</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">.txt</span>
                      </div>
                      <div className="flex flex-col items-center p-2">
                        <File size={24} className="text-red-500 mb-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">PDF文档</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">.pdf</span>
                      </div>
                      <div className="flex flex-col items-center p-2">
                        <FileText size={24} className="text-purple-500 mb-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Markdown</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">.md</span>
                      </div>
                      <div className="flex flex-col items-center p-2">
                        <FileSpreadsheet size={24} className="text-green-500 mb-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Excel表格</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">.xls, .xlsx</span>
                      </div>
                      <div className="flex flex-col items-center p-2">
                        <FileText size={24} className="text-blue-700 mb-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Word文档</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">.doc, .docx</span>
                      </div>
                      <div className="flex flex-col items-center p-2">
                        <FileText size={24} className="text-amber-600 mb-1" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">图片文件</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">.jpg, .png</span>
                      </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 显示错误信息 */}
            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                {errors.map((error, index) => (
                  <div key={index} className="flex items-start">
                    <AlertCircle size={16} className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* 提示信息 */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Brain size={18} className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  系统将自动分析您导入的内容，并根据内容特征将其分类到核心概念、关联链接、参考来源或索引关键词四种卡片类型中。
                </p>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button 
                type="button"
                onClick={handleImport}
                disabled={isProcessing || (!importContent.trim() && importType === 'paste') || (!selectedFile && importType === 'upload')}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  isProcessing 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>正在分析...</span>
                  </div>
                ) : (
                  '分析并分类'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">分类结果预览</h3>
              <button 
                onClick={() => setShowResults(false)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                返回编辑
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              {importResults.map((result, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-4 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full ${
                        result.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' :
                        result.color === 'green' ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' :
                        result.color === 'yellow' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400' :
                        'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                      } flex items-center justify-center mr-3`}>
                        {cardTypeMap[result.color].icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{result.title}</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{cardTypeMap[result.color].name} · 地址: {result.address}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 mr-2">
                        置信度: {Math.round(result.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">{result.content}</p>
                </motion.div>
              ))}
            </div>
            
            {/* 统计信息 */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">总记录数</p>
                <p className="text-lg font-bold">{importResults.length}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">核心概念</p>
                <p className="text-lg font-bold">{importResults.filter(r => r.color === 'blue').length}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">关联链接</p>
                <p className="text-lg font-bold">{importResults.filter(r => r.color === 'green').length}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">参考来源</p>
                <p className="text-lg font-bold">{importResults.filter(r => r.color === 'yellow').length}</p>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button 
                type="button"
                onClick={() => setShowResults(false)}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                返回编辑
              </button>
              <button 
                type="button"
                onClick={handleConfirmImport}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                确认导入
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ImportModal;