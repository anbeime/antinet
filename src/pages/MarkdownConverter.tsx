// Markdown + Mermaid + CSV 完整工作流前端页面
// 支持 Markdown 转 PDF/Word/HTML/Excel，Mermaid 图表渲染，CSV 表格提取

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FileCode,
  FileImage,
  Table,
  Download,
  Upload,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  RefreshCw
} from 'lucide-react';

// API 配置
const API_BASE = '/api/markdown-converter';

interface ConverterStatus {
  pandoc: { available: boolean; path: string | null };
  mermaid_cli: { available: boolean; path: string | null };
  pdfplumber: boolean;
  dependencies: Record<string, boolean>;
  features: {
    mermaid_rendering: boolean;
    csv_extraction: boolean;
    full_workflow: boolean;
  };
}

interface ConversionResult {
  success: boolean;
  file_path?: string;
  error?: string;
  warnings?: string[];
}

const outputFormats = [
  { value: 'pdf', label: 'PDF 文档', icon: FileText, color: 'red' },
  { value: 'docx', label: 'Word 文档', icon: FileCode, color: 'blue' },
  { value: 'html', label: 'HTML 网页', icon: FileText, color: 'green' },
  { value: 'xlsx', label: 'Excel 表格', icon: Table, color: 'emerald' },
];

const MarkdownConverter: React.FC = () => {
  // 状态
  const [markdown, setMarkdown] = useState(`# 项目报告

## 流程图示例

\`\`\`mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[处理中]
    B -->|否| D[结束]
    C --> D
\`\`\`

## 数据表格

| 日期 | 销售额 | 成本 | 利润 |
|------|--------|------|------|
| 2024-01 | ¥10,000 | ¥6,000 | ¥4,000 |
| 2024-02 | ¥12,000 | ¥7,000 | ¥5,000 |
| 2024-03 | ¥15,000 | ¥8,000 | ¥7,000 |

## CSV 表格示例

\`\`\`csv
产品,销量,增长率
手机,1000,15%
电脑,800,8%
平板,500,-3%
\`\`\`

## 结论

报告完成。
`);

  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [renderMermaid, setRenderMermaid] = useState(true);
  const [extractCsv, setExtractCsv] = useState(false);
  const [status, setStatus] = useState<ConverterStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 加载状态
  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  }, []);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // 转换文件
  const handleConvert = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      const blob = new Blob([markdown], { type: 'text/markdown' });
      formData.append('file', blob, 'input.md');
      formData.append('output_format', selectedFormat);
      formData.append('render_mermaid', String(renderMermaid));

      const response = await fetch(`${API_BASE}/convert/file`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Conversion failed');
      }

      // 下载文件
      const blob2 = await response.blob();
      const url = window.URL.createObjectURL(blob2);
      const a = document.createElement('a');
      a.href = url;
      
      const ext = selectedFormat === 'docx' ? '.docx' : 
                  selectedFormat === 'xlsx' ? '.xlsx' : 
                  selectedFormat === 'html' ? '.html' : '.pdf';
      a.download = `converted${ext}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  // 渲染 Mermaid 图表
  const handleRenderMermaid = async () => {
    if (!markdown) return;

    try {
      const response = await fetch(`${API_BASE}/mermaid/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: extractMermaidCode(markdown),
          output_format: 'svg'
        }),
      });

      if (response.ok) {
        const svg = await response.text();
        // 在新窗口显示
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(svg);
          newWindow.document.close();
        }
      }
    } catch (err) {
      console.error('Mermaid render failed:', err);
    }
  };

  // 提取 Mermaid 代码
  const extractMermaidCode = (text: string): string => {
    const match = text.match(/```mermaid\s*\n([\s\S]*?)```/);
    return match ? match[1].trim() : 'graph TD\nA[No mermaid found] --> B[Error]';
  };

  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
  };

  // 状态指示器颜色
  const getStatusColor = (available: boolean) => 
    available ? 'text-green-500' : 'text-red-500';

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
            📄 Markdown + Mermaid + CSV 工作流
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            将 Markdown 转换为 PDF/Word/HTML/Excel，支持 Mermaid 图表和 CSV 表格
          </p>
        </motion.div>

        {/* 状态栏 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.pandoc?.available ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Pandoc</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.features?.mermaid_rendering ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Mermaid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.pdfplumber ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">CSV 提取</span>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Settings size={16} />
              设置
            </button>
          </div>

          {/* 详细设置 */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(status?.pandoc?.available || false)}>
                              {status?.pandoc?.available ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            </span>
                    <span>Pandoc: {status?.pandoc?.path || 'Not found'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(status?.mermaid_cli?.available || false)}>
                              {status?.mermaid_cli?.available ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            </span>
                    <span>Mermaid CLI: {status?.mermaid_cli?.path || 'Using online service'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：编辑器 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="text-blue-500" size={20} />
                <span className="font-medium text-gray-900 dark:text-white">Markdown 编辑器</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="复制"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`p-2 rounded-lg transition-colors ${previewMode ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="预览"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="w-full h-96 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入 Markdown 内容..."
                spellCheck={false}
              />
            </div>

            {/* 选项 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renderMermaid}
                    onChange={(e) => setRenderMermaid(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">渲染 Mermaid</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extractCsv}
                    onChange={(e) => setExtractCsv(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">提取 CSV</span>
                </label>
              </div>
            </div>
          </motion.div>

          {/* 右侧：预览和选项 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* 输出格式选择 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                输出格式
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {outputFormats.map((format) => {
                  const Icon = format.icon;
                  const isSelected = selectedFormat === format.value;
                  return (
                    <button
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon className={`text-${format.color}-500`} size={24} />
                      <span className={`font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {format.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                转换操作
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleConvert}
                  disabled={loading || !markdown}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      转换中...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      转换为 {outputFormats.find(f => f.value === selectedFormat)?.label}
                    </>
                  )}
                </button>

                <button
                  onClick={handleRenderMermaid}
                  disabled={!markdown || !renderMermaid}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                >
                  <FileImage size={20} />
                  预览 Mermaid 图表
                </button>
              </div>

              {/* 错误/成功提示 */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400"
                  >
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-600 dark:text-green-400"
                  >
                    <CheckCircle size={18} />
                    <span className="text-sm">转换成功！文件已开始下载。</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 使用说明 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                📖 使用说明
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">1.</span>
                  <span>在左侧编辑器输入 Markdown 内容</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">2.</span>
                  <span>使用 <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">```mermaid</code> 代码块添加图表</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">3.</span>
                  <span>使用 <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">```csv</code> 代码块添加表格数据</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">4.</span>
                  <span>选择输出格式，点击转换按钮</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">5.</span>
                  <span>Mermaid 图表将自动渲染为图片嵌入文档</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownConverter;