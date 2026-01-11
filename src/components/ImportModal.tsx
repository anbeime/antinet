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

  // 生成地址建议
  const generateAddress = (color: CardColor) => {
    const colors: Record<CardColor, string> = {
      blue: 'A',
      green: 'B',
      yellow: 'C',
      red: 'D'
    };
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    return `${colors[color]}${randomNumber}`;
  };

  // 模拟AI分类逻辑
  const autoClassifyContent = (content: string): Array<{
    title: string;
    content: string;
    color: CardColor;
    confidence: number;
    address: string;
  }> => {
    // 分割文本为段落
    const paragraphs = content.split('\n\n')
      .filter(para => para.trim().length > 0)
      .map(para => para.trim());
    
    if (paragraphs.length === 0) {
      throw new Error('未找到有效内容，请确保文本包含完整的知识记录');
    }
    
    // 模拟分类结果
    const results: Array<{
      title: string;
      content: string;
      color: CardColor;
      confidence: number;
      address: string;
    }> = [];
    
    // 简单的关键词匹配规则来模拟AI分类
    const classificationRules: Record<string, { color: CardColor, confidence: number }> = {
      // 蓝色卡片 - 核心概念关键词
      '理论|概念|模型|框架|原则|方法|策略|范式|体系': { color: 'blue', confidence: 0.85 },
      // 绿色卡片 - 关联链接关键词
      '关联|联系|连接|关系|结合|整合|对比|区别|相似': { color: 'green', confidence: 0.8 },
      // 黄色卡片 - 参考来源关键词
      '参考|来源|引用|文献|资料|文档|链接|URL|来源链接|文章|书籍|研究': { color: 'yellow', confidence: 0.9 },
      // 红色卡片 - 索引关键词
      '定义|术语|关键词|索引|标签|分类|类型|范畴|类别': { color: 'red', confidence: 0.75 }
    };
    
    paragraphs.forEach(paragraph => {
      // 尝试从段落中提取标题
      let title = paragraph.substring(0, Math.min(50, paragraph.indexOf('.') !== -1 ? paragraph.indexOf('.') + 1 : 50));
      if (title.length > 30) {
        title = title.substring(0, 30) + '...';
      }
      
      // 查找最匹配的分类
      let bestMatch: { color: CardColor, confidence: number } = { color: 'blue', confidence: 0.5 };
      let maxScore = 0;
      
      Object.entries(classificationRules).forEach(([keywords, { color, confidence }]) => {
        const keywordList = keywords.split('|');
        let score = 0;
        
        keywordList.forEach(keyword => {
          if (paragraph.toLowerCase().includes(keyword.toLowerCase())) {
            score += 1;
          }
        });
        
        if (score > maxScore) {
          maxScore = score;
          bestMatch = { color, confidence: Math.min(1, confidence + (score * 0.1)) };
        }
      });
      
      // 如果没有找到匹配项，随机分配一个类型
      if (maxScore === 0) {
        const colors: CardColor[] = ['blue', 'green', 'yellow', 'red'];
        bestMatch.color = colors[Math.floor(Math.random() * colors.length)];
        bestMatch.confidence = 0.5;
      }
      
      results.push({
        title: title.replace(/\.$/, ''), // 移除末尾的句号
        content: paragraph,
        color: bestMatch.color,
        confidence: bestMatch.confidence,
        address: generateAddress(bestMatch.color),
      });
    });
    
    return results;
  };

  // 模拟解析PDF文件内容
  const parsePDFFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // 模拟PDF解析延迟
      setTimeout(() => {
        // 模拟从PDF中提取的内容
        const mockContent = `PDF文档内容示例：\n\n第一章 核心概念\n知识管理是组织或个人对知识进行识别、获取、开发、使用、存储和共享的过程。有效的知识管理可以提高组织的创新能力和竞争优势。\n\n第二章 最佳实践\n建立知识共享文化是知识管理成功的关键因素之一。组织应该鼓励员工分享经验和见解，创造开放的交流环境。\n\n第三章 技术工具\n现代知识管理系统通常包含内容管理、搜索引擎、协作工具和分析功能等核心组件。这些工具帮助组织更有效地管理和利用知识资产。`;
        resolve(mockContent);
      }, 1000);
    });
  };

  // 模拟解析Excel文件内容
  const parseExcelFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // 模拟Excel解析延迟
      setTimeout(() => {
        // 模拟从Excel中提取的内容
        const mockContent = `Excel表格数据示例：\n\n核心概念：知识管理\n知识管理是组织或个人对知识进行识别、获取、开发、使用、存储和共享的过程。\n\n关联链接：知识管理与创新\n知识管理系统可以促进组织内部的知识流动和共享，为创新提供必要的基础和支持。\n\n参考来源：《知识管理：获取竞争优势的利器》\n这本书详细介绍了知识管理的理论基础和实践方法，提供了丰富的案例分析和实施指南。\n\n索引关键词：知识资产、知识共享、知识创新`;
        resolve(mockContent);
      }, 1000);
    });
  };

  // 模拟解析Word文件内容
  const parseWordFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // 模拟Word解析延迟
      setTimeout(() => {
        // 模拟从Word中提取的内容
        const mockContent = `Word文档内容示例：\n\n第一章 知识管理概述\n知识管理是组织或个人对知识进行识别、获取、开发、使用、存储和共享的过程。有效的知识管理可以提高组织的创新能力和竞争优势。\n\n第二章 知识管理系统\n现代知识管理系统通常包含内容管理、搜索引擎、协作工具和分析功能等核心组件。这些工具帮助组织更有效地管理和利用知识资产。\n\n第三章 实施策略\n成功实施知识管理需要组织文化的支持、明确的目标和有效的执行计划。高层领导的支持和员工的积极参与是关键因素。`;
        resolve(mockContent);
      }, 1000);
    });
  };

  // 模拟解析图片文件内容
  const parseImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // 模拟图片解析延迟
      setTimeout(() => {
        // 模拟从图片中提取的内容（OCR结果）
        const mockContent = `图片内容OCR识别结果：\n\n这张图片包含了关于知识管理的重要信息，主要包括以下几点：\n\n1. 知识管理的核心目标是提高组织的创新能力和竞争优势\n2. 有效的知识管理系统应该支持内容创建、存储、共享和发现\n3. 知识管理需要组织文化的支持和员工的积极参与\n4. 知识管理可以帮助组织更好地利用内部资源，提高决策质量`;
        resolve(mockContent);
      }, 1500);
    });
  };

  // 模拟解析Markdown文件内容
  const parseMarkdownFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // 模拟Markdown解析延迟
      setTimeout(() => {
        // 模拟从Markdown中提取的内容
        const mockContent = `Markdown文档内容示例：\n\n# 核心概念\n\n## 知识管理\n知识管理是组织或个人对知识进行识别、获取、开发、使用、存储和共享的过程。\n\n## 卢曼卡片方法\n卢曼卡片盒是一种高效的知识管理系统，通过索引卡片和笔记卡片的关联，构建个人知识网络。\n\n# 关联链接\n\n知识管理系统与AI技术的结合可以增强知识发现和关联能力，创造更有价值的知识网络。\n\n# 参考来源\n\n《如何阅读一本书》\n这本书提供了系统的阅读方法，强调主动阅读和笔记的重要性。\n\n# 索引关键词\n\n知识管理、卢曼卡片、AI增强、知识网络、学习方法`;
        resolve(mockContent);
      }, 1000);
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
          } else if (['doc', 'docx'].includes(fileExtension)) {
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
          } else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
            toast('正在解析图片文件，请稍候...', {
              icon: <Loader2 size={16} className="animate-spin" />,
              className: 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
            });
            const content = await parseImageFile(file);
            setImportContent(content);
          } else if (['xls', 'xlsx'].includes(fileExtension)) {
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
      // 模拟处理延迟
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