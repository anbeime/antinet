import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileType, Loader, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// 定义卡片类型
interface KnowledgeCard {
  id: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
  title: string;
  content: string;
  address: string;
  createdAt: string;
  tags?: string[];
  source?: string;
}

interface CardExporterProps {
  cards: KnowledgeCard[];
  fileName?: string;
  title?: string;
  author?: string;
  apiBase?: string;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
  variant?: 'buttons' | 'dropdown' | 'split';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const API_BASE = 'http://localhost:8000';

const CardExporter: React.FC<CardExporterProps> = ({
  cards,
  fileName = 'antinet_report',
  title = 'Antinet 分析报告',
  author = 'Antinet 智能知识管家',
  apiBase = API_BASE,
  onExportStart,
  onExportComplete,
  onExportError,
  variant = 'buttons',
  size = 'md',
  className = ''
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'word' | 'excel'>('word');
  const [showDropdown, setShowDropdown] = useState(false);

  // 尺寸配置
  const sizeConfig = {
    sm: {
      button: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-1.5'
    },
    md: {
      button: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2'
    },
    lg: {
      button: 'px-6 py-3 text-lg',
      icon: 'w-6 h-6',
      gap: 'gap-3'
    }
  };

  // 导出为 Word
  const exportToWord = async () => {
    if (!cards || cards.length === 0) {
      toast.warning('没有可导出的卡片');
      return;
    }

    setIsExporting(true);
    onExportStart?.();

    try {
      // 转换卡片格式以适配后端 API
      const cardsForExport = cards.map(card => ({
        type: card.color === 'blue' ? 'fact' : 
              card.color === 'green' ? 'interpret' : 
              card.color === 'yellow' ? 'risk' : 'action',
        title: card.title,
        content: card.content,
        tags: card.tags || [],
        source: card.source || card.address || 'Antinet'
      }));

      const response = await fetch(`${apiBase}/api/pdf/export/cards-docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cards: cardsForExport,
          title: title,
          author: author
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const finalFileName = `${fileName}.docx`;
        
        // 下载文件
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Word 文档导出成功！');
        onExportComplete?.();
      } else {
        const error = await response.json();
        const errorMsg = error.detail || '导出失败';
        toast.error(`导出失败: ${errorMsg}`);
        onExportError?.(errorMsg);
      }
    } catch (error) {
      console.error('Word 导出失败:', error);
      const errorMsg = 'Word 导出失败，请检查后端服务';
      toast.error(errorMsg);
      onExportError?.(errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  // 导出为 Excel
  const exportToExcel = async () => {
    if (!cards || cards.length === 0) {
      toast.warning('没有可导出的卡片');
      return;
    }

    setIsExporting(true);
    onExportStart?.();

    try {
      // 转换为 Excel 格式
      const excelData = cards.map(card => ({
        '类型': card.color === 'blue' ? '事实' : 
                card.color === 'green' ? '解释' : 
                card.color === 'yellow' ? '风险' : '行动',
        '标题': card.title,
        '内容': card.content,
        '地址': card.address,
        '创建时间': card.createdAt,
        '标签': (card.tags || []).join(', '),
        '来源': card.source || ''
      }));

      // 使用 SheetJS 导出
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '知识卡片');
      
      // 设置列宽
      const wscols = [
        {wch: 10},  // 类型
        {wch: 30},  // 标题
        {wch: 60},  // 内容
        {wch: 30},  // 地址
        {wch: 20},  // 创建时间
        {wch: 20},  // 标签
        {wch: 20},  // 来源
      ];
      ws['!cols'] = wscols;

      XLSX.writeFile(wb, `${fileName}.xlsx`);
      
      toast.success('Excel 导出成功！');
      onExportComplete?.();
    } catch (error) {
      console.error('Excel 导出失败:', error);
      const errorMsg = 'Excel 导出失败，请确保已安装 xlsx 库';
      toast.error(errorMsg);
      onExportError?.(errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  // 根据格式导出
  const handleExport = async (format: 'word' | 'excel') => {
    if (format === 'word') {
      await exportToWord();
    } else {
      await exportToExcel();
    }
    setShowDropdown(false);
  };

  // 按钮变体
  if (variant === 'buttons') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => handleExport('word')}
          disabled={isExporting}
          className={`
            flex items-center ${sizeConfig[size].gap} ${sizeConfig[size].button}
            bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="导出为 Word 文档（推荐，完美支持中文）"
        >
          {isExporting && exportFormat === 'word' ? (
            <Loader className={`${sizeConfig[size].icon} animate-spin`} />
          ) : (
            <FileType className={sizeConfig[size].icon} />
          )}
          <span>导出 Word</span>
        </button>
        
        <button
          onClick={() => handleExport('excel')}
          disabled={isExporting}
          className={`
            flex items-center ${sizeConfig[size].gap} ${sizeConfig[size].button}
            bg-green-600 hover:bg-green-700 text-white rounded-lg 
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="导出为 Excel 表格"
        >
          {isExporting && exportFormat === 'excel' ? (
            <Loader className={`${sizeConfig[size].icon} animate-spin`} />
          ) : (
            <FileSpreadsheet className={sizeConfig[size].icon} />
          )}
          <span>导出 Excel</span>
        </button>
      </div>
    );
  }

  // 下拉菜单变体
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isExporting}
          className={`
            flex items-center ${sizeConfig[size].gap} ${sizeConfig[size].button}
            bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isExporting ? (
            <Loader className={`${sizeConfig[size].icon} animate-spin`} />
          ) : (
            <Download className={sizeConfig[size].icon} />
          )}
          <span>导出</span>
          <ChevronDown className={`${sizeConfig[size].icon} transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20">
              <button
                onClick={() => {
                  setExportFormat('word');
                  handleExport('word');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors"
              >
                <FileType className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Word 文档</div>
                  <div className="text-xs text-gray-500">推荐，完美支持中文</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setExportFormat('excel');
                  handleExport('excel');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Excel 表格</div>
                  <div className="text-xs text-gray-500">数据表格格式</div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // 分割按钮变体（主按钮 + 下拉）
  return (
    <div className={`flex items-center ${className}`}>
      <button
        onClick={() => handleExport('word')}
        disabled={isExporting}
        className={`
          flex items-center ${sizeConfig[size].gap} ${sizeConfig[size].button}
          bg-blue-600 hover:bg-blue-700 text-white rounded-l-lg 
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          border-r border-blue-500
        `}
      >
        {isExporting ? (
          <Loader className={`${sizeConfig[size].icon} animate-spin`} />
        ) : (
          <FileType className={sizeConfig[size].icon} />
        )}
        <span>导出 Word</span>
      </button>
      
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isExporting}
          className={`
            flex items-center justify-center ${sizeConfig[size].button}
            bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg 
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <ChevronDown className={`${sizeConfig[size].icon} transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20">
              <button
                onClick={() => handleExport('excel')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">导出 Excel</div>
                  <div className="text-xs text-gray-500">数据表格格式</div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardExporter;
