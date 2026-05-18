// 报表自动化页面
// 数据 → Excel → PDF → PPT 一键生成完整报告

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  FileText,
  Presentation,
  Download,
  Settings,
  BarChart3,
  FileCheck,
  Loader2,
  Database,
  CheckCircle,
  AlertCircle,
  Upload,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { getApiBaseUrl } from '@/lib/apiConfig';

// API 配置
const API_BASE = '/api/automation';

interface DataRow {
  [key: string]: any;
}

interface ReportConfig {
  title: string;
  format: 'excel' | 'pdf' | 'ppt' | 'all';
  includeCharts: boolean;
}

interface AutomationStatus {
  excel_available: boolean;
  pdf_available: boolean;
  ppt_available: boolean;
  features: {
    chart_generation: boolean;
    multi_format_export: boolean;
  };
}

interface GenerationResult {
  success: boolean;
  files?: {
    excel?: { path: string; download_url: string };
    pdf?: { path: string; download_url: string };
    ppt?: { path: string; download_url: string };
  };
  error?: string;
}

const outputFormats = [
  { value: 'excel', label: 'Excel 报表', icon: FileSpreadsheet, color: 'green' },
  { value: 'pdf', label: 'PDF 报告', icon: FileText, color: 'red' },
  { value: 'ppt', label: 'PPT 演示', icon: Presentation, color: 'orange' },
  { value: 'all', label: '全部格式', icon: Download, color: 'blue' },
];

const ReportAutomation: React.FC = () => {
  useTheme();
  
  const [data, setData] = useState<DataRow[]>([]);
  const [config, setConfig] = useState<ReportConfig>({
    title: '报表分析报告',
    format: 'all',
    includeCharts: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 加载状态
  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(getApiBaseUrl() + `${API_BASE}/status`);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(getApiBaseUrl() + '/api/analysis/upload-and-analyze', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setData(result.data);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || '上传失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReport = async () => {
    if (data.length === 0 && !uploadedFile) {
      setError('请先上传数据文件');
      return;
    }

    setIsGenerating(true);
    setResults(null);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(getApiBaseUrl() + `${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: data.length > 0 ? data : generateSampleData(),
          title: config.title,
          config: {
            include_charts: config.includeCharts,
            output_format: config.format
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '生成报表失败');
      }

      const result = await response.json();
      setResults(result);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报表失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSampleData = (): DataRow[] => {
    return [
      { 日期: '2025-01-01', 销售额: 12500, 成本: 8000, 利润: 4500, 地区: '北京' },
      { 日期: '2025-01-02', 销售额: 15800, 成本: 9500, 利润: 6300, 地区: '上海' },
      { 日期: '2025-01-03', 销售额: 18200, 成本: 11000, 利润: 7200, 地区: '广州' },
      { 日期: '2025-01-04', 销售额: 14300, 成本: 8800, 利润: 5500, 地区: '深圳' },
      { 日期: '2025-01-05', 销售额: 16900, 成本: 10200, 利润: 6700, 地区: '北京' },
      { 日期: '2025-01-06', 销售额: 19500, 成本: 11800, 利润: 7700, 地区: '上海' },
      { 日期: '2025-01-07', 销售额: 22100, 成本: 13500, 利润: 8600, 地区: '广州' },
      { 日期: '2025-01-08', 销售额: 18700, 成本: 11200, 利润: 7500, 地区: '深圳' },
      { 日期: '2025-01-09', 销售额: 15600, 成本: 9400, 利润: 6200, 地区: '北京' },
      { 日期: '2025-01-10', 销售额: 21300, 成本: 12800, 利润: 8500, 地区: '上海' }
    ];
  };

  const handleDownload = (url: string, filename: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url.startsWith('http') ? url : getApiBaseUrl() + url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (available: boolean) => 
    available ? 'text-green-500' : 'text-yellow-500';

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
            📊 报表自动化
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            数据 → Excel → PDF → PPT 一键生成完整报告
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
                <span className={`w-2 h-2 rounded-full ${status?.excel_available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Excel</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.pdf_available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.ppt_available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">PPT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.features?.chart_generation ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-600 dark:text-gray-400">图表</span>
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
                    <span className={getStatusColor(status?.excel_available || false)}>
                      {status?.excel_available ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    </span>
                    <span>Excel 生成: {status?.excel_available ? '可用' : '不可用'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(status?.pdf_available || false)}>
                      {status?.pdf_available ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    </span>
                    <span>PDF 生成: {status?.pdf_available ? '可用' : '不可用'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(status?.ppt_available || false)}>
                      {status?.ppt_available ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    </span>
                    <span>PPT 生成: {status?.ppt_available ? '可用' : '不可用'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(status?.features?.chart_generation || false)}>
                      {status?.features?.chart_generation ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    </span>
                    <span>图表生成: {status?.features?.chart_generation ? '可用' : '不可用'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧：数据源和配置 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* 数据源 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Database className="w-5 h-5 mr-2 text-purple-500" />
                数据源
              </h3>
              <label className="block">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    上传数据文件
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    支持 Excel/CSV/JSON
                  </p>
                </div>
              </label>
              {uploadedFile && (
                <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-700 dark:text-purple-300 flex items-center">
                    <FileCheck className="w-4 h-4 mr-2" />
                    {uploadedFile.name}
                  </p>
                </div>
              )}
              {!uploadedFile && data.length === 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setData(generateSampleData())}
                    className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-purple-500 py-2 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} />
                    使用示例数据
                  </button>
                </div>
              )}
            </div>

            {/* 报表配置 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-500" />
                报表配置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    报表标题
                  </label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    输出格式
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {outputFormats.map((fmt) => {
                      const Icon = fmt.icon;
                      const isSelected = config.format === fmt.value;
                      return (
                        <button
                          key={fmt.value}
                          onClick={() => setConfig({ ...config, format: fmt.value as any })}
                          className={`flex items-center justify-center gap-1 py-2 rounded-lg text-sm transition-colors ${
                            isSelected
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{fmt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeCharts"
                    checked={config.includeCharts}
                    onChange={(e) => setConfig({ ...config, includeCharts: e.target.checked })}
                    className="w-4 h-4 text-purple-500 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <label htmlFor="includeCharts" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    包含图表
                  </label>
                </div>
              </div>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || (data.length === 0 && !uploadedFile)}
              className="w-full flex items-center justify-center space-x-2 bg-purple-500 text-white py-3 px-4 rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>生成报表</span>
                </>
              )}
            </button>
          </motion.div>

          {/* 右侧：数据预览和结果 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-9 space-y-6"
          >
            {/* 数据预览 */}
            {data.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                    数据预览
                  </h3>
                  <span className="text-sm text-gray-500">
                    {data.length} 行
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {Object.keys(data[0] || {}).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {data.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          {Object.values(row).map((value: any, vidx) => (
                            <td key={vidx} className="px-4 py-3 text-sm">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.length > 5 && (
                  <div className="p-3 text-center text-sm text-gray-500">
                    ... 还有 {data.length - 5} 行数据
                  </div>
                )}
              </div>
            )}

            {/* 生成结果 */}
            {results && results.success && results.files && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileCheck className="w-5 h-5 mr-2 text-green-500" />
                  报表生成完成
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {results.files.excel && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center mb-2">
                        <FileSpreadsheet className="w-6 h-6 text-green-500" />
                        <span className="ml-2 font-medium">Excel报表</span>
                      </div>
                      <button
                        onClick={() => handleDownload(results.files?.excel?.download_url || '', 'report.xlsx')}
                        className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载</span>
                      </button>
                    </div>
                  )}
                  {results.files.pdf && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center mb-2">
                        <FileText className="w-6 h-6 text-red-500" />
                        <span className="ml-2 font-medium">PDF报告</span>
                      </div>
                      <button
                        onClick={() => handleDownload(results.files?.pdf?.download_url || '', 'report.pdf')}
                        className="w-full flex items-center justify-center space-x-2 bg-red-500 text-white py-2 rounded hover:bg-red-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载</span>
                      </button>
                    </div>
                  )}
                  {results.files.ppt && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Presentation className="w-6 h-6 text-orange-500" />
                        <span className="ml-2 font-medium">PPT演示</span>
                      </div>
                      <button
                        onClick={() => handleDownload(results.files?.ppt?.download_url || '', 'report.pptx')}
                        className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 空状态 */}
            {!results && data.length === 0 && !isGenerating && (
              <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 dark:text-gray-400">
                    请上传数据文件开始生成报表
                  </p>
                </div>
              </div>
            )}

            {/* 错误/成功提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
              {success && !error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-green-600 dark:text-green-400"
                >
                  <CheckCircle size={18} />
                  <span className="text-sm">操作成功！</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 使用说明 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                📖 使用说明
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">1.</span>
                  <span>上传 Excel/CSV/JSON 数据文件，或使用示例数据</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">2.</span>
                  <span>配置报表标题和输出格式</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">3.</span>
                  <span>点击"生成报表"按钮开始生成</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">4.</span>
                  <span>生成完成后，点击下载按钮获取报表文件</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ReportAutomation;