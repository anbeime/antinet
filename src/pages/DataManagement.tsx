import React from 'react';
import { motion } from 'framer-motion';
import { ListTodo } from 'lucide-react';
import GTDSystem from '@/components/GTDSystem';

/**
 * 数据管理页面 - 仅保留GTD任务管理
 * 知识卡片管理已移至知识卡片页面
 */
const DataManagement: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <ListTodo className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              任务管理
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              GTD任务管理系统 - 收集、处理、组织、回顾、执行
            </p>
          </div>
        </div>
      </div>

      {/* GTD任务管理系统 */}
      <GTDSystem />
    </motion.div>
  );
};

export default DataManagement;
