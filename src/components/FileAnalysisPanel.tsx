// src/components/FileAnalysisPanel.tsx - 文件分析面板
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Download, Loader, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000';

interface AnalysisResult {
  status: string;
  message: string;
  uploaded_file: string;
  output_file: string;
  download_url: string;
  cards_count: number;
  data_rows: number;
}

interface HistoryItem {
  filename: string;
  size: number;
  created_at: string;
}

const FileAnalysisPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState('请分析这份数据');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/list-analyses`);
      const data = await response.json();
      setHistory(data.files || []);
    } catch (error) {
      console.error('获取历史分析失败:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // 检查文件类型
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!validTypes.includes(fileExt)) {
        toast('请上传 CSV 或 Excel 文件', {
          className: 'bg-amber-50 text-amber-800'
        });
        return;
      }
      
      setFile(selectedFile);
      toast(`✓ 已选择文件: ${selectedFile.name}`, {
        className: 'bg-green-50 text-green-800'
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast('请先选择文件', {
        className: 'bg-amber-50 text-amber-800'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('query', query);
      formData.append('include_charts', 'true');

      const response = await fetch(`${API_BASE_URL}/api/analysis/upload-and-analyze`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const data = await response.json();
      setResult(data);
      
      toast('✓ 分析完成！', {
        className: 'bg-green-50 text-green-800'
      });
      
      // 刷新历史列表
      fetchHistory();
    } catch (error) {
      console.error('分析失败:', error);
      toast(`✗ 分析失败: ${error}`, {
        className: 'bg-red-50 text-red-800'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* 标题 */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Upload className="w-8 h-8 mr-2" />
          文件分析
        </h1>
        <p className="text-green-100">
          上传 CSV 或 Excel 文件，使用 8-Agent 系统进行智能分析，生成四色卡片和完整报告
        </p>
      </div>

      {/* 上传区域 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">上传文件</h2>
        
        <div className="space-y-4">
          {/* 文件选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">选择文件</label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  file ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                }`}>
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-sm text-gray-500">({(file.size / 1024).toFixed(2)} KB)</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        点击选择文件或拖拽文件到此处
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        支持 CSV, Excel (.xlsx, .xls) 格式
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {file && (
                <button
                  onClick={() => setFile(null)}
                  className="px-4 py-2 text-red-600 hover:text-red-700"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {/* 分析需求 */}
          <div>
            <label className="block text-sm font-medium mb-2">分析需求</label>
            <input
              type="text"
              placeholder="例如：分析销售趋势并识别风险"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              描述您希望从数据中获得什么样的分析结果
            </p>
          </div>

          {/* 上传按钮 */}
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                上传并分析
              </>
            )}
          </button>
        </div>
      </div>

      {/* 分析结果 */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-green-500"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold">分析完成</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">生成卡片</p>
              <p className="text-2xl font-bold text-blue-600">{result.cards_count}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">数据行数</p>
              <p className="text-2xl font-bold text-green-600">{result.data_rows}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">上传文件</p>
              <p className="text-sm font-medium text-purple-600 truncate">{result.uploaded_file}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">输出文件</p>
              <p className="text-sm font-medium text-orange-600 truncate">{result.output_file}</p>
            </div>
          </div>

          <a
            href={`${API_BASE_URL}${result.download_url}`}
            download
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download className="w-5 h-5" />
            下载分析报告
          </a>
        </motion.div>
      )}

      {/* 历史分析 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">历史分析</h2>
        
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无历史分析记录
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item, index) => (
              <div key={index} className="border dark:border-gray-700 rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium">{item.filename}</p>
                    <p className="text-sm text-gray-500">
                      大小: {(item.size / 1024).toFixed(2)} KB | 
                      时间: {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <a
                  href={`${API_BASE_URL}/api/analysis/download/${item.filename}`}
                  download
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors"
                >
                  <Download size={16} />
                  下载
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileAnalysisPanel;
