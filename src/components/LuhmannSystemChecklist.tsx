import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  Circle, 
  ChevronDown, 
  ChevronUp,
  BookOpen,
  Layout,
  Code,
  Link as LinkIcon,
  FileText,
  Search,
  Settings,
  Lightbulb,
  Briefcase,
  AlertTriangle,
  BarChart3,
  Brain,
  TrendingUp
} from 'lucide-react';

// 定义检查项类型
interface CheckItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  status: 'completed' | 'partial' | 'missing';
  details?: string;
}

// 定义部分类型
interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: CheckItem[];
}

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
  const sections: Section[] = [
    {
      id: 'philosophy',
      title: '1. 系统设计理念',
      icon: <BookOpen size={20} />,
      items: [
        {
          id: 'color-philosophy',
          title: '1.1 四色编码哲学',
          icon: <Code size={16} />,
          description: '每个颜色代表不同的思维层次和功能类型',
          status: 'completed',
          details: '蓝色(核心概念)、绿色(关联链接)、黄色(参考来源)、红色(索引关键词)四种卡片类型已全部实现'
        },
        {
          id: 'physical-layout',
          title: '1.2 物理空间布局',
          icon: <Layout size={16} />,
          description: '利用墙面或白板创建"活的知识树"，模拟卢曼的树状结构',
          status: 'partial',
          details: '基础的分类和可视化已实现，但完整的树状知识结构可视化需要增强'
        }
      ]
    },
    {
      id: 'implementation',
      title: '2. 具体实施方案',
      icon: <Settings size={20} />,
      items: [
        {
          id: 'material-prep',
          title: '2.1 材料准备',
          icon: <Briefcase size={16} />,
          description: '4种颜色即时贴、墙面或大型白板、细头记号笔、标尺或网格线辅助对齐',
          status: 'completed',
          details: '数字系统已提供对应功能，无需物理材料'
        },
        {
          id: 'color-assignment',
          title: '2.2 颜色功能分配表',
          icon: <Code size={16} />,
          description: '为每种颜色定义具体功能、内容规范和放置规则',
          status: 'completed',
          details: '蓝色(主想法卡片)、绿色(链接关系卡)、黄色(参考来源卡)、红色(索引关键词)的功能和规范已实现'
        }
      ]
    },
    {
      id: 'workflow',
      title: '3. 操作流程详解',
      icon: <LinkIcon size={20} />,
      items: [
        {
          id: 'trunk-structure',
          title: '3.1 步骤1：建立主干结构',
          icon: <Layout size={16} />,
          description: '用蓝色即时贴创建5个主要分支',
          status: 'partial',
          details: '基础分类已实现，但需要增强结构化的分支系统'
        },
        {
          id: 'add-blue-cards',
          title: '3.2 步骤2：添加主想法卡片（蓝色）',
          icon: <BookOpen size={16} />,
          description: '确定位置、分配地址、书写内容',
          status: 'partial',
          details: '基础功能已实现，但需要增强地址生成系统和邻近原则分配'
        },
        {
          id: 'build-connections',
          title: '3.3 步骤3：建立链接关系（绿色）',
          icon: <LinkIcon size={16} />,
          description: '创建绿色卡、附加位置、双向链接',
          status: 'partial',
          details: '基础关联功能已实现，但需要增强"参见XX地址"的引用方式和双向链接'
        },
        {
          id: 'manage-references',
          title: '3.4 步骤4：管理参考文献（黄色）',
          icon: <FileText size={16} />,
          description: '书目信息、关键摘录、集中存放',
          status: 'partial',
          details: '基础功能已实现，但需要增强参考文献信息的标准化和集中管理'
        },
        {
          id: 'build-index',
          title: '3.5 步骤5：构建索引系统（红色）',
          icon: <Search size={16} />,
          description: '关键词选择、地址映射、字母排序',
          status: 'partial',
          details: '基础功能已实现，但需要增强关键词索引系统和字母排序'
        }
      ]
    },
    {
      id: 'advanced',
      title: '4. 高级技巧和最佳实践',
      icon: <Lightbulb size={20} />,
      items: [
        {
          id: 'space-management',
          title: '4.1 空间管理策略',
          icon: <Layout size={16} />,
          description: '分区规划、密度控制、层级标识',
          status: 'partial',
          details: '部分功能已实现，但需要增强数字空间的管理策略'
        },
        {
          id: 'color-combination',
          title: '4.2 颜色组合使用',
          icon: <Code size={16} />,
          description: '复杂关系的表达（蓝+绿、蓝+红、黄+绿等组合）',
          status: 'partial',
          details: '基础功能已实现，但可以增强UI交互和视觉表达'
        },
        {
          id: 'maintenance',
          title: '4.3 维护和更新',
          icon: <Settings size={16} />,
          description: '日常维护、扩展策略',
          status: 'partial',
          details: '基础功能已实现，但需要增强自动化维护和更新功能'
        }
      ]
    },
    {
      id: 'thinking',
      title: '5. 思维促进机制',
      icon: <Brain size={20} />,
      items: [
        {
          id: 'color-trigger',
          title: '5.1 通过颜色触发不同思考模式',
          icon: <Lightbulb size={16} />,
          description: '不同颜色触发不同的思考状态',
          status: 'partial',
          details: '基础视觉区分已实现，但需要增强思考模式引导功能'
        },
        {
          id: 'physical-cognition',
          title: '5.2 物理操作的认知益处',
          icon: <Briefcase size={16} />,
          description: '贴卡动作、空间导航、颜色识别的认知益处',
          status: 'missing',
          details: '数字系统需要重新设计交互方式以获得类似的认知益处'
        }
      ]
    },
    {
      id: 'cases',
      title: '6. 实际应用案例',
      icon: <Briefcase size={20} />,
      items: [
        {
          id: 'academic-research',
          title: '6.1 学术研究项目',
          icon: <FileText size={16} />,
          description: '蓝色(研究假设和发现)、绿色(理论间的联系)、黄色(文献综述笔记)、红色(核心概念索引)',
          status: 'partial',
          details: '基础功能已实现，但可以针对学术研究场景进行优化'
        },
        {
          id: 'book-writing',
          title: '6.2 书籍写作规划',
          icon: <BookOpen size={16} />,
          description: '蓝色(章节核心观点)、绿色(情节或论证流程)、黄色(参考资料收集)、红色(人物/主题追踪)',
          status: 'partial',
          details: '基础功能已实现，但可以针对书籍写作场景进行优化'
        },
        {
          id: 'personal-knowledge',
          title: '6.3 个人知识管理',
          icon: <Brain size={16} />,
          description: '蓝色(学到的核心知识)、绿色(知识间的联系)、黄色(学习资源记录)、红色(快速检索入口)',
          status: 'completed',
          details: '个人知识管理的核心功能已全部实现'
        }
      ]
    },
    {
      id: 'solutions',
      title: '7. 常见问题解决方案',
      icon: <AlertTriangle size={20} />,
      items: [
        {
          id: 'space-shortage',
          title: '7.1 墙面空间不足',
          icon: <Layout size={16} />,
          description: '使用可移动白板、建立"归档区"、采用折叠式展示板',
          status: 'completed',
          details: '数字系统不存在物理空间限制，归档和组织功能已实现'
        },
        {
          id: 'address-conflict',
          title: '7.2 地址冲突处理',
          icon: <AlertCircle size={16} />,
          description: '插入技巧、重组织、跳转卡',
          status: 'partial',
          details: '基础功能已实现，但需要增强地址管理系统'
        },
        {
          id: 'maintenance-workload',
          title: '7.3 维护工作量控制',
          icon: <Settings size={16} />,
          description: '简化索引、批量处理、数字化备份',
          status: 'completed',
          details: '数字系统已实现自动化维护和备份功能'
        }
      ]
    },
    {
      id: 'evaluation',
      title: '8. 效果评估指标',
      icon: <BarChart3 size={20} />,
      items: [
        {
          id: 'system-health',
          title: '8.1 系统健康度',
          icon: <CheckCircle2 size={16} />,
          description: '链接密度、索引覆盖率、空间利用率',
          status: 'partial',
          details: '部分指标已在分析报告中实现，但需要增强系统健康度评估'
        },
        {
          id: 'personal-growth',
          title: '8.2 个人成长指标',
          icon: <TrendingUp size={16} />,
          description: '新想法产生频率、跨领域连接数量、知识检索速度提升',
          status: 'partial',
          details: '部分指标已在分析报告中实现，但需要增强个人成长评估'
        }
      ]
    }
  ];

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
      
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-800">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">功能实现总结</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <CheckCircle2 size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">已实现功能：</span> 四色编码哲学、基本的卡片创建和管理、个人知识管理核心功能、数字化备份等。
            </p>
          </div>
          <div className="flex items-start">
            <AlertCircle size={18} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">部分实现功能：</span> 地址系统、链接关系、参考文献管理、索引系统、效果评估指标等。这些功能需要进一步增强和优化。
            </p>
          </div>
          <div className="flex items-start">
            <Circle size={18} className="text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">未实现功能：</span> 物理操作的认知益处需要在数字系统中重新设计交互方式。
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};



export default LuhmannSystemChecklist;