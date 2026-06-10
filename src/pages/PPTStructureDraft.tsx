// PPT结构草稿生成器
// 基于MECE原则，从杂乱内容中梳理出清晰的PPT框架

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Layers,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  Download,
  Lightbulb,
  Target,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit3
} from 'lucide-react';

import { getApiBaseUrl } from '@/lib/apiConfig';

// API 配置
const API_BASE = () => getApiBaseUrl() + '/api/ppt-structure';

interface Section {
  section_id: string;
  section_title: string;
  key_points: string[];
  content_summary: string;
  order: number;
}

interface Draft {
  draft_id: string;
  topic: string;
  sections: Section[];
  total_pages: number;
  created_at: string;
  mece_compliant: boolean;
}

interface MECEInfo {
  name: string;
  full_name: string;
  chinese: string;
  alias: string;
  origin: string;
  purpose: string;
  definition: {
    mutually_exclusive: { description: string; meaning: string };
    collectively_exhaustive: { description: string; meaning: string };
  };
  application: {
    scenarios: string[];
    benefits: string[];
  };
  usage: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
  };
}

const PPTStructureDraft: React.FC = () => {
  // 状态
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [numSections, setNumSections] = useState(4);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showMeceInfo, setShowMeceInfo] = useState(false);
  const [meceInfo, setMeceInfo] = useState<MECEInfo | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedPoints, setEditedPoints] = useState<string[]>([]);

  // 加载MECE信息
  const loadMeceInfo = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE()}/mece-info`);
      if (response.ok) {
        const data = await response.json();
        setMeceInfo(data.mece);
      }
    } catch (err) {
      console.error('Failed to load MECE info:', err);
    }
  }, []);

  React.useEffect(() => {
    loadMeceInfo();
  }, [loadMeceInfo]);

  // 生成草稿
  const handleGenerate = async () => {
    if (!topic && !content) {
      setError('请提供PPT主题或内容素材');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE()}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || '未命名主题',
          content: content || '请提供内容素材以生成PPT结构',
          num_sections: numSections
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '生成失败');
      }

      const data = await response.json();
      setDraft(data.draft);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }

  // 导出草稿
  const handleExport = () => {
    if (!draft) return;

    const exportData = {
      topic: draft.topic,
      total_pages: draft.total_pages,
      mece_compliant: draft.mece_compliant,
      sections: draft.sections.map(s => ({
        page: s.order,
        title: s.section_title,
        points: s.key_points
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PPT结构草稿_${draft.topic}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // 导出为Markdown格式
  const handleExportMarkdown = () => {
    if (!draft) return;

    let md = `# ${draft.topic}\n\n`;
    md += `> 基于MECE原则生成的PPT结构草稿 | 共${draft.total_pages}页\n\n`;
    md += `---\n\n`;

    draft.sections.forEach((section, index) => {
      md += `## 第${index + 1}页：${section.section_title}\n\n`;
      section.key_points.forEach((point, i) => {
        md += `${i + 1}. ${point}\n`;
      });
      md += `\n---\n\n`;
    });

    md += `## MECE原则检查\n\n`;
    md += `- 相互独立（Mutually Exclusive）：${draft.mece_compliant ? '✅ 通过' : '❌ 未通过'}\n`;
    md += `- 完全穷尽（Collectively Exhaustive）：✅ 通过\n\n`;
    md += `> 生成时间：${new Date(draft.created_at).toLocaleString()}\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PPT结构草稿_${draft.topic}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // 复制内容
  const handleCopy = () => {
    if (!draft) return;

    let text = `${draft.topic}\n\n`;
    draft.sections.forEach((section, index) => {
      text += `【第${index + 1}页】${section.section_title}\n`;
      section.key_points.forEach((point, i) => {
        text += `  ${i + 1}. ${point}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text);
  };

  // 开始编辑板块
  const handleStartEdit = (section: Section) => {
    setEditingSection(section.section_id);
    setEditedTitle(section.section_title);
    setEditedPoints([...section.key_points]);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!draft || !editingSection) return;

    const updatedSections = draft.sections.map(s => {
      if (s.section_id === editingSection) {
        return {
          ...s,
          section_title: editedTitle,
          key_points: editedPoints
        };
      }
      return s;
    });

    setDraft({ ...draft, sections: updatedSections as Section[] });
    setEditingSection(null);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditedTitle('');
    setEditedPoints([]);
  };

  // 清空草稿
  const handleClear = async () => {
    try {
      await fetch(`${API_BASE()}/clear`, { method: 'DELETE' });
      setDraft(null);
    } catch (err) {
      console.error('Failed to clear drafts:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📊 PPT结构草稿生成器
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            基于MECE原则，从杂乱内容中梳理出清晰的PPT框架
          </p>
        </motion.div>

        {/* MECE原则说明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <button
            onClick={() => setShowMeceInfo(!showMeceInfo)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Lightbulb className="text-blue-500" size={20} />
            <span className="font-medium text-blue-700 dark:text-blue-400">什么是MECE原则？</span>
            {showMeceInfo ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <AnimatePresence>
            {showMeceInfo && meceInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      {meceInfo.name}（{meceInfo.full_name}）
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {meceInfo.chinese} | {meceInfo.alias}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                      {meceInfo.origin}，用于{meceInfo.purpose}
                    </p>

                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="text-green-500" size={16} />
                          <span className="font-medium text-green-700 dark:text-green-400">
                            相互独立（Mutually Exclusive）
                          </span>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          {meceInfo.definition.mutually_exclusive.meaning}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="text-blue-500" size={16} />
                          <span className="font-medium text-blue-700 dark:text-blue-400">
                            完全穷尽（Collectively Exhaustive）
                          </span>
                        </div>
                        <p className="text-sm text-blue-600 dark:text-blue-500">
                          {meceInfo.definition.collectively_exhaustive.meaning}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      应用场景
                    </h4>
                    <ul className="space-y-1 mb-4">
                      {meceInfo.application.scenarios.map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Target className="text-blue-400" size={14} />
                          {s}
                        </li>
                      ))}
                    </ul>

                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      核心优势
                    </h4>
                    <ul className="space-y-1">
                      {meceInfo.application.benefits.map((b, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <Zap className="text-yellow-500 mt-0.5" size={14} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* 主题输入 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="text-blue-500" size={20} />
                PPT主题
              </h3>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例如：2024年度工作总结"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            {/* 内容素材 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="text-green-500" size={20} />
                内容素材
              </h3>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="粘贴你的文本摘要、数据要点或已有提纲...

例如：
- 营收增长30%
- 用户突破1000万
- 新产品上线
- 获得B轮融资
- 团队扩张至200人"
                className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
              />
            </div>

            {/* 板块数量 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                板块数量
              </h3>
              <div className="flex gap-3">
                {[3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setNumSections(num)}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${
                      numSections === num
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {num}个板块
                  </button>
                ))}
              </div>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={loading || (!topic && !content)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  基于MECE原则生成PPT结构
                </>
              )}
            </button>

            {/* 错误/成功提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400"
                >
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-600 dark:text-green-400"
                >
                  <CheckCircle size={20} />
                  <span>PPT结构草稿生成成功！</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* 右侧：预览 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {draft ? (
              <>
                {/* 草稿概览 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      📋 {draft.topic}
                    </h3>
                    <div className="flex items-center gap-2">
                      {draft.mece_compliant ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                          <CheckCircle size={12} />
                          MECE合规
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                          <AlertCircle size={12} />
                          需优化
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>共{draft.total_pages}页</span>
                    <span>•</span>
                    <span>{new Date(draft.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* 板块列表 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      页面结构
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="复制"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={handleClear}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-red-500"
                        title="清空"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {draft.sections.map((section, index) => (
                      <div key={section.section_id} className="p-4">
                        {editingSection === section.section_id ? (
                          /* 编辑模式 */
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                              placeholder="页面标题"
                            />
                            {editedPoints.map((point, i) => (
                              <input
                                key={i}
                                type="text"
                                value={point}
                                onChange={(e) => {
                                  const newPoints = [...editedPoints];
                                  newPoints[i] = e.target.value;
                                  setEditedPoints(newPoints);
                                }}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
                                placeholder={`要点 ${i + 1}`}
                              />
                            ))}
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                保存
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* 查看模式 */
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded">
                                  {index + 1}
                                </span>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {section.section_title}
                                </h4>
                              </div>
                              <button
                                onClick={() => handleStartEdit(section)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title="编辑"
                              >
                                <Edit3 size={14} className="text-gray-400" />
                              </button>
                            </div>
                            <ul className="ml-8 space-y-1">
                              {section.key_points.map((point, i) => (
                                <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                  <span className="text-blue-400">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 导出选项 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    导出草稿
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleExport}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                    >
                      <Download size={18} />
                      JSON格式
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                    >
                      <BookOpen size={18} />
                      Markdown格式
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* 空状态 */
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                <Layers className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无草稿
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  在左侧输入主题和内容素材<br />
                  点击生成按钮创建PPT结构草稿
                </p>
              </div>
            )}

            {/* 使用说明 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen className="text-purple-500" size={20} />
                使用流程
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">1</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    明确你要讲的主题或素材
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">2</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    AI拆解结构，生成框架，排除重复
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">3</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    你调整重点，补充内容
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">4</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    AI再次帮你提炼要点，优化页面逻辑
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PPTStructureDraft;