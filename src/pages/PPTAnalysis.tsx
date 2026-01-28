import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Presentation, Upload, Palette, Type, Layout, Download, Eye, Star, Zap } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

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

const PPTAnalysis: React.FC = () => {
  const { theme } = useTheme();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const templates: Template[] = [
    { id: 'business', name: '商务简约', thumbnail: '📊', style: 'modern', colors: ['#2563eb', '#dc2626', '#16a34a'] },
    { id: 'creative', name: '创意多彩', thumbnail: '🎨', style: 'creative', colors: ['#7c3aed', '#db2777', '#ea580c'] },
    { id: 'academic', name: '学术严谨', thumbnail: '🎓', style: 'classic', colors: ['#374151', '#059669', '#0284c7'] },
    { id: 'tech', name: '科技未来', thumbnail: '🚀', style: 'tech', colors: ['#0891b2', '#4338ca', '#be123c'] }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt'))) {
      setUploadedFile(file);
      setIsAnalyzing(true);
      
      // Simulate PPT analysis
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
    }
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

            {/* Actions */}
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                <Eye className="w-4 h-4" />
                <span>预览幻灯片</span>
              </button>
              <button className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">
                <Download className="w-4 h-4" />
                <span>导出优化版</span>
              </button>
            </div>
          </motion.div>

          {/* Right Panel */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div className="text-center">
                  <Loader className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">正在分析PPT结构...</p>
                </div>
              </div>
            ) : slides.length > 0 ? (
              <div className="space-y-6">
                {/* Analysis Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">分析结果</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{slides.length}</div>
                      <div className="text-sm text-gray-500">幻灯片</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">5</div>
                      <div className="text-sm text-gray-500">布局类型</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">12</div>
                      <div className="text-sm text-gray-500">元素数量</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">85%</div>
                      <div className="text-sm text-gray-500">优化建议</div>
                    </div>
                  </div>
                </div>

                {/* Slides Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">幻灯片预览</h3>
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
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <Presentation className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">等待PPT上传</h3>
                  <p className="text-gray-500 dark:text-gray-400">上传PPT文件开始智能分析</p>
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