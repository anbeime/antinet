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
    icon: <Brain size={18} />
  },
  green: { 
    name: '关联链接', 
    icon: <Network size={18} />
  },
  yellow: { 
    name: '参考来源', 
    icon: <Database size={18} />
  },
  red: { 
    name: '索引关键词', 
    icon: <Search size={18} />
  }
};

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedCards: Array<{
    title: string;
    content: string;
    color: CardColor;
    address: string;
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
  }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // 智能分析内容 - 调用后端8智能体系统
  const autoClassifyContent = async (content: string): Promise<Array<{
    title: string;
    content: string;
    color: CardColor;
    confidence: number;
    address: string;
  }>> => {
    try {
      // 调用后端智能分析API
      const response = await fetch('http://localhost:8000/api/knowledge/import/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          auto_save: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 转换API返回格式为组件需要的格式
      return result.cards.map((card: any, index: number) => ({
        title: card.title,
        content: card.content,
        color: card.card_type as CardColor,
        confidence: card.confidence,
        address: card.address || `${card.card_type.toUpperCase()}${index + 1}`,
        relatedCards: card.related_cards || []
      }));
      
    } catch (error) {
      console.error('智能分析失败，降级到本地分类:', error);
      
      // 降级到本地分类算法
      return localClassifyContent(content);
    }
  };
  
  // 本地分类算法（作为降级方案）
  const localClassifyContent = (content: string): Array<{
    title: string;
    content: string;
    color: CardColor;
    confidence: number;
    address: string;
  }> => {
    // 分割文本为段落
    const paragraphs = content.split(/\n\s*\n/)
      .filter(para => para.trim().length > 0)
      .map(para => para.trim());

    if (paragraphs.length === 0) {
      throw new Error('未找到有效内容,请确保文本包含完整的知识记录');
    }

    // 智能分类函数
    const classifyParagraph = (text: string): { color: CardColor; confidence: number } => {
      const lowerText = text.toLowerCase();
      
      // 定义各类型的关键词
      const conceptKeywords = ['定义', '概念', '理论', '原理', '思想', '观点', '主要', '核心', '基础', '本质', '什么是', '是指', '含义', '意思'];
      const linkKeywords = ['关联', '联系', '相关', '连接', '关系', '对比', '区别', '类似', '参见', '参考', '与', '和', '比较', '相似'];
      const sourceKeywords = ['来源', '出处', '引用', '参考文献', '资料', '文档', 'http', 'www', '链接', '网址', '书籍', '论文', '作者', '出版'];
      const indexKeywords = ['关键词', '标签', '索引', '分类', '术语', '名词', '概念词', 'tag', 'keyword'];
      
      let scores = {
        blue: 0,
        green: 0,
        yellow: 0,
        red: 0
      };
      
      // 计算各类型得分
      conceptKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) scores.blue += 1;
      });
      
      linkKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) scores.green += 1;
      });
      
      sourceKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) scores.yellow += 1;
      });
      
      indexKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) scores.red += 1;
      });
      
      // 额外规则
      // 如果包含URL,很可能是参考来源
      if (/https?:\/\/|www\.|\.com|\.org|\.net/i.test(text)) {
        scores.yellow += 3;
      }
      
      // 如果文本很短(少于50字),可能是索引关键词
      if (text.length < 50) {
        scores.red += 2;
      }
      
      // 如果文本很长(超过200字),可能是核心概念
      if (text.length > 200) {
        scores.blue += 1;
      }
      
      // 如果包含问号,可能是核心概念
      if (text.includes('?') || text.includes('？')) {
        scores.blue += 1;
      }
      
      // 如果包含冒号,可能是定义
      if (text.includes(':') || text.includes('：')) {
        scores.blue += 0.5;
      }
      
      // 找出得分最高的类型
      const maxScore = Math.max(scores.blue, scores.green, scores.yellow, scores.red);
      
      let selectedColor: CardColor = 'blue'; // 默认为核心概念
      if (maxScore === 0) {
        // 如果没有匹配任何关键词,根据长度判断
        if (text.length < 50) {
          selectedColor = 'red';
        } else if (text.length > 200) {
          selectedColor = 'blue';
        } else {
          selectedColor = 'blue';
        }
      } else {
        if (scores.yellow === maxScore && scores.yellow > 0) selectedColor = 'yellow';
        else if (scores.blue === maxScore) selectedColor = 'blue';
        else if (scores.green === maxScore) selectedColor = 'green';
        else if (scores.red === maxScore) selectedColor = 'red';
      }
      
      // 计算置信度(0.5-0.95之间)
      const totalScore = scores.blue + scores.green + scores.yellow + scores.red;
      const confidence = totalScore === 0 ? 0.6 : Math.min(0.95, 0.5 + (maxScore / (totalScore + 1)) * 0.45);
      
      return { color: selectedColor, confidence };
    };

    // 生成地址
    const colorCounts: Record<CardColor, number> = { blue: 0, green: 0, yellow: 0, red: 0 };
    
    const generateAddress = (color: CardColor): string => {
      const prefixes: Record<CardColor, string> = {
        blue: 'A',
        green: 'B',
        yellow: 'C',
        red: 'D'
      };
      colorCounts[color]++;
      return `${prefixes[color]}${colorCounts[color]}`;
    };

    // 提取标题(取第一行或前30个字符)
    const extractTitle = (text: string): string => {
      // 尝试提取第一行作为标题
      const lines = text.split('\n').filter(line => line.trim());
      const firstLine = lines[0]?.trim() || '';
      
      // 如果第一行是标题格式(# 开头或很短)
      if (firstLine.startsWith('#')) {
        return firstLine.replace(/^#+\s*/, '').trim();
      }
      
      if (firstLine.length > 0 && firstLine.length <= 60) {
        return firstLine;
      }
      
      // 否则取前30个字符
      const title = text.substring(0, 30).trim();
      return title + (text.length > 30 ? '...' : '');
    };

    // 对每个段落进行分类
    const results = paragraphs.map((para) => {
      const { color, confidence } = classifyParagraph(para);
      const title = extractTitle(para);
      const address = generateAddress(color);
      
      return {
        title,
        content: para,
        color,
        confidence,
        address
      };
    });

    return results;
  };

  // 文本文件解析
  const parseTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => {
        reject(new Error('读取文本文件失败'));
      };
      reader.readAsText(file, 'UTF-8');
    });
  };

  // Markdown文件解析
  const parseMarkdownFile = (file: File): Promise<string> => {
    return parseTextFile(file);
  };

  // PDF文件解析 - 提示需要后端支持
  const parsePDFFile = (_file: File): Promise<string> => {
    toast('PDF解析需要后端支持,请使用文本或Markdown文件', {
      icon: <AlertCircle size={16} />,
      className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
    });
    return Promise.reject(new Error('PDF解析功能需要后端服务支持'));
  };

  // Excel文件解析 - 提示需要后端支持
  const parseExcelFile = (_file: File): Promise<string> => {
    toast('Excel解析需要后端支持,请使用文本或Markdown文件', {
      icon: <AlertCircle size={16} />,
      className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
    });
    return Promise.reject(new Error('Excel解析功能需要后端服务支持'));
  };

  // Word文件解析 - 提示需要后端支持
  const parseWordFile = (_file: File): Promise<string> => {
    toast('Word文档解析需要后端支持,请使用文本或Markdown文件', {
      icon: <AlertCircle size={16} />,
      className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
    });
    return Promise.reject(new Error('Word文档解析功能需要后端服务支持'));
  };

  // 图片文件解析 - 提示需要后端支持
  const parseImageFile = (_file: File): Promise<string> => {
    toast('图片OCR解析需要后端支持,请使用文本或Markdown文件', {
      icon: <AlertCircle size={16} />,
      className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
    });
    return Promise.reject(new Error('图片OCR解析功能需要后端服务支持'));
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['txt', 'md', 'pdf', 'xls', 'xlsx', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    
    if (!validExtensions.includes(fileExtension || '')) {
      toast('请上传支持的文件格式：.txt、.md、.pdf、.xls、.xlsx、.doc、.docx、.jpg、.jpeg、.png', {
        icon: <AlertCircle size={16} />,
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
      return;
    }
    
    setSelectedFile(file);
    setIsProcessing(true);
    
    try {
      let content = '';
      
      // 根据文件类型选择解析方法
      if (fileExtension === 'txt') {
        content = await parseTextFile(file);
        toast('文本文件解析成功', {
          icon: <Check size={16} />,
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
      } else if (fileExtension === 'md') {
        content = await parseMarkdownFile(file);
        toast('Markdown文件解析成功', {
          icon: <Check size={16} />,
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
      } else if (fileExtension === 'pdf') {
        content = await parsePDFFile(file);
      } else if (fileExtension && ['doc', 'docx'].includes(fileExtension)) {
        content = await parseWordFile(file);
      } else if (fileExtension && ['xls', 'xlsx'].includes(fileExtension)) {
        content = await parseExcelFile(file);
      } else if (fileExtension && ['jpg', 'jpeg', 'png'].includes(fileExtension)) {
        content = await parseImageFile(file);
      }
      
      setImportContent(content);
    } catch (error) {
      console.error('文件解析错误:', error);
      setSelectedFile(null);
      setImportContent('');
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理导入
  const handleImport = async () => {
    setErrors([]);
    setIsProcessing(true);
    
    try {
      const content = importContent.trim();
      
      if (!content) {
        throw new Error('请输入或上传要导入的知识内容');
      }
      
      toast.loading('正在使用8智能体系统分析...', { id: 'analyzing' });
      
      // ✅ 调用智能分析（带await）
      const classifiedResults = await autoClassifyContent(content);
      
      setImportResults(classifiedResults);
      setShowResults(true);
      
      toast.success(`成功识别并分类了 ${classifiedResults.length} 条知识记录`, {
        id: 'analyzing',
        icon: <Check size={16} />,
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入过程中发生错误';
      setErrors([errorMessage]);
      toast.error(errorMessage, {
        id: 'analyzing',
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
      address: result.address
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
                    placeholder="请粘贴要导入的知识记录内容，每条记录请用空行分隔...

示例：
知识管理系统
知识管理系统是一种用于收集、组织、存储和分享知识的工具。

参考资料
https://example.com/knowledge-management
这是一篇关于知识管理的优秀文章。

关键词
知识管理、信息组织、知识共享"
                    rows={12}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none resize-none dark:bg-gray-700 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 提示：每条知识记录之间用空行分隔，系统会自动识别并分类为核心概念、关联链接、参考来源或索引关键词。
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileUpload}
                    accept=".txt,.md,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
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
                        onClick={() => {
                          setSelectedFile(null);
                          setImportContent('');
                        }}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  
                  <div className="mt-6 text-left">
                    <p className="text-sm font-medium mb-3">✅ 当前支持的格式：</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Check size={14} className="mr-1" />
                        <span>.txt 文本文件</span>
                      </div>
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Check size={14} className="mr-1" />
                        <span>.md Markdown文件</span>
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium mt-4 mb-3">⏳ 需要后端支持的格式：</p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        <span>.pdf PDF文档</span>
                      </div>
                      <div className="flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        <span>.doc/.docx Word文档</span>
                      </div>
                      <div className="flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        <span>.xls/.xlsx Excel表格</span>
                      </div>
                      <div className="flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        <span>.jpg/.png 图片OCR</span>
                      </div>
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
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">智能分类说明：</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>系统会根据内容特征自动分类</li>
                    <li>包含定义、概念的内容 → 核心概念(蓝色)</li>
                    <li>包含关联、对比的内容 → 关联链接(绿色)</li>
                    <li>包含URL、引用的内容 → 参考来源(黄色)</li>
                    <li>短文本、关键词 → 索引关键词(红色)</li>
                  </ul>
                </div>
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
                disabled={isProcessing || !importContent.trim()}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                  isProcessing || !importContent.trim()
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    <span>正在分析...</span>
                  </>
                ) : (
                  <>
                    <Brain size={16} className="mr-2" />
                    <span>智能分析并分类</span>
                  </>
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
                  transition={{ delay: index * 0.05 }}
                  className="border rounded-lg p-4 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center flex-1">
                      <div className={`w-8 h-8 rounded-full ${
                        result.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' :
                        result.color === 'green' ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' :
                        result.color === 'yellow' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400' :
                        'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                      } flex items-center justify-center mr-3 flex-shrink-0`}>
                        {cardTypeMap[result.color].icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{result.title}</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {cardTypeMap[result.color].name} · 地址: {result.address}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 ml-2 flex-shrink-0">
                      {Math.round(result.confidence * 100)}%
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{result.content}</p>
                </motion.div>
              ))}
            </div>
            
            {/* 统计信息 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">总记录数</p>
                <p className="text-2xl font-bold">{importResults.length}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">核心概念</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {importResults.filter(r => r.color === 'blue').length}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">关联链接</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importResults.filter(r => r.color === 'green').length}
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">参考来源</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {importResults.filter(r => r.color === 'yellow').length}
                </p>
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
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
              >
                <Check size={16} className="mr-2" />
                确认导入 {importResults.length} 条记录
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ImportModal;
