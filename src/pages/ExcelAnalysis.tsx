import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Upload, BarChart3, Table, Filter, Download, Calculator, TrendingUp, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Column {
  key: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sample: any;
}

interface DataRow {
  [key: string]: any;
}

interface AnalysisStats {
  totalRows: number;
  totalColumns: number;
  numericColumns: number;
  textColumns: number;
  dateColumns: number;
  missingValues: number;
  duplicates: number;
}

const ExcelAnalysis: React.FC = () => {
  const { theme } = useTheme();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeSheet, setActiveSheet] = useState('Sheet1');

  const mockData: DataRow[] = [
    { id: 1, name: '张三', age: 28, department: '技术部', salary: 12000, join_date: '2022-01-15', performance: 85 },
    { id: 2, name: '李四', age: 32, department: '销售部', salary: 15000, join_date: '2021-06-20', performance: 92 },
    { id: 3, name: '王五', age: 26, department: '技术部', salary: 10000, join_date: '2023-03-10', performance: 78 },
    { id: 4, name: '赵六', age: 35, department: '市场部', salary: 13000, join_date: '2020-11-05', performance: 88 },
    { id: 5, name: '钱七', age: 29, department: '人事部', salary: 11000, join_date: '2022-08-12', performance: 90 }
  ];

  const mockColumns: Column[] = [
    { key: 'id', name: 'ID', type: 'number', sample: 1 },
    { key: 'name', name: '姓名', type: 'string', sample: '张三' },
    { key: 'age', name: '年龄', type: 'number', sample: 28 },
    { key: 'department', name: '部门', type: 'string', sample: '技术部' },
    { key: 'salary', name: '薪资', type: 'number', sample: 12000 },
    { key: 'join_date', name: '入职日期', type: 'date', sample: '2022-01-15' },
    { key: 'performance', name: '绩效评分', type: 'number', sample: 85 }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setUploadedFile(file);
      setIsAnalyzing(true);
      
      setTimeout(() => {
        setData(mockData);
        setColumns(mockColumns);
        setStats({
          totalRows: 5,
          totalColumns: 7,
          numericColumns: 4,
          textColumns: 2,
          dateColumns: 1,
          missingValues: 0,
          duplicates: 0
        });
        setIsAnalyzing(false);
      }, 1500);
    }
  };

  const renderDataTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {columns.map(col => (
              <th key={col.key} scope="col" className="px-6 py-3">
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, index) => (
            <tr key={index} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              {columns.map(col => (
                <td key={col.key} className="px-6 py-4">
                  {col.type === 'number' ? row[col.key]?.toLocaleString() : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 10 && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          显示前10行，共{data.length}行数据
        </div>
      )}
    </div>
  );

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
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Excel智能分析
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                数据洞察、统计分析、可视化图表生成
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-green-500" />
                上传表格
              </h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-green-400 dark:hover:border-green-500 transition-colors">
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {uploadedFile ? uploadedFile.name : '选择Excel文件'}
                  </p>
                </label>
              </div>
            </div>

            {/* Analysis Tools */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-green-500" />
                分析工具
              </h3>
              <div className="space-y-2">
                {['数据统计', '趋势分析', '相关性分析', '异常检测', '预测建模'].map(tool => (
                  <button key={tool} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            {/* Export */}
            <button className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">
              <Download className="w-4 h-4" />
              <span>导出分析报告</span>
            </button>
          </motion.div>

          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-9 space-y-6"
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div className="text-center">
                  <Loader className="w-8 h-8 mx-auto animate-spin text-green-500 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">正在分析Excel数据...</p>
                </div>
              </div>
            ) : stats ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">总行数</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalRows}</p>
                      </div>
                      <Table className="w-8 h-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">列数</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalColumns}</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">数值列</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.numericColumns}</p>
                      </div>
                      <Calculator className="w-8 h-8 text-orange-500" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">缺失值</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.missingValues}</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                </div>

                {/* Data Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Table className="w-5 h-5 mr-2 text-green-500" />
                      数据预览
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      显示数据表格的前10行
                    </p>
                  </div>
                  <div className="p-6">
                    {renderDataTable()}
                  </div>
                </div>

                {/* Quick Insights */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                      快速洞察
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">薪资分析</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">平均薪资: ¥12,200，技术部薪资相对较低</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">绩效分布</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">平均绩效: 86.6分，销售部表现最佳</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">等待Excel上传</h3>
                  <p className="text-gray-500 dark:text-gray-400">上传Excel文件开始智能数据分析</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ExcelAnalysis;