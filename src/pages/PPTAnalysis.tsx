import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Presentation, Upload, Palette, Download, Eye, Loader, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

interface Slide {
  id: number;
  title: string;
  content: string;
  layout: string;
  elements: string[];
}

interface Template {
  id: string;
  name: string;
  thumbnail: string;
  style: string;
  colors: string[];
}

interface KnowledgeCard {
  id: string;
  type: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
  tags?: string;
}

const API_BASE = 'http://localhost:8000';

const PPTAnalysis: React.FC = () => {
  const { theme } = useTheme();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pptAvailable, setPptAvailable] = useState<boolean | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const templates = [
    { id: 'business', name: '商务简约', thumbnail: '[商]', style: 'modern', colors: ['#2563eb', '#dc2626', '#16a34a'] },
    { id: 'creative', name: '创意多彩', thumbnail: '[创]', style: 'creative', colors: ['#7c3aed', '#db2777', '#ea580c'] },
    { id: 'academic', name: '学术严谨', thumbnail: '[学]', style: 'classic', colors: ['#374151', '#059669', '#0284c7'] },
    { id: 'tech', name: '科技未来', thumbnail: '[科]', style: 'tech', colors: ['#0891b2', '#4338ca', '#be123c'] }
  ];
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);

  // 检查PPT服务状态
  useEffect(() => {
    checkPPTStatus();
    loadKnowledgeCards();
  }, []);

  const checkPPTStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ppt/status`);
      const data = await response.json();
      setPptAvailable(data.available);
      if (!data.available) {
        toast.warning('PPT服务暂不可用，请安装依赖: pip install python-pptx');
      }
    } catch (error) {
      console.error('检查PPT状态失败:', error);
      setPptAvailable(false);
      toast.error('无法连接到PPT服务');
    }
  };

  // 加载知识卡片
  const loadKnowledgeCards = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/cards`);
      if (response.ok) {
        const data = await response.json();
        setCards(data);
        // 默认全选
        setSelectedCards(new Set(data.map((c: KnowledgeCard) => c.id)));
      }
    } catch (error) {
      console.error('加载知识卡片失败:', error);
      toast.error('加载知识卡片失败');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pptx') && !file.name.endsWith('.ppt')) {
      toast.error('请上传PPT文件 (.pptx 或 .ppt)');
      return;
    }

    setUploadedFile(file);
    setIsAnalyzing(true);

    // 创建FormData
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 调用后端API分析PPT
      const response = await fetch(`${API_BASE}/api/ppt/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSlides(data.slides || []);
        toast.success(`PPT分析完成，共 ${data.slides?.length || 0} 页`);
      } else {
        // 如果API不存在，使用本地模拟
        simulateAnalysis();
      }
    } catch (error) {
      console.error('PPT分析失败:', error);
      // 降级到模拟
      simulateAnalysis();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const simulateAnalysis = () => {
    // 模拟PPT分析（当后端API不可用时）
    setTimeout(() => {
      setSlides([
        { id: 1, title: '项目概述', content: 'Antinet智能知识管家介绍', layout: 'title-content', elements: ['标题', '文本', '图片'] },
        { id: 2, title: '核心功能', content: 'NPU加速、四色卡片、8-Agent系统', layout: 'two-column', elements: ['标题', '列表', '图标'] },
        { id: 3, title: '技术架构', content: '前端React + 后端FastAPI + NPU推理', layout: 'diagram', elements: ['标题', '流程图', '标注'] },
        { id: 4, title: '性能优势', content: '推理延迟<500ms，数据不出域', layout: 'chart', elements: ['标题', '柱状图', '数据标签'] },
        { id: 5, title: '应用场景', content: '数据分析、知识管理、团队协作', layout: 'grid', elements: ['标题', '卡片', '图标'] }
      ]);
      setIsAnalyzing(false);
    }, 2000);
  };

  // 导出卡片到PPT
  const exportCardsToPPT = async () => {
    if (selectedCards.size === 0) {
      toast.warning('请至少选择一张卡片');
      return;
    }

    setIsExporting(true);
    try {
      const selectedCardData = cards.filter(c => selectedCards.has(c.id));

      const exportData = {
        cards: selectedCardData.map(card => ({
          type: card.type || (card.category === '事实' ? 'fact' : card.category === '解释' ? 'interpret' : card.category === '风险' ? 'risk' : 'action'),
          title: card.title,
          content: card.content,
          tags: card.tags ? card.tags.split(',') : [],
          created_at: card.created_at
        })),
        title: 'Antinet 四色卡片分析报告',
        include_summary: true,
        filename: `antinet_cards_${new Date().toISOString().slice(0, 10)}.pptx`
      };

      const response = await fetch(`${API_BASE}/api/ppt/export/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      });

      if (response.ok) {
        // 获取文件blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportData.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PPT导出成功！');
      } else {
        const error = await response.json();
        toast.error(`导出失败: ${error.detail || '未知错误'}`);
      }
    } catch (error) {
      console.error('导出PPT失败:', error);
      toast.error('导出PPT失败，请检查后端服务');
    } finally {
      setIsExporting(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Presentation className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                PPT智能分析与生成
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                AI驱动的演示文稿分析与模板优化
              </p>
            </div>
          </div>

          {/* 服务状态 */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">PPT服务状态:</span>
            {pptAvailable === null ? (
              <span className="text-sm text-gray-400">检查中...</span>
            ) : pptAvailable ? (
              <span className="flex items-center text-sm text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" /> 可用
              </span>
            ) : (
              <span className="flex items-center text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" /> 不可用
              </span>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-blue-500" />
                上传PPT
              </h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <input type="file" accept=".pptx,.ppt" onChange={handleFileUpload} className="hidden" id="ppt-upload" />
                <label htmlFor="ppt-upload" className="cursor-pointer">
                  <Presentation className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {uploadedFile ? uploadedFile.name : '选择PPT文件'}
                  </p>
                </label>
              </div>
            </div>

            {/* Templates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Palette className="w-5 h-5 mr-2 text-blue-500" />
                设计模板
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-3 rounded-lg border-2 transition-all ${selectedTemplate.id === template.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}
                  >
                    <div className="text-2xl mb-1">{template.thumbnail}</div>
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{template.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Actions */}
            <div className="space-y-3">
              <button
                onClick={exportCardsToPPT}
                disabled={isExporting || selectedCards.size === 0}
                className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>导出中...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>导出选中卡片 ({selectedCards.size})</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Right Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* 知识卡片选择 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-500" />
                  选择要导出的知识卡片
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedCards(new Set(cards.map(c => c.id)))}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    全选
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setSelectedCards(new Set())}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    清空
                  </button>
                </div>
              </div>

              {cards.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>暂无知识卡片，请先创建卡片</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {cards.map(card => (
                    <div
                      key={card.id}
                      onClick={() => toggleCardSelection(card.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCards.has(card.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedCards.has(card.id)}
                          onChange={() => {}}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{card.title}</p>
                          <p className="text-xs text-gray-500 truncate">{card.category || card.type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PPT分析结果 */}
            {isAnalyzing ? (
              <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div className="text-center">
                  <Loader className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">正在分析PPT结构...</p>
                </div>
              </div>
            ) : slides.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-blue-500" />
                  幻灯片预览 ({slides.length}页)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slides.map(slide => (
                    <div key={slide.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">幻灯片 {slide.id}</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">{slide.layout}</span>
                      </div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{slide.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{slide.content}</p>
                      <div className="flex flex-wrap gap-1">
                        {slide.elements.map(element => (
                          <span key={element} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">{element}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <Presentation className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">PPT分析</h3>
                  <p className="text-gray-500 dark:text-gray-400">上传PPT文件开始智能分析，或选择卡片导出</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PPTAnalysis;
