import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Upload, BarChart3, Table, Download, Calculator, TrendingUp, AlertTriangle, Loader, FileText, Presentation, Edit3, Save, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { getApiBaseUrl } from '@/lib/apiConfig';

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
  useTheme();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeFeature, setActiveFeature] = useState<'analysis' | 'editor'>('analysis');

  // 检查是否需要直接打开编辑器
  useEffect(() => {
    if (localStorage.getItem('openExcelEditor') === 'true') {
      localStorage.removeItem('openExcelEditor');
      setActiveFeature('editor');
    }
  }, []);

  // 在线编辑功能
  const [editData, setEditData] = useState<string[][]>([]);
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [editValue, setEditValue] = useState('');

  // 将分析数据转换为可编辑格式
  useEffect(() => {
    if (data.length > 0 && columns.length > 0) {
      const editable: string[][] = [
        columns.map(c => c.name),
        ...data.slice(0, 1000).map(row => columns.map(c => String(row[c.key] ?? '')))
      ];
      setEditData(editable);
    }
  }, [data, columns]);

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newData = [...editData];
    newData[rowIdx][colIdx] = value;
    setEditData(newData);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setUploadedFile(file);
      setIsAnalyzing(true);
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(getApiBaseUrl() + '/api/analysis/upload-and-analyze', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.data && result.columns) {
            setData(result.data);
            setColumns(result.columns);
            setStats(result.stats || {
              totalRows: result.data.length,
              totalColumns: result.columns.length,
              numericColumns: 0,
              textColumns: result.columns.length,
              dateColumns: 0,
              missingValues: 0,
              duplicates: 0
            });
          }
        } else {
          alert('文件分析失败');
        }
      } catch (error) {
        console.error('上传失败:', error);
        alert('上传失败');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleExportReport = async () => {
    if (data.length === 0) {
      alert('请先上传并分析Excel文件');
      return;
    }

    try {
      // 构建导出数据
      const exportData: any = {
        analysis_info: {
          title: `${uploadedFile?.name || 'Excel'} 分析报告`,
          date: new Date().toISOString().split('T')[0],
          data_source: uploadedFile?.name || 'unknown',
          card_counts: {
            fact: 1,
            interpret: 1,
            risk: 1,
            action: 1
          },
          summary: `数据分析报告，包含 ${data.length} 行数据，${columns.length} 列字段`
        },
        cards_by_type: {
          fact: [{
            id: 'fact_001',
            title: '数据概览',
            content: `本次分析共处理 ${stats?.totalRows || data.length} 行数据，包含 ${stats?.totalColumns || columns.length} 个列。其中数值列 ${stats?.numericColumns || 0} 个，文本列 ${stats?.textColumns || 0} 个。`,
            card_type: 'blue',
            category: '数据分析'
          }],
          interpret: [{
            id: 'interpret_001',
            title: '数据质量分析',
            content: `数据完整性分析：发现 ${stats?.missingValues || 0} 个缺失值。${stats?.duplicates ? `重复数据 ${stats.duplicates} 行。` : ''}`,
            card_type: 'green',
            category: '数据质量'
          }],
          risk: [{
            id: 'risk_001',
            title: '数据风险提示',
            content: stats?.missingValues ? '数据存在缺失值，可能影响分析准确性。建议清理或补充数据。' : '数据质量良好，无明显风险。',
            card_type: 'yellow',
            category: '风险提示'
          }],
          action: [{
            id: 'action_001',
            title: '优化建议',
            content: stats?.missingValues ? '建议：清理缺失值或补充数据。继续进行深入的数据探索和可视化分析。' : '建议：继续进行深入的数据探索和可视化分析。',
            card_type: 'red',
            category: '行动建议'
          }]
        },
        data_sheets: {
          '原始数据': data.slice(0, 1000)
        },
        filename: `analysis_${uploadedFile?.name?.replace(/\.[^/.]+$/, '') || 'export'}.xlsx`
      };

      // 添加统计摘要
      if (stats) {
        exportData.data_sheets['统计摘要'] = [stats];
      }

      const response = await fetch(getApiBaseUrl() + '/api/excel/export-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
      });

      if (response.ok) {
        const result = await response.json();
        const link = document.createElement('a');
        link.href = `getApiBaseUrl() + ${result.download_url}`;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('分析报告导出成功！');
      } else {
        const errorText = await response.text();
        console.error('导出失败:', errorText);
        alert('导出失败: ' + errorText);
      }
    } catch (error) {
      console.error('导出异常:', error);
      alert('导出失败: ' + (error as Error).message);
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

        {/* 功能切换标签 */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveFeature('analysis')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFeature === 'analysis' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            数据分析
          </button>
          <button
            onClick={() => setActiveFeature('editor')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFeature === 'editor' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Edit3 className="w-4 h-4 inline mr-2" />
            在线编辑
          </button>
        </div>

        {/* 功能内容 */}
        {activeFeature === 'analysis' ? (
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
                上传文件
              </h3>
              <label className="block">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    点击上传Excel文件
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    支持 .xlsx, .xls 格式
                  </p>
                </div>
              </label>
              {uploadedFile && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    {uploadedFile.name}
                  </p>
                </div>
              )}
            </div>

            {/* Stats */}
            {stats && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                  数据统计
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">总行数</span>
                    <span className="font-semibold">{stats.totalRows.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">总列数</span>
                    <span className="font-semibold">{stats.totalColumns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">数值列</span>
                    <span className="font-semibold text-blue-600">{stats.numericColumns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">文本列</span>
                    <span className="font-semibold text-green-600">{stats.textColumns}</span>
                  </div>
                  {stats.missingValues > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">缺失值</span>
                      <span className="font-semibold text-yellow-600">{stats.missingValues}</span>
                    </div>
                  )}
                  {stats.duplicates > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">重复行</span>
                      <span className="font-semibold text-red-600">{stats.duplicates}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analysis Tools */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-green-500" />
                在线查看
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={() => window.open('http://localhost:3000/office-docs', '_blank')}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm flex items-center space-x-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-500" />
                  <span>在线表格</span>
                </button>
                <button 
                  onClick={() => window.open('http://localhost:3000/pdf-viewer', '_blank')}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  <span>PDF查看器</span>
                </button>
                <button 
                  onClick={() => window.open('http://localhost:3000/ppt-viewer', '_blank')}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm flex items-center space-x-2"
                >
                  <Presentation className="w-4 h-4 text-orange-500" />
                  <span>PPT演示</span>
                </button>
                <button 
                  onClick={() => window.open('http://localhost:3000/report-automation', '_blank')}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm flex items-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span>报表生成</span>
                </button>
                <button 
                  onClick={() => window.open('http://localhost:3000/knowledge-graph', '_blank')}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm flex items-center space-x-2"
                >
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.6c-.15-.41-.24-.86-.24-1.33 0-1.1.9-2 2-2v1c0-.55.45-1 1-1H17V9.5c0-.28-.22-.5-.5-.5s-.5.22-.5.5V11H14v-.5c0-.28-.22-.5-.5-.5s-.5.22-.5.5V13h-2V9.5c0-.28-.22-.5-.5-.5s-.5.22-.5.5V15c0 2.21 1.79 4 4 4v1c-1.1 0-2-.9-2-2v-1H9v1c-1.1 0-2-.9-2-2 0-.62.08-1.21.21-1.79L5.21 16.3C5.08 15.62 5 14.87 5 14c0-3.86 3.14-7 7-7 1.03 0 2 .22 2.88.63V5c0-.55.45-1 1-1s1 .45 1 1v3.88c.88-.41 1.85-.63 2.87-.63 4.07 0 7.38 3.32 7.38 7.38 0 .62-.08 1.21-.21 1.79l-1.96 1.45c.13.58.21 1.23.21 1.85 0 2.21-1.79 4-4 4v-1z"/>
                  </svg>
                  <span>知识图谱</span>
                </button>
                <button 
                  onClick={() => window.open('http://localhost:3000/mindmap', '_blank')}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm flex items-center space-x-2"
                >
                  <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  <span>思维导图</span>
                </button>
              </div>
            </div>

            {/* Export */}
            <button
              onClick={handleExportReport}
              className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
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
                {/* Data Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Table className="w-5 h-5 mr-2 text-blue-500" />
                      数据预览
                    </h3>
                    <span className="text-sm text-gray-500">
                      显示 {editData.length > 0 ? editData.length - 1 : data.length} 行
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-2 py-2 text-xs w-8">#</th>
                          {columns.map(col => (
                            <th key={col.key} className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              <div className="flex items-center space-x-1">
                                <span>{col.name}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  col.type === 'number' ? 'bg-blue-100 text-blue-700' :
                                  col.type === 'date' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {col.type}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {editData.length > 0 ? editData.slice(1).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-2 py-1 text-xs text-gray-400 w-8">{idx + 1}</td>
                            {row.map((cell, cidx) => (
                              <td key={cidx} className="px-1 py-1">
                                {editingCell?.row === idx + 1 && editingCell?.col === cidx ? (
                                  <input
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={() => { updateCell(idx + 1, cidx, editValue); setEditingCell(null); }}
                                    onKeyDown={e => e.key === 'Enter' && (updateCell(idx + 1, cidx, editValue), setEditingCell(null))}
                                    className="w-full px-2 py-1 bg-blue-50 outline-blue-500 text-sm"
                                    autoFocus
                                  />
                                ) : (
                                  <div 
                                    onClick={() => { setEditingCell({row: idx + 1, col: cidx}); setEditValue(cell); }} 
                                    className="px-2 py-1 cursor-text hover:bg-blue-50 min-h-[28px] text-sm"
                                  >
                                    {cell || '-'}
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        )) : data.slice(0, 100).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-2 py-1 text-xs text-gray-400 w-8">{idx + 1}</td>
                            {columns.map(col => (
                              <td key={col.key} className="px-2 py-1 text-sm text-gray-900 dark:text-gray-100">
                                {row[col.key] !== null && row[col.key] !== undefined ? String(row[col.key]) : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Column Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                    字段信息
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {columns.map(col => (
                      <div key={col.key} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{col.name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            col.type === 'number' ? 'bg-blue-100 text-blue-700' :
                            col.type === 'date' ? 'bg-green-100 text-green-700' :
                            col.type === 'boolean' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {col.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          示例: {col.sample !== null && col.sample !== undefined ? String(col.sample).substring(0, 50) : '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 dark:text-gray-400">请上传Excel文件开始分析</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
        ) : (
          <SimpleSpreadsheetEditor 
            initialData={data.length > 0 ? [
              columns.map(c => c.name),
              ...data.slice(0, 100).map(row => columns.map(c => String(row[c.key] ?? '')))
            ] : undefined}
            onSave={(savedData) => {
              console.log('Saved data:', savedData);
              // 可以选择导出或进一步处理
            }} 
          />
        )}
      </div>
    </div>
  );
};

// 简单在线表格编辑器
const SimpleSpreadsheetEditor: React.FC<{ initialData?: string[][], onSave?: (data: string[][]) => void }> = ({ initialData, onSave }) => {
  const [rows, setRows] = useState<string[][]>(initialData || [['字段1', '字段2', '字段3'], ['', '', '']]);
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [editValue, setEditValue] = useState('');

  const addRow = () => setRows([...rows, Array(rows[0]?.length || 3).fill('')]);
  const addCol = () => setRows(rows.map(r => [...r, '']));
  const updateCell = (r: number, c: number, v: string) => {
    const newRows = [...rows];
    newRows[r][c] = v;
    setRows(newRows);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-auto max-h-[500px]">
      <div className="sticky top-0 bg-gray-100 dark:bg-gray-700 px-3 py-2 flex items-center justify-between z-10">
        <span className="font-semibold text-sm">在线表格</span>
        <div className="flex space-x-1">
          <button onClick={addRow} className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600" title="添加行"><Plus className="w-3 h-3" /></button>
          <button onClick={addCol} className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600" title="添加列"><Plus className="w-3 h-3 rotate-90" /></button>
          <button onClick={() => onSave?.(rows)} className="p-1 bg-green-500 text-white rounded hover:bg-green-600" title="保存"><Save className="w-3 h-3" /></button>
        </div>
      </div>
      <table className="w-full text-sm border-collapse">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="w-8 p-1 bg-gray-50 dark:bg-gray-700 border text-center text-xs">{ri + 1}</td>
              {row.map((cell, ci) => (
                <td key={ci} className="border">
                  {editingCell?.row === ri && editingCell?.col === ci ? (
                    <input
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => { updateCell(ri, ci, editValue); setEditingCell(null); }}
                      onKeyDown={e => e.key === 'Enter' && (updateCell(ri, ci, editValue), setEditingCell(null))}
                      className="w-full px-2 py-1 bg-blue-50 outline-blue-500" autoFocus
                    />
                  ) : (
                    <div onClick={() => { setEditingCell({row: ri, col: ci}); setEditValue(cell); }} 
                      className="w-full px-2 py-1 cursor-text hover:bg-gray-50 min-h-[28px]">{cell || '-'}</div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExcelAnalysis;
