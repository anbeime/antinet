import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  FileText,
  Upload,
  BarChart3,
  CheckCircle,
  Loader,
  FileDown,
  Layers,
  Scissors,
  Combine,
  FileType,
  FileSpreadsheet,
  Download,
  X,
  AlertCircle,
  Image,
  FileImage,
  History,
  Trash2,
  Clock,
  File,
  Save,
  Bookmark,
  BookmarkCheck,
  Eye,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Hash,
  Copy,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import PDFExporter from '@/components/PDFExporter';

interface ProcessingStatus {
  stage: string;
  progress: number;
  message: string;
}

interface AnalysisResult {
  fileName: string;
  pageCount: number;
  wordCount: number;
  extractedText: string;
  summary: string;
  keyPoints: string[];
  tables: any[];
  suggestedCards: string[];
}

interface KnowledgeCard {
  id: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
  title: string;
  content: string;
  address: string;
  createdAt: string;
}

interface ConversionTask {
  id: string;
  file: File;
  fileName: string;
  targetFormat: 'word' | 'excel' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  resultUrl?: string;
  resultBlob?: Blob;
  errorMessage?: string;
  createdAt: Date;
}

interface ConversionRecord {
  id: string;
  fileName: string;
  targetFormat: string;
  status: 'completed' | 'error';
  createdAt: Date;
  fileSize?: number;
}

const API_BASE = getApiBaseUrl() + ''

const PDFAnalysis: React.FC = () => {
  useTheme();
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [generatedCards, setGeneratedCards] = useState<KnowledgeCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [savedCardIds, setSavedCardIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [activeFeature, setActiveFeature] = useState<'extract' | 'generate' | 'merge' | 'split' | 'fromImages' | 'convertWord' | 'convertExcel' | 'pptConvert' | 'history' | 'viewer'>('extract');
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [convertedPdfUrl, setConvertedPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 格式转换相关状态
  const [conversionTasks, setConversionTasks] = useState<ConversionTask[]>([]);
  const [conversionRecords, setConversionRecords] = useState<ConversionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('antinet_conversion_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) }));
      }
    } catch (e) { /* ignore */ }
    return [];
  });
  const conversionFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (activeFeature === 'merge') {
      const validFiles = files.filter(f => f.type === 'application/pdf');
      if (validFiles.length !== files.length) {
        toast.error('请选择 PDF 文件');
        return;
      }
      setUploadedFiles(validFiles);
      toast.success(`已选择 ${validFiles.length} 个 PDF 文件`);
    } else if (activeFeature === 'fromImages') {
      const validFiles = files.filter(f => f.type.startsWith('image/'));
      if (validFiles.length !== files.length) {
        toast.error('请选择有效的图片文件（JPG/PNG/BMP/TIFF）');
        return;
      }
      setUploadedFiles(validFiles);
      toast.success(`已选择 ${validFiles.length} 张图片`);
    } else {
      const file = files[0];
      if (file && file.type === 'application/pdf') {
        setUploadedFile(file);
        setAnalysisResult(null);
        setEditedText('');
        setGeneratedCards([]);
        setSelectedCards(new Set());
        setSavedCardIds(new Set());
      } else {
        toast.error('请选择 PDF 文件');
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtractText = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'upload', progress: 0, message: '正在上传文件...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      setProcessingStatus({ stage: 'extract', progress: 30, message: '正在提取文本...' });
      
      const response = await fetch(`${API_BASE}/api/pdf/extract/text`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('提取失败');
      }

      const result = await response.json();
      
      setAnalysisResult({
        fileName: uploadedFile.name,
        pageCount: result.pages || 1,
        wordCount: result.full_text?.split(/\s+/).length || 0,
        extractedText: result.full_text || '',
        summary: result.summary || '',
        keyPoints: result.key_points || [],
        tables: result.tables || [],
        suggestedCards: result.suggested_cards || []
      });
      setEditedText(result.full_text || '');

      setProcessingStatus({ stage: 'complete', progress: 100, message: '处理完成' });
      toast.success('文本提取成功！');
    } catch (error) {
      console.error('提取失败:', error);
      toast.error('文本提取失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '处理失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractKnowledge = async (useAI: boolean = false) => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'upload', progress: 0, message: '正在上传文件...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      setProcessingStatus({ stage: 'analyze', progress: 30, message: useAI ? '正在AI智能分析...' : '正在分析文档...' });
      
      // 优先尝试智能 AI 卡片生成，如果失败则回退到规则生成
      let response;
      if (useAI) {
        try {
          response = await fetch(`${API_BASE}/api/pdf/generate/ai-cards`, {
            method: 'POST',
            body: formData
          });
        } catch (e) {
          console.warn('AI卡片生成失败，回退到规则生成:', e);
          response = await fetch(`${API_BASE}/api/pdf/generate/four-color-cards`, {
            method: 'POST',
            body: formData
          });
        }
      } else {
        response = await fetch(`${API_BASE}/api/pdf/generate/four-color-cards`, {
          method: 'POST',
          body: formData
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '知识提取失败');
      }

      const result = await response.json();
      
      setProcessingStatus({ stage: 'generate', progress: 70, message: '正在生成知识卡片...' });

      const cardsData = result.cards || [];
      const cards: KnowledgeCard[] = cardsData.map((card: any, index: number) => {
        const safeCard = {
          id: String(card?.id || `card-${Date.now()}-${index}`),
          type: String(card?.type || 'fact'),
          title: String(card?.title || '无标题'),
          content: String(card?.content || '无内容'),
        };

        return {
          id: safeCard.id,
          color: (safeCard.type === 'fact' ? 'blue' : 
                  safeCard.type === 'explanation' ? 'green' : 
                  safeCard.type === 'risk' ? 'yellow' : 'red') as 'blue' | 'green' | 'yellow' | 'red',
          title: safeCard.title,
          content: safeCard.content,
          address: `PDF/${result.filename || 'unknown'}/Card-${index + 1}`,
          createdAt: new Date().toISOString(),
        };
      });

      setGeneratedCards(cards);
      setSelectedCards(new Set());
      setSavedCardIds(new Set());
      setProcessingStatus({ stage: 'complete', progress: 100, message: '知识卡片生成完成' });
      toast.success(`成功生成 ${cards.length} 张知识卡片！${result.mode ? ` (${result.mode})` : ''}`);
    } catch (error) {
      console.error('知识提取失败:', error);
      toast.error('知识提取失败，请检查后端服务');
      setProcessingStatus({ stage: 'error', progress: 0, message: '处理失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 保存卡片到知识卡片系统
  const saveCardsToSystem = async (cardsToSave: KnowledgeCard[]) => {
    if (cardsToSave.length === 0) {
      toast.warning('请选择要保存的卡片');
      return;
    }

    setIsSaving(true);
    let savedCount = 0;
    let errorCount = 0;

    const categoryMap: Record<string, string> = {
      blue: '事实', green: '解释', yellow: '风险', red: '行动'
    };

    for (const card of cardsToSave) {
      try {
        const response = await fetch(`${API_BASE}/api/knowledge/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: card.color,
            title: card.title,
            content: card.content,
            category: categoryMap[card.color] || '事实',
            address: card.address || undefined,
          })
        });

        if (response.ok) {
          savedCount++;
          setSavedCardIds(prev => new Set(prev).add(card.id));
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setIsSaving(false);

    if (savedCount > 0) {
      toast.success(`成功保存 ${savedCount} 张卡片到知识卡片库！`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} 张卡片保存失败`);
    }
  };

  // 保存全部卡片
  const saveAllCards = () => {
    const unsavedCards = generatedCards.filter(c => !savedCardIds.has(c.id));
    if (unsavedCards.length === 0) {
      toast.info('所有卡片已保存');
      return;
    }
    saveCardsToSystem(unsavedCards);
  };

  // 保存选中的卡片
  const saveSelectedCards = () => {
    const cardsToSave = generatedCards.filter(c => selectedCards.has(c.id) && !savedCardIds.has(c.id));
    if (cardsToSave.length === 0) {
      toast.info('没有新的卡片需要保存');
      return;
    }
    saveCardsToSystem(cardsToSave);
  };

  // 切换卡片选择
  const toggleCardSelection = (cardId: string) => {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedCards(newSelection);
  };

  // 全选/取消全选
  const toggleSelectAllCards = () => {
    if (selectedCards.size === generatedCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(generatedCards.map(c => c.id)));
    }
  };

  // PDF 合并
  const handleMergePDF = async () => {
    if (uploadedFiles.length < 2) {
      toast.error('请至少上传2个 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'merge', progress: 30, message: '正在合并 PDF...' });

    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE}/api/pdf/toolkit/merge`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`合并失败: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '合并完成' });
      toast.success('PDF 合并成功！', {
        action: {
          label: '在线查看',
          onClick: () => navigate('/pdf-viewer')
        }
      });
    } catch (error) {
      console.error('合并失败:', error);
      toast.error('PDF 合并失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '合并失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // PDF 拆分
  const handleSplitPDF = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'split', progress: 30, message: '正在拆分 PDF...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch(`${API_BASE}/api/pdf/toolkit/split`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`拆分失败: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'split_pdfs.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '拆分完成' });
      toast.success('PDF 拆分成功！', {
        action: {
          label: '在线查看',
          onClick: () => navigate('/pdf-viewer')
        }
      });
    } catch (error) {
      console.error('拆分失败:', error);
      toast.error('PDF 拆分失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '拆分失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 图片转 PDF
  const handleImagesToPDF = async () => {
    if (uploadedFiles.length < 1) {
      toast.error('请至少上传1张图片');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'convert', progress: 30, message: '正在合并为 PDF...' });

    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE}/api/pdf/toolkit/images-to-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`合并失败: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'images.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '合并完成' });
      toast.success('图片转 PDF 成功！', {
        action: {
          label: '在线查看',
          onClick: () => navigate('/pdf-viewer')
        }
      });
    } catch (error) {
      console.error('合并失败:', error);
      toast.error('图片转 PDF 失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '合并失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ============ 格式转换功能（内嵌） ============

  const handleConversionFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) {
      toast.error('请选择 PDF 文件');
      return;
    }

    const targetFormat = activeFeature === 'convertWord' ? 'word' : 'excel';

    const newTasks: ConversionTask[] = validFiles.map(file => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      fileName: file.name,
      targetFormat: targetFormat as 'word' | 'excel',
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    }));

    setConversionTasks(prev => [...prev, ...newTasks]);
    toast.success(`已添加 ${newTasks.length} 个文件到转换队列`);

    newTasks.forEach((task, index) => {
      setTimeout(() => startConversion(task), index * 500);
    });
  };

  const startConversion = async (task: ConversionTask) => {
    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: 'processing', progress: 10 } : t
    ));

    try {
      const formData = new FormData();
      formData.append('file', task.file);

      if (task.targetFormat === 'word') {
        await convertToWord(task, formData);
      } else if (task.targetFormat === 'excel') {
        await convertToExcel(task, formData);
      }
    } catch (error) {
      console.error('转换失败:', error);
      setConversionTasks(prev => prev.map(t =>
        t.id === task.id ? {
          ...t,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : '转换失败'
        } : t
      ));
      addConversionRecord(task.fileName, task.targetFormat, 'error', task.file.size);
      toast.error(`${task.fileName} 转换失败`);
    }
  };

  const convertToWord = async (task: ConversionTask, formData: FormData) => {
    // 第一步：上传PDF生成四色卡片
    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    const analyzeResponse = await fetch(`${API_BASE}/api/pdf/generate/four-color-cards`, {
      method: 'POST',
      body: formData
    });

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || 'PDF 分析失败');
    }

    const analysisData = await analyzeResponse.json();

    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, progress: 60 } : t
    ));

    // 第二步：将卡片导出为Word
    const wordFormData = new FormData();
    wordFormData.append('cards_data', JSON.stringify({
        cards: analysisData.cards || [],
        title: `${task.fileName.replace('.pdf', '')}_分析报告`,
        author: 'Antinet 智能知识管家'
    }));
    
    const wordResponse = await fetch(`${API_BASE}/api/pdf/export/cards-docx`, {
      method: 'POST',
      body: wordFormData
    });

    if (!wordResponse.ok) {
      const errorData = await wordResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Word 导出失败');
    }

    const blob = await wordResponse.blob();
    const url = window.URL.createObjectURL(blob);

    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? {
        ...t,
        status: 'completed',
        progress: 100,
        resultUrl: url,
        resultBlob: blob
      } : t
    ));

    addConversionRecord(task.fileName, 'word', 'completed', task.file.size);
    toast.success(`${task.fileName} 转换为 Word 成功！`);
  };

  const convertToExcel = async (task: ConversionTask, formData: FormData) => {
    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, progress: 30 } : t
    ));

    const excelFormData = new FormData();
    excelFormData.append('cards_data', JSON.stringify(analysisData.cards || []));
    
    const response = await fetch(`${API_BASE}/api/pdf/export/four-color-excel`, {
      method: 'POST',
      body: excelFormData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Excel 导出失败');
    }

    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, progress: 80 } : t
    ));

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? {
        ...t,
        status: 'completed',
        progress: 100,
        resultUrl: url,
        resultBlob: blob
      } : t
    ));

    addConversionRecord(task.fileName, 'excel', 'completed', task.file.size);
    toast.success(`${task.fileName} 转换为 Excel 成功！`);
  };

  const addConversionRecord = (fileName: string, targetFormat: string, status: 'completed' | 'error', fileSize?: number) => {
    const record: ConversionRecord = {
      id: `record-${Date.now()}`,
      fileName,
      targetFormat,
      status,
      createdAt: new Date(),
      fileSize,
    };
    setConversionRecords(prev => {
      const next = [record, ...prev];
      try { localStorage.setItem('antinet_conversion_records', JSON.stringify(next)); } catch (e) { /* ignore */ }
      return next;
    });
  };

  const handleDownloadResult = (task: ConversionTask) => {
    if (task.resultUrl) {
      const a = document.createElement('a');
      a.href = task.resultUrl;
      const ext = task.targetFormat === 'word' ? '.docx' : task.targetFormat === 'excel' ? '.xlsx' : '.pdf';
      a.download = task.fileName.replace('.pdf', ext);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const removeConversionTask = (taskId: string) => {
    setConversionTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const clearConversionRecords = () => {
    setConversionRecords([]);
    try { localStorage.removeItem('antinet_conversion_records'); } catch (e) { /* ignore */ }
    toast.success('转换记录已清空');
  };

  // ============ 卡片颜色映射 ============
  const cardColors = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-800', label: '事实' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 text-green-800', label: '解释' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-100 text-yellow-800', label: '风险' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-100 text-red-800', label: '行动' },
  };

  // ============ 功能标签页配置 ============
  const features = [
    {
      id: 'extract' as const,
      name: '文本提取',
      icon: <FileText size={20} />,
      description: '提取 PDF 文本内容',
      color: 'from-blue-500 to-cyan-500',
      inactiveBg: 'bg-blue-50 dark:bg-blue-900/20',
      inactiveBorder: 'border-blue-200 dark:border-blue-800',
      inactiveText: 'text-blue-600 dark:text-blue-400',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
    },
    {
      id: 'generate' as const,
      name: '知识卡片',
      icon: <Layers size={20} />,
      description: '生成四色知识卡片',
      color: 'from-purple-500 to-pink-500',
      inactiveBg: 'bg-purple-50 dark:bg-purple-900/20',
      inactiveBorder: 'border-purple-200 dark:border-purple-800',
      inactiveText: 'text-purple-600 dark:text-purple-400',
      hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
    },
    {
      id: 'merge' as const,
      name: 'PDF合并',
      icon: <Combine size={20} />,
      description: '合并多个 PDF',
      color: 'from-green-500 to-emerald-500',
      inactiveBg: 'bg-green-50 dark:bg-green-900/20',
      inactiveBorder: 'border-green-200 dark:border-green-800',
      inactiveText: 'text-green-600 dark:text-green-400',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/30',
    },
    {
      id: 'split' as const,
      name: 'PDF拆分',
      icon: <Scissors size={20} />,
      description: '拆分 PDF 页面',
      color: 'from-orange-500 to-red-500',
      inactiveBg: 'bg-orange-50 dark:bg-orange-900/20',
      inactiveBorder: 'border-orange-200 dark:border-orange-800',
      inactiveText: 'text-orange-600 dark:text-orange-400',
      hoverBg: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
    },
    {
      id: 'fromImages' as const,
      name: '图片转PDF',
      icon: <FileImage size={20} />,
      description: '将图片合并为 PDF',
      color: 'from-teal-500 to-cyan-500',
      inactiveBg: 'bg-teal-50 dark:bg-teal-900/20',
      inactiveBorder: 'border-teal-200 dark:border-teal-800',
      inactiveText: 'text-teal-600 dark:text-teal-400',
      hoverBg: 'hover:bg-teal-100 dark:hover:bg-teal-900/30',
    },
    {
      id: 'convertWord' as const,
      name: '转Word',
      icon: <FileType size={20} />,
      description: 'PDF 转 Word 文档',
      color: 'from-blue-600 to-indigo-500',
      inactiveBg: 'bg-indigo-50 dark:bg-indigo-900/20',
      inactiveBorder: 'border-indigo-200 dark:border-indigo-800',
      inactiveText: 'text-indigo-600 dark:text-indigo-400',
      hoverBg: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
    },
    {
      id: 'convertExcel' as const,
      name: '转Excel',
      icon: <FileSpreadsheet size={20} />,
      description: 'PDF 转 Excel 表格',
      color: 'from-green-600 to-emerald-500',
      inactiveBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      inactiveBorder: 'border-emerald-200 dark:border-emerald-800',
      inactiveText: 'text-emerald-600 dark:text-emerald-400',
      hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
    },
    {
      id: 'pptConvert' as const,
      name: 'PPT转PDF',
      icon: <FileDown size={20} />,
      description: 'PPT 转换为 PDF',
      color: 'from-purple-500 to-pink-500',
      inactiveBg: 'bg-purple-50 dark:bg-purple-900/20',
      inactiveBorder: 'border-purple-200 dark:border-purple-800',
      inactiveText: 'text-purple-600 dark:text-purple-400',
      hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
    },
    {
      id: 'history' as const,
      name: '转换记录',
      icon: <History size={20} />,
      description: '查看转换历史',
      color: 'from-gray-500 to-slate-500',
      inactiveBg: 'bg-slate-50 dark:bg-slate-900/20',
      inactiveBorder: 'border-slate-200 dark:border-slate-700',
      inactiveText: 'text-slate-600 dark:text-slate-400',
      hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800/30',
    },
    {
      id: 'viewer' as const,
      name: 'PDF查看器',
      icon: <Eye size={20} />,
      description: '在线查看PDF文档',
      color: 'from-red-500 to-pink-500',
      inactiveBg: 'bg-red-50 dark:bg-red-900/20',
      inactiveBorder: 'border-red-200 dark:border-red-700',
      inactiveText: 'text-red-600 dark:text-red-400',
      hoverBg: 'hover:bg-red-100 dark:hover:bg-red-900/30',
    },
  ];

  // ============ 渲染格式转换面板 ============
  const renderConversionPanel = () => {
    const isWord = activeFeature === 'convertWord';
    const formatLabel = isWord ? 'Word' : 'Excel';
    const formatColor = isWord ? 'blue' : 'green';
    const formatIcon = isWord ? <FileType className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />;

    return (
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold flex items-center">
              {formatIcon}
              <span className="ml-2">PDF 转 {formatLabel}</span>
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${isWord ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
              {isWord ? '.docx' : '.xlsx'}
            </span>
          </div>

          {/* 上传区域 */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isWord
                ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50/50 dark:border-blue-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/10'
                : 'border-green-300 hover:border-green-500 hover:bg-green-50/50 dark:border-green-700 dark:hover:border-green-500 dark:hover:bg-green-900/10'
            }`}
            onClick={() => conversionFileInputRef.current?.click()}
          >
            <input
              ref={conversionFileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleConversionFileUpload}
              className="hidden"
            />
            <Upload className={`w-12 h-12 mx-auto mb-3 ${isWord ? 'text-blue-400' : 'text-green-400'}`} />
            <p className="text-lg font-medium mb-1">点击选择 PDF 文件</p>
            <p className="text-sm text-gray-500">支持批量上传，自动开始转换</p>
          </div>

          {/* 转换任务列表 */}
          {conversionTasks.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">转换任务</h4>
              {conversionTasks.filter(t => t.targetFormat === (isWord ? 'word' : 'excel')).map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <File className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{task.fileName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {task.status === 'processing' && (
                        <Loader className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      {task.status === 'completed' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <button
                            onClick={() => handleDownloadResult(task)}
                            className="text-blue-500 hover:text-blue-600 p-1"
                            title="下载"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {task.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <button
                        onClick={() => removeConversionTask(task.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="移除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {task.status === 'processing' && (
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${isWord ? 'bg-blue-500' : 'bg-green-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                  {task.status === 'error' && (
                    <p className="text-xs text-red-500 mt-1">{task.errorMessage || '转换失败'}</p>
                  )}
                  {task.status === 'completed' && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">转换完成，点击下载按钮保存文件</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ 渲染 PPT 转 PDF 面板 ============
  const renderPPTConvertPanel = () => {
    return (
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold flex items-center">
              <FileDown className="w-5 h-5 mr-2 text-purple-500" />
              PPT 转 PDF
            </h3>
          </div>

          <div className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl p-8 text-center hover:border-purple-500 transition-colors">
            <input
              type="file"
              accept=".pptx,.ppt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPptFile(file);
                }
              }}
              className="hidden"
              id="ppt-file-upload-main"
            />
            <label htmlFor="ppt-file-upload-main" className="cursor-pointer">
              {pptFile ? (
                <div className="flex flex-col items-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                  <p className="text-sm font-medium">{pptFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">点击更换文件</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FileDown className="w-10 h-10 text-purple-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">点击选择 PPT 文件</p>
                  <p className="text-xs text-gray-400 mt-1">支持 .pptx 格式</p>
                </div>
              )}
            </label>
          </div>

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            💡 需要安装 <a href="https://www.libreoffice.org/download/download/" target="_blank" className="text-purple-500 hover:underline">LibreOffice</a>
          </p>

          <button
            onClick={async () => {
              if (!pptFile) {
                toast.error('请先选择 PPT 文件');
                return;
              }
              setIsProcessing(true);
              try {
                const formData = new FormData();
                formData.append('file', pptFile);
                
                const response = await fetch(`${API_BASE}/api/ppt/convert/to-pdf`, {
                  method: 'POST',
                  body: formData
                });
                
                if (response.ok) {
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  setConvertedPdfUrl(url);
                  
                  // 下载
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = pptFile.name.replace(/\.(pptx?)$/, '.pdf');
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  
                  toast.success('PDF 转换成功！', {
                    action: {
                      label: '在线查看',
                      onClick: () => window.open('/pdf-viewer?url=' + encodeURIComponent(url), '_blank')
                    }
                  });
                } else {
                  const error = await response.json();
                  toast.error(`转换失败: ${error.detail || '未知错误'}`);
                }
              } catch (error) {
                console.error('转换失败:', error);
                toast.error('转换失败，请安装 LibreOffice');
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={!pptFile || isProcessing}
            className="w-full mt-6 flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span>{isProcessing ? '转换中...' : '转换为 PDF'}</span>
          </button>

          {/* 预览已转换的 PDF */}
          {convertedPdfUrl && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">PDF 预览</h4>
              <iframe
                src={convertedPdfUrl}
                className="w-full h-96 border border-gray-300 dark:border-gray-600 rounded-lg"
                title="PDF Preview"
              />
              <button
                onClick={() => window.open('/pdf-viewer?url=' + encodeURIComponent(convertedPdfUrl), '_blank')}
                className="mt-2 w-full py-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                在新窗口打开 →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ 渲染转换记录面板 ============
  const renderHistoryPanel = () => {
    return (
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold flex items-center">
              <History className="w-5 h-5 mr-2 text-gray-500" />
              转换记录
            </h3>
            {conversionRecords.length > 0 && (
              <button
                onClick={clearConversionRecords}
                className="text-sm text-red-500 hover:text-red-600 flex items-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>清空记录</span>
              </button>
            )}
          </div>

          {conversionRecords.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h4 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">暂无转换记录</h4>
              <p className="text-sm text-gray-400 dark:text-gray-500">使用"转Word"或"转Excel"功能后，记录将显示在这里</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversionRecords.map(record => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center space-x-3">
                    {record.targetFormat === 'word' ? (
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <FileType className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[250px]">{record.fileName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        转换为 {record.targetFormat === 'word' ? 'Word' : 'Excel'} · {record.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    {record.status === 'completed' ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">成功</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">失败</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">PDF 智能分析</h1>
                <p className="text-gray-600 dark:text-gray-400">提取、分析、转换 PDF 文档</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Tabs */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          {features.map((feature) => (
            <motion.button
              key={feature.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveFeature(feature.id);
                setUploadedFile(null);
                setUploadedFiles([]);
                setAnalysisResult(null);
                setEditedText('');
                setGeneratedCards([]);
                setSelectedCards(new Set());
                setSavedCardIds(new Set());
                setProcessingStatus(null);
              }}
              className={`p-3 rounded-xl text-center transition-all border ${
                activeFeature === feature.id
                  ? `bg-gradient-to-r ${feature.color} text-white shadow-lg border-transparent`
                  : `${feature.inactiveBg} ${feature.inactiveText} ${feature.inactiveBorder} ${feature.hoverBg}`
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                {feature.icon}
                <span className="text-xs font-medium">{feature.name}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* 所有功能统一使用左右布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Upload & Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-blue-500" />
                {activeFeature === 'history' ? '转换记录' : '上传文件'}
              </h3>

              {activeFeature === 'history' ? (
                /* 转换记录 - 左侧显示统计 */
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{conversionRecords.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">总转换次数</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{conversionRecords.filter(r => r.status === 'completed').length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">成功</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{conversionRecords.filter(r => r.status === 'error').length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">失败</p>
                  </div>
                  {conversionRecords.length > 0 && (
                    <button
                      onClick={clearConversionRecords}
                      className="w-full py-3 bg-gradient-to-r from-gray-500 to-slate-500 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      清空记录
                    </button>
                  )}
                </div>
              ) : (
                /* 其他功能 - 文件上传 */
                <>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={activeFeature === 'fromImages' ? 'image/*' : '.pdf'}
                      multiple={activeFeature === 'merge' || activeFeature === 'fromImages' || activeFeature === 'convertWord' || activeFeature === 'convertExcel'}
                      onChange={(e) => {
                        if (activeFeature === 'convertWord' || activeFeature === 'convertExcel') {
                          handleConversionFileUpload(e);
                        } else {
                          handleFileUpload(e);
                        }
                        // 重置input value，确保同一文件可以再次选择
                        if (e.target) e.target.value = '';
                      }}
                      className="hidden"
                      id="pdf-upload"
                    />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    {(activeFeature === 'convertWord' || activeFeature === 'convertExcel') ? (
                      <div className="flex flex-col items-center">
                        {activeFeature === 'convertWord' ? <FileType className="w-10 h-10 text-blue-400 mb-2" /> : <FileSpreadsheet className="w-10 h-10 text-green-400 mb-2" />}
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          点击选择 PDF 文件，自动转换为 {activeFeature === 'convertWord' ? 'Word' : 'Excel'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">支持批量上传</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                        <p className="text-sm font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">点击更换文件</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        {activeFeature === 'fromImages' ? <Image className="w-10 h-10 text-gray-400 mb-2" /> : <FileText className="w-10 h-10 text-gray-400 mb-2" />}
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {activeFeature === 'fromImages' ? '点击选择图片' : '点击选择 PDF 文件'}
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                {/* File List for Merge/ImagesToPDF */}
                {(activeFeature === 'merge' || activeFeature === 'fromImages') && uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">已选择的文件：</p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm">
                        <span className="truncate flex-1">{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="ml-2 text-red-500 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 mt-6">
                  {activeFeature === 'extract' && (
                    <button
                      onClick={handleExtractText}
                      disabled={!uploadedFile || isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
                      提取文本
                    </button>
                  )}

                  {activeFeature === 'generate' && (
                    <button
                      onClick={() => handleExtractKnowledge(false)}
                      disabled={!uploadedFile || isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <Layers className="w-5 h-5 mr-2" />}
                      生成知识卡片
                    </button>
                  )}

                  {activeFeature === 'merge' && (
                    <button
                      onClick={handleMergePDF}
                      disabled={uploadedFiles.length < 2 || isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <Combine className="w-5 h-5 mr-2" />}
                      合并 PDF
                    </button>
                  )}

                  {activeFeature === 'split' && (
                    <button
                      onClick={handleSplitPDF}
                      disabled={!uploadedFile || isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <Scissors className="w-5 h-5 mr-2" />}
                      拆分 PDF
                    </button>
                  )}

                  {activeFeature === 'fromImages' && (
                    <button
                      onClick={handleImagesToPDF}
                      disabled={uploadedFiles.length < 1 || isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <FileImage className="w-5 h-5 mr-2" />}
                      合并为 PDF
                    </button>
                  )}

                  {activeFeature === 'pptConvert' && (
                    <button
                      onClick={async () => {
                        if (!pptFile) {
                          toast.error('请先选择 PPT 文件');
                          return;
                        }
                        setIsProcessing(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', pptFile);
                          
                          const response = await fetch(`${API_BASE}/api/ppt/convert/to-pdf`, {
                            method: 'POST',
                            body: formData
                          });
                          
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = pptFile.name.replace(/\.(pptx?)$/, '.pdf');
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            toast.success('PDF 转换成功！');
                          } else {
                            const error = await response.json();
                            toast.error(`转换失败: ${error.detail || '未知错误'}`);
                          }
                        } catch (error) {
                          console.error('转换失败:', error);
                          toast.error('转换失败，请安装 LibreOffice');
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={!pptFile || isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <FileDown className="w-5 h-5 mr-2" />}
                      转换为 PDF
                    </button>
                  )}

                  {/* 转Word/Excel - 显示当前任务数 */}
                  {(activeFeature === 'convertWord' || activeFeature === 'convertExcel') && (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                      {conversionTasks.filter(t => t.targetFormat === (activeFeature === 'convertWord' ? 'word' : 'excel')).length > 0 ? (
                        <p>已添加 {conversionTasks.filter(t => t.targetFormat === (activeFeature === 'convertWord' ? 'word' : 'excel')).length} 个转换任务，查看右侧面板</p>
                      ) : (
                        <p>选择文件后自动开始转换</p>
                      )}
                    </div>
                  )}
                </div>
                </>
              )}

                {/* Processing Status */}
                {processingStatus && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{processingStatus.message}</span>
                      <span className="font-medium">{processingStatus.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${processingStatus.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Panel - Results */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              {/* Text Extraction Result */}
              {activeFeature === 'extract' && analysisResult && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                    文本提取结果
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{analysisResult.pageCount}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">页数</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{analysisResult.wordCount}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">字数</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">{analysisResult.tables?.length || 0}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">表格</p>
                    </div>
                  </div>

                  {/* PDF Preview Section */}
                  {uploadedFile && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF 预览</h4>
                        <button
                          onClick={() => setActiveFeature('viewer')}
                          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
                        >
                          全屏查看 →
                        </button>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden h-64 bg-gray-100 dark:bg-gray-700">
                        <PDFViewerInternal externalFile={uploadedFile} />
                      </div>
                    </div>
                  )}

                  {/* Editable Text Section */}
                  {analysisResult.extractedText && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">提取文本 (可编辑)</h4>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(editedText);
                            toast.success('已复制到剪贴板');
                          }}
                          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>复制</span>
                        </button>
                      </div>
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="提取的文本将显示在这里，您可以编辑修改..."
                      />
                      <div className="mt-2 flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            const blob = new Blob([editedText], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = uploadedFile?.name?.replace('.pdf', '_edited.txt') || 'edited.txt';
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success('已导出TXT文件');
                          }}
                          className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          导出TXT
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([editedText], { type: 'text/markdown;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = uploadedFile?.name?.replace('.pdf', '_edited.md') || 'edited.md';
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success('已导出Markdown');
                          }}
                          className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          导出MD
                        </button>
                        <button
                          onClick={() => {
                            toast.success('文本已保存');
                          }}
                          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Knowledge Cards Result */}
              {activeFeature === 'generate' && generatedCards.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold flex items-center">
                      <Layers className="w-5 h-5 mr-2 text-purple-500" />
                      知识卡片 ({generatedCards.length})
                    </h3>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-500">已选: {selectedCards.size}/{generatedCards.length}</span>
                      <button
                        onClick={toggleSelectAllCards}
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 text-sm hover:underline"
                      >
                        {selectedCards.size === generatedCards.length ? '取消全选' : '全选'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedCards.map((card) => {
                      const colors = cardColors[card.color];
                      const isSelected = selectedCards.has(card.id);
                      const isSaved = savedCardIds.has(card.id);
                      return (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`${colors.bg} ${colors.border} border-2 rounded-xl p-4 transition-all cursor-pointer ${
                            isSelected ? 'ring-2 ring-purple-500 shadow-md' : ''
                          } ${isSaved ? 'opacity-70' : ''}`}
                          onClick={() => toggleCardSelection(card.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCardSelection(card.id)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                                {colors.label}
                              </span>
                            </div>
                            {isSaved && (
                              <span className="flex items-center text-xs text-green-600 dark:text-green-400">
                                <BookmarkCheck className="w-3.5 h-3.5 mr-1" />
                                已保存
                              </span>
                            )}
                            {!isSaved && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveCardsToSystem([card]);
                                }}
                                disabled={isSaving}
                                className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 flex items-center space-x-1 hover:underline"
                                title="保存此卡片到知识卡片库"
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                                <span>保存</span>
                              </button>
                            )}
                          </div>
                          <h4 className={`font-semibold mb-2 ${colors.text}`}>{card.title}</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4">{card.content}</p>
                          <p className="text-xs text-gray-400 mt-2">{card.address}</p>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {/* 保存全部到卡片库 */}
                    <button
                      onClick={saveAllCards}
                      disabled={isSaving || savedCardIds.size === generatedCards.length}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md font-medium"
                    >
                      {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{isSaving ? '保存中...' : savedCardIds.size === generatedCards.length ? '全部已保存' : '全部保存到卡片库'}</span>
                    </button>

                    {/* 保存选中卡片 */}
                    {selectedCards.size > 0 && (
                      <button
                        onClick={saveSelectedCards}
                        disabled={isSaving}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md font-medium"
                      >
                        {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                        <span>保存选中 {selectedCards.size} 张卡片</span>
                      </button>
                    )}

                    {/* 导出为PDF */}
                    <PDFExporter
                      cards={generatedCards}
                      title="Antinet 知识卡片导出"
                      author="Antinet 智能知识管家"
                      fileName={`antinet-cards-${Date.now()}.pdf`}
                    >
                      <FileDown className="w-4 h-4 mr-2 inline" />
                      导出为 PDF
                    </PDFExporter>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isProcessing && !analysisResult && generatedCards.length === 0 && activeFeature !== 'convertWord' && activeFeature !== 'convertExcel' && activeFeature !== 'history' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                  {activeFeature === 'merge' ? (
                    <>
                      <Combine className="w-16 h-16 mx-auto text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">PDF 合并</h3>
                      <p className="text-gray-600 dark:text-gray-400">选择多个 PDF 文件进行合并</p>
                    </>
                  ) : activeFeature === 'split' ? (
                    <>
                      <Scissors className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">PDF 拆分</h3>
                      <p className="text-gray-600 dark:text-gray-400">将 PDF 拆分为多个单页文件</p>
                    </>
                  ) : activeFeature === 'fromImages' ? (
                    <>
                      <FileImage className="w-16 h-16 mx-auto text-teal-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">图片转 PDF</h3>
                      <p className="text-gray-600 dark:text-gray-400">选择多张图片合并为 PDF</p>
                    </>
                  ) : activeFeature === 'generate' ? (
                    <>
                      <Layers className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">四色知识卡片</h3>
                      <p className="text-gray-600 dark:text-gray-400">上传 PDF 文件，AI 自动生成蓝/绿/黄/红四色知识卡片</p>
                    </>
                  ) : activeFeature === 'pptConvert' ? (
                    <>
                      <FileDown className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">PPT 转 PDF</h3>
                      <p className="text-gray-600 dark:text-gray-400">将 PowerPoint 演示文稿转换为 PDF</p>
                    </>
                  ) : (
                    <>
                      <FileText className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">文本提取</h3>
                      <p className="text-gray-600 dark:text-gray-400">上传 PDF 文件开始提取文本内容</p>
                    </>
                  )}
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                  <Loader className="w-16 h-16 mx-auto text-blue-500 mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">正在处理中...</h3>
                  <p className="text-gray-600 dark:text-gray-400">{processingStatus?.message || '请稍候'}</p>
                </div>
              )}

              {/* 转Word/Excel - 转换任务列表 */}
              {(activeFeature === 'convertWord' || activeFeature === 'convertExcel') && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    {activeFeature === 'convertWord' ? <FileType className="w-5 h-5 mr-2 text-blue-500" /> : <FileSpreadsheet className="w-5 h-5 mr-2 text-green-500" />}
                    转换为 {activeFeature === 'convertWord' ? 'Word' : 'Excel'}
                    <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${activeFeature === 'convertWord' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                      {activeFeature === 'convertWord' ? '.docx' : '.xlsx'}
                    </span>
                  </h3>

                  {conversionTasks.filter(t => t.targetFormat === (activeFeature === 'convertWord' ? 'word' : 'excel')).length > 0 ? (
                    <div className="space-y-3">
                      {conversionTasks.filter(t => t.targetFormat === (activeFeature === 'convertWord' ? 'word' : 'excel')).map(task => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <File className="w-5 h-5 text-gray-400" />
                              <span className="text-sm font-medium truncate max-w-[200px]">{task.fileName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {task.status === 'processing' && (
                                <Loader className="w-4 h-4 animate-spin text-blue-500" />
                              )}
                              {task.status === 'completed' && (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <button
                                    onClick={() => handleDownloadResult(task)}
                                    className="text-blue-500 hover:text-blue-600 p-1"
                                    title="下载"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {task.status === 'error' && (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                              <button
                                onClick={() => removeConversionTask(task.id)}
                                className="text-gray-400 hover:text-red-500 p-1"
                                title="移除"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {task.status === 'processing' && (
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <motion.div
                                className={`h-2 rounded-full ${activeFeature === 'convertWord' ? 'bg-blue-500' : 'bg-green-500'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${task.progress}%` }}
                              />
                            </div>
                          )}
                          {task.status === 'error' && task.errorMessage && (
                            <p className="text-xs text-red-500 mt-1">{task.errorMessage}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      {activeFeature === 'convertWord' ? <FileType className="w-16 h-16 mx-auto text-blue-300 mb-4" /> : <FileSpreadsheet className="w-16 h-16 mx-auto text-green-300 mb-4" />}
                      <p className="text-gray-500 dark:text-gray-400">上传 PDF 文件，自动开始转换为 {activeFeature === 'convertWord' ? 'Word' : 'Excel'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 转换记录 - 右侧显示记录列表 */}
              {activeFeature === 'history' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <History className="w-5 h-5 mr-2 text-gray-500" />
                    转换历史记录
                  </h3>

                  {conversionRecords.length > 0 ? (
                    <div className="space-y-3">
                      {conversionRecords.map(record => (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center space-x-3">
                            {record.targetFormat === 'word' ? (
                              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <FileType className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium truncate max-w-[250px]">{record.fileName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                转换为 {record.targetFormat === 'word' ? 'Word' : 'Excel'} · {record.createdAt.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div>
                            {record.status === 'completed' ? (
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">成功</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">失败</span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">暂无转换记录</p>
                    </div>
                  )}
                </div>
              )}

              {/* PDF查看器面板 */}
              {activeFeature === 'viewer' && (
                <div className="h-full flex flex-col">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700 flex-1">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <Eye className="w-5 h-5 mr-2 text-red-500" />
                      PDF查看器
                    </h3>
                    <div className="flex-1 min-h-[500px]">
                      <PDFViewerInternal externalFile={uploadedFile} />
                    </div>
                  </div>
                </div>
              )}

              {/* PPT 转 PDF 面板 */}
              {activeFeature === 'pptConvert' && renderPPTConvertPanel()}
            </motion.div>
          </div>
      </div>
    </div>
  );
};

const PDFViewerInternal: React.FC<{ externalFile?: File | null }> = ({ externalFile }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    loadPDFJS();
  }, []);

  // 监听外部文件变化并自动加载
  React.useEffect(() => {
    if (!externalFile) return;
    const loadExternalFile = async () => {
      setIsLoading(true);
      setFileName(externalFile.name);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        try {
          const pdfjs = await waitForPdfJs();
          const doc = pdfjs.getDocument({ data });
          const realDoc = doc.promise ? await doc.promise : doc;
          setPdfDoc(realDoc);
          setTotalPages(realDoc.numPages);
          setCurrentPage(1);
        } catch (error) {
          console.error('[PDF] 加载外部PDF失败:', error);
          toast.error('加载PDF预览失败');
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(externalFile);
    };
    loadExternalFile();
  }, [externalFile]);

  React.useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale]);

const loadPDFJS = async () => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (pdfjsLib?.getDocument) return; // 已加载且可用
    const script = document.createElement('script');
    script.src = 'https://cdn.staticfile.org/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs) pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.staticfile.org/pdf.js/3.11.174/pdf.worker.min.js';
    };
    script.onerror = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://cdn.bootcdn.net/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script2.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        if (pdfjs) pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.bootcdn.net/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      document.head.appendChild(script2);
    };
    document.head.appendChild(script);
  };

  const waitForPdfJs = (timeout = 5000) => new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs?.getDocument) { resolve(pdfjs); return; }
      if (Date.now() - start > timeout) { reject(new Error('PDF.js 加载超时')); return; }
      setTimeout(check, 100);
    };
    check();
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.includes('pdf')) {
      toast.error('请选择PDF文件');
      return;
    }
    console.log('[PDF] 上传文件:', file.name, file.size, 'bytes');
    setIsLoading(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      console.log('[PDF] FileReader loaded, data length:', data.length);
      try {
        const pdfjs = await waitForPdfJs();
        console.log('[PDF] PDF.js loaded:', !!pdfjs, 'version:', pdfjs?.version);
        const doc = pdfjs.getDocument({ data });
        console.log('[PDF] getDocument returned, type:', typeof doc, 'keys:', Object.keys(doc), 'numPages:', doc.numPages);
        // 如果是 loading task，用 .promise 获取真正文档
        const realDoc = doc.promise ? await doc.promise : doc;
        console.log('[PDF] Final doc, numPages:', realDoc.numPages);
        setPdfDoc(realDoc);
        setTotalPages(realDoc.numPages);
        setCurrentPage(1);
      } catch (error) {
        console.error('[PDF] 加载PDF失败:', error);
        toast.error('加载PDF失败');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderPage = async (pageNum: number) => {
    console.log('[PDF] renderPage called, pdfDoc:', pdfDoc, 'canvas:', !!canvasRef.current);
    if (!pdfDoc || !canvasRef.current) {
      console.log('[PDF] Early return: pdfDoc or canvas missing');
      return;
    }
    console.log('[PDF] pdfDoc keys:', Object.keys(pdfDoc), 'numPages:', pdfDoc.numPages);
    if (typeof pdfDoc.getPage !== 'function') {
      console.log('[PDF] getPage not a function, checking if it exists:', pdfDoc.getPage);
      // 可能 getDocument 返回的是 loading task，需要调用 .promise
      if (pdfDoc.promise) {
        console.log('[PDF] getDocument returned a promise/task, waiting...');
        try {
          const realDoc = await pdfDoc.promise;
          console.log('[PDF] Resolved to real doc, numPages:', realDoc.numPages);
          setPdfDoc(realDoc);
          return;
        } catch (err) {
          console.error('[PDF] Failed to resolve doc promise:', err);
          return;
        }
      }
      return;
    }
    try {
      const page = await pdfDoc.getPage(pageNum);
      console.log('[PDF] Got page, numPages:', pdfDoc.numPages);
      const viewport = page.getViewport({ scale });
      console.log('[PDF] Viewport:', viewport.width, 'x', viewport.height);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      console.log('[PDF] Canvas dims set:', canvas.width, 'x', canvas.height, 'context:', !!context);
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        console.log('[PDF] Render complete');
      }
    } catch (error) {
      console.error('[PDF] 渲染页面失败:', error);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
      <div className="bg-gray-200 dark:bg-gray-800 px-3 py-2 flex items-center justify-between">
        <label className="cursor-pointer flex items-center space-x-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
          <Upload className="w-4 h-4" />
          <span>打开PDF</span>
          <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
        </label>
        {fileName && <span className="text-sm text-gray-600 dark:text-gray-400">{fileName}</span>}
        <div className="flex items-center space-x-2">
          <button onClick={() => setScale(Math.max(scale - 0.25, 0.5))} disabled={scale <= 0.5} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded disabled:opacity-50">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(Math.min(scale + 0.25, 3))} disabled={scale >= 3} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded disabled:opacity-50">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-400 mx-1" />
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="number" min={1} max={totalPages} value={currentPage} onChange={(e) => { const p = parseInt(e.target.value); if (p >= 1 && p <= totalPages) setCurrentPage(p); }} className="w-12 px-1 py-0.5 text-center border rounded text-sm" />
          <span className="text-gray-500 text-sm">/ {totalPages}</span>
          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex justify-center p-2 bg-gray-200 dark:bg-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : pdfDoc ? (
          <div className="bg-white shadow-lg">
            <canvas ref={canvasRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-2" />
              <p className="text-sm">请上传PDF文件</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFAnalysis;
