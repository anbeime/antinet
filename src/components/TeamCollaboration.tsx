import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronUp
} from 'lucide-react';
import { teamMemberService, activityService, analyticsService } from '../services/dataService';
import { toast } from 'sonner';
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

// ========== 锦衣卫会议面板组件 ==========
const JinyiweiMeetingPanel: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [rounds, setRounds] = useState(3);
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [meetingLog, setMeetingLog] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(0);

  // 8个锦衣卫Agent定义
  const agents = [
    { id: 'zhihuishi', name: '指挥使', role: '会议主持', avatar: '👑', color: 'from-amber-500 to-orange-600' },
    { id: 'tongzhi', name: '同知', role: '战略顾问', avatar: '🎯', color: 'from-blue-500 to-blue-600' },
    { id: 'qianhu', name: '千户', role: '执行专家', avatar: '⚔️', color: 'from-red-500 to-red-600' },
    { id: 'baihu', name: '百户', role: '技术专家', avatar: '🔧', color: 'from-cyan-500 to-cyan-600' },
    { id: 'zongqi', name: '总旗', role: '情报分析', avatar: '📊', color: 'from-purple-500 to-purple-600' },
    { id: 'xiaoqi', name: '小旗', role: '创新专员', avatar: '💡', color: 'from-orange-500 to-orange-600' },
    { id: 'tixingguan', name: '提刑官', role: '风险评估', avatar: '⚖️', color: 'from-indigo-500 to-indigo-600' },
    { id: 'zhangxingguan', name: '掌刑官', role: '实施监督', avatar: '📋', color: 'from-green-500 to-green-600' },
  ];

  const startMeeting = () => {
    if (!topic.trim()) {
      toast.error('请输入会议主题');
      return;
    }
    setIsMeetingActive(true);
    setMeetingLog([`🏛️ 锦衣卫会议开始 - 主题：${topic}`]);
    setCurrentRound(1);
    
    // 模拟会议进程
    let round = 1;
    const interval = setInterval(() => {
      if (round > rounds) {
        clearInterval(interval);
        setMeetingLog(prev => [...prev, '✅ 会议结束，已形成决议']);
        setIsMeetingActive(false);
        return;
      }
      
      setMeetingLog(prev => [...prev, `\n📢 第${round}轮讨论：`]);
      
      agents.forEach((agent, idx) => {
        setTimeout(() => {
          const speeches = [
            `【${agent.name}】关于此议题，我认为...`,
            `【${agent.name}】从${agent.role}角度分析...`,
            `【${agent.name}】建议采取以下措施...`,
            `【${agent.name}】补充一点...`,
          ];
          const speech = speeches[Math.floor(Math.random() * speeches.length)];
          setMeetingLog(prev => [...prev, `${agent.avatar} ${speech}`]);
        }, idx * 800);
      });
      
      round++;
      setCurrentRound(round);
    }, 6000);
  };

  const resetMeeting = () => {
    setIsMeetingActive(false);
    setMeetingLog([]);
    setCurrentRound(0);
    setTopic('');
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2 flex items-center">
          <Crown className="mr-2 text-red-600" />
          锦衣卫智能体会议
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          8位锦衣卫智能体基于知识卡片进行深度讨论，模拟真实团队协作场景
        </p>
      </div>

      {/* 会议设置 */}
      <div className="bg-white dark:bg-gray-750 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">会议主题</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入需要讨论的主题..."
              disabled={isMeetingActive}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">讨论轮数</label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => !isMeetingActive && setRounds(num)}
                  disabled={isMeetingActive}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    rounds === num
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-red-500'
                  } disabled:opacity-50`}
                >
                  {num}轮
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 参会人员 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">参会人员（8位锦衣卫）</label>
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
                    <p className="text-xs text-gray-500">{agent.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex space-x-4">
          <button
            onClick={startMeeting}
            disabled={isMeetingActive || !topic.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold flex items-center justify-center transition-all"
          >
            {isMeetingActive ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                会议进行中...
              </>
            ) : (
              <>
                <Play size={20} className="mr-2" />
                召开锦衣卫会议
              </>
            )}
          </button>
          <button
            onClick={resetMeeting}
            disabled={isMeetingActive}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold flex items-center transition-colors disabled:opacity-50"
          >
            <RotateCcw size={20} className="mr-2" />
            重置
          </button>
        </div>
      </div>

      {/* 会议记录 */}
      {meetingLog.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <MessageSquare className="mr-2 text-green-400" />
              会议记录
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">
                第 {currentRound} / {rounds} 轮
              </span>
              {isMeetingActive && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto font-mono text-sm">
            {meetingLog.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-2 rounded ${
                  log.startsWith('🏛️') ? 'bg-red-900/30 text-red-300' :
                  log.startsWith('📢') ? 'bg-blue-900/30 text-blue-300' :
                  log.startsWith('✅') ? 'bg-green-900/30 text-green-300' :
                  'text-gray-300'
                }`}
              >
                {log}
              </motion.div>
            ))}
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
  const [activeTab, setActiveTab] = useState<'integration' | 'realtime' | 'gaps' | 'reports' | 'jinyiwei'>('integration');
  
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
  
  // 加载状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 编辑状态
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingGap, setEditingGap] = useState<KnowledgeGap | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isGapModalOpen, setIsGapModalOpen] = useState(false);
  const [isReportConfigOpen, setIsReportConfigOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

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
          contribution: m.contribution || Math.floor(Math.random() * 100)
        })));

        // 初始化知识缺口数据（可以从后端加载）
        setKnowledgeGaps([
          { id: 1, area: 'API设计', gapScore: 85, priority: '高', description: '团队缺乏系统性的API设计规范和最佳实践', suggestions: ['建立API设计规范文档', '开展API设计培训'] },
          { id: 2, area: 'UI/UX', gapScore: 72, priority: '中', description: '用户体验设计能力需要提升', suggestions: ['引入设计系统', '增加用户研究环节'] },
          { id: 3, area: '性能优化', gapScore: 68, priority: '中', description: '应用性能优化知识不够系统', suggestions: ['建立性能监控体系', '分享性能优化案例'] },
          { id: 4, area: '测试覆盖', gapScore: 60, priority: '低', description: '测试覆盖率有待提高', suggestions: ['制定测试规范', '引入自动化测试'] }
        ]);

        // 初始化协作消息
        setMessages([
          { id: 1, user: '张三', avatar: '👨‍💼', content: '我们需要制定一个新的产品创新策略，结合AI技术和用户体验研究的最新成果。', timestamp: '2026-02-20 10:30' },
          { id: 2, user: '李四', avatar: '👩‍💻', content: '我认为可以从用户旅程地图入手，识别关键痛点和机会点，然后用AI技术来优化这些环节。', timestamp: '2026-02-20 10:35', replies: [
            { id: 3, user: '王五', avatar: '👨‍🎨', content: '这个思路很好！我建议我们可以先做一个快速的用户调研，收集一些初步反馈。', timestamp: '2026-02-20 10:40' }
          ]},
          { id: 4, user: '赵六', avatar: '👩‍🔬', content: '我们还应该考虑技术可行性和资源限制，制定一个分阶段的实施计划。', timestamp: '2026-02-20 10:45' }
        ]);

      } catch (err) {
        setError('加载协作数据失败，请检查后端连接');
        console.error('Collaboration data load error:', err);
        toast.error('加载协作数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadCollaborationData();
  }, []);

  // ========== 团队成员管理 ==========
  const handleAddMember = () => {
    setEditingMember({ id: 0, name: '', role: '', email: '', avatar: '👤', online: false, contribution: 0 });
    setIsMemberModalOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember({ ...member });
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    
    try {
      if (editingMember.id === 0) {
        // 添加新成员
        const newMember = await teamMemberService.add(editingMember);
        setTeamMembers([...teamMembers, { ...newMember, id: newMember.id || Date.now() }]);
        toast.success('成员添加成功');
      } else {
        // 更新成员
        await teamMemberService.update(editingMember.id, editingMember);
        setTeamMembers(teamMembers.map(m => m.id === editingMember.id ? editingMember : m));
        toast.success('成员更新成功');
      }
      setIsMemberModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      toast.error('保存成员失败');
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('确定要删除这个成员吗？')) return;
    
    try {
      await teamMemberService.delete(id);
      setTeamMembers(teamMembers.filter(m => m.id !== id));
      toast.success('成员删除成功');
    } catch (err) {
      toast.error('删除成员失败');
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
      user: '当前用户',
      avatar: '👤',
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
      user: '当前用户',
      avatar: '👤',
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
          onClick={() => setActiveTab('jinyiwei')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'jinyiwei' 
              ? 'border-red-500 text-red-600 dark:text-red-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Crown size={18} className="mr-2" />
            <span>锦衣卫会议</span>
            <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full">
              AI
            </span>
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
                <p className="text-gray-600 dark:text-gray-300">AI智能识别重复和互补内容，生成完整的团队知识图谱</p>
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
              {/* 左侧：整合状态和进度 */}
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

              {/* 右侧：团队成员和统计图表 */}
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
              <p className="text-gray-600 dark:text-gray-300">多人同时编辑和评论，加速知识发展过程</p>
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
              {/* 左侧：知识空白列表 */}
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

              {/* 右侧：知识覆盖度雷达图 */}
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
                      团队倾向于异步协作模式，建议优化异步协作工具和流程，提高效率。
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
    </div>
  );
};

export default TeamCollaborationEnhanced;
