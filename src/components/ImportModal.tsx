import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();
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
  Loader2,
  Sparkles,
  Inbox,
  Clock,
  Calendar,
  Archive,
  Book
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
  }>, syncToGTD?: boolean, rawText?: string) => void;
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [syncToGTD, setSyncToGTD] = useState(false);
  const [isAIClassifying, setIsAIClassifying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);  // 跟踪当前批次是否已保存

  // 智能分析内容 - 使用本地智能分类算法（快速且功能完整）
  const autoClassifyContent = async (content: string): Promise<Array<{
    title: string;
    content: string;
    color: CardColor;
    confidence: number;
    address: string;
  }>> => {
    try {
      // 直接使用本地分类算法，避免后端API调用的延迟
      return localClassifyContent(content);
    } catch (error) {
      console.error('本地分类失败:', error);
      throw error;
    }
  };
  
  // 本地分类算法（完整的四色卡片分类逻辑）
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
      // 蓝色: 核心概念 + 事实
      const blueKeywords = ['定义', '概念', '理论', '原理', '思想', '观点', '主要', '核心', '基础', '本质', '什么是', '是指', '含义', '意思', '事实', '数据', '统计', '研究表明', '结果显示'];
      // 绿色: 关联链接 + 解释
      const greenKeywords = ['关联', '联系', '相关', '连接', '关系', '对比', '区别', '类似', '参见', '参考', '与', '和', '比较', '相似', '解释', '原因', '因为', '所以', '导致', '由于'];
      // 黄色: 参考来源 + 推断风险
      const yellowKeywords = ['来源', '出处', '引用', '参考文献', '资料', '文档', 'http', 'www', '链接', '网址', '书籍', '论文', '作者', '出版', '风险', '隐患', '注意', '谨慎', '可能', '潜在'];
      // 红色: 索引关键词 + 行动
      const redKeywords = ['关键词', '标签', '索引', '分类', '术语', '名词', '概念词', 'tag', 'keyword', '行动', '建议', '必须', '需要', '应该', '要去做', '待办', '执行', '完成', '开始', '继续', '停止'];
      
      let scores = {
        blue: 0,
        green: 0,
        yellow: 0,
        red: 0
      };
      
      // 计算各类型得分
      blueKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) scores.blue += 1;
      });
      
      greenKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) scores.green += 1;
      });
      
      yellowKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) scores.yellow += 1;
      });
      
      redKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) scores.red += 1;
      });
      
      // 额外规则
      // 如果包含URL,很可能是参考来源
      if (/https?:\/\/|www\.|\.com|\.org|\.net/i.test(text)) {
        scores.yellow += 3;
      }
      
      // 如果文本很短(少于50字),可能是索引关键词或行动
      if (text.length < 50) {
        scores.red += 2;
      }
      
      // 如果文本很长(超过200字),可能是核心概念
      if (text.length > 200) {
        scores.blue += 1;
      }
      
      // 如果包含行动词，优先判定为红色
      const actionWords = ['建议', '应该', '必须', '需要', '要去做', '待办', '执行', '完成', '开始', '继续', '停止'];
      if (actionWords.some(word => lowerText.includes(word))) {
        scores.red += 3;
      }
      
      // 找出最高分
      const maxScore = Math.max(scores.blue, scores.green, scores.yellow, scores.red);
      const colorMap: Record<string, CardColor> = {
        blue: 'blue',
        green: 'green',
        yellow: 'yellow',
        red: 'red'
      };
      
      const color = colorMap[Object.entries(scores).find(([_, s]) => s === maxScore)?.[0] || 'blue'] || 'blue';
      const confidence = maxScore > 0 ? Math.min(maxScore / 5, 1) : 0.3;
      
      return { color, confidence };
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
      const urlMatch = para.match(/https?:\/\/[^\s\n\)\]]+/);
      const address = urlMatch ? urlMatch[0].replace(/[\)\]]$/, '').slice(0, 120) : generateAddress(color);
      
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

  // PDF文件解析 - 使用pdf.js在前端提取（解决后端正则乱码问题）
  const parsePDFFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      pages.push(text);
    }
    return pages.join('\n\n');
  };

  // Excel文件解析 - 调用后端API
  const parseExcelFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(getApiBaseUrl() + '/api/knowledge/import/file', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Excel解析失败');
    const result = await response.json();
    return result.cards.map((c: any) => c.content).join('\n\n');
  };

  // Word文件解析 - 调用后端API
  const parseWordFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(getApiBaseUrl() + '/api/knowledge/import/file', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Word解析失败');
    const result = await response.json();
    return result.cards.map((c: any) => c.content).join('\n\n');
  };

  // 图片文件解析 - 调用后端API
  const parseImageFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(getApiBaseUrl() + '/api/knowledge/import/file', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('图片OCR解析失败');
    const result = await response.json();
    return result.cards.map((c: any) => c.content).join('\n\n');
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
        toast('PDF文件解析成功', {
          icon: <Check size={16} />,
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
      } else if (fileExtension && ['doc', 'docx'].includes(fileExtension)) {
        content = await parseWordFile(file);
        toast('Word文档解析成功', {
          icon: <Check size={16} />,
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
      } else if (fileExtension && ['xls', 'xlsx'].includes(fileExtension)) {
        content = await parseExcelFile(file);
        toast('Excel文件解析成功', {
          icon: <Check size={16} />,
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
      } else if (fileExtension && ['jpg', 'jpeg', 'png'].includes(fileExtension)) {
        content = await parseImageFile(file);
        toast('图片OCR解析成功', {
          icon: <Check size={16} />,
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
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

  // 处理粘贴内容导入（调用后端锦衣卫全线：安全检查 + 密卷房提取 + 四司分类）
  const handlePasteImport = async () => {
    if (!importContent.trim()) {
      setErrors(['请输入要导入的内容']);
      return;
    }

    try {
      setIsProcessing(true);
      setErrors([]);

      // 调用后端 import/text，preview_only=true 只分类不保存
      const res = await fetch(getApiBaseUrl() + '/api/knowledge/import/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: importContent, preview_only: true })
      });

      if (!res.ok) {
        let detail = '';
        try { const err = await res.json(); detail = err.detail || ''; } catch {}
        throw new Error(`分类失败 (${res.status})${detail ? ': ' + detail : ''}`);
      }

      const data = await res.json();
      const cards = data.cards || [];

      if (cards.length === 0) {
        setErrors(['未识别到有效知识记录，请检查输入内容']);
        return;
      }

      // 安全检查提示
      if (data.security_issues && data.security_issues.length > 0) {
        toast.warning(`锦衣卫安全检查：${data.security_issues.length} 个问题已过滤`, {
          description: data.security_issues.slice(0, 3).join('; ')
        });
      }

      // 映射到前端格式
      const colorCounts: Record<string, number> = { blue: 0, green: 0, yellow: 0, red: 0 };
      const prefixes: Record<string, string> = { blue: 'A', green: 'B', yellow: 'C', red: 'D' };

      const results = cards.map((item: any) => {
        const color = (item.card_type || 'blue').toLowerCase() as CardColor;
        colorCounts[color] = (colorCounts[color] || 0) + 1;
        const address = item.address || `${prefixes[color]}${colorCounts[color]}`;
        return {
          title: item.title || item.content.slice(0, 30),
          content: item.content,
          color,
          confidence: item.confidence || 0.85,
          address
        };
      });

      setImportResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('导入失败:', error);
      setErrors([error instanceof Error ? error.message : '导入失败，请稍后重试']);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理文件上传导入（调用后端锦衣卫全线：文件解析 + 密卷房提取 + 四司分类）
  const handleFileImport = async () => {
    if (!selectedFile) {
      setErrors(['请选择要导入的文件']);
      return;
    }

    try {
      setIsProcessing(true);
      setErrors([]);

      // 调用后端文件导入API（后端统一处理解析+分类，支持PDF/Word/Excel/图片等）
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(getApiBaseUrl() + '/api/knowledge/import/file?preview_only=true', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let detail = '';
        try { const err = await res.json(); detail = err.detail || ''; } catch {}
        throw new Error(`文件解析失败 (${res.status})${detail ? ': ' + detail : ''}`);
      }

      const data = await res.json();
      const cards = data.cards || [];

      if (cards.length === 0) {
        setErrors(['未从文件中识别到有效知识记录']);
        return;
      }

      // 映射后端结果到前端格式
      const colorCounts: Record<string, number> = { blue: 0, green: 0, yellow: 0, red: 0 };
      const prefixes: Record<string, string> = { blue: 'A', green: 'B', yellow: 'C', red: 'D' };

      const results = cards.map((item: any) => {
        const color = (item.card_type || 'blue').toLowerCase() as CardColor;
        colorCounts[color] = (colorCounts[color] || 0) + 1;
        const address = item.address || `${prefixes[color]}${colorCounts[color]}`;
        return {
          title: item.title || item.content.slice(0, 30),
          content: item.content,
          color,
          confidence: item.confidence || 0.85,
          address
        };
      });

      setImportResults(results);
      setShowResults(true);
      toast.success(`锦衣卫文件解析完成，识别到 ${cards.length} 条知识记录`);
    } catch (error) {
      console.error('文件导入失败:', error);
      setErrors([error instanceof Error ? error.message : '文件导入失败，请检查文件格式']);
    } finally {
      setIsProcessing(false);
    }
  };

  // 确认导入
  const handleConfirmImport = async () => {
    if (importResults.length === 0) {
      setErrors(['没有可导入的内容']);
      return;
    }

    try {
      setIsProcessing(true);

      if (importType === 'upload' && selectedFile) {
        // 文件导入：调用后端一次性保存（含源文件追溯 + 关键词分类 + 自动建链）
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await fetch(getApiBaseUrl() + '/api/knowledge/import/file', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          let detail = '';
          try { const err = await res.json(); detail = err.detail || ''; } catch {}
          throw new Error(`文件保存失败 (${res.status})${detail ? ': ' + detail : ''}`);
        }

        // 通知父组件：后端已保存，仅需刷新卡片列表
        onImport([], syncToGTD, '__FILE_SAVED__');
      } else {
        // 粘贴文本导入：走原有流程（传递原始文本用于后端溯源保存）
        const rawText = importType === 'paste' ? importContent : undefined;
        onImport(
          importResults.map(result => ({
            title: result.title,
            content: result.content,
            color: result.color,
            address: result.address
          })),
          syncToGTD,
          rawText
        );
      }

      // 重置表单并关闭模态框
      setIsSaved(true);
      resetForm();
      setShowConfirmDialog(false);
      onClose();

      toast(`${importResults.length} 条知识记录已成功导入并分类${syncToGTD ? '，并同步到任务管理' : ''}`, {
        icon: <Check size={16} />,
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } catch (error) {
      console.error('保存失败:', error);
      setErrors(['保存失败: ' + (error instanceof Error ? error.message : '未知错误')]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 取消导入
  const handleCancelImport = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  // AI 精准分类 - 调用 Genie 8-智能体锦衣卫分类（Genie 优先，关键词降级兜底）
  const handleAIClassify = async () => {
    const content = importType === 'paste' ? importContent : (selectedFile ? await selectedFile.text() : '');
    if (!content.trim()) return;

    setIsAIClassifying(true);
    setErrors([]);
    try {
      // 调用 Genie 8-智能体锦衣卫分类接口（含降级兜底）
      const res = await fetch(getApiBaseUrl() + '/api/genie-playground/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content })
      });

      if (!res.ok) {
        let detail = '';
        try { const err = await res.json(); detail = err.detail || ''; } catch {}
        throw new Error(`AI 分类失败 (${res.status})${detail ? ': ' + detail : ''}`);
      }

      const data = await res.json();
      const cards = data.cards || [];

      if (cards.length === 0) {
        setErrors(['AI 分类未生成有效卡片，请检查输入内容']);
        return;
      }

      // 提示分类来源
      if (data.source === 'genie') {
        toast.success('锦衣卫 Genie 智能分类完成', {
          description: `模型 ${data.model} | 四司联合判定 ${cards.length} 张卡片`,
          duration: 4000
        });
      } else if (data.source === 'fallback') {
        toast.warning('Genie 不可用，已降级为关键词规则分类', {
          description: data.fallback_reason ? `原因: ${data.fallback_reason}` : '使用本地规则引擎兜底',
          duration: 5000
        });
      }

      // 映射后端结果到前端格式
      const colorCounts: Record<string, number> = { blue: 0, green: 0, yellow: 0, red: 0 };
      const prefixes: Record<string, string> = { blue: 'A', green: 'B', yellow: 'C', red: 'D' };

      const results = cards.map((item: any) => {
        const color = (item.card_type || item.color || 'blue').toLowerCase() as CardColor;
        colorCounts[color] = (colorCounts[color] || 0) + 1;
        const address = item.address || `${prefixes[color]}${colorCounts[color]}`;
        return {
          title: item.title || item.content.slice(0, 30),
          content: item.content,
          color,
          confidence: item.confidence || 0.85,
          address
        };
      });

      setImportResults(results);
      setShowResults(true);
    } catch (e: any) {
      console.error('AI 分类失败:', e);
      setErrors([e.message || 'AI 分类失败，请稍后重试']);
    } finally {
      setIsAIClassifying(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setImportContent('');
    setSelectedFile(null);
    setImportResults([]);
    setShowResults(false);
    setErrors([]);
    setSyncToGTD(false);
    setIsAIClassifying(false);
    setIsProcessing(false);
    setIsSaved(false);
  };

  // 放弃更改并关闭
  const handleDiscardAndClose = () => {
    resetForm();
    setShowConfirmDialog(false);
    onClose();
  };

  // 保存并关闭
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
      onClick={() => {
        // 有未保存的结果 → 弹确认框；否则直接关闭
        if (importResults.length > 0 && !isSaved) {
          setShowConfirmDialog(true);
        } else {
          onClose();
        }
      }}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">导入知识记录</h2>
          <button 
            onClick={() => {
              // X 按钮同样检查未保存状态
              if (importResults.length > 0 && !isSaved) {
                setShowConfirmDialog(true);
              } else {
                onClose();
              }
            }}
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
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <Inbox size={16} />
                选择导入方式
              </label>
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
                    <p className="text-sm font-medium mb-3">✅ 支持的文件格式：</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Check size={14} className="mr-1" />
                        <span>.txt 文本文件</span>
                      </div>
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Check size={14} className="mr-1" />
                        <span>.md Markdown文件</span>
                      </div>
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Check size={14} className="mr-1" />
                        <span>.pdf PDF文档</span>
                      </div>
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Check size={14} className="mr-1" />
                        <span>.doc/.docx Word文档</span>
                      </div>
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Check size={14} className="mr-1" />
                        <span>.xls/.xlsx Excel表格</span>
                      </div>
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Check size={14} className="mr-1" />
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
                <Book size={18} className="text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
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
                onClick={handleAIClassify}
                disabled={isAIClassifying || isProcessing || !importContent.trim()}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center text-sm ${
                  isAIClassifying || isProcessing || !importContent.trim()
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'border border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/20'
                }`}
              >
                {isAIClassifying ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" />
                    <span>AI 分析中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="mr-1.5" />
                    <span>AI 精准分类</span>
                  </>
                )}
              </button>
              <button 
                type="button"
                onClick={importType === 'paste' ? handlePasteImport : handleFileImport}
                disabled={isProcessing || isAIClassifying || !importContent.trim()}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                  isProcessing || isAIClassifying || !importContent.trim()
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
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Calendar size={20} className="text-gray-500" />
                分类结果预览
              </h3>
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
            <div className="flex items-center gap-2 mb-3">
              <Archive size={18} className="text-gray-500" />
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">分类统计</h4>
              <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                <Clock size={12} />
                {new Date().toLocaleTimeString()}
              </span>
            </div>
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
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToGTD}
                    onChange={(e) => setSyncToGTD(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">同步到任务管理</span>
                </label>
                <button 
                  type="button"
                  onClick={() => setShowConfirmDialog(true)}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center text-white ${isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <Check size={16} className="mr-2" />
                  {isSaved ? '已保存' : `确认导入 ${importResults.length} 条记录`}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* 确认对话框：已保存则直接关闭，未保存则提示 */}
      {showConfirmDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowConfirmDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${isSaved ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400'}`}>
                {isSaved ? <Check size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-bold">{isSaved ? '已保存' : '未保存的更改'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isSaved
                    ? `${importResults.length} 条记录已保存到知识库`
                    : `您有 ${importResults.length} 条知识记录尚未保存`}
                </p>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {isSaved
                ? '记录已成功保存，您可以安全关闭。'
                : '您可以选择保存这些记录到知识库，或者放弃更改。'}
            </p>

            <div className="flex justify-end space-x-3">
              {!isSaved && (
                <button
                  onClick={handleDiscardAndClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  不保存
                </button>
              )}
              <button
                type="button"
                onClick={handleCancelImport}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isSaved ? '关闭' : '继续编辑'}
              </button>
              <button
                type="button"
                onClick={isSaved ? handleCancelImport : handleConfirmImport}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSaved ? '关闭' : '保存并关闭'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ImportModal;