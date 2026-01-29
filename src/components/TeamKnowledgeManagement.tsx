import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  MoreHorizontal,
  Search,
  PlusCircle,
  X,
  Check,
  ChevronDown,
  UserPlus,
  Settings,
  Share2,
  History,
  Users as UsersIcon,
  Book,
  FileCheck,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { teamMemberService, knowledgeSpaceService, activityService, commentService } from '../services/dataService';

// 定义团队成员类型
interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
  joinDate: string;
  lastActive: string;
  permissions: string[];
  contribution: number;
  email?: string;
}

// 定义知识空间类型
interface KnowledgeSpace {
  id: string;
  name: string;
  description: string;
  members: string[];
  owner: string;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  isPublic: boolean;
}

// 定义知识版本类型
interface KnowledgeVersion {
  id: string;
  cardId: string;
  content: string;
  updatedBy: string;
  updatedAt: string;
  reason: string;
}

// 定义评论类型
interface Comment {
  id: string;
  cardId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  replies: Comment[];
}

const TeamKnowledgeManagement: React.FC = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'spaces' | 'members' | 'activity' | 'approval' | 'settings'>('spaces');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<KnowledgeSpace | null>(null);
  const [knowledgeVersions, setKnowledgeVersions] = useState<KnowledgeVersion[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newSpace, setNewSpace] = useState({ name: '', description: '', isPublic: false });
  const [newMember, setNewMember] = useState({ name: '', role: '', email: '', permissions: ['view'] });
  const [newComment, setNewComment] = useState('');
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [showApprovalQueue, setShowApprovalQueue] = useState(false);
  const [realtimeActivities, setRealtimeActivities] = useState<any[]>([]);
  const [contributionData, setContributionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从后端API加载知识管理数据
  useEffect(() => {
    const loadKnowledgeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 调用后端API获取真实知识管理数据
        const [members, spaces, activities, comments] = await Promise.all([
          teamMemberService.getAll(),
          knowledgeSpaceService.getAll(),
          activityService.getRecent(20),
          commentService.getByTarget(1, 'space')
        ]);

        // 设置团队成员数据
        setTeamMembers(members.map(m => {
          let permissions: string[] = ['read'];
          if (m.permissions) {
            if (typeof m.permissions === 'string') {
              try {
                permissions = JSON.parse(m.permissions);
              } catch {
                permissions = ['read'];
              }
            } else if (Array.isArray(m.permissions)) {
              permissions = m.permissions;
            }
          }
          
          return {
            id: m.id?.toString() || '',
            name: m.name,
            role: m.role,
            avatar: m.avatar || '👤',
            online: m.online || false,
            joinDate: m.join_date || '',
            lastActive: m.last_active || '',
            permissions,
            contribution: m.contribution || 0,
            email: m.email
          };
        }));

        // 设置知识空间数据
        setKnowledgeSpaces(spaces.map(s => {
          let membersList: string[] = [];
          if (s.members) {
            if (typeof s.members === 'string') {
              try {
                membersList = JSON.parse(s.members);
              } catch {
                membersList = [];
              }
            } else if (Array.isArray(s.members)) {
              membersList = s.members;
            }
          }
          
          return {
            id: s.id?.toString() || '',
            name: s.name,
            description: s.description || '',
            members: membersList,
            owner: s.owner || '',
            createdAt: s.created_at || '',
            updatedAt: s.updated_at || '',
            cardCount: s.card_count || 0,
            isPublic: s.is_public || false
          };
        }));

        // 设置活动数据
        setRealtimeActivities(activities.map(a => ({
          id: a.id?.toString() || '',
          user: a.user_name,
          avatar: '👤',
          action: a.action,
          target: a.content || '',
          timestamp: a.timestamp || '',
          metadata: a.metadata || ''
        })));

        // 设置评论数据
        setComments(comments.map(c => ({
          id: c.id?.toString() || '',
          cardId: c.target_id?.toString() || '1',
          userId: c.id?.toString() || '',
          userName: c.user_name,
          userAvatar: c.user_avatar || '👤',
          content: c.content,
          createdAt: c.created_at || '',
          replies: []
        })));

        // 贡献数据
        const contributionChartData = members
          .sort((a, b) => (b.contribution || 0) - (a.contribution || 0))
          .slice(0, 5)
          .map(m => ({
            name: m.name,
            contribution: m.contribution || 0
          }));
        setContributionData(contributionChartData);

        // 知识版本数据（基于知识空间）
        setKnowledgeVersions(spaces.map(s => ({
          id: s.id?.toString() || '',
          cardId: s.id?.toString() || '',
          content: s.name,
          updatedBy: s.owner || '',
          updatedAt: s.updated_at || '',
          reason: '初始版本'
        })));
      } catch (err) {
        setError('加载知识管理数据失败，请检查后端连接');
        console.error('Knowledge management data load error:', err);
        toast.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadKnowledgeData();
  }, []);

  // 初始化时加载第一个知识空间
  useEffect(() => {
    if (knowledgeSpaces.length > 0 && !selectedSpace) {
      setSelectedSpace(knowledgeSpaces[0]);
    }
  }, [knowledgeSpaces, selectedSpace]);

  // 活动轮播显示
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentActivityIndex(prev => (prev + 1) % realtimeActivities.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // 创建新的知识空间
  const handleCreateSpace = () => {
    if (!newSpace.name.trim()) {
      toast('请输入知识空间名称', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
      return;
    }

    const space: KnowledgeSpace = {
      id: `space-${Date.now()}`,
      name: newSpace.name,
      description: newSpace.description,
      members: [teamMembers[0].id], // 默认创建者加入
      owner: teamMembers[0].id,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      cardCount: 0,
      isPublic: newSpace.isPublic
    };

    setKnowledgeSpaces([space, ...knowledgeSpaces]);
    setSelectedSpace(space);
    setShowCreateSpaceModal(false);
    setNewSpace({ name: '', description: '', isPublic: false });

    toast('知识空间创建成功！', {
      className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
    });
  };

  // 添加新团队成员
  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      toast('请输入成员姓名和邮箱', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
      return;
    }

    const member: TeamMember = {
      id: `member-${Date.now()}`,
      name: newMember.name,
      role: newMember.role,
      avatar: '👤',
      online: false,
      joinDate: new Date().toISOString().split('T')[0],
      lastActive: '刚刚加入',
      permissions: newMember.permissions,
      contribution: 0
    };

    setTeamMembers([...teamMembers, member]);
    setShowAddMemberModal(false);
    setNewMember({ name: '', role: '', email: '', permissions: ['view'] });

    toast(`已邀请 ${newMember.name} 加入团队！`, {
      className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
    });
  };

  // 添加评论
  const handleAddComment = () => {
    if (!newComment.trim() || !selectedSpace) {
      return;
    }

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      cardId: '1', // 假设我们正在评论第一个卡片
      userId: '1', // 假设当前用户是第一个用户
      userName: '张明',
      userAvatar: 'U',
      content: newComment,
      createdAt: new Date().toISOString(),
      replies: []
    };

    setComments([comment, ...comments]);
    setNewComment('');

    toast('评论已添加！', {
      className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
    });
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // 过滤团队成员
  const filteredMembers = teamMembers.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 渲染加载状态
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">加载知识管理数据中...</p>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-red-600 dark:text-red-400">
          <div className="text-4xl mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">知识管理数据加载失败</h3>
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

  // 渲染空状态
  const hasNoData = teamMembers.length === 0 && knowledgeSpaces.length === 0;
  
  if (hasNoData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-4">🏢</div>
          <h3 className="text-lg font-semibold mb-2">暂无团队数据</h3>
          <p className="text-sm mb-4">请先创建团队并添加成员</p>
          <button 
            onClick={() => setShowCreateSpaceModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            创建知识空间
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
          onClick={() => setActiveTab('spaces')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'spaces' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Book size={18} className="mr-2" />
            <span>知识空间</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'members' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <UsersIcon size={18} className="mr-2" />
            <span>团队成员</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'activity' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Clock size={18} className="mr-2" />
            <span>活动记录</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('approval')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'approval' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <FileCheck size={18} className="mr-2" />
            <span>审核管理</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'settings' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Settings size={18} className="mr-2" />
            <span>团队设置</span>
          </div>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 知识空间管理 */}
        {activeTab === 'spaces' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">知识空间管理</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-1 text-sm font-medium transition-colors"
                onClick={() => setShowCreateSpaceModal(true)}
              >
                <PlusCircle size={16} />
                <span>创建知识空间</span>
              </motion.button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：知识空间列表 */}
              <div className="lg:col-span-1 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="搜索知识空间..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-3">
                  {knowledgeSpaces.map(space => (
                    <motion.div
                      key={space.id}
                      whileHover={{ x: 5 }}
                      className={`p-4 rounded-lg border ${
                        selectedSpace?.id === space.id 
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      } cursor-pointer transition-colors`}
                      onClick={() => setSelectedSpace(space)}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">{space.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          space.isPublic ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400' : 
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {space.isPublic ? '公开' : '私有'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{space.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {space.cardCount} 张卡片 · {space.members.length} 位成员
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          更新于 {space.updatedAt}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 右侧：知识空间详情 */}
              {selectedSpace && (
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold">{selectedSpace.name}</h3>
                        <p className="mt-1 text-blue-100">{selectedSpace.description}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
                          <Share2 size={18} />
                        </button>
                        <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
                          <Settings size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="flex items-center">
                        <UsersIcon size={16} className="mr-2" />
                        <span>{selectedSpace.members.length} 位成员</span>
                      </div>
                      <div className="flex items-center">
                        <Book size={16} className="mr-2" />
                        <span>{selectedSpace.cardCount} 张卡片</span>
                      </div>
                      <div className="flex items-center">
                        <Clock size={16} className="mr-2" />
                        <span>创建于 {selectedSpace.createdAt}</span>
                      </div>
                      <div className="flex items-center">
                        <RefreshCw size={16} className="mr-2" />
                        <span>更新于 {selectedSpace.updatedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 空间成员 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <UsersIcon size={16} className="mr-2" />
                        空间成员 ({selectedSpace.members.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {teamMembers.filter(member => selectedSpace.members.includes(member.id)).map(member => (
                          <div 
                            key={member.id}
                            className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-sm"
                          >
                            <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-2">
                              {member.avatar}
                            </span>
                            <span className="mr-2">{member.name}</span>
                            <span className={`w-2 h-2 rounded-full ${member.online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          </div>
                        ))}
                        <button className="flex items-center bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/30 px-3 py-1.5 rounded-full text-sm text-blue-600 dark:text-blue-400 transition-colors">
                          <UserPlus size={14} className="mr-2" />
                          <span>添加成员</span>
                        </button>
                      </div>
                    </div>

                    {/* 最新更新 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Clock size={16} className="mr-2" />
                        最新更新
                      </h4>
                      <div className="space-y-3">
                        {realtimeActivities.slice(0, 3).map(activity => (
                          <div key={activity.id} className="flex items-start">
                            <span className="text-xl mr-2">
                              {teamMembers.find(m => m.name === activity.user)?.avatar || '👤'}
                            </span>
                            <div>
                              <p className="text-sm">
                                <span className="font-medium">{activity.user}</span> {activity.action} <span className="text-blue-600 dark:text-blue-400">{activity.target}</span>
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.timestamp}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 知识版本历史 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <History size={16} className="mr-2" />
                      知识版本历史
                    </h4>
                    <div className="space-y-3">
                      {knowledgeVersions.map(version => (
                        <div key={version.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">
                                版本 {version.id === '1' ? '(当前)' : ''}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                由 {teamMembers.find(m => m.id === version.updatedBy)?.name} 更新于 {formatDate(version.updatedAt)}
                              </p>
                            </div>
                            <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                              查看详情
                            </button>
                          </div>
                          <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">{version.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 评论和讨论 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <MessageSquare size={16} className="mr-2" />
                      评论和讨论 ({comments.length})
                    </h4>
                    <div className="space-y-4">
                      {comments.map(comment => (
                        <div key={comment.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                          <div className="flex items-start">
                            <span className="text-xl mr-2">{comment.userAvatar}</span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <p className="text-sm font-medium">{comment.userName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(comment.createdAt)}
                                </p>
                              </div>
                              <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{comment.content}</p>
                              
                              {/* 回复 */}
                              {comment.replies.length > 0 && (
                                <div className="mt-3 space-y-3 pl-4">
                                  {comment.replies.map(reply => (
                                    <div key={reply.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                      <div className="flex items-start">
                                        <span className="text-lg mr-2">{reply.userAvatar}</span>
                                        <div className="flex-1">
                                          <div className="flex justify-between items-center">
                                            <p className="text-xs font-medium">{reply.userName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              {formatDate(reply.createdAt)}
                                            </p>
                                          </div>
                                          <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">{reply.content}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div className="mt-2 flex items-center space-x-4">
                                <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                  回复
                                </button>
                                <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                  点赞
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* 添加评论 */}
                    <div className="mt-4 flex">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-2 flex-shrink-0">
                        👤
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="添加你的评论..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                        />
                      </div>
                      <button 
                        className="ml-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        onClick={handleAddComment}
                      >
                        <MessageSquare size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 团队成员管理 */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">团队成员管理</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-1 text-sm font-medium transition-colors"
                onClick={() => setShowAddMemberModal(true)}
              >
                <UserPlus size={16} />
                <span>添加成员</span>
              </motion.button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索团队成员..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-750">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      成员信息
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      角色
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      加入时间
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      状态
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      贡献值
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredMembers.map(member => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-xl">{member.avatar}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{member.email || 'demo@example.com'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{member.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{member.joinDate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.online 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {member.online ? '在线' : '离线'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{member.contribution}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3">
                          编辑
                        </button>
                        <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                          移除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 团队贡献分析 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold mb-3">团队贡献分析</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="贡献值" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 活动记录 */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">团队活动记录</h2>
              <div className="flex items-center space-x-3">
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                  筛选 <ChevronDown size={14} className="ml-1" />
                </button>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                  导出 <ChevronDown size={14} className="ml-1" />
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4">
                <h3 className="font-semibold mb-3">实时活动</h3>
                <motion.div 
                  className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-800"
                  animate={{ 
                    backgroundColor: currentActivityIndex % 2 === 0 
                      ? 'rgba(239, 246, 255, 0.8)' 
                      : 'rgba(239, 246, 255, 1)'
                  }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                >
                  <div className="flex items-start">
                    <span className="text-xl mr-3">
                      {teamMembers.find(m => m.name === realtimeActivities[currentActivityIndex].user)?.avatar || '👤'}
                    </span>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{realtimeActivities[currentActivityIndex].user}</span> {realtimeActivities[currentActivityIndex].action} 
                        <span className="text-blue-600 dark:text-blue-400"> {realtimeActivities[currentActivityIndex].target}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{realtimeActivities[currentActivityIndex].timestamp}</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {realtimeActivities.map(activity => (
                  <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex items-start">
                      <span className="text-xl mr-3">
                        {teamMembers.find(m => m.name === activity.user)?.avatar || '👤'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user}</span> {activity.action} 
                          <span className="text-blue-600 dark:text-blue-400"> {activity.target}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 审核管理 */}
        {activeTab === 'approval' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">知识审核管理</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-1 text-sm font-medium transition-colors"
                onClick={() => setShowApprovalQueue(!showApprovalQueue)}
              >
                <FileCheck size={16} />
                <span>{showApprovalQueue ? '隐藏' : '显示'}审核队列</span>
              </motion.button>
            </div>

            {showApprovalQueue && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold">待审核知识 ({3})</h3>
                </div>
                
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">新市场调研报告</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">由 团队成员 创建</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                          批准
                        </button>
                        <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">产品路线图更新</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">由 团队成员 更新</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                          批准
                        </button>
                        <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">API文档更新</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">由 团队成员 更新</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                          批准
                        </button>
                        <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold mb-3">审核统计</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>待审核</span>
                      <span>3</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>已批准</span>
                      <span>12</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>已拒绝</span>
                      <span>5</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold mb-3">审核效率</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="text-sm">平均审核时间</p>
                        <p className="text-xl font-bold">4.5小时</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400">-15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                        <Check size={18} />
                      </div>
                      <div>
                        <p className="text-sm">今日已处理</p>
                        <p className="text-xl font-bold">5</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 团队设置 */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2">团队设置</h2>
              <p className="text-gray-600 dark:text-gray-300">管理团队的基本信息和配置</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-6">基本信息</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="team-name" className="block text-sm font-medium mb-2">团队名称</label>
                  <input
                    id="team-name"
                    type="text"
                    defaultValue="Antinet智能知识团队"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                
                <div>
                  <label htmlFor="team-description" className="block text-sm font-medium mb-2">团队描述</label>
                  <input
                    id="team-description"
                    type="text"
                    defaultValue="基于卢曼卡片盒方法的AI驱动企业知识管理团队"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-4">权限管理</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <div>
                      <h4 className="font-medium">管理权限</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">可创建和管理知识空间，添加和移除成员</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">仅管理员</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <div>
                      <h4 className="font-medium">编辑权限</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">可创建和编辑知识卡片</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">所有成员</span>
                      <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline">修改</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <div>
                      <h4 className="font-medium">评论权限</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">可对知识卡片进行评论</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">所有成员</span>
                      <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline">修改</button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                    <div>
                      <h4 className="font-medium">查看权限</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">可查看团队知识内容</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">所有成员</span>
                      <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline">修改</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  保存设置
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 创建知识空间模态框 */}
      {showCreateSpaceModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold">创建知识空间</h2>
              <button 
                onClick={() => setShowCreateSpaceModal(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="space-name" className="block text-sm font-medium mb-2">知识空间名称 *</label>
                <input
                  id="space-name"
                  type="text"
                  value={newSpace.name}
                  onChange={(e) => setNewSpace(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入知识空间名称"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label htmlFor="space-description" className="block text-sm font-medium mb-2">知识空间描述</label>
                <textarea
                  id="space-description"
                  value={newSpace.description}
                  onChange={(e) => setNewSpace(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="输入知识空间描述..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  id="is-public"
                  type="checkbox"
                  checked={newSpace.isPublic}
                  onChange={(e) => setNewSpace(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="is-public" className="ml-2 text-sm font-medium">
                  设为公开知识空间
                </label>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowCreateSpaceModal(false)}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="button"
                    onClick={handleCreateSpace}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    创建空间
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 添加成员模态框 */}
      {showAddMemberModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold">添加团队成员</h2>
              <button 
                onClick={() => setShowAddMemberModal(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="member-name" className="block text-sm font-medium mb-2">成员姓名 *</label>
                <input
                  id="member-name"
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入成员姓名"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label htmlFor="member-email" className="block text-sm font-medium mb-2">成员邮箱 *</label>
                <input
                  id="member-email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="输入成员邮箱"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label htmlFor="member-role" className="block text-sm font-medium mb-2">成员角色</label>
                <input
                  id="member-role"
                  type="text"
                  value={newMember.role}
                  onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="输入成员角色"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">权限设置</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="permission-view"
                      type="checkbox"
                      checked={newMember.permissions.includes('view')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewMember(prev => ({ 
                            ...prev, 
                            permissions: [...prev.permissions, 'view'] 
                          }));
                        } else {
                          setNewMember(prev => ({ 
                            ...prev, 
                            permissions: prev.permissions.filter(p => p !== 'view') 
                          }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="permission-view" className="ml-2 text-sm">
                      查看
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="permission-comment"
                      type="checkbox"
                      checked={newMember.permissions.includes('comment')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewMember(prev => ({ 
                            ...prev, 
                            permissions: [...prev.permissions, 'comment'] 
                          }));
                        } else {
                          setNewMember(prev => ({ 
                            ...prev, 
                            permissions: prev.permissions.filter(p => p !== 'comment') 
                          }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="permission-comment" className="ml-2 text-sm">
                      评论
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="permission-edit"
                      type="checkbox"
                      checked={newMember.permissions.includes('edit')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewMember(prev => ({ 
                            ...prev, 
                            permissions: [...prev.permissions, 'edit'] 
                          }));
                        } else {
                          setNewMember(prev => ({ 
                            ...prev, 
                            permissions: prev.permissions.filter(p => p !== 'edit') 
                          }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="permission-edit" className="ml-2 text-sm">
                      编辑
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="permission-admin"
                      type="checkbox"
                      checked={newMember.permissions.includes('admin')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewMember(prev => ({ 
                            ...prev, 
                            permissions: [...prev.permissions, 'admin'] 
                          }));
                        } else {
                          setNewMember(prev => ({ 
                            ...prev, 
                            permissions: prev.permissions.filter(p => p !== 'admin') 
                          }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="permission-admin" className="ml-2 text-sm">
                      管理员
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="button"
                    onClick={handleAddMember}className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    邀请成员
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TeamKnowledgeManagement;