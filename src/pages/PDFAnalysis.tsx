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
  Hash,
  Copy,
  Presentation,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import PDFExporter from '@/components/PDFExporter';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min?url';

// 配置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

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
  fileDataUrl?: string;
}

interface ConversionRecord {
  id: string;
  fileName: string;
  targetFormat: string;
  status: 'completed' | 'error';
  createdAt: Date;
  fileSize?: number;
  errorMessage?: string;
  fileDataUrl?: string;
}

const API_BASE = () => getApiBaseUrl()

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
  const [activeFeature, setActiveFeature] = useState<'extract' | 'generate' | 'merge' | 'split' | 'fromImages' | 'convertWord' | 'convertExcel' | 'pptConvert' | 'history' | 'ocr'>('extract');
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [convertedPdfUrl, setConvertedPdfUrl] = useState<string | null>(null);
  // 卡片生成模式：'rule'(默认，<1s) / 'auto'(LLM，约 5-30s) / 'multi-agent'(2 阶段 LLM，约 10-60s)
  // 默认持久化为 rule，避免上次误选 LLM 模式后下次仍卡顿
  const [cardGenMode, setCardGenMode] = useState<'auto' | 'rule' | 'multi-agent'>(() => {
    try {
      const saved = localStorage.getItem('pdf-analysis:cardGenMode');
      if (saved === 'auto' || saved === 'rule' || saved === 'multi-agent') return saved;
    } catch {}
    return 'rule';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OCR 识别相关状态
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrPresets] = useState<{ id: string; name: string; description: string }[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  const handleOcrExtract = async () => {
    if (!ocrFile) return;
    setIsOcrProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', ocrFile);
      if (selectedPreset) formData.append('preset', selectedPreset);
      const resp = await fetch(`${API_BASE()}/api/ocr/extract`, { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('OCR 识别失败');
      const data = await resp.json();
      setOcrResult(data.text || JSON.stringify(data, null, 2));
      toast.success('OCR 识别完成');
    } catch (e: any) {
      toast.error(e.message || 'OCR 识别失败');
    } finally {
      setIsOcrProcessing(false);
    }
  };

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

  // ============ Docx 预览状态 ============
  const [showDocxPreview, setShowDocxPreview] = useState(false);
  const [docxPreviewHtml, setDocxPreviewHtml] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');

  const handlePreviewDocx = async (task: ConversionTask) => {
    if (!task.resultUrl) {
      toast.error('文档未准备好，请稍后重试');
      return;
    }
    try {
      const response = await fetch(task.resultUrl);
      const arrayBuffer = await response.arrayBuffer();
      const result = await (window as any).mammoth.convertToHtml({ arrayBuffer });
      setDocxPreviewHtml(result.value);
      setPreviewFileName(task.fileName.replace('.pdf', '.docx'));
      setShowDocxPreview(true);
    } catch (err) {
      console.error('mammoth 转换失败:', err);
      toast.error('Word 文档预览失败');
    }
  };

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

  // 使用 pdf.js 在前端提取 PDF 文本（解决后端正则乱码问题）
  const extractPdfTextLocally = async (file: File): Promise<{ full_text: string; page_count: number }> => {
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
    return { full_text: pages.join('\n\n'), page_count: doc.numPages };
  };

  const handleExtractText = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'extract', progress: 10, message: '正在提取文本...' });

    try {
      // 优先使用前端 pdf.js 提取（更准确的 CJK 支持）
      const { full_text, page_count } = await extractPdfTextLocally(uploadedFile);

      setProcessingStatus({ stage: 'extract', progress: 60, message: '文本提取完成' });
      
      setAnalysisResult({
        fileName: uploadedFile.name,
        pageCount: page_count,
        wordCount: full_text.split(/\s+/).length || 0,
        extractedText: full_text,
        summary: '',
        keyPoints: [],
        tables: [],
        suggestedCards: []
      });
      setEditedText(full_text);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '处理完成' });
      toast.success(`文本提取成功！共 ${page_count} 页`);
    } catch (error) {
      console.error('前端 PDF 提取失败，尝试后端 API:', error);

      // 回退到后端 API
      try {
        const formData = new FormData();
        formData.append('file', uploadedFile);

        setProcessingStatus({ stage: 'extract', progress: 30, message: '正在通过后端提取文本...' });

        const response = await fetch(`${API_BASE()}/api/pdf/extract/text`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('后端提取失败');
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
      } catch (fallbackError) {
        console.error('提取失败:', fallbackError);
        toast.error('文本提取失败');
        setProcessingStatus({ stage: 'error', progress: 0, message: '处理失败' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 通过后端从文本生成四色卡片（不需要后端正则 pypdf）
  const generateCardsFromText = async (text: string, mode: string = 'auto'): Promise<any> => {
    const resp = await fetch(`${API_BASE()}/api/pdf/generate/cards-from-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 50000), max_cards: 20, mode })
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || '卡片生成失败');
    return resp.json();
  };

  const handleExtractKnowledge = async (mode?: string) => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    const genMode = mode || cardGenMode;
    setIsProcessing(true);
    setProcessingStatus({ stage: 'upload', progress: 0, message: '正在上传文件...' });
    if (genMode === 'auto') {
      toast.info('已选择【自动】模式，将调用 LLM（约 5-30s）；如需快速出结果请切换到【规则】', { duration: 4000 });
    } else if (genMode === 'multi-agent') {
      toast.info('已选择【多智能体】模式，将多阶段调用 LLM（约 10-60s）', { duration: 4000 });
    }

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      setProcessingStatus({ stage: 'analyze', progress: 30, message: genMode === 'multi-agent' ? '正在多智能体分析...' : '正在分析文档...' });

      // 先提取文本（用 pdf.js 前端提取，解决乱码）
      let full_text: string;
      let page_count: number;
      try {
        const result = await extractPdfTextLocally(uploadedFile);
        full_text = result.full_text;
        page_count = result.page_count;
      } catch (e) {
        // 回退到后端提取
        const resp = await fetch(`${API_BASE()}/api/pdf/extract/text`, { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('文本提取失败');
        const data = await resp.json();
        full_text = data.full_text || '';
        page_count = data.pages || 1;
      }

      if (!full_text.trim()) {
        throw new Error('未能从 PDF 提取到文本内容');
      }

      // 通过文本端点生成卡片
      const textResult = await generateCardsFromText(full_text, genMode);

      setProcessingStatus({ stage: 'generate', progress: 70, message: '正在生成知识卡片...' });

      const cardsData = textResult.cards || [];
      const cards: KnowledgeCard[] = cardsData.map((card: any, index: number) => ({
        id: String(card?.id || `card-${Date.now()}-${index}`),
        color: (card?.type === 'fact' ? 'blue' : 
                card?.type === 'explanation' ? 'green' : 
                card?.type === 'risk' ? 'yellow' : 'red') as 'blue' | 'green' | 'yellow' | 'red',
        title: String(card?.title || '无标题'),
        content: String(card?.content || '无内容'),
        address: `PDF/${uploadedFile.name}/Card-${index + 1}`,
        createdAt: new Date().toISOString(),
      }));

      setGeneratedCards(cards);
      setSelectedCards(new Set());
      setSavedCardIds(new Set());
      setProcessingStatus({ stage: 'complete', progress: 100, message: '知识卡片生成完成' });
      toast.success(`成功生成 ${cards.length} 张知识卡片（共 ${page_count} 页）${textResult.mode ? `（${textResult.mode}）` : ''}！`);
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
        const response = await fetch(`${API_BASE()}/api/knowledge/cards`, {
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
      const response = await fetch(`${API_BASE()}/api/pdf/toolkit/merge`, {
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
      const response = await fetch(`${API_BASE()}/api/pdf/toolkit/split`, {
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
    formData.append('ocr', String(ocrEnabled));

    try {
      const response = await fetch(`${API_BASE()}/api/pdf/toolkit/images-to-pdf`, {
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
      createdAt: new Date(),
      fileDataUrl: undefined
    }));

    setConversionTasks(prev => [...prev, ...newTasks]);
    toast.success(`已添加 ${newTasks.length} 个文件到转换队列`);

    // 逐个读取文件为 dataUrl 并启动转换
    newTasks.forEach((task, index) => {
      if (task.file.size < 5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (e) => {
          task.fileDataUrl = e.target?.result as string;
        };
        reader.readAsDataURL(task.file);
      }
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
      addConversionRecord(task.fileName, task.targetFormat, 'error', task.file.size, error instanceof Error ? error.message : '转换失败', task.fileDataUrl);
      toast.error(`${task.fileName} 转换失败`);
    }
  };

  const convertToWord = async (task: ConversionTask, formData: FormData) => {
    // 第一步：上传PDF生成四色卡片
    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    const analyzeResponse = await fetch(`${API_BASE()}/api/pdf/generate/four-color-cards`, {
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
    const reportTitle = `${task.fileName.replace('.pdf', '')}_分析报告`;
    const wordFormData = new FormData();
    wordFormData.append('cards_data', JSON.stringify(analysisData.cards || []));
    wordFormData.append('title', reportTitle);
    wordFormData.append('author', 'Antinet 智能知识管家');
    
    const wordResponse = await fetch(`${API_BASE()}/api/pdf/export/cards-docx`, {
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

    addConversionRecord(task.fileName, 'word', 'completed', task.file.size, undefined, task.fileDataUrl);
    toast.success(`${task.fileName} 转换为 Word 成功！`);
  };

  const convertToExcel = async (task: ConversionTask, formData: FormData) => {
    // 第一步：上传PDF生成四色卡片
    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    const analyzeResponse = await fetch(`${API_BASE()}/api/pdf/generate/four-color-cards`, {
      method: 'POST',
      body: formData
    });

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || 'PDF 分析失败');
    }

    const analysisData = await analyzeResponse.json();

    // 第二步：将卡片导出为Excel
    setConversionTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, progress: 30 } : t
    ));

    const excelTitle = `${task.fileName.replace('.pdf', '')}_分析报告`;
    const excelFormData = new FormData();
    excelFormData.append('cards_data', JSON.stringify(analysisData.cards || []));
    excelFormData.append('title', excelTitle);
    
    const response = await fetch(`${API_BASE()}/api/pdf/export/four-color-excel`, {
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

    addConversionRecord(task.fileName, 'excel', 'completed', task.file.size, undefined, task.fileDataUrl);
    toast.success(`${task.fileName} 转换为 Excel 成功！`);
  };

  const addConversionRecord = (fileName: string, targetFormat: string, status: 'completed' | 'error', fileSize?: number, errorMessage?: string, fileDataUrl?: string) => {
    const record: ConversionRecord = {
      id: `record-${Date.now()}`,
      fileName,
      targetFormat,
      status,
      createdAt: new Date(),
      fileSize,
      errorMessage: errorMessage || undefined,
      fileDataUrl,
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
    // merge/split features commented out
    // {
    //   id: 'merge' as const,
    //   name: 'PDF合并',
    //   icon: <Combine size={20} />,
    //   description: '合并多个 PDF',
    //   color: 'from-green-500 to-emerald-500',
    //   inactiveBg: 'bg-green-50 dark:bg-green-900/20',
    //   inactiveBorder: 'border-green-200 dark:border-green-800',
    //   inactiveText: 'text-green-600 dark:text-green-400',
    //   hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/30',
    // },
    // {
    //   id: 'split' as const,
    //   name: 'PDF拆分',
    //   icon: <Scissors size={20} />,
    //   description: '拆分 PDF 页面',
    //   color: 'from-orange-500 to-red-500',
    //   inactiveBg: 'bg-orange-50 dark:bg-orange-900/20',
    //   inactiveBorder: 'border-orange-200 dark:border-orange-800',
    //   inactiveText: 'text-orange-600 dark:text-orange-400',
    //   hoverBg: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
    // },
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
              <span className={`ml-2 w-2 h-2 rounded-full bg-${formatColor}-500`}></span>
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
                          {task.targetFormat === 'word' && (
                            <button
                              onClick={() => handlePreviewDocx(task)}
                              className="text-purple-500 hover:text-purple-600 p-1"
                              title="预览 Word 文档"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
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
              PPT 转 PDF 转换
            </h3>
          </div>
          {convertedPdfUrl ? (
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">PDF 预览</h4>
                <div className="flex items-center gap-2">
                  <a href={convertedPdfUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    <ExternalLink size={14} />
                    新窗口
                  </a>
                  <a href={convertedPdfUrl} download
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    <Download size={14} />
                    下载
                  </a>
                  <button onClick={() => setConvertedPdfUrl(null)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <object data={convertedPdfUrl} type="application/pdf" className="w-full h-[600px] border border-gray-300 dark:border-gray-600 rounded-lg">
                <embed src={convertedPdfUrl} type="application/pdf" className="w-full h-full" />
              </object>
            </div>
          ) : (
            <div className="text-center py-16">
              <FileDown className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h4 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">暂无预览</h4>
              <p className="text-sm text-gray-400 dark:text-gray-500">在左侧选择 PPT 文件并转换为 PDF 后，预览将显示在这里</p>
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
              <p className="text-sm text-gray-400 dark:text-gray-500">使用"转Word"、"转Excel"或"PPT转PDF"功能后，记录将显示在这里</p>
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
                    ) : record.targetFormat === 'pdf' ? (
                      <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <FileDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[250px]">{record.fileName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        转换为 {record.targetFormat === 'word' ? 'Word' : record.targetFormat === 'pdf' ? 'PDF' : 'Excel'} · {record.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.status === 'completed' ? (
                      <>
                        {record.fileDataUrl && (
                            <button
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = record.fileDataUrl!;
                                const ext = record.targetFormat === 'word' ? '.docx' : record.targetFormat === 'excel' ? '.xlsx' : '.pdf';
                                a.download = record.fileName.replace(/\.\w+$/, ext);
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                              className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:underline whitespace-nowrap"
                              title="下载文件"
                            >
                              <Download className="w-3 h-3 inline mr-0.5" />
                              下载
                            </button>
                        )}
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">成功</span>
                      </>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-help" title={record.errorMessage || '失败'}>
                        失败
                      </span>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-6">
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
            <button
              onClick={() => window.open('/pdf-viewer', '_blank')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow hover:shadow-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
              title="在 PDF 查看器中打开（全屏滚动 · 可编辑 · 保存为笔记）"
            >
              <ExternalLink size={16} />
              <span className="text-sm font-medium">PDF 预览</span>
            </button>
          </div>
        </motion.div>

        {/* Feature Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
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
              ) : activeFeature === 'pptConvert' ? (
                /* PPT 转 PDF - 左侧上传 */
                <>
                  <div className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl p-6 text-center hover:border-purple-500 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('ppt-file-upload-main')?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file && (file.name.endsWith('.ppt') || file.name.endsWith('.pptx'))) {
                        setPptFile(file);
                      } else {
                        toast.error('请选择 PPT 文件');
                      }
                    }}
                  >
                    <input type="file" accept=".pptx,.ppt" id="ppt-file-upload-main" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setPptFile(file);
                      }}
                    />
                    {pptFile ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                        <p className="text-sm font-medium">{pptFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">点击更换文件</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Presentation className="w-10 h-10 text-purple-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">点击选择 PPT 文件</p>
                        <p className="text-xs text-gray-400 mt-1">支持 .pptx / .ppt 格式</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 mt-6">
                    <button
                      onClick={async () => {
                        if (!pptFile) { toast.error('请先选择 PPT 文件'); return; }
                        setIsProcessing(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', pptFile);
                          const response = await fetch(`${API_BASE()}/api/ppt/convert/to-pdf`, { method: 'POST', body: formData });
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            setConvertedPdfUrl(url);
                            addConversionRecord(pptFile.name, 'pdf', 'completed', pptFile.size, undefined, url);
                            toast.success('PDF 转换成功！');
                          } else {
                            const error = await response.json();
                            addConversionRecord(pptFile.name, 'pdf', 'error', pptFile.size, error.detail || '未知错误');
                            toast.error(`转换失败: ${error.detail || '未知错误'}`);
                          }
                        } catch { toast.error('转换失败，请安装 LibreOffice'); }
                        finally { setIsProcessing(false); }
                      }}
                      disabled={!pptFile || isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <FileDown className="w-5 h-5 mr-2" />}
                      {isProcessing ? '转换中...' : '转换为 PDF'}
                    </button>
                  </div>
                </>
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
                    {activeFeature === 'fromImages' && (
                      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none pt-1">
                        <input type="checkbox" checked={ocrEnabled} onChange={e => setOcrEnabled(e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600 text-teal-500 focus:ring-teal-400" />
                        <span>启用 OCR 文字识别（提取图片文字，附加到 PDF 末尾）</span>
                      </label>
                    )}
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

                  {activeFeature === 'ocr' && (
                    <div className="space-y-3">
                      <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-teal-400 transition-colors"
                        onClick={() => ocrFileInputRef.current?.click()}
                      >
                        {ocrFile ? (
                          <div className="text-sm">
                            <FileImage className="w-8 h-8 mx-auto text-teal-500 mb-2" />
                            <p className="text-gray-700 dark:text-gray-300 font-medium">{ocrFile.name}</p>
                            <p className="text-gray-500 text-xs mt-1">点击重新选择</p>
                          </div>
                        ) : (
                          <>
                            <FileImage className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500 text-sm">点击选择图片</p>
                          </>
                        )}
                        <input
                          ref={ocrFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => setOcrFile(e.target.files?.[0] || null)}
                        />
                      </div>

                      {ocrPresets.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">识别模板</label>
                          <select
                            value={selectedPreset}
                            onChange={e => setSelectedPreset(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          >
                            {ocrPresets.map(p => (
                              <option key={p.id} value={p.id}>{p.name} — {p.description}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        onClick={handleOcrExtract}
                        disabled={!ocrFile || isOcrProcessing}
                        className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isOcrProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
                        {isOcrProcessing ? '识别中...' : '开始OCR识别'}
                      </button>

                      {ocrResult && (
                        <div className="rounded-lg border border-teal-200 dark:border-teal-800 p-4 bg-teal-50 dark:bg-teal-900/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">识别结果：</span>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (!ocrResult) return;
                                  try {
                                    const formData = new FormData();
                                    formData.append('json_text', ocrResult);
                                    formData.append('preset', selectedPreset);
                                    formData.append('format', 'xlsx');
                                    const resp = await fetch(`${API_BASE()}/api/ocr/export`, { method: 'POST', body: formData });
                                    if (!resp.ok) throw new Error('导出失败');
                                    const data = await resp.json();
                                    if (data.download_url) {
                                      const a = document.createElement('a');
                                      a.href = `${API_BASE()}${data.download_url}`;
                                      a.download = data.filename;
                                      a.click();
                                      toast.success('Excel导出成功');
                                    }
                                  } catch (e: any) {
                                    toast.error(e.message || '导出失败');
                                  }
                                }}
                                className="text-xs px-2 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white transition-colors flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                导出Excel
                              </button>
                              <button
                                onClick={() => { navigator.clipboard.writeText(ocrResult); toast.success('已复制'); }}
                                className="text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 text-white transition-colors"
                              >
                                复制
                              </button>
                            </div>
                          </div>
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words max-h-80 overflow-y-auto">{ocrResult}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {activeFeature === 'generate' && (
                    <div className="space-y-2">
                      {/* 生成模式选择 */}
                      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        {(['auto', 'rule', 'multi-agent'] as const).map(m => {
                          const labels: Record<typeof m, { text: string; hint: string }> = {
                            rule:        { text: '规则',     hint: '⚡ < 1s，纯关键词提取' },
                            auto:        { text: '自动',     hint: '🤖 ~5-30s，LLM 推理' },
                            'multi-agent': { text: '多智能体', hint: '🏛️ ~10-60s，多阶段 LLM' },
                          };
                          return (
                            <button
                              key={m}
                              onClick={() => { setCardGenMode(m); try { localStorage.setItem('pdf-analysis:cardGenMode', m); } catch {} }}
                              title={labels[m].hint}
                              className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-all ${
                                cardGenMode === m
                                  ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-300 shadow-sm'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                              }`}
                            >
                              {labels[m].text}
                            </button>
                          );
                        })}
                      </div>
                      {/* 生成按钮 */}
                      <button
                        onClick={() => handleExtractKnowledge()}
                        disabled={!uploadedFile || isProcessing}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <Layers className="w-5 h-5 mr-2" />}
                        生成知识卡片
                      </button>
                    </div>
                  )}

                  {/* merge/split buttons commented out */}
                  {/*activeFeature === 'merge' && (
                    <button
                      onClick={handleMergePDF}
                      disabled={uploadedFiles.length < 2 || isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <Combine className="w-5 h-5 mr-2" />}
                      合并 PDF
                    </button>
                  )*/}

                  {/*activeFeature === 'split' && (
                    <button
                      onClick={handleSplitPDF}
                      disabled={!uploadedFile || isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isProcessing ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <Scissors className="w-5 h-5 mr-2" />}
                      拆分 PDF
                    </button>
                  )*/}


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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Hash className="w-4 h-4 text-blue-500" />
                        <p className="text-2xl font-bold text-blue-600">{analysisResult.pageCount}</p>
                      </div>
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
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const url = URL.createObjectURL(uploadedFile);
                          window.open('/pdf-viewer?url=' + encodeURIComponent(url), '_blank');
                          setTimeout(() => URL.revokeObjectURL(url), 60000);
                        }}
                        className="group w-full border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all text-left flex items-center gap-4"
                      >
                        <div className="shrink-0 w-12 h-12 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                          <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{uploadedFile.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">点击在 PDF 查看器中打开（全屏滚动 · 可编辑 · 保存为笔记）</div>
                        </div>
                        <ExternalLink className="shrink-0 w-5 h-5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                      </button>
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
              {!isProcessing && !analysisResult && generatedCards.length === 0 && activeFeature !== 'convertWord' && activeFeature !== 'convertExcel' && activeFeature !== 'history' && activeFeature !== 'pptConvert' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                  {/* merge/split commented out */}
                  {/*  activeFeature === 'merge' ? (...) : activeFeature === 'split' ? (...) : */}
                  {activeFeature === 'fromImages' ? (
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

              {/* 转Word/Excel - 转换面板 */}
              {(activeFeature === 'convertWord' || activeFeature === 'convertExcel') && renderConversionPanel()}

              {/* 转换记录 - 右侧显示记录列表 */}
              {activeFeature === 'history' && renderHistoryPanel()}

              {/* PPT 转 PDF 面板 */}
              {activeFeature === 'pptConvert' && renderPPTConvertPanel()}
            </motion.div>
          </div>

        {/* 其他在线查看入口 */}
        <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">其他在线查看</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => window.open('/knowledge-graph', '_blank')}
              className="flex items-center space-x-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm"
            >
              <History className="w-4 h-4 text-green-600" />
              <span className="text-green-700 dark:text-green-400">知识库图谱工作台</span>
            </button>
            <button
              onClick={() => window.open('/pdf-viewer', '_blank')}
              className="flex items-center space-x-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
            >
              <FileText className="w-4 h-4 text-red-600" />
              <span className="text-red-700 dark:text-red-400">PDF查看器</span>
            </button>
            <button
              onClick={() => window.open('/ppt-viewer', '_blank')}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-sm"
            >
              <Presentation className="w-4 h-4 text-orange-600" />
              <span className="text-orange-700 dark:text-orange-400">PPT演示</span>
            </button>
            <button
              onClick={() => window.open('/excel-analysis', '_blank')}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
            >
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 dark:text-blue-400">Excel分析</span>
            </button>
          </div>
        </div>
        <DocxPreviewModal
          isOpen={showDocxPreview}
          onClose={() => setShowDocxPreview(false)}
          html={docxPreviewHtml}
          fileName={previewFileName}
        />
      </div>
    </div>
  );
};

// ============ Word 文档预览弹窗 ============
const DocxPreviewModal: React.FC<{ isOpen: boolean; onClose: () => void; html: string; fileName: string }> = ({ isOpen, onClose, html, fileName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[90vw] h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FileType className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">{fileName}</h3>
            <span className="text-xs text-gray-400">（预览版，格式可能有细微差异）</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900">
          <div
            className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow-lg p-8 rounded-lg prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          />
        </div>
      </div>
    </div>
  );
};

export default PDFAnalysis;
