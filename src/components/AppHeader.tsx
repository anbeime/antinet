import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Database, Briefcase, ListTodo, Users, FolderOpen, FileText, Presentation, Table, Cpu, Bot, Sparkles, ChevronDown, Menu, BookOpen } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/', label: '概览', icon: <Database size={18} /> },
    { path: '/?tab=cards-management', label: '知识管理', icon: <Briefcase size={18} /> },
    { path: '/?tab=data-management', label: '任务管理', icon: <ListTodo size={18} /> },
    { path: '/?tab=virtual-office-meeting', label: '智能协作会议', icon: <Users size={18} /> },
  ];

  const docItems = [
    { path: '/?tab=pdf-analysis', label: 'PDF分析器', icon: <FileText size={16} /> },
    { path: '/?tab=ppt-analysis', label: 'PPT生成', icon: <Presentation size={16} /> },
    { path: '/?tab=excel-analysis', label: 'Excel/在线表格', icon: <Table size={16} /> },
  ];

  const aiItems = [
    { path: '/agent-system', label: 'Agent系统', icon: <Bot size={16} /> },
    { path: '/book-skill', label: '书籍方法论', icon: <BookOpen size={16} /> },
    { path: '/?tab=skill-center', label: '技能中心', icon: <Sparkles size={16} /> },
  ];

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center"
          >
            <Brain className="w-5 h-5 text-white" />
          </motion.div>
          <h1
            className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer"
            onClick={() => handleNav('/')}
          >
            知易智能知识管家
          </h1>
        </div>

        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${isActive(item.path) ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          <div className="relative group">
            <button className="flex items-center space-x-1 px-3 py-2 border-b-2 border-transparent hover:text-blue-500">
              <FolderOpen size={18} />
              <span>文档处理</span>
              <ChevronDown size={14} className="ml-1" />
            </button>
            <div className="absolute top-full left-0 mt-0 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {docItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative group">
            <button className="flex items-center space-x-1 px-3 py-2 border-b-2 border-transparent hover:text-blue-500">
              <Cpu size={18} />
              <span>AI工具</span>
              <ChevronDown size={14} className="ml-1" />
            </button>
            <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {aiItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            {theme === 'light' ? '[暗]' : '[亮]'}
          </button>
          <button
            className="flex md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-[60px] left-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-50 md:hidden overflow-y-auto max-h-[calc(100vh-60px)]">
            <div className="p-2">
              <button onClick={() => handleNav('/')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <Database size={16} /><span>概览</span>
              </button>
              <button onClick={() => handleNav('/?tab=cards-management')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <Briefcase size={16} /><span>知识管理</span>
              </button>
              <button onClick={() => handleNav('/?tab=data-management')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <ListTodo size={16} /><span>任务管理</span>
              </button>
              <button onClick={() => handleNav('/?tab=virtual-office-meeting')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <Users size={16} /><span>团队会议</span>
              </button>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">文档处理</div>
              <button onClick={() => handleNav('/?tab=pdf-analysis')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <FileText size={16} /><span>PDF分析器</span>
              </button>
              <button onClick={() => handleNav('/?tab=ppt-analysis')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <Presentation size={16} /><span>PPT生成</span>
              </button>
              <button onClick={() => handleNav('/?tab=excel-analysis')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <Table size={16} /><span>Excel/在线表格</span>
              </button>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">AI工具</div>
              <button onClick={() => handleNav('/agent-system')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <Bot size={16} /><span>Agent系统</span>
              </button>
              <button onClick={() => handleNav('/book-skill')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <BookOpen size={16} /><span>书籍方法论</span>
              </button>
              <button onClick={() => handleNav('/?tab=skill-center')} className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2">
                <Sparkles size={16} /><span>技能中心</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default AppHeader;
