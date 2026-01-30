import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  Circle, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { checklistService, Section as SectionType } from '@/services/dataService';



const LuhmannSystemChecklist: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    philosophy: true,
    implementation: true,
    workflow: true,
    advanced: false,
    thinking: false,
    cases: false,
    solutions: false,
    evaluation: false
  });

  // 切换部分展开/折叠
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // 获取状态图标
  const getStatusIcon = (status: 'completed' | 'partial' | 'missing') => {
    switch(status) {
      case 'completed':
        return <CheckCircle2 className="text-green-500" size={18} />;
      case 'partial':
        return <AlertCircle className="text-amber-500" size={18} />;
      case 'missing':
        return <Circle className="text-gray-400" size={18} />;
    }
  };

  // 检查列表数据
  const [sections, setSections] = useState<SectionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从API加载检查清单数据
  useEffect(() => {
    const loadChecklistData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 调用后端API获取真实检查清单数据
        const data = await checklistService.getAll();
        setSections(data);
        
        // 如果数据为空，显示提示
        if (!data || data.length === 0) {
          setError('暂无检查清单数据，请添加一些检查项');
        }
      } catch (err) {
        setError('加载检查清单失败，请检查后端服务是否启动');
        console.error('Checklist data load error:', err);
        toast.error('检查清单数据加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadChecklistData();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">卢曼卡片系统功能检查清单</h2>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载检查清单中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">加载失败</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-gray-600 dark:text-gray-400">暂无检查清单数据</h3>
          <p className="text-sm text-gray-500 dark:text-gray-500">请先配置检查清单或从后端API加载数据</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 text-left"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                    {section.icon}
                  </div>
                  <h3 className="font-semibold">{section.title}</h3>
                </div>
                {expandedSections[section.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {expandedSections[section.id] && (
                <div className="p-4 space-y-4">
                  {section.items.map(item => (
                    <div key={item.id} className="flex">
                      <div className="w-8 flex-shrink-0 flex items-start justify-center mt-0.5">
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="ml-3">
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-2">
                            {item.icon}
                          </div>
                          <h4 className="font-medium">{item.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>
                        {item.details && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{item.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};



export default LuhmannSystemChecklist;