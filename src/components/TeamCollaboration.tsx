﻿﻿import React, { useState, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Permission } from '@/contexts/authContext';
import {
  Users,
  FileCheck,
  Clock,
  AlertCircle,
  Edit3,
  Trash2,
  Plus,
  X,
  Send,
  Save,
  Calendar,
  Library,
  Bookmark,
  MessageSquare
} from 'lucide-react';
import MeetingCardPanel, { CardDetailPopup } from './MeetingCardPanel';
import { collaborationService, collaborationREST } from '../services/collaborationService';
import { teamMemberService, activityService, projectService, researchProjectService } from '../services/dataService';
import { toast } from 'sonner';
import { AuthContext } from '../contexts/authContext';
import { getApiBaseUrl } from '@/lib/apiConfig';


// ========== 类型定义 ==========

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

// ========== 主组件==========
const TeamCollaborationEnhanced: React.FC = () => {
  const { userInfo, updatePermissions } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'realtime' | 'projects' | 'mindmap'>('realtime');
  
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

  // WebSocket 协作状态
  const [collabUserId] = useState(() => {
    let id = localStorage.getItem('collab_user_id');
    if (!id) {
      id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      localStorage.setItem('collab_user_id', id);
    }
    return id;
  });
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [discussionCards, setDiscussionCards] = useState<any[]>([]);
  const [showCardPanel, setShowCardPanel] = useState(false);
  const [referencedCards, setReferencedCards] = useState<any[]>([]);
  const [previewCard, setPreviewCard] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cardCacheRef = useRef<Map<string, any>>(new Map());

  // 新消息时自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // 知识库卡片选择
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [topicCards, setTopicCards] = useState<any[]>([]);

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
      name: '知识库重析',
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
          description: '设计新的知识库架析',
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
          description: '收集用户反馈和使用数换',
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

        // 记录最近活动用于展示
        if (activities && activities.length > 0) {
          console.info(`[协作] 最运${activities.length} 条活动已加载`);
        }

// 同步当前用户权限：匹配到团队成员则使用其权限
        const matchedMember = members.find((m: any) => m.name === userInfo.name);
        if (matchedMember && matchedMember.permissions) {
          updatePermissions(matchedMember.permissions as Permission[], matchedMember.role, matchedMember.id);
        }

        // 从后端加载项目数换
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
            // 如果没有数据，使用默认示例项监
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

        // 通过 WebSocket REST 加载历史活动
        try {
          const activities = await collaborationREST.getActivities(50);
          if (activities && activities.length > 0) {
            setMessages(activities.map((a: any, idx: number) => ({
              id: idx + 1,
              user: a.user || '未知',
              avatar: a.avatar || '👤',
              content: a.content || '',
              timestamp: a.timestamp ? new Date(a.timestamp).toLocaleString('zh-CN') : '',
              replies: []
            })));
            console.info(`[协作] 加载了${activities.length} 条历史消息`);
          }
        } catch (e) {
          console.info('[协作] 无历史消息记录，开始新的协作会话');
        }

      } finally {
        setLoading(false);
      }
    };

    loadCollaborationData();
  }, []);

  // 加载研究专题列表（用于知识卡片选择）
  useEffect(() => {
    researchProjectService.getAll().then(data => {
      if (data && data.length > 0) {
        setTopics(data);
        setSelectedTopicId(data[0].id ?? null);
      }
    }).catch(() => {});
  }, []);

  // 当选择专题变化时加载卡片
  useEffect(() => {
    if (!selectedTopicId) { setTopicCards([]); return; }
    researchProjectService.getCards(selectedTopicId).then(cards => {
      setTopicCards(cards || []);
    }).catch(() => setTopicCards([]));
  }, [selectedTopicId]);

  // ========== WebSocket 实时协作连接 ==========
  useEffect(() => {
    if (!collabUserId) return;
    
    collaborationService.connect(collabUserId, userInfo.name, userInfo.avatar);
    setConnected(true);
    
    const unsubscribe = collaborationService.onMessage((msg) => {
      if (msg.type === 'history') {
        console.log(`[协作] 收到历史数据: ${msg.activities?.length || 0} 条活加 ${msg.members?.length || 0} 名成员`);
        if (msg.activities && msg.activities.length > 0) {
          setMessages(msg.activities.map((a: any, idx: number) => ({
            id: idx + 1,
            user: a.user || '未知',
            avatar: a.avatar || '👤',
            content: a.content || '',
            timestamp: a.timestamp ? new Date(a.timestamp).toLocaleString('zh-CN') : '',
            replies: []
          })));
        }
        if (msg.members) {
          setOnlineCount(msg.members.filter((m: any) => m.status === 'online').length);
        }
      } else if (msg.type === 'new_activity' && msg.activity) {
        const a = msg.activity;
        // 跳过发送者自己的消息（已在 handleSendMessage 中本地添加）
        if (a.userId === collabUserId) return;
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: a.user || '未知',
          avatar: a.avatar || '👤',
          content: a.content || '',
          timestamp: a.timestamp ? new Date(a.timestamp).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN'),
          replies: []
        }]);
        // 滚动到底部
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else if (msg.type === 'user_online' || msg.type === 'user_offline') {
        setOnlineCount(prev => msg.type === 'user_online' ? prev + 1 : Math.max(0, prev - 1));
      }
    });
    
    return () => {
      unsubscribe();
      collaborationService.disconnect();
      setConnected(false);
    };
  }, [collabUserId]);

  // 同步所有项目任务到 tasks 状态
  useEffect(() => {
    const allTasks: Task[] = projects.flatMap(p => p.tasks || []);
    setTasks(allTasks);
  }, [projects]);

  // 维护卡片标题→对象的持久缓存，用于历史消息中的 @[卡片] 查找
  useEffect(() => {
    const cache = cardCacheRef.current;
    [...topicCards, ...discussionCards, ...referencedCards].forEach(card => {
      const key = card.title || card.name;
      if (key) cache.set(key, card);
    });
  }, [topicCards, discussionCards, referencedCards]);

  // ========== 团队成员管理 ==========
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

  // ========== 知识缺口管理 ==========
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

  // ========== 协作消息管理 ==========
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // 持久化当前引用的卡片，用于后续历史消息渲染
    referencedCards.forEach(card => {
      const key = card.title || card.name;
      if (key) cardCacheRef.current.set(key, card);
    });
    
    const refs = referencedCards.map(c => `@[${c.title || c.name || '卡片'}]`).join(' ');
    const fullContent = refs ? `${refs} ${newMessage}` : newMessage;
    
    const message: CollaborationMessage = {
      id: Date.now(),
      user: userInfo.name || '匿名用户',
      avatar: userInfo.avatar || '👤',
      content: fullContent,
      timestamp: new Date().toLocaleString('zh-CN')
    };
    
    // 本地立即显示
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setReferencedCards([]);
    
    // 通过 REST API 持久化到数据库并广播给所有在线用户
    collaborationREST.addActivity({
      user: message.user,
      userId: collabUserId,
      avatar: message.avatar,
      action: '发言',
      content: message.content,
      type: 'message'
    }).catch(err => console.warn('[协作] REST持久化失败:', err));
    
    // 滚动到底部
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
    
    // 通过 WebSocket 发送评认
    collaborationService.sendComment({
      user: reply.user,
      userId: collabUserId,
      avatar: reply.avatar,
      content: reply.content,
      parentId: parentId,
      targetId: parentId,
      targetType: 'message'
    });
    
    setReplyingTo(null);
    setReplyContent('');
  };

  // ========== 报告配置 ==========
  const handleSaveReportConfig = () => {
    // 这里可以保存到后端
    toast.success('报告配置已保存')
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
    if (!confirm('确定要删除这个任务吗，')) return;
    
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
          <p className="mt-2 text-gray-600 dark:text-gray-400">加载协作数据中..</p>
        </div>
      </div>
    );
  }

  const renderMessageContent = (text: string) => {
    const allCards = [...topicCards, ...discussionCards];
    const parts: Array<{ type: 'text' | 'card'; content: string; card?: any }> = [];
    const regex = /@\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      const title = match[1];
      const card = allCards.find(c => (c.title || c.name) === title) || cardCacheRef.current.get(title);
      if (card) {
        parts.push({ type: 'card', content: title, card });
      } else {
        parts.push({ type: 'text', content: `@[${title}]` });
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    if (parts.length === 0) return text;

    return parts.map((part, i) => {
      if (part.type === 'card') {
        return (
          <span
            key={i}
            onClick={() => setPreviewCard(part.card)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors text-xs font-medium"
            title="点击查看卡片详情"
          >
            📌 {part.content}
          </span>
        );
      }
      return <span key={i}>{part.content}</span>;
    });
  };

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
      {/* 功能标签顶*/}
      <div className="border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto">
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
            onClick={() => setActiveTab('mindmap')}
            className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
              activeTab === 'mindmap'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
            }`}
          >
            思维导图
          </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6">


        {/* 实时协作编辑 */}
                {activeTab === 'realtime' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">实时协作编辑</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">多人同时编辑和评论，加速知识发展过程</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {connected ? `${onlineCount}人在线` : '未连接'}
                  </span>
                  <button
                    onClick={() => setShowCardPanel(!showCardPanel)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${showCardPanel ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    <Library size={14} />
                    知识卡片
                  </button>
                </div>
              </div>

              <div className={`grid gap-6 ${showCardPanel ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {/* 聊天面板 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-[500px] flex flex-col ${showCardPanel ? 'lg:col-span-2' : ''}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <MessageSquare size={16} />
                      </div>
                      <h3 className="font-semibold">协作讨论</h3>
                      <span className="text-xs text-gray-500">{messages.length} 条消息</span>
                    </div>
                  </div>

                  <div className="flex-1 bg-gray-50 dark:bg-gray-750 rounded-lg p-4 border border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <div className="space-y-4">
                      {messages.length === 0 && (
                        <div className="text-center text-gray-400 py-8 text-sm">
                          暂无消息，开始协作讨论吧
                        </div>
                      )}
                      {messages.map(message => (
                        <div key={message.id} className="relative">
                          <div className="flex items-start space-x-3">
                            <span className="text-2xl flex-shrink-0">{message.avatar}</span>
                            <div className="flex-1 min-w-0">
                              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-sm">{message.user}</span>
                                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{message.timestamp}</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap break-words">{renderMessageContent(message.content)}</p>
                              </div>
                              <button
                                onClick={() => handleReply(message.id)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 ml-1"
                              >
                                回复
                              </button>

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

                              {message.replies && message.replies.length > 0 && (
                                <div className="mt-3 ml-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
                                  {message.replies.map(reply => (
                                    <div key={reply.id} className="flex items-start space-x-3">
                                      <span className="text-xl flex-shrink-0">{reply.avatar}</span>
                                      <div className="flex-1 bg-gray-100 dark:bg-gray-600 rounded-lg p-2">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="font-medium text-sm">{reply.user}</span>
                                          <span className="text-xs text-gray-500">{reply.timestamp}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{renderMessageContent(reply.content)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                    {referencedCards.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 px-1">
                        {referencedCards.map((card, idx) => (
                          <span
                            key={idx}
                            onClick={() => setPreviewCard(card)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors"
                            title="点击查看卡片详情"
                          >
                            📌 {card.title || card.name || '卡片'}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex items-end gap-2">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {userInfo.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                          placeholder="输入想法或建议.."
                          className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-colors outline-none"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const fakeCard = { id: 'card_' + Date.now(), title:'新知识卡片', content: newMessage || '讨论中产生的知识', card_type: 'blue' as const };
                              setDiscussionCards(prev => [...prev, fakeCard]);
                              toast.success('已添加到知识卡片');
                            }}
                            disabled={!newMessage.trim()}
                            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 text-gray-600 dark:text-gray-400 rounded-full transition-colors"
                            title="添加为知识卡片"
                          >
                            <Bookmark size={16} />
                          </button>
                          <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full transition-colors"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                {showCardPanel && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-[500px] flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Library size={16} className="text-blue-500" />
                        知识卡片
                      </h3>
                      <span className="text-xs text-gray-500">{topicCards.length + discussionCards.length} 张</span>
                    </div>
                    {topics.length > 0 && (
                      <select
                        value={selectedTopicId ?? ''}
                        onChange={e => setSelectedTopicId(Number(e.target.value) || null)}
                        className="mb-3 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                      >
                        {topics.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex-1 overflow-y-auto">
                      {topicCards.length === 0 && discussionCards.length === 0 ? (
                        <div className="text-center text-gray-400 py-8 text-sm">
                          选择上方专题加载卡片，或在讨论中点击 Bookmark 按钮添加知识卡片
                        </div>
                      ) : (
                        <MeetingCardPanel cards={[...topicCards, ...discussionCards] as any} onSaveCard={(card) => {
                            setReferencedCards(prev => [...prev, card]);
                            toast.success('已添加卡片引用');
                          }} />
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}



        {/* 协作分析报告 */}


        {/* 项目管理 */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-2">项目管理</h2>
                <p className="text-gray-600 dark:text-gray-300">管理团队项目和任务分配，提高协作效率</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>共{projects.length} 个项目</span>
                  <span>·</span>
                  <span>共{tasks.length} 个任务</span>
                  <span>·</span>
                  <span className="text-green-600">
                    已完成{tasks.filter(t => t.status === 'completed').length}
                  </span>
                  <span>·</span>
                  <span className="text-orange-600">
                    进行中{tasks.filter(t => t.status === 'in-progress').length}
                  </span>
                </div>
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

              {/* 中间:项目详情和任加*/}
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
                          <div className="text-xs text-gray-500">已完成任加</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{selectedProject.tasks.filter(t => t.status === 'in-progress').length}</div>
                          <div className="text-xs text-gray-500">进行中任加</div>
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
                          <span>{selectedProject.assignedMembers.length} 人参中</span>
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
                                  <span>分配至 {teamMembers.find(m => m.id === task.assignedTo)?.name || '未分配'}</span>
                                  {task.dueDate && <span>截止: {new Date(task.dueDate).toLocaleDateString()}</span>}
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
                    <p className="text-gray-500 dark:text-gray-400">从左侧列表中选择一个项目来查看任务和进度详想</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}

          {/* 思维导图 */}
          {activeTab === 'mindmap' && <MindMapPanel userInfo={userInfo} />}
      </div>

      {/* 卡片详情预览弹窗 */}
      {previewCard && (
        <CardDetailPopup
          card={previewCard as any}
          onClose={() => setPreviewCard(null)}
        />
      )}

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
              <option value="👨‍💼">👨‍💼经理</option>
              <option value="👩‍💼">👩‍💼开发</option>
              <option value="👨‍🎨">👨‍🎨设计</option>
              <option value="👩‍🔬">👩‍🔬研究</option>
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
            <label className="block text-sm font-medium mb-1">参与库(%)</label>
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
              <label className="block text-sm font-medium mb-1">开始日未</label>
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

interface MindMapPanelProps {
  userInfo: { id: string; name: string; avatar: string; color: string };
}

interface MindNode {
  id: string;
  text: string;
  children: MindNode[];
  collapsed: boolean;
  color: string;
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
        children: [] as MindNode[],
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

    const children: MindNode[] = Object.entries(byType).map(([type, typeCards]): MindNode => ({
      id: `type-${type}`,
      text: typeNames[type] || type,
      color: colorMap[type] || '#3b82f6',
      collapsed: false,
      children: typeCards.slice(0, 10).map((card): MindNode => ({
        id: `card-${card.id}`,
        text: card.title?.slice(0, 20) || `卡片${card.id}`,
        children: [] as MindNode[],
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

  const [root, setRoot] = useState<MindNode>(() => buildMindMap());
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
      text: '新主颜',
      children: [] as MindNode[],
      collapsed: false,
      color: nodeColors[Math.floor(Math.random() * nodeColors.length)]
    };

    const addToParent = (node: MindNode): MindNode => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode] };
      }
      return { ...node, children: node.children.map(addToParent) };
    };

    setRoot(addToParent(root));
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === 'root') return;

    const deleteFromTree = (node: MindNode): MindNode => ({
      ...node,
      children: node.children.filter(c => c.id !== nodeId).map(deleteFromTree)
    });

    setRoot(deleteFromTree(root));
    setSelectedNode(null);
  };

  const updateNodeText = (nodeId: string, newText: string) => {
    const updateInTree = (node: MindNode): MindNode => {
      if (node.id === nodeId) {
        return { ...node, text: newText };
      }
      return { ...node, children: node.children.map(updateInTree) };
    };

    setRoot(updateInTree(root));
    setEditingNode(null);
  };

  const renderNode = (node: MindNode, isRoot: boolean = false) => {
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
        <div className="text-center py-8">加载中..</div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-750 rounded-xl p-8 border border-gray-200 dark:border-gray-700 min-h-[500px] overflow-auto">
            <div className="flex justify-center">
              {renderNode(root, true)}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>💡 双击节点编辑文字，点击节点添加删除子节点</p>
            <span>全{cards.length} 张知识卡片</span>
          </div>
        </>
      )}
    </div>
  );
};

// ========== 专题研究列表组件（嵌入团队项目管理面板） ==========
const UnifiedResearchList: React.FC<{ onSelect?: (project: any) => void }> = ({ onSelect }) => {
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
    return <div className="text-center py-4 text-sm text-gray-400">加载中..</div>;
  }

  if (researchProjects.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">
        暂无专题研究，请到 GTD → 专题研究中创建
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {researchProjects.map(project => (
        <div
          key={`research-${project.id}`}
          onClick={() => onSelect?.(project)}
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
