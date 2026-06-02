import React, { useState, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Permission } from '@/contexts/authContext';
import {
  Users,
  Network,
  FileCheck,
  Lightbulb,
  BarChart3,
  Search,
  Clock,
  UserPlus,
  RefreshCw,
  MessageSquare,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  CheckCircle2,
  AlertCircle,
  FileSearch,
  Award,
  Edit3,
  Trash2,
  Plus,
  X,
  Send,
  Settings,
  Save,
  Crown,
  Sparkles,
  Play,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  Brain,
GitBranch,
  Eye
} from 'lucide-react';
import WikiEditor from './WikiEditor';
import { teamMemberService, activityService, analyticsService, projectService } from '../services/dataService';
import { toast } from 'sonner';
import { AuthContext } from '../contexts/authContext';
import * as echarts from 'echarts';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// ========== 8-Agent会议面板组件(使用真实后端)==========
const AgentMeetingPanel: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [rounds, setRounds] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [meetingResult, setMeetingResult] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  // 加载Agent信息
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch(getApiBaseUrl() + '/api/meeting/agents');
        if (response.ok) {
          const data = await response.json();
          setAgents(data);
        }
      } catch (error) {
        console.error('加载Agent失败:', error);
        // 使用默认数据
        setAgents([
          { id: 'taishige', name: '太史阁', title: '历史记录与反思官', avatar: '📚', color: 'from-blue-500 to-blue-600', description: '负责记录所有操作、决策和结果' },
          { id: 'jinjiyu', name: '锦衣卫', title: '安全与情报收集官', avatar: '🛡️', color: 'from-red-500 to-red-600', description: '监控系统安全状态,识别潜在威胁' },
          { id: 'tongzhengsi', name: '通政司', title: '信息与通讯中枢', avatar: '📡', color: 'from-green-500 to-green-600', description: '管理所有信息流,确保通讯畅通' },
          { id: 'jianchayuan', name: '监察院', title: '监督与审计官', avatar: '🔍', color: 'from-purple-500 to-purple-600', description: '监督各项操作和流程的执行情况' },
          { id: 'mijuanfang', name: '密卷房', title: '知识库与档案管理员', avatar: '📂', color: 'from-indigo-500 to-indigo-600', description: '负责非结构化知识的整理、归档' },
          { id: 'chengxiangfu', name: '丞相府', title: '战略规划与决策支持官', avatar: '👑', color: 'from-yellow-500 to-yellow-600', description: '基于全局数据进行战略分析' },
          { id: 'junjichu', name: '军机处', title: '任务执行与结果官', avatar: '⚔️', color: 'from-orange-500 to-orange-600', description: '执行具体任务,生成分析结果' },
          { id: 'zhihuishi', name: '指挥使', title: '任务协调官', avatar: '🎯', color: 'from-teal-500 to-teal-600', description: '协调各部门工作,确保任务高效流转' },
        ]);
      }
    };
    loadAgents();
  }, []);

  const startMeeting = async () => {
    if (!topic.trim()) {
      toast.error('请输入会议主题');
      return;
    }
    
    setIsLoading(true);
    toast.info('正在召集8-Agent进行讨论...');
    
    try {
      const response = await fetch(getApiBaseUrl() + '/api/meeting/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          context: context.trim(),
          rounds: rounds,
          card_ids: []
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setMeetingResult(result);
      toast.success('8-Agent协作会议完成！');
    } catch (error) {
      console.error('会议创建失败:', error);
      toast.error('会议创建失败,请检查后端服务');
    } finally {
      setIsLoading(false);
    }
  };

  const resetMeeting = () => {
    setMeetingResult(null);
    setTopic('');
    setContext('');
    setExpandedRounds(new Set());
    toast.info('会议已重置');
  };

  const toggleRound = (roundNum: number) => {
    const newExpanded = new Set(expandedRounds);
    if (newExpanded.has(roundNum)) {
      newExpanded.delete(roundNum);
    } else {
      newExpanded.add(roundNum);
    }
    setExpandedRounds(newExpanded);
  };

  const exportResult = (format: 'json' | 'markdown') => {
    if (!meetingResult) return;
    
    let content = '';
    let filename = '';
    
    if (format === 'markdown') {
      content = `# 8-Agent协作会议记录\n\n`;
      content += `**主题**:${meetingResult.topic}\n\n`;
      content += `**时间**:${meetingResult.start_time}\n\n`;
      content += `**参与人员**:${meetingResult.participants.join('、')}\n\n`;
      content += `**耗时**:${meetingResult.duration_seconds}秒\n\n`;
      content += `---\n\n`;
      
      meetingResult.rounds.forEach((round: any) => {
        content += `## 第${round.round}轮:${round.theme}\n\n`;
        round.speeches.forEach((speech: any) => {
          content += `### ${speech.agent_name}(${speech.agent_title})${speech.avatar}\n\n`;
          const formatSpeechContent = (raw: string) => {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                return parsed.map((item: any) => `[${item.color}] ${item.content}`).join(' | ');
              }
              return raw;
            } catch {
              return raw;
            }
          };
          content += `${formatSpeechContent(speech.speech)}\n\n`;
        });
      });
      
const formatSpeechContent = (raw: string) => {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                return parsed.map((item: any) => `[${item.color}] ${item.content}`).join(' | ');
              }
              return raw;
            } catch {
              return raw;
            }
          };
          const decisionText = (() => {
            try {
              const p = JSON.parse(meetingResult.decision);
              return typeof p === 'string' ? p : JSON.stringify(p);
            } catch { return meetingResult.decision; }
          })();
          let actionItems: string[] = meetingResult.action_items;
          try {
            if (typeof actionItems === 'string') actionItems = JSON.parse(actionItems);
          } catch { /* use as-is */ }
          if (!Array.isArray(actionItems)) actionItems = [actionItems];
          content += `## 会议决策\n\n${decisionText}\n\n`;
          content += `## 行动项\n\n`;
          actionItems.forEach((item: string, idx: number) => {
            content += `${idx + 1}. ${item}\n`;
          });
      
      filename = `8Agent会议_${meetingResult.topic}_${new Date().toISOString().slice(0, 10)}.md`;
    } else {
      content = JSON.stringify(meetingResult, null, 2);
      filename = `8Agent会议_${meetingResult.topic}_${new Date().toISOString().slice(0, 10)}.json`;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('会议记录已导出');
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2 flex items-center">
          <Crown className="mr-2 text-amber-600" />
          8-Agent智能协作会议
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          8位AI智能体基于后端数据库进行真实讨论,形成决策和行动方案
        </p>
      </div>

      {/* 会议设置 */}
      {!meetingResult && (
        <div className="bg-white dark:bg-gray-750 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">会议主题 *</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入需要讨论的主题,例如:新产品开发策略"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">背景信息(可选)</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="提供相关背景信息,帮助Agent更好地理解议题..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">讨论轮数</label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setRounds(num)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      rounds === num
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-amber-500'
                    }`}
                  >
                    {num}轮
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 参会人员 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">参会人员(8位Agent)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${agent.color} flex items-center justify-center text-white text-lg`}>
                      {agent.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 开始按钮 */}
          <button
            onClick={startMeeting}
            disabled={isLoading || !topic.trim()}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold text-lg flex items-center justify-center transition-all"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                正在召集Agent讨论...
              </>
            ) : (
              <>
                <Sparkles size={20} className="mr-2" />
                召开8-Agent协作会议
              </>
            )}
          </button>
        </div>
      )}

      {/* 会议结果 */}
      {meetingResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 结果头部 */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{meetingResult.topic}</h3>
                <p className="text-amber-100 mt-1">
                  {meetingResult.rounds.length}轮讨论 · {meetingResult.participants.length}位Agent参与 · 耗时{meetingResult.duration_seconds}秒
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportResult('markdown')}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center transition-colors"
                >
                  <Download size={16} className="mr-1" />
                  导出
                </button>
                <button
                  onClick={resetMeeting}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center transition-colors"
                >
                  <RotateCcw size={16} className="mr-1" />
                  新会议
                </button>
              </div>
            </div>
          </div>

          {/* 决策结果 */}
          <div className="bg-white dark:bg-gray-750 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold mb-3 flex items-center">
              <CheckCircle2 className="mr-2 text-green-600" />
              会议决策
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {(() => {
                try {
                  const parsed = JSON.parse(meetingResult.decision);
                  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
                } catch {
                  return meetingResult.decision;
                }
              })()}
            </p>
          </div>

          {/* 行动项 */}
          <div className="bg-white dark:bg-gray-750 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold mb-3 flex items-center">
              <Award className="mr-2 text-amber-600" />
              行动项
            </h4>
            <ul className="space-y-2">
              {(() => {
                let items: string[] = meetingResult.action_items;
                try {
                  if (typeof items === 'string') items = JSON.parse(items);
                } catch { /* use as-is */ }
                return (Array.isArray(items) ? items : [items]).map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center text-sm mr-3 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ));
              })()}
            </ul>
          </div>

          {/* 讨论记录 */}
          <div className="bg-white dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold flex items-center">
                <MessageSquare className="mr-2 text-blue-600" />
                讨论记录
              </h4>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {meetingResult.rounds.map((round: any) => (
                <div key={round.round} className="p-4">
                  <button
                    onClick={() => toggleRound(round.round)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center">
                      <span className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold mr-3">
                        {round.round}
                      </span>
                      <span className="font-medium">{round.theme}</span>
                    </div>
                    {expandedRounds.has(round.round) ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </button>
                  
                  {expandedRounds.has(round.round) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 space-y-3 pl-11"
                    >
                      {round.speeches.map((speech: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center mb-2">
                            <span className="text-lg mr-2">{speech.avatar}</span>
                            <span className="font-medium text-sm">{speech.agent_name}</span>
                            <span className="text-xs text-gray-500 ml-2">{speech.agent_title}</span>
                          </div>
                          {(() => {
                            try {
                              const parsed = JSON.parse(speech.speech);
                              if (Array.isArray(parsed)) {
                                return parsed.map((item: any, i: number) => (
                                  <span key={i} className={`inline-block mr-2 text-sm ${
                                    item.color === 'red' ? 'text-red-600 dark:text-red-400' :
                                    item.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                                    item.color === 'green' ? 'text-green-600 dark:text-green-400' :
                                    item.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-gray-700 dark:text-gray-300'
                                  }`}>{item.content}</span>
                                ));
                              }
                              return <span>{speech.speech}</span>;
                            } catch {
                              return <span>{speech.speech}</span>;
                            }
                          })()}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ========== 类型定义 ==========
interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar?: string;
  online?: boolean;
  join_date?: string;
  last_active?: string;
  permissions?: string[];
  contribution?: number;
  email?: string;
}

interface KnowledgeGap {
  id: number;
  area: string;
  gapScore: number;
  priority: '高' | '中' | '低';
  description?: string;
  suggestions?: string[];
}

interface CollaborationMessage {
  id: number;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  replies?: CollaborationMessage[];
}

interface ReportConfig {
  syncCollaboration: number;
  asyncCollaboration: number;
  coreConcepts: number;
  relatedLinks: number;
  references: number;
  keywords: number;
  avgResponseTime: string;
  participation: number;
  knowledgeConnectivity: number;
}

  interface Project {
  id: number;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'pending' | 'in-progress';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate: string;
  progress: number;
  assignedMembers: number[];
  tasks: Task[];
  }

  interface Task {
  id: number;
  projectId?: number;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'pending';
  priority: 'low' | 'medium' | 'high';
  assignedTo: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  }

// ========== 编辑弹窗组件 ==========
interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ========== 主组件 ==========
const TeamCollaborationEnhanced: React.FC = () => {
  const { userInfo, updatePermissions, hasPermission, isAdmin } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'integration' | 'realtime' | 'gaps' | 'reports' | 'projects' | 'knowledge-graph' | 'mindmap' | 'wiki-editor'>('integration');
  
  // 监听来自顶栏菜单的tab切换事件
  useEffect(() => {
    const handleSwitchTeamTab = (e: CustomEvent) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab as any);
      }
    };
    window.addEventListener('switchTeamTab', handleSwitchTeamTab as EventListener);
    return () => {
      window.removeEventListener('switchTeamTab', handleSwitchTeamTab as EventListener);
    };
  }, []);
  
  // 数据状态
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    syncCollaboration: 45,
    asyncCollaboration: 55,
    coreConcepts: 35,
    relatedLinks: 25,
    references: 20,
    keywords: 20,
    avgResponseTime: '12分钟',
    participation: 85,
    knowledgeConnectivity: 68
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // 加载状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 默认项目数据
  const getDefaultProjects = (): Project[] => [
    {
      id: 1,
      name: 'AI助手系统开发',
      description: '开发基于大语言模型的智能助手系统，提升团队协作效率',
      status: 'active',
      priority: 'high',
      startDate: '2026-01-15',
      endDate: '2026-06-30',
      progress: 65,
      assignedMembers: [1, 2, 3],
      tasks: [
        {
          id: 1,
          title: '需求分析',
          description: '分析用户需求和系统功能',
          status: 'completed',
          priority: 'high',
          assignedTo: 1,
          dueDate: '2026-02-15',
          createdAt: '2026-01-15',
          updatedAt: '2026-02-15'
        },
        {
          id: 2,
          title: 'UI设计',
          description: '设计用户界面和交互流程',
          status: 'in-progress',
          priority: 'medium',
          assignedTo: 2,
          dueDate: '2026-03-15',
          createdAt: '2026-02-01',
          updatedAt: '2026-02-20'
        }
      ]
    },
    {
      id: 2,
      name: '知识库重构',
      description: '重新设计和实现企业知识库系统，支持多模态内容管理',
      status: 'planning',
      priority: 'medium',
      startDate: '2026-03-01',
      endDate: '2026-08-15',
      progress: 15,
      assignedMembers: [2, 4],
      tasks: [
        {
          id: 3,
          title: '架构设计',
          description: '设计新的知识库架构',
          status: 'todo',
          priority: 'high',
          assignedTo: 2,
          dueDate: '2026-03-30',
          createdAt: '2026-02-25',
          updatedAt: '2026-02-25'
        }
      ]
    },
    {
      id: 3,
      name: '用户体验优化',
      description: '基于用户反馈优化产品界面和交互流程',
      status: 'completed',
      priority: 'medium',
      startDate: '2025-11-01',
      endDate: '2026-02-28',
      progress: 100,
      assignedMembers: [1, 3, 4],
      tasks: [
        {
          id: 4,
          title: '用户调研',
          description: '收集用户反馈和使用数据',
          status: 'completed',
          priority: 'medium',
          assignedTo: 3,
          dueDate: '2026-01-15',
          createdAt: '2025-11-01',
          updatedAt: '2026-01-15'
        },
        {
          id: 5,
          title: '界面优化',
          description: '根据反馈优化界面设计',
          status: 'completed',
          priority: 'medium',
          assignedTo: 4,
          dueDate: '2026-02-28',
          createdAt: '2026-01-20',
          updatedAt: '2026-02-28'
        }
      ]
    }
  ];
  
  // 编辑状态
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingGap, setEditingGap] = useState<KnowledgeGap | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isGapModalOpen, setIsGapModalOpen] = useState(false);
  const [isReportConfigOpen, setIsReportConfigOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 项目管理状态
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // 全局错误监听, 捕获运行时异常并提示
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error', event.error || event.message, event);
      toast.error('发生错误: ' + (event.error?.message || event.message));
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection', event.reason);
      toast.error('未处理的Promise异常: ' + (event.reason?.message || event.reason));
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // 颜色配置
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // 从后端API加载协作数据
  useEffect(() => {
    const loadCollaborationData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 调用后端API获取真实协作数据
        const [members, activities] = await Promise.all([
          teamMemberService.getAll(),
          activityService.getRecent(30)
        ]);

        // 设置团队成员数据
        setTeamMembers(members.map((m, idx) => ({
          ...m,
          id: m.id || idx + 1,
          avatar: m.avatar || '👤',
          online: m.online ?? Math.random() > 0.5,
          contribution: m.contribution || Math.floor(Math.random() * 100),
          permissions: m.permissions || ['read', 'write']
        })));

// 同步当前用户权限：匹配到团队成员则使用其权限
        const matchedMember = members.find((m: any) => m.name === userInfo.name);
        if (matchedMember && matchedMember.permissions) {
          updatePermissions(matchedMember.permissions as Permission[], matchedMember.role, matchedMember.id);
        }

        // 从后端加载项目数据
        try {
          const projectsData = await projectService.getAll();
          if (projectsData && projectsData.length > 0) {
            const mappedProjects: Project[] = projectsData.map((p: any) => ({
              ...p,
              id: p.id || 0,
              description: p.description || '',
              startDate: p.startDate || p.start_date || '',
              endDate: p.endDate || p.end_date || '',
              status: p.status || 'pending',
              priority: p.priority || 'medium',
              progress: p.progress || 0,
              assignedMembers: p.assignedMembers || p.assigned_members || [],
              tasks: (p.tasks || []).map((t: any, idx: number) => ({
                ...t,
                id: t.id || Date.now() + idx,
                projectId: p.id,
                title: t.title || '',
                description: t.description || '',
                status: t.status || 'todo',
                priority: t.priority || 'medium',
                assignedTo: t.assignedTo || t.assigned_to || 0,
                dueDate: t.dueDate || t.due_date || '',
                createdAt: t.createdAt || t.created_at || new Date().toISOString(),
                updatedAt: t.updatedAt || t.updated_at || new Date().toISOString(),
              })),
            }));
            setProjects(mappedProjects);
          } else {
            // 如果没有数据，使用默认示例项目
            setProjects(getDefaultProjects());
          }
        } catch (projectErr) {
          console.error('加载项目数据失败:', projectErr);
          setProjects(getDefaultProjects());
        }

        // 初始化知识缺口数据
        setKnowledgeGaps([
          { id: 1, area: 'API设计', gapScore: 85, priority: '高', description: '团队缺乏系统性的API设计规范和最佳实践', suggestions: ['建立API设计规范文档', '开展API设计培训'] },
          { id: 2, area: 'UI/UX', gapScore: 72, priority: '中', description: '用户体验设计能力需要提升', suggestions: ['引入设计系统', '增加用户研究环节'] },
          { id: 3, area: '性能优化', gapScore: 68, priority: '中', description: '应用性能优化知识不够系统', suggestions: ['建立性能监控体系', '分享性能优化案例'] },
          { id: 4, area: '测试覆盖', gapScore: 60, priority: '低', description: '测试覆盖率有待提高', suggestions: ['制定测试规范', '引入自动化测试'] }
        ]);

        // 初始化协作消息
        setMessages([
          { id: 1, user: '张三', avatar: '👨‍💼', content: '我们需要制定一个新的产品创新策略,结合AI技术和用户体验研究的最新成果.', timestamp: '2026-02-20 10:30' },
          { id: 2, user: '李四', avatar: '👩‍💻', content: '我认为可以从用户旅程地图入手,识别关键痛点和机会点,然后用AI技术来优化这些环节.', timestamp: '2026-02-20 10:35', replies: [
            { id: 3, user: '王五', avatar: '👨‍🎨', content: '这个思路很好！我建议我们可以先做一个快速的用户调研,收集一些初步反馈.', timestamp: '2026-02-20 10:40' }
          ]},
          { id: 4, user: '赵六', avatar: '👩‍🔬', content: '我们还应该考虑技术可行性和资源限制,制定一个分阶段的实施计划.', timestamp: '2026-02-20 10:45' }
        ]);

      } finally {
        setLoading(false);
      }
    };

    loadCollaborationData();
  }, []);

  // ========== 团队成员管理 ==========
  const handleAddMember = () => {
    if (!hasPermission('admin') && !hasPermission('write')) {
      toast.error('权限不足：需要管理或编辑权限才能添加成员');
      return;
    }
    setEditingMember({ id: 0, name: '', role: '', email: '', avatar: '👤', online: false, contribution: 0, permissions: ['read', 'write'] });
    setIsMemberModalOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    if (!hasPermission('admin') && !hasPermission('write')) {
      toast.error('权限不足：需要管理或编辑权限才能编辑成员');
      return;
    }
    setEditingMember({ ...member });
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    
    try {
      if (editingMember.id === 0) {
        // 添加新成员
        const newMember = await teamMemberService.add(editingMember, userInfo.name);
        setTeamMembers([...teamMembers, { ...newMember, id: newMember.id || Date.now() }]);
        toast.success('成员添加成功');
      } else {
        // 更新成员
        await teamMemberService.update(editingMember.id, editingMember, userInfo.name);
        setTeamMembers(teamMembers.map(m => m.id === editingMember.id ? editingMember : m));
        toast.success('成员更新成功');
// 如果修改的是自己，同步权限到 AuthContext
        if (editingMember.name === userInfo.name && editingMember.permissions) {
          updatePermissions(editingMember.permissions as Permission[], editingMember.role, editingMember.id);
        }
      }
      setIsMemberModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      toast.error('保存成员失败');
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!hasPermission('admin')) {
      toast.error('权限不足：仅管理员可删除成员');
      return;
    }
    if (!confirm('确定要删除这个成员吗？')) return;
    
    try {
      await teamMemberService.delete(id, userInfo.name);
      setTeamMembers(teamMembers.filter(m => m.id !== id));
      toast.success('成员删除成功');
    } catch (err: any) {
      toast.error(err?.message || '删除成员失败');
    }
  };

  // ========== 知识缺口管理 ==========
  const handleAddGap = () => {
    setEditingGap({ id: 0, area: '', gapScore: 50, priority: '中', description: '', suggestions: [] });
    setIsGapModalOpen(true);
  };

  const handleEditGap = (gap: KnowledgeGap) => {
    setEditingGap({ ...gap });
    setIsGapModalOpen(true);
  };

  const handleSaveGap = () => {
    if (!editingGap) return;
    
    if (editingGap.id === 0) {
      const newGap = { ...editingGap, id: Date.now() };
      setKnowledgeGaps([...knowledgeGaps, newGap]);
      toast.success('知识缺口添加成功');
    } else {
      setKnowledgeGaps(knowledgeGaps.map(g => g.id === editingGap.id ? editingGap : g));
      toast.success('知识缺口更新成功');
    }
    setIsGapModalOpen(false);
    setEditingGap(null);
  };

  const handleDeleteGap = (id: number) => {
    if (!confirm('确定要删除这个知识缺口吗？')) return;
    setKnowledgeGaps(knowledgeGaps.filter(g => g.id !== id));
    toast.success('知识缺口删除成功');
  };

  // ========== 协作消息管理 ==========
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: CollaborationMessage = {
      id: Date.now(),
      user: userInfo.name || '匿名用户',
      avatar: userInfo.avatar || '👤',
      content: newMessage,
      timestamp: new Date().toLocaleString('zh-CN')
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
    toast.success('消息发送成功');
  };

  const handleReply = (messageId: number) => {
    setReplyingTo(messageId);
    setReplyContent('');
  };

  const handleSendReply = (parentId: number) => {
    if (!replyContent.trim()) return;
    
    const reply: CollaborationMessage = {
      id: Date.now(),
      user: userInfo.name || '匿名用户',
      avatar: userInfo.avatar || '👤',
      content: replyContent,
      timestamp: new Date().toLocaleString('zh-CN')
    };
    
    setMessages(messages.map(m => {
      if (m.id === parentId) {
        return { ...m, replies: [...(m.replies || []), reply] };
      }
      return m;
    }));
    
    setReplyingTo(null);
    setReplyContent('');
    toast.success('回复发送成功');
  };

  // ========== 报告配置 ==========
  const handleSaveReportConfig = () => {
    // 这里可以保存到后端
    toast.success('报告配置已保存');
    setIsReportConfigOpen(false);
  };

  // ========== 项目管理 ==========
  const handleAddProject = () => {
    setEditingProject({ 
      id: 0, 
      name: '', 
      description: '', 
      status: 'pending', 
      priority: 'medium',
      startDate: new Date().toISOString().split('T')[0], 
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
      progress: 0, 
      assignedMembers: [], 
      tasks: [] 
    });
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject({ ...project });
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async () => {
    if (!editingProject) return;
    
    try {
      if (editingProject.id === 0) {
        const newProject = await projectService.create({
          name: editingProject.name,
          description: editingProject.description || '',
          status: editingProject.status as 'pending' | 'in-progress' | 'completed',
          priority: editingProject.priority as 'low' | 'medium' | 'high',
          startDate: editingProject.startDate,
          endDate: editingProject.endDate,
          progress: editingProject.progress,
          assignedMembers: editingProject.assignedMembers,
          tasks: editingProject.tasks,
        });
        const tasks: Task[] = (newProject.tasks || []).map((t, idx) => ({
          ...t,
          id: t.id || Date.now() + idx,
          projectId: newProject.id,
          title: t.title || '',
          description: t.description || '',
          status: t.status || 'todo',
          priority: t.priority || 'medium',
          assignedTo: t.assignedTo || 0,
          dueDate: t.dueDate || '',
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
        }));
        const project: Project = {
          ...newProject,
          id: newProject.id || Date.now(),
          description: newProject.description || '',
          startDate: newProject.startDate || '',
          endDate: newProject.endDate || '',
          status: newProject.status || 'pending',
          priority: newProject.priority || 'medium',
          progress: newProject.progress || 0,
          assignedMembers: newProject.assignedMembers || [],
          tasks: tasks,
        };
        setProjects([...projects, project]);
        setSelectedProject(project);
        toast.success('项目创建成功');
      } else {
        await projectService.update(editingProject.id, {
          name: editingProject.name,
          description: editingProject.description || '',
          status: editingProject.status as 'pending' | 'in-progress' | 'completed',
          priority: editingProject.priority as 'low' | 'medium' | 'high',
          startDate: editingProject.startDate,
          endDate: editingProject.endDate,
          progress: editingProject.progress,
          assignedMembers: editingProject.assignedMembers,
          tasks: editingProject.tasks,
        });
        const updatedProject: Project = { 
          ...editingProject,
          status: editingProject.status || 'pending',
          priority: editingProject.priority || 'medium',
        };
        setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
        setSelectedProject(updatedProject);
        toast.success('项目更新成功');
      }
      setIsProjectModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('保存项目失败:', error);
      toast.error('保存项目失败');
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('确定要删除这个项目吗？删除后所有相关任务也将被删除。')) return;
    try {
      await projectService.delete(id);
      setProjects(projects.filter(p => p.id !== id));
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
      toast.success('项目删除成功');
    } catch (error) {
      console.error('删除项目失败:', error);
      toast.error('删除项目失败');
    }
  };

  // ========== 任务管理 ==========
  const handleAddTask = (projectId: number) => {
    setEditingTask({ 
      id: 0, 
      projectId, 
      title: '', 
      description: '', 
      status: 'todo', 
      priority: 'medium', 
      assignedTo: 0, 
      dueDate: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask({ ...task });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = () => {
    if (!editingTask) return;
    
    setProjects(projects.map(project => {
      if (project.id === editingTask.projectId) {
        let updatedTasks;
        if (editingTask.id === 0) {
          const newTask = { ...editingTask, id: Date.now() };
          updatedTasks = [...project.tasks, newTask];
        } else {
          updatedTasks = project.tasks.map(t => t.id === editingTask.id ? editingTask : t);
        }
        
        // 更新项目进度
        const completedTasks = updatedTasks.filter(t => t.status === 'completed').length;
        const progress = updatedTasks.length > 0 ? Math.round((completedTasks / updatedTasks.length) * 100) : 0;
        
        return { ...project, tasks: updatedTasks, progress };
      }
      return project;
    }));
    
    if (selectedProject) {
      setSelectedProject({
        ...selectedProject,
        tasks: editingTask.id === 0 
          ? [...selectedProject.tasks, { ...editingTask, id: Date.now() }]
          : selectedProject.tasks.map(t => t.id === editingTask.id ? editingTask : t)
      });
    }
    
    setIsTaskModalOpen(false);
    setEditingTask(null);
    toast.success(editingTask.id === 0 ? '任务添加成功' : '任务更新成功');
  };

  const handleDeleteTask = (taskId: number) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    
    setProjects(projects.map(project => {
      if (project.tasks.some(t => t.id === taskId)) {
        const updatedTasks = project.tasks.filter(t => t.id !== taskId);
        const completedTasks = updatedTasks.filter(t => t.status === 'completed').length;
        const progress = updatedTasks.length > 0 ? Math.round((completedTasks / updatedTasks.length) * 100) : 0;
        
        return { ...project, tasks: updatedTasks, progress };
      }
      return project;
    }));
    
    if (selectedProject) {
      setSelectedProject({
        ...selectedProject,
        tasks: selectedProject.tasks.filter(t => t.id !== taskId)
      });
    }
    
    toast.success('任务删除成功');
  };

  const handleToggleTask = (taskId: number) => {
    setProjects(projects.map(project => {
      if (project.tasks.some(t => t.id === taskId)) {
        const updatedTasks = project.tasks.map(t => 
          t.id === taskId 
            ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' as Task['status'] }
            : t
        );
        const completedTasks = updatedTasks.filter(t => t.status === 'completed').length;
        const progress = updatedTasks.length > 0 ? Math.round((completedTasks / updatedTasks.length) * 100) : 0;
        
        return { ...project, tasks: updatedTasks, progress };
      }
      return project;
    }));
    
    if (selectedProject) {
      setSelectedProject({
        ...selectedProject,
        tasks: selectedProject.tasks.map(t => 
          t.id === taskId 
            ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' as Task['status'] }
            : t
        )
      });
    }
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">加载协作数据中...</p>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-red-600 dark:text-red-400">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">协作数据加载失败</h3>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 功能标签页 */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto">
        <button 
          onClick={() => setActiveTab('integration')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'integration' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Network size={18} className="mr-2" />
            <span>团队知识整合</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('realtime')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'realtime' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Clock size={18} className="mr-2" />
            <span>实时协作编辑</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('gaps')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'gaps' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Lightbulb size={18} className="mr-2" />
            <span>知识空白识别</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'reports'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <BarChart3 size={18} className="mr-2" />
            <span>协作分析报告</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'projects'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <FileCheck size={18} className="mr-2" />
            <span>项目管理</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('knowledge-graph')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'knowledge-graph'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <GitBranch size={18} className="mr-2" />
            <span>知识图谱</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('mindmap')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'mindmap'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Brain size={18} className="mr-2" />
            <span>思维导图</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('wiki-editor')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'wiki-editor'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Network size={18} className="mr-2" />
            <span>知识网络</span>
          </div>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 团队知识整合 */}
        {activeTab === 'integration' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-2">团队知识整合</h2>
                <p className="text-gray-600 dark:text-gray-300">AI智能识别重复和互补内容,生成完整的团队知识图谱</p>
              </div>
              <button 
                onClick={handleAddMember}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <UserPlus size={18} className="mr-2" />
                添加成员
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧:整合状态和进度 */}
              <div className="lg:col-span-1 space-y-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800"
                >
                  <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">整合进度</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>AI分析重复内容</span>
                        <span>100%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full w-full"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>识别互补知识</span>
                        <span>100%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full w-full"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>建立知识关联</span>
                        <span>100%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full w-full"></div>
                      </div>
                    </div>
                  </div>
                  <button className="mt-4 w-full flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <RefreshCw size={16} className="mr-2" />
                    <span>重新整合</span>
                  </button>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                  className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-semibold mb-3">整合发现</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <CheckCircle2 size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">发现了12个重复的核心概念卡片</p>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle2 size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">识别出8组互补的知识体系</p>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle2 size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">建立了25个新的知识关联</p>
                    </div>
                    <div className="flex items-start">
                      <AlertCircle size={18} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">发现3个潜在的知识冲突点</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* 右侧:团队成员和统计图表 */}
              <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                  className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-semibold mb-3">团队成员 ({teamMembers.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-sm group relative"
                      >
                        <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-2">
                          {member.avatar}
                        </span>
                        <span className="mr-2">{member.name}</span>
                        <span className={`w-2 h-2 rounded-full ${member.online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <div className="absolute right-0 top-0 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                          <button 
                            onClick={() => handleEditMember(member)}
                            className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteMember(member.id)}
                            className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
                  className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-[300px]"
                >
                  <h3 className="font-semibold mb-3">知识整合结果分布</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={teamMembers.map(m => ({ name: m.name, value: m.contribution || 0 }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {teamMembers.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {/* 实时协作编辑 */}
        {activeTab === 'realtime' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2">实时协作编辑</h2>
              <p className="text-gray-600 dark:text-gray-300">多人同时编辑和评论,加速知识发展过程</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-[500px] flex flex-col"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <FileCheck size={16} />
                    </div>
                    <h3 className="font-semibold">产品创新策略讨论</h3>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
                      {teamMembers.filter(m => m.online).length}人在线
                    </span>
                  </div>
                </div>

                <div className="flex-1 bg-gray-50 dark:bg-gray-750 rounded-lg p-4 border border-gray-200 dark:border-gray-700 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div key={message.id} className="relative">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{message.avatar}</span>
                          <div className="flex-1">
                            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-sm">{message.user}</span>
                                <span className="text-xs text-gray-500">{message.timestamp}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300">{message.content}</p>
                            </div>
                            <button 
                              onClick={() => handleReply(message.id)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                            >
                              回复
                            </button>
                            
                            {/* 回复输入框 */}
                            {replyingTo === message.id && (
                              <div className="mt-2 flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder="输入回复..."
                                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                  autoFocus
                                />
                                <button 
                                  onClick={() => handleSendReply(message.id)}
                                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                  <Send size={14} />
                                </button>
                                <button 
                                  onClick={() => setReplyingTo(null)}
                                  className="p-1.5 text-gray-500 hover:text-gray-700"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}
                            
                            {/* 回复列表 */}
                            {message.replies && message.replies.length > 0 && (
                              <div className="mt-3 ml-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
                                {message.replies.map(reply => (
                                  <div key={reply.id} className="flex items-start space-x-3">
                                    <span className="text-xl">{reply.avatar}</span>
                                    <div className="flex-1 bg-gray-100 dark:bg-gray-600 rounded-lg p-2">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-sm">{reply.user}</span>
                                        <span className="text-xs text-gray-500">{reply.timestamp}</span>
                                      </div>
                                      <p className="text-sm text-gray-700 dark:text-gray-300">{reply.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-2 flex-shrink-0">
                    👤
                  </div>
                  <div className="flex-1 flex items-center space-x-2">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="添加你的想法或评论..." 
                      className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-colors outline-none"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* 知识空白识别 */}
        {activeTab === 'gaps' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-2">知识空白识别</h2>
                <p className="text-gray-600 dark:text-gray-300">智能发现团队知识体系中的空白点和机会点</p>
              </div>
              <button 
                onClick={handleAddGap}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus size={18} className="mr-2" />
                添加空白项
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧:知识空白列表 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-1 space-y-4"
              >
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <FileSearch size={18} className="mr-2" />
                    发现的知识空白 ({knowledgeGaps.length})
                  </h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {knowledgeGaps.map(gap => (
                      <div 
                        key={gap.id} 
                        className={`p-3 rounded-lg border relative group ${
                          gap.priority === '高' ? 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-800' :
                          gap.priority === '中' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-800' :
                          'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className={`font-medium text-sm ${
                            gap.priority === '高' ? 'text-red-800 dark:text-red-300' :
                            gap.priority === '中' ? 'text-amber-800 dark:text-amber-300' :
                            'text-blue-800 dark:text-blue-300'
                          }`}>
                            {gap.area}
                          </h4>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                            <button 
                              onClick={() => handleEditGap(gap)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteGap(gap.id)}
                              className="p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs mt-1 opacity-80">{gap.description}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            gap.priority === '高' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' :
                            gap.priority === '中' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300' :
                            'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                          }`}>
                            {gap.priority}优先级
                          </span>
                          <span className="text-xs text-gray-500">缺口: {gap.gapScore}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">知识机会点</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Lightbulb size={18} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">AI技术与用户体验设计的交叉应用</p>
                    </div>
                    <div className="flex items-start">
                      <Lightbulb size={18} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">跨部门知识共享平台的建立</p>
                    </div>
                    <div className="flex items-start">
                      <Lightbulb size={18} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">建立持续学习和知识更新的机制</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 右侧:知识覆盖度雷达图 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                className="lg:col-span-2 bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3">知识领域覆盖度分析</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={150} data={knowledgeGaps.map(g => ({ subject: g.area, A: 100 - g.gapScore, fullMark: 100 }))}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="知识覆盖度"
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.5}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <h4 className="font-medium mb-2">空白填补建议</h4>
                    <ul className="space-y-2 text-sm">
                      {knowledgeGaps.slice(0, 3).map(gap => (
                        <li key={gap.id} className="flex items-start">
                          <CheckCircle2 size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{gap.suggestions?.[0] || `加强${gap.area}能力建设`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <h4 className="font-medium mb-2">预期效果</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <Award size={16} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>提高产品创新的准确性和成功率</span>
                      </li>
                      <li className="flex items-start">
                        <Award size={16} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>缩短从创意到实施的周期</span>
                      </li>
                      <li className="flex items-start">
                        <Award size={16} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>增强团队的市场竞争力</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* 协作分析报告 */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-2">协作分析报告</h2>
                <p className="text-gray-600 dark:text-gray-300">可视化团队知识贡献和协作模式分析</p>
              </div>
              <button 
                onClick={() => setIsReportConfigOpen(true)}
                className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Settings size={18} className="mr-2" />
                配置报告
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 协作模式分析 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3">协作模式分析</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>同步协作</span>
                      <span>{reportConfig.syncCollaboration}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${reportConfig.syncCollaboration}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>异步协作</span>
                      <span>{reportConfig.asyncCollaboration}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${reportConfig.asyncCollaboration}%` }}></div>
                    </div>
                  </div>
                  <div className="p-3 mt-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      团队倾向于异步协作模式,建议优化异步协作工具和流程,提高效率.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* 知识类型分布 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3">知识类型分布</h3>
                <div className="space-y-3">
                  {[
                    { label: '核心概念', value: reportConfig.coreConcepts, color: 'bg-blue-500' },
                    { label: '关联链接', value: reportConfig.relatedLinks, color: 'bg-green-500' },
                    { label: '参考来源', value: reportConfig.references, color: 'bg-yellow-500' },
                    { label: '索引关键词', value: reportConfig.keywords, color: 'bg-red-500' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${item.color}`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{item.label}</span>
                          <span>{item.value}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.value}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 协作效率指标 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3">协作效率指标</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm">平均响应时间</p>
                        <p className="text-xl font-bold">{reportConfig.avgResponseTime}</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400">-15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="text-sm">参与度</p>
                        <p className="text-xl font-bold">{reportConfig.participation}%</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400">+8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-3">
                        <Network size={20} />
                      </div>
                      <div>
                        <p className="text-sm">知识关联度</p>
                        <p className="text-xl font-bold">{reportConfig.knowledgeConnectivity}%</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400">+12%</span>
                  </div>
                </div>
              </motion.div>

              {/* 团队成员贡献 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
                className="md:col-span-2 bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3">团队成员贡献分析</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamMembers.map(m => ({ name: m.name, 贡献值: m.contribution || 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="贡献值" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* 项目管理 */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-2">项目管理</h2>
                <p className="text-gray-600 dark:text-gray-300">管理团队项目和任务分配，提高协作效率</p>
              </div>
              <button 
                onClick={handleAddProject}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus size={18} className="mr-2" />
                新建项目
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧:项目列表 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-1 space-y-4"
              >
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">团队项目</h3>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {projects.map(project => (
                      <div 
                        key={`team-${project.id}`}
                        onClick={() => setSelectedProject(project)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedProject?.id === project.id 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' 
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{project.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            project.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            project.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {project.status === 'completed' ? '已完成' : 
                             project.status === 'in-progress' ? '进行中' : '待开始'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{project.tasks.length} 个任务</span>
                          <span>{new Date(project.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>进度</span>
                            <span>{project.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all" 
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 专题研究入口 */}
                  <h3 className="font-semibold mt-4 mb-3 flex items-center">
                    <span className="text-lg mr-1.5">📚</span>专题研究
                  </h3>
                  <UnifiedResearchList />
                </div>
              </motion.div>

              {/* 中间:项目详情和任务 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                className="lg:col-span-2 space-y-4"
              >
                {selectedProject ? (
                  <>
                    {/* 项目详情 */}
                    <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{selectedProject.name}</h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{selectedProject.description}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditProject(selectedProject)}
                            className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProject(selectedProject.id)}
                            className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{selectedProject.progress}%</div>
                          <div className="text-xs text-gray-500">完成进度</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{selectedProject.tasks.filter(t => t.status === 'completed').length}</div>
                          <div className="text-xs text-gray-500">已完成任务</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{selectedProject.tasks.filter(t => t.status === 'in-progress').length}</div>
                          <div className="text-xs text-gray-500">进行中任务</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">{selectedProject.tasks.length}</div>
                          <div className="text-xs text-gray-500">总任务数</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar size={16} className="text-gray-500" />
                          <span>截止日期: {new Date(selectedProject.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users size={16} className="text-gray-500" />
                          <span>{selectedProject.assignedMembers.length} 人参与</span>
                        </div>
                      </div>
                    </div>

                    {/* 任务列表 */}
                    <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">任务列表</h3>
                        <button 
                          onClick={() => handleAddTask(selectedProject.id)}
                          className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Plus size={14} className="mr-1" />
                          添加任务
                        </button>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {selectedProject.tasks.map(task => (
                          <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
                            <div className="flex items-center space-x-3 flex-1">
                              <input
                                type="checkbox"
                                checked={task.status === 'completed'}
                                onChange={() => handleToggleTask(task.id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                    {task.title}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                  }`}>
                                    {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                                  <span>分配给: {teamMembers.find(m => m.id === task.assignedTo)?.name || '未分配'}</span>
                                  {task.dueDate && <span>• 截止: {new Date(task.dueDate).toLocaleDateString()}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button 
                                onClick={() => handleEditTask(task)}
                                className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white dark:bg-gray-750 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
                    <FileCheck size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">选择项目查看详情</h3>
                    <p className="text-gray-500 dark:text-gray-400">从左侧列表中选择一个项目来查看任务和进度详情</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}

        {/* 知识图谱 */}
        {activeTab === 'knowledge-graph' && <KnowledgeGraphPanel userInfo={userInfo} />}
        
        {/* 思维导图 */}
        {activeTab === 'mindmap' && <MindMapPanel userInfo={userInfo} />}

        {/* 知识网络/wiki编辑器 */}
        {activeTab === 'wiki-editor' && (
          <div className="h-[calc(100vh-200px)]">
            <WikiEditor />
          </div>
        )}
      </div>

      {/* 成员编辑弹窗 */}
      <EditModal 
        isOpen={isMemberModalOpen} 
        onClose={() => setIsMemberModalOpen(false)} 
        title={editingMember?.id === 0 ? '添加团队成员' : '编辑团队成员'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">姓名</label>
            <input
              type="text"
              value={editingMember?.name || ''}
              onChange={(e) => setEditingMember(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="输入成员姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">角色</label>
            <input
              type="text"
              value={editingMember?.role || ''}
              onChange={(e) => setEditingMember(prev => prev ? { ...prev, role: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="输入角色"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input
              type="email"
              value={editingMember?.email || ''}
              onChange={(e) => setEditingMember(prev => prev ? { ...prev, email: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="输入邮箱"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">头像</label>
            <select
              value={editingMember?.avatar || '👤'}
              onChange={(e) => setEditingMember(prev => prev ? { ...prev, avatar: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="👤">👤 默认</option>
              <option value="👨‍💼">👨‍💼 经理</option>
              <option value="👩‍💻">👩‍💻 开发</option>
              <option value="👨‍🎨">👨‍🎨 设计</option>
              <option value="👩‍🔬">👩‍🔬 研究</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="online"
              checked={editingMember?.online || false}
              onChange={(e) => setEditingMember(prev => prev ? { ...prev, online: e.target.checked } : null)}
              className="mr-2"
            />
            <label htmlFor="online" className="text-sm">在线状态</label>
          </div>
          {/* 权限设置 */}
          <div>
            <label className="block text-sm font-medium mb-2">权限设置</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'read', label: '查看', desc: '可查看内容' },
                { key: 'write', label: '编辑', desc: '可编辑内容' },
                { key: 'comment', label: '评论', desc: '可发表评论' },
                { key: 'admin', label: '管理', desc: '完全控制权' },
              ].map(perm => (
                <label key={perm.key} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors
                  ${(editingMember?.permissions || ['read', 'write']).includes(perm.key) 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' 
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={(editingMember?.permissions || ['read', 'write']).includes(perm.key)}
                    onChange={(e) => {
                      setEditingMember(prev => {
                        if (!prev) return prev;
                        const perms = prev.permissions || ['read', 'write'];
                        return {
                          ...prev,
                          permissions: e.target.checked 
                            ? [...perms, perm.key] 
                            : perms.filter((p: string) => p !== perm.key)
                        };
                      });
                    }}
                    className="rounded"
                  />
                  <div>
                    <div className="text-sm font-medium">{perm.label}</div>
                    <div className="text-xs text-gray-500">{perm.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button 
              onClick={() => setIsMemberModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              取消
            </button>
            <button 
              onClick={handleSaveMember}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
            >
              <Save size={16} className="mr-2" />
              保存
            </button>
          </div>
        </div>
      </EditModal>

      {/* 知识缺口编辑弹窗 */}
      <EditModal 
        isOpen={isGapModalOpen} 
        onClose={() => setIsGapModalOpen(false)} 
        title={editingGap?.id === 0 ? '添加知识缺口' : '编辑知识缺口'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">领域名称</label>
            <input
              type="text"
              value={editingGap?.area || ''}
              onChange={(e) => setEditingGap(prev => prev ? { ...prev, area: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="输入领域名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">缺口分数 (0-100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={editingGap?.gapScore || 0}
              onChange={(e) => setEditingGap(prev => prev ? { ...prev, gapScore: parseInt(e.target.value) || 0 } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">优先级</label>
            <select
              value={editingGap?.priority || '中'}
              onChange={(e) => setEditingGap(prev => prev ? { ...prev, priority: e.target.value as '高' | '中' | '低' } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={editingGap?.description || ''}
              onChange={(e) => setEditingGap(prev => prev ? { ...prev, description: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              rows={3}
              placeholder="输入描述"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button 
              onClick={() => setIsGapModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              取消
            </button>
            <button 
              onClick={handleSaveGap}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
            >
              <Save size={16} className="mr-2" />
              保存
            </button>
          </div>
        </div>
      </EditModal>

      {/* 报告配置弹窗 */}
      <EditModal 
        isOpen={isReportConfigOpen} 
        onClose={() => setIsReportConfigOpen(false)} 
        title="配置协作报告"
      >
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">同步协作比例 (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={reportConfig.syncCollaboration}
              onChange={(e) => setReportConfig(prev => ({ ...prev, syncCollaboration: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">异步协作比例 (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={reportConfig.asyncCollaboration}
              onChange={(e) => setReportConfig(prev => ({ ...prev, asyncCollaboration: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">核心概念比例 (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={reportConfig.coreConcepts}
              onChange={(e) => setReportConfig(prev => ({ ...prev, coreConcepts: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">关联链接比例 (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={reportConfig.relatedLinks}
              onChange={(e) => setReportConfig(prev => ({ ...prev, relatedLinks: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">平均响应时间</label>
            <input
              type="text"
              value={reportConfig.avgResponseTime}
              onChange={(e) => setReportConfig(prev => ({ ...prev, avgResponseTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="例如: 12分钟"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">参与度 (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={reportConfig.participation}
              onChange={(e) => setReportConfig(prev => ({ ...prev, participation: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button 
              onClick={() => setIsReportConfigOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              取消
            </button>
            <button 
              onClick={handleSaveReportConfig}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
            >
              <Save size={16} className="mr-2" />
              保存配置
            </button>
          </div>
        </div>
      </EditModal>

      {/* 项目编辑弹窗 */}
      <EditModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        title={editingProject?.id === 0 ? '新建项目' : '编辑项目'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">项目名称</label>
            <input
              type="text"
              value={editingProject?.name || ''}
              onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="输入项目名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">项目描述</label>
            <textarea
              value={editingProject?.description || ''}
              onChange={(e) => setEditingProject(prev => prev ? { ...prev, description: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              rows={3}
              placeholder="输入项目描述"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">状态</label>
            <select
              value={editingProject?.status || 'pending'}
              onChange={(e) => setEditingProject(prev => prev ? { ...prev, status: e.target.value as Project['status'] } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="pending">待开始</option>
              <option value="in-progress">进行中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">开始日期</label>
              <input
                type="date"
                value={editingProject?.startDate || ''}
                onChange={(e) => setEditingProject(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">结束日期</label>
              <input
                type="date"
                value={editingProject?.endDate || ''}
                onChange={(e) => setEditingProject(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">分配成员</label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
              {teamMembers.map(member => (
                <label key={member.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={editingProject?.assignedMembers?.includes(member.id) || false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setEditingProject(prev => {
                        if (!prev) return null;
                        const assignedMembers = prev.assignedMembers || [];
                        if (isChecked) {
                          return { ...prev, assignedMembers: [...assignedMembers, member.id] };
                        } else {
                          return { ...prev, assignedMembers: assignedMembers.filter(id => id !== member.id) };
                        }
                      });
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">{member.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button 
              onClick={() => setIsProjectModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              取消
            </button>
            <button 
              onClick={handleSaveProject}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
            >
              <Save size={16} className="mr-2" />
              保存
            </button>
          </div>
        </div>
      </EditModal>

      {/* 任务编辑弹窗 */}
      <EditModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        title={editingTask?.id === 0 ? '新建任务' : '编辑任务'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">任务标题</label>
            <input
              type="text"
              value={editingTask?.title || ''}
              onChange={(e) => setEditingTask(prev => prev ? { ...prev, title: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              placeholder="输入任务标题"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">任务描述</label>
            <textarea
              value={editingTask?.description || ''}
              onChange={(e) => setEditingTask(prev => prev ? { ...prev, description: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              rows={3}
              placeholder="输入任务描述"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">状态</label>
              <select
                value={editingTask?.status || 'pending'}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, status: e.target.value as Task['status'] } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="pending">待开始</option>
                <option value="in-progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">优先级</label>
              <select
                value={editingTask?.priority || 'medium'}
                onChange={(e) => setEditingTask(prev => prev ? { ...prev, priority: e.target.value as Task['priority'] } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">截止日期</label>
            <input
              type="date"
              value={editingTask?.dueDate || ''}
              onChange={(e) => setEditingTask(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">分配成员</label>
            <select
              value={editingTask?.assignedTo || ''}
              onChange={(e) => setEditingTask(prev => prev ? { ...prev, assignedTo: parseInt(e.target.value) || 0 } : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">未分配</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button 
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              取消
            </button>
            <button 
              onClick={handleSaveTask}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
            >
              <Save size={16} className="mr-2" />
              保存
            </button>
          </div>
        </div>
      </EditModal>
    </div>
  );
};

interface KnowledgeGraphPanelProps {
  userInfo: { id: string; name: string; avatar: string; color: string };
}

const KnowledgeGraphPanel: React.FC<KnowledgeGraphPanelProps> = ({ userInfo }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(getApiBaseUrl() + '/api/knowledge/cards?limit=100');
        const data = await res.json();
        const fetched = Array.isArray(data) ? data : (data.cards || []);
        setCards(fetched);
        if (fetched.length > 0 && !selectedCard) {
          setSelectedCard(fetched[0]);
          setEditTitle(fetched[0].title || '');
          setEditContent(fetched[0].content || '');
        }
      } catch (e) {
        console.error('Failed to load cards:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  const handleCardClick = (card: any) => {
    setSelectedCard(card);
    setEditTitle(card.title || '');
    setEditContent(card.content || '');
    setIsEditing(false);
    setShowPreview(true);
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditTitle(selectedCard?.title || '');
      setEditContent(selectedCard?.content || '');
    }
    setIsEditing(!isEditing);
    setShowPreview(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCard) return;
    try {
      const res = await fetch(getApiBaseUrl() + `/api/knowledge/cards/${selectedCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent })
      });
      if (res.ok) {
        const updated = await res.json();
        setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, ...updated } : c));
        setSelectedCard({ ...selectedCard, title: editTitle, content: editContent });
        setIsEditing(false);
        toast.success('卡片已更新');
      } else {
        toast.error('更新失败');
      }
    } catch (e) {
      toast.error('更新失败: ' + String(e));
    }
  };

  const filteredCards = cards.filter(card =>
    (card.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (card.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const colorMap: Record<string, string> = {
    'blue': '#3b82f6',
    'green': '#22c55e',
    'yellow': '#eab308',
    'red': '#ef4444'
  };
  const colorLabel: Record<string, string> = {
    'blue': '蓝色',
    'green': '绿色',
    'yellow': '黄色',
    'red': '红色'
  };

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    const nodes = cards.map((card: any) => ({
      id: String(card.id),
      name: card.title || `卡片${card.id}`,
      category: card.card_type || 'blue',
      symbolSize: 40 + (card.content?.length || 0) / 50,
      itemStyle: {
        color: colorMap[card.card_type] || colorMap['blue']
      }
    }));

    nodes.push({
      id: 'user',
      name: userInfo.name || '当前用户',
      category: 'user',
      symbolSize: 50,
      itemStyle: { color: '#8b5cf6' }
    });

    const links: any[] = [];
    for (let i = 0; i < cards.length; i++) {
      if (i > 0 && i < cards.length) {
        links.push({ source: String(cards[i].id), target: String(cards[Math.max(0, i-1)].id), label: '关联' });
      }
    }
    const userCardIdx = Math.floor(cards.length / 2);
    if (cards.length > 0) {
      links.push({ source: 'user', target: String(cards[userCardIdx].id), label: '创建' });
    }

    const categories = [
      { name: '蓝色卡片' },
      { name: '绿色卡片' },
      { name: '黄色卡片' },
      { name: '红色卡片' },
      { name: '用户' }
    ];

    const option = {
      tooltip: { trigger: 'item', formatter: (params: any) => `${params.name}` },
      legend: { data: categories.map(c => c.name), top: 10 },
      series: [{
        type: 'graph',
        layout: 'force',
        data: nodes.map(node => ({
          ...node,
          label: { show: true, fontSize: 11 }
        })),
        links,
        categories,
        roam: true,
        forceRepulsion: 500,
        linkDistance: 120,
        lineStyle: { color: 'source', curveness: 0.1 }
      }]
    };

    chart.setOption(option);

    // Click on graph node to select card
    chart.off('click');
    chart.on('click', (params: any) => {
      const card = cards.find(c => String(c.id) === params.name || String(c.id) === params.data?.id);
      if (card) handleCardClick(card);
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [cards, userInfo]);

  const typeColorBg: Record<string, string> = {
    'blue': 'bg-blue-100 dark:bg-blue-900/30',
    'green': 'bg-green-100 dark:bg-green-900/30',
    'yellow': 'bg-yellow-100 dark:bg-yellow-900/30',
    'red': 'bg-red-100 dark:bg-red-900/30'
  };

return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">团队知识图谱</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">点击左侧卡片或图谱节点查看详情并编辑</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCard(null)}
            className="flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
          >
            <X size={14} className="mr-1" /> 清除选择
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <RefreshCw size={14} className="mr-1" /> 刷新图谱
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : (
        <div className="flex gap-4" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
          {/* Left: Card list */}
          <div className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索卡片..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {['blue','green','yellow','red'].map(t => (
                  <span key={t} className={`text-xs px-1.5 py-0.5 rounded ${typeColorBg[t]} font-medium`} style={{ color: colorMap[t] }}>
                    {colorLabel[t]}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredCards.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">无匹配卡片</div>
              )}
              {filteredCards.map(card => (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedCard?.id === card.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: colorMap[card.card_type] || colorMap['blue'] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{card.title || `卡片${card.id}`}</div>
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {card.content?.slice(0, 60) || '暂无内容'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 text-center">
              共 {filteredCards.length} 张卡片
            </div>
          </div>

          {/* Center: Graph */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 overflow-hidden">
            <div ref={chartRef} className="w-full h-full" />
          </div>

          {/* Right: Detail panel */}
          <div className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {!selectedCard ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Eye size={32} className="mb-2 opacity-30" />
                <p className="text-sm">选择左侧卡片查看详情</p>
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colorMap[selectedCard.card_type] || colorMap['blue'] }}
                    />
                    <span className="text-sm font-medium truncate max-w-[160px]">
                      {selectedCard.title || `卡片${selectedCard.id}`}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className={`p-1.5 rounded-lg text-xs ${showPreview ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                      title="预览"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={handleEditToggle}
                      className={`p-1.5 rounded-lg text-xs ${isEditing ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                      title="编辑"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">标题</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">内容</label>
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={10}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <button
                        onClick={handleSaveEdit}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center justify-center gap-1"
                      >
                        <Save size={14} className="mr-1" /> 保存修改
                      </button>
                    </div>
                  ) : showPreview ? (
                    <div>
                      <div className="mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColorBg[selectedCard.card_type] || ''}`} style={{ color: colorMap[selectedCard.card_type] }}>
                          {colorLabel[selectedCard.card_type] || '蓝色'} 卡片
                        </span>
                      </div>
                      <h3 className="text-base font-semibold mb-2">{selectedCard.title || `卡片${selectedCard.id}`}</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {selectedCard.content || '暂无内容'}
                      </div>
                      {selectedCard.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {(selectedCard.tags as string[]).map((tag: string) => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 text-center py-8">预览已隐藏</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface MindMapPanelProps {
  userInfo: { id: string; name: string; avatar: string; color: string };
}

const MindMapPanel: React.FC<MindMapPanelProps> = ({ userInfo }) => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(getApiBaseUrl() + '/api/knowledge/cards?limit=50');
        const data = await res.json();
        setCards(Array.isArray(data) ? data : (data.cards || []));
      } catch (e) {
        console.error('Failed to load cards:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  const colorMap: Record<string, string> = {
    'blue': '#3b82f6',
    'green': '#22c55e',
    'yellow': '#eab308',
    'red': '#ef4444'
  };

  const buildMindMap = () => {
    if (cards.length === 0) {
      return {
        id: 'root',
        text: userInfo.name ? `${userInfo.name}的思维导图` : '团队思维导图',
        children: [],
        collapsed: false,
        color: '#8b5cf6'
      };
    }

    const byType: Record<string, any[]> = {};
    cards.forEach(card => {
      const type = card.card_type || 'blue';
      if (!byType[type]) byType[type] = [];
      byType[type].push(card);
    });

    const typeNames: Record<string, string> = {
      'blue': '蓝色卡片',
      'green': '绿色卡片',
      'yellow': '黄色卡片',
      'red': '红色卡片'
    };

    const children = Object.entries(byType).map(([type, typeCards]) => ({
      id: `type-${type}`,
      text: typeNames[type] || type,
      color: colorMap[type] || '#3b82f6',
      collapsed: false,
      children: typeCards.slice(0, 10).map(card => ({
        id: `card-${card.id}`,
        text: card.title?.slice(0, 20) || `卡片${card.id}`,
        children: [],
        collapsed: false,
        color: colorMap[type] || '#3b82f6'
      }))
    }));

    return {
      id: 'root',
      text: userInfo.name ? `${userInfo.name}的思维导图` : '团队思维导图',
      children,
      collapsed: false,
      color: '#8b5cf6'
    };
  };

  const [root, setRoot] = useState(buildMindMap);
  const [selectedNode, setSelectedNode] = useState<string | null>('root');
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    setRoot(buildMindMap());
  }, [cards, userInfo.name]);

  const nodeColors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

  const addChildNode = (parentId: string) => {
    const newNode = {
      id: `node-${Date.now()}`,
      text: '新主题',
      children: [],
      collapsed: false,
      color: nodeColors[Math.floor(Math.random() * nodeColors.length)]
    };
    
    const addToParent = (node: typeof root): typeof root => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode] };
      }
      return { ...node, children: node.children.map(addToParent) };
    };
    
    setRoot(addToParent(root));
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === 'root') return;
    
    const deleteFromTree = (node: typeof root): typeof root => ({
      ...node,
      children: node.children.filter(c => c.id !== nodeId).map(deleteFromTree)
    });
    
    setRoot(deleteFromTree(root));
    setSelectedNode(null);
  };

  const updateNodeText = (nodeId: string, newText: string) => {
    const updateInTree = (node: typeof root): typeof root => {
      if (node.id === nodeId) {
        return { ...node, text: newText };
      }
      return { ...node, children: node.children.map(updateInTree) };
    };
    
    setRoot(updateInTree(root));
    setEditingNode(null);
  };

  const renderNode = (node: typeof root, isRoot: boolean = false) => {
    const isSelected = selectedNode === node.id;
    const isEditing = editingNode === node.id;

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div
          onClick={() => setSelectedNode(node.id)}
          onDoubleClick={() => { setEditingNode(node.id); setEditText(node.text); }}
          className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${
            isSelected ? 'ring-2 ring-blue-500' : ''
          }`}
          style={{ backgroundColor: node.color + '20', border: `2px solid ${node.color}` }}
        >
          {isEditing ? (
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => updateNodeText(node.id, editText)}
              onKeyDown={(e) => e.key === 'Enter' && updateNodeText(node.id, editText)}
              autoFocus
              className="bg-transparent border-none outline-none text-center"
            />
          ) : (
            <span className="font-medium">{node.text}</span>
          )}
        </div>
        
        {node.children.length > 0 && !node.collapsed && (
          <div className="flex items-start space-x-4 mt-4">
            {node.children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-gray-300" />
                <div className="mt-2">{renderNode(child)}</div>
              </div>
            ))}
          </div>
        )}
        
        {isSelected && !isRoot && (
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => addChildNode(node.id)}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              + 子节点
            </button>
            <button
              onClick={() => deleteNode(node.id)}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            >
              删除
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold mb-2">团队思维导图</h2>
          <p className="text-gray-600 dark:text-gray-300">基于4色卡片分类的思维导图</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            当前用户: {userInfo.avatar} {userInfo.name || '匿名'}
          </span>
          <button
            onClick={() => addChildNode('root')}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus size={18} className="mr-2" />
            添加分支
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-750 rounded-xl p-8 border border-gray-200 dark:border-gray-700 min-h-[500px] overflow-auto">
            <div className="flex justify-center">
              {renderNode(root, true)}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>💡 双击节点编辑文字，点击节点添加/删除子节点</p>
            <span>共 {cards.length} 张知识卡片</span>
          </div>
        </>
      )}
    </div>
  );
};

// ========== 专题研究列表组件（嵌入团队项目管理面板） ==========
const UnifiedResearchList: React.FC = () => {
  const [researchProjects, setResearchProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResearch = async () => {
      try {
        const { researchProjectService } = await import('../services/dataService');
        const projects = await researchProjectService.getAll();
        setResearchProjects(projects);
      } catch {
        setResearchProjects([]);
      } finally {
        setLoading(false);
      }
    };
    loadResearch();
  }, []);

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  if (loading) {
    return <div className="text-center py-4 text-sm text-gray-400">加载中...</div>;
  }

  if (researchProjects.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">
        暂无专题研究，请在 GTD → 专题研究中创建
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {researchProjects.map(project => (
        <div
          key={`research-${project.id}`}
          onClick={() => {
            // 导航到 GTD 中的专题研究
            const event = new CustomEvent('navigateToResearch', { detail: { projectId: project.id } });
            window.dispatchEvent(event);
          }}
          className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-750 ${
            colorMap[project.color || 'blue'] || colorMap.blue
          } border`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{project.icon || '📚'}</span>
              <span className="font-medium text-sm">{project.name}</span>
            </div>
            <span className="text-xs opacity-70">专题</span>
          </div>
          {project.description && (
            <p className="text-xs opacity-60 mt-1 truncate">{project.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default TeamCollaborationEnhanced;
