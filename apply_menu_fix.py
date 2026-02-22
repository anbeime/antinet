"""
应用菜单修复 - 使用更简单的方法
"""
import re

file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到菜单开始和结束的行号
start_line = None
end_line = None

for i, line in enumerate(lines):
    if 'hidden md:flex items-center space-x-6' in line:
        start_line = i
    if start_line and '</div>' in line and i > start_line + 10:
        # 检查这是否是菜单容器的结束
        # 通过检查缩进或上下文
        end_line = i
        break

if start_line and end_line:
    print(f"找到菜单代码: 第 {start_line + 1} 行到第 {end_line + 1} 行")
    
    # 新的菜单代码
    new_menu_lines = '''          <div className="hidden md:flex items-center space-x-1">
            {/* 概览 */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
            >
              <Database size={18} />
              <span>概览</span>
            </button>

            {/* 知识管理下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${['cards', 'data-management'].includes(activeTab) ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
              >
                <Briefcase size={18} />
                <span>知识管理</span>
                <ChevronDown size={14} className="ml-1" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg flex items-center space-x-2 ${activeTab === 'cards' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Layers size={16} />
                  <span>知识卡片</span>
                </button>
                <button
                  onClick={() => setActiveTab('data-management')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg flex items-center space-x-2 ${activeTab === 'data-management' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <ListTodo size={16} />
                  <span>任务管理</span>
                </button>
              </div>
            </div>

            {/* 文档中心下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${['pdf-analysis', 'ppt-analysis', 'excel-analysis', 'batch-process'].includes(activeTab) ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
              >
                <FileText size={18} />
                <span>文档中心</span>
                <ChevronDown size={14} className="ml-1" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('pdf-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg flex items-center space-x-2 ${activeTab === 'pdf-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <FileText size={16} />
                  <span>PDF分析</span>
                </button>
                <button
                  onClick={() => setActiveTab('ppt-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'ppt-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Presentation size={16} />
                  <span>PPT生成</span>
                </button>
                <button
                  onClick={() => setActiveTab('excel-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'excel-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Table size={16} />
                  <span>Excel分析</span>
                </button>
                <button
                  onClick={() => setActiveTab('batch-process')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg flex items-center space-x-2 ${activeTab === 'batch-process' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Upload size={16} />
                  <span>批量处理</span>
                </button>
              </div>
            </div>

            {/* AI工具下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${['data-analysis', 'agent-system', 'skill-center', 'multi-model'].includes(activeTab) ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
              >
                <Cpu size={18} />
                <span>AI工具</span>
                <ChevronDown size={14} className="ml-1" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('data-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg flex items-center space-x-2 ${activeTab === 'data-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <TrendingUp size={16} />
                  <span>智能分析</span>
                </button>
                <button
                  onClick={() => setActiveTab('agent-system')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'agent-system' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Bot size={16} />
                  <span>Agent系统</span>
                </button>
                <button
                  onClick={() => setActiveTab('skill-center')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'skill-center' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Sparkles size={16} />
                  <span>技能中心</span>
                </button>
                <button
                  onClick={() => setActiveTab('multi-model')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg flex items-center space-x-2 ${activeTab === 'multi-model' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Layers size={16} />
                  <span>多模型</span>
                </button>
              </div>
            </div>
          </div>
'''
    
    # 替换菜单代码
    new_lines = lines[:start_line] + [new_menu_lines] + lines[end_line+1:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print("✅ 菜单修复成功")
else:
    print(f"❌ 未找到菜单代码")
    if start_line:
        print(f"找到开始行: {start_line + 1}")
    if end_line:
        print(f"找到结束行: {end_line + 1}")
