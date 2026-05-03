import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, Presentation, Download, Settings, BarChart3, FileCheck, Loader, Database } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { getApiBaseUrl } from '@/lib/apiConfig';

interface DataRow {
  [key: string]: any;
}

interface ReportConfig {
  title: string;
  format: 'excel' | 'pdf' | 'ppt' | 'all';
  includeCharts: boolean;
}

const ReportAutomation: React.FC = () => {
  useTheme();
  const [data, setData] = useState<DataRow[]>([]);
  const [config, setConfig] = useState<ReportConfig>({
    title: '报表分析报告',
    format: 'all',
    includeCharts: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsGenerating(true);

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
        }
      }
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateReport = async () => {
    if (data.length === 0 && !uploadedFile) {
      alert('请先上传数据文件');
      return;
    }

    setIsGenerating(true);
    setResults(null);

    try {
      const response = await fetch(getApiBaseUrl() + '/api/automation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: data.length > 0 ? data : generateSampleData(),
          title: config.title,
          config: {
            include_charts: config.includeCharts
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setResults(result.files);
      } else {
        alert('生成报表失败');
      }
    } catch (error) {
      console.error('生成报表失败:', error);
      alert('生成报表失败: ' + (error as Error).message);
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
    const link = document.createElement('a');
    link.href = `getApiBaseUrl() + ${url}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                报表自动化
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                数据 → Excel → PDF → PPT 一键生成
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
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
                  <Database className="w-8 h-8 mx-auto mb-2 text-gray-400" />
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
                    className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-purple-500 py-2"
                  >
                    使用示例数据
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    输出格式
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
                      { value: 'pdf', label: 'PDF', icon: FileText },
                      { value: 'ppt', label: 'PPT', icon: Presentation },
                      { value: 'all', label: '全部', icon: Download }
                    ].map((fmt) => (
                      <button
                        key={fmt.value}
                        onClick={() => setConfig({ ...config, format: fmt.value as any })}
                        className={`flex items-center justify-center space-x-1 py-2 rounded-lg text-sm transition-colors ${
                          config.format === fmt.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <fmt.icon className="w-4 h-4" />
                        <span>{fmt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeCharts"
                    checked={config.includeCharts}
                    onChange={(e) => setConfig({ ...config, includeCharts: e.target.checked })}
                    className="w-4 h-4 text-purple-500"
                  />
                  <label htmlFor="includeCharts" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    包含图表
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full flex items-center justify-center space-x-2 bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isGenerating ? '生成中...' : '生成报表'}</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-9 space-y-6"
          >
            {data.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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

            {results && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileCheck className="w-5 h-5 mr-2 text-green-500" />
                  报表生成完成
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {results.excel && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center mb-2">
                        <FileSpreadsheet className="w-6 h-6 text-green-500" />
                        <span className="ml-2 font-medium">Excel报表</span>
                      </div>
                      <button
                        onClick={() => handleDownload(results.excel?.download_url || '', 'report.xlsx')}
                        className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载</span>
                      </button>
                    </div>
                  )}
                  {results.pdf && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center mb-2">
                        <FileText className="w-6 h-6 text-red-500" />
                        <span className="ml-2 font-medium">PDF报告</span>
                      </div>
                      <button
                        onClick={() => handleDownload(results.pdf?.download_url || '', 'report.pdf')}
                        className="w-full flex items-center justify-center space-x-2 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载</span>
                      </button>
                    </div>
                  )}
                  {results.ppt && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Presentation className="w-6 h-6 text-orange-500" />
                        <span className="ml-2 font-medium">PPT演示</span>
                      </div>
                      <button
                        onClick={() => handleDownload(results.ppt?.download_url || '', 'report.pptx')}
                        className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!results && data.length === 0 && !isGenerating && (
              <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 dark:text-gray-400">
                    请上传数据文件开始生成报表
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ReportAutomation;