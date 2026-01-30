// 新的Tab类型定义
type TabType = 
  | 'dashboard'      // 系统概览
  | 'cards'          // 知识卡片
  | 'analysis'       // 智能分析
  | 'file-analysis'  // 文件分析
  | 'agent-system'   // 8-Agent系统
  | 'skill-center'   // 技能中心
  | 'data-management'// 数据管理
  | 'batch-process'  // 批量处理
  | 'npu-performance';// NPU性能

// Tab配置
const TAB_CONFIG = [
  {
    id: 'dashboard',
    name: '系统概览',
    icon: 'Gauge',
    description: '系统状态和统计总览'
  },
  {
    id: 'cards',
    name: '知识卡片',
    icon: 'Database',
    description: '卡片管理（CRUD）'
  },
  {
    id: 'analysis',
    name: '智能分析',
    icon: 'Brain',
    description: '8-Agent智能分析'
  },
  {
    id: 'file-analysis',
    name: '文件分析',
    icon: 'Upload',
    description: '上传文件进行分析'
  },
  {
    id: 'agent-system',
    name: '8-Agent系统',
    icon: 'Users',
    description: 'Agent介绍和管理'
  },
  {
    id: 'skill-center',
    name: '技能中心',
    icon: 'Zap',
    description: '技能列表和执行'
  },
  {
    id: 'data-management',
    name: '数据管理',
    icon: 'FolderOpen',
    description: '数据上传和查询'
  },
  {
    id: 'batch-process',
    name: '批量处理',
    icon: 'Layers',
    description: '批量文档处理'
  },
  {
    id: 'npu-performance',
    name: 'NPU性能',
    icon: 'Activity',
    description: 'NPU性能监控'
  }
];

export type { TabType };
export { TAB_CONFIG };
