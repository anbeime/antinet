import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, FolderOpen, Search, Trash2, Edit, Plus, HardDrive, Clock, Shield, BarChart3 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface DataFile {
  id: string;
  name: string;
  type: 'pdf' | 'ppt' | 'excel' | 'image' | 'text';
  size: string;
  modified: string;
  status: 'processed' | 'processing' | 'failed';
}

const DataManagement: React.FC = () => {
  const { theme } = useTheme();
  const [files, setFiles] = useState<DataFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    // 从后端 API 加载活动数据
    const loadActivities = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/data/activities?limit=20');
        if (response.ok) {
          const activities = await response.json();
          // 转换活动数据为文件格式（临时方案）
          const filesFromActivities = activities.map((activity: any, index: number) => ({
            id: String(activity.id),
            name: activity.content || '未命名文件',
            type: 'text' as const,
            size: '0KB',
            modified: activity.timestamp || new Date().toISOString(),
            status: 'processed' as const
          }));
          setFiles(filesFromActivities);
        } else {
          console.error('加载活动数据失败');
          // 降级到空数组
          setFiles([]);
        }
      } catch (error) {
        console.error('加载活动数据异常:', error);
        setFiles([]);
      }
    };
    
    loadActivities();
  }, []);

  const getFileIcon = (type: string) => {
    const icons = {
      pdf: <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><FileText className="w-5 h-5 text-red-500" /></div>,
      ppt: <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Presentation className="w-5 h-5 text-blue-500" /></div>,
      excel: <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-green-500" /></div>,
      image: <div className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><Image className="w-5 h-5 text-purple-500" /></div>,
      text: <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><FileText className="w-5 h-5 text-gray-500" /></div>
    };
    return icons[type as keyof typeof icons] || icons.text;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      processed: <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">已处理</span>,
      processing: <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full flex items-center"><Loader className="w-3 h-3 mr-1 animate-spin"/>处理中</span>,
      failed: <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full">失败</span>
    };
    return badges[status as keyof typeof badges] || badges.processed;
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const storageStats = {
    total: '15.2GB',
    used: '8.7GB',
    available: '6.5GB',
    usagePercent: 57
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
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                数据管理中心
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                统一管理所有上传的数据文件，支持NPU加速处理
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
                <Upload className="w-5 h-5 mr-2 text-indigo-500" />
                上传数据
              </h3>
              <button className="w-full bg-indigo-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>选择文件</span>
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">支持 PDF、PPT、Excel、图片等格式</p>
            </div>

            {/* Storage Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <HardDrive className="w-5 h-5 mr-2 text-indigo-500" />
                存储状态
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">已使用</span>
                  <span className="font-medium">{storageStats.used} / {storageStats.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <motion.div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${storageStats.usagePercent}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  可用空间: {storageStats.available}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-indigo-500" />
                数据保护
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>端侧处理，数据不出域</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>NPU加密加速</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>本地存储加密</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-9 space-y-6"
          >
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索文件..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-64 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">所有类型</option>
                    <option value="pdf">PDF</option>
                    <option value="ppt">PPT</option>
                    <option value="excel">Excel</option>
                    <option value="image">图片</option>
                    <option value="text">文档</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm">批量操作</button>
                  <button className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm">刷新</button>
                </div>
              </div>
            </div>

            {/* Files List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold flex items-center">
                  <FolderOpen className="w-5 h-5 mr-2 text-indigo-500" />
                  文件库 ({filteredFiles.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-6 py-3">文件名</th>
                      <th scope="col" className="px-6 py-3">大小</th>
                      <th scope="col" className="px-6 py-3">修改时间</th>
                      <th scope="col" className="px-6 py-3">状态</th>
                      <th scope="col" className="px-6 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map(file => (
                      <tr key={file.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(file.type)}
                            <span>{file.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{file.size}</td>
                        <td className="px-6 py-4">{file.modified}</td>
                        <td className="px-6 py-4">{getStatusBadge(file.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Edit className="w-4 h-4" /></button>
                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Download className="w-4 h-4" /></button>
                            <button className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Processing Queue */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-indigo-500" />
                  NPU处理队列
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Loader className="w-5 h-5 text-yellow-500 animate-spin" />
                      <span className="font-medium">会议纪要.docx</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">分析中... 65%</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium">项目报告.pdf</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">已完成</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;