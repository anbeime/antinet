// src/services/dataService.ts - 数据管理服务
// 提供团队成员、知识空间、协作活动等数据的API调用
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';

const API_BASE_URL = getApiBaseUrl() + '/api/data'

// ========== 类型定义 ==========
export interface TeamMember {
  id?: number;
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

export interface KnowledgeSpace {
  id?: number;
  name: string;
  description: string;
  members?: string[];
  owner: string;
  created_at?: string;
  updated_at?: string;
  card_count?: number;
  is_public?: boolean;
}

export interface Activity {
  id?: number;
  user_name: string;
  action: string;
  content: string;
  timestamp?: string;
  space_id?: number;
  metadata?: Record<string, any>;
}

export interface Comment {
  id?: number;
  user_name: string;
  user_avatar?: string;
  content: string;
  created_at?: string;
  target_id: number;
  target_type?: string;
  parent_id?: number;
  metadata?: Record<string, any>;
}

// ========== API封装 ==========
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API调用失败:', error);
    toast.error('数据加载失败，请检查后端服务是否启动');
    throw error;
  }
}

// ========== 团队成员API ==========
export const teamMemberService = {
  // 获取所有团队成员
  getAll: async (): Promise<TeamMember[]> => {
    return apiCall<TeamMember[]>('/team-members');
  },

  // 添加团队成员
  add: async (member: Omit<TeamMember, 'id'>, actor?: string): Promise<TeamMember> => {
    const params = actor ? `?actor=${encodeURIComponent(actor)}` : '';
    return apiCall<TeamMember>(`/team-members${params}`, {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  // 更新团队成员
  update: async (id: number, member: Partial<TeamMember>, actor?: string): Promise<void> => {
    const params = actor ? `?actor=${encodeURIComponent(actor)}` : '';
    return apiCall<void>(`/team-members/${id}${params}`, {
      method: 'PUT',
      body: JSON.stringify(member),
    });
  },

  // 删除团队成员
  delete: async (id: number, actor?: string): Promise<void> => {
    const params = actor ? `?actor=${encodeURIComponent(actor)}` : '';
    return apiCall<void>(`/team-members/${id}${params}`, {
      method: 'DELETE',
    });
  },
};

// ========== 知识空间API ==========
export const knowledgeSpaceService = {
  // 获取所有知识空间
  getAll: async (): Promise<KnowledgeSpace[]> => {
    return apiCall<KnowledgeSpace[]>('/knowledge-spaces');
  },

  // 添加知识空间
  add: async (space: Omit<KnowledgeSpace, 'id'>): Promise<KnowledgeSpace> => {
    return apiCall<KnowledgeSpace>('/knowledge-spaces', {
      method: 'POST',
      body: JSON.stringify(space),
    });
  },
};

// ========== 协作活动API ==========
export const activityService = {
  // 获取最近的协作活动
  getRecent: async (limit: number = 20): Promise<Activity[]> => {
    return apiCall<Activity[]>(`/activities?limit=${limit}`);
  },

  // 添加协作活动
  add: async (activity: Omit<Activity, 'id'>): Promise<Activity> => {
    return apiCall<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },
};

// ========== 评论API ==========
export const commentService = {
  // 获取评论
  getByTarget: async (targetId: number, targetType: string = 'space'): Promise<Comment[]> => {
    return apiCall<Comment[]>(`/comments/${targetId}?target_type=${targetType}`);
  },

  // 添加评论
  add: async (comment: Omit<Comment, 'id'>): Promise<Comment> => {
    return apiCall<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  },
};

// ========== 分析数据API ==========
export const analyticsService = {
  // 获取分析数据
  get: async (category: string): Promise<any> => {
    return apiCall<any>(`/analytics/${category}`);
  },

  // 更新分析数据
  update: async (category: string, data: any): Promise<any> => {
    return apiCall<any>(`/analytics/${category}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ========== 检查清单API ==========
export interface CheckItem {
  id: string;
  title: string;
  icon: string;
  description: string;
  status: 'completed' | 'partial' | 'missing';
  details?: string;
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  items: CheckItem[];
}

export const checklistService = {
  // 获取检查清单数据
  getAll: async (): Promise<Section[]> => {
    const data = await apiCall<any>('/checklist');
    return data?.data || [];
  },

  // 更新检查清单数据
  update: async (sections: Section[]): Promise<any> => {
    const data_json = JSON.stringify(sections);
    return apiCall<any>('/checklist', {
      method: 'PUT',
      body: JSON.stringify(data_json),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
};

// GTD 任务服务
export interface GtdTask {
  id?: number;
  title: string;
  description?: string;
  category: 'inbox' | 'today' | 'later' | 'archive' | 'projects';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  is_completed?: boolean;
  reminder_enabled?: boolean;
  remind_at?: string;
  source_type?: string;  // 'card' | 'project' | 'meeting' | null
  source_id?: number;    // 来源对象ID
  project_id?: number;   // 关联的专题ID
  assigned_to?: number;
  assigned_to_name?: string;
}

export const gtdTaskService = {
  // 获取所有任务
  getAll: async (): Promise<GtdTask[]> => {
    return apiCall<GtdTask[]>('/gtd/tasks');
  },

  // 按类别获取任务
  getByCategory: async (category: string): Promise<GtdTask[]> => {
    return apiCall<GtdTask[]>(`/gtd/tasks/category/${category}`);
  },

  // 获取单个任务
  getById: async (id: number): Promise<GtdTask> => {
    return apiCall<GtdTask>(`/gtd/tasks/${id}`);
  },

  // 创建任务
  add: async (task: Omit<GtdTask, 'id' | 'created_at' | 'updated_at'>): Promise<GtdTask> => {
    return apiCall<GtdTask>('/gtd/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  // 更新任务
  update: async (id: number, task: Partial<GtdTask>): Promise<GtdTask> => {
    return apiCall<GtdTask>(`/gtd/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  // 删除任务
  delete: async (id: number): Promise<{success: boolean; message: string}> => {
    return apiCall<{success: boolean; message: string}>(`/gtd/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  // 获取统计信息
  getStats: async (): Promise<{
    total: number;
    by_category: Record<string, number>;
    by_priority: Record<string, number>;
  }> => {
    return apiCall('/gtd/stats');
  },

  // 健康检查
  health: async (): Promise<{
    status: string;
    database: string;
    tasks_count: number;
  }> => {
    return apiCall('/gtd/health');
  },
};

// ========== 专题研究服务 ==========
const RESEARCH_API_BASE = getApiBaseUrl() + '/api/research'

export interface ResearchProject {
  id?: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export const researchProjectService = {
  // 获取所有专题
  getAll: async (): Promise<ResearchProject[]> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects`);
    if (!response.ok) throw new Error('获取专题失败');
    return response.json();
  },

  // 获取单个专题
  getById: async (id: number): Promise<ResearchProject> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${id}`);
    if (!response.ok) throw new Error('获取专题详情失败');
    return response.json();
  },

  // 创建专题
  create: async (project: Omit<ResearchProject, 'id' | 'created_at' | 'updated_at'>): Promise<ResearchProject> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('创建专题失败');
    return response.json();
  },

  // 更新专题
  update: async (id: number, project: Partial<ResearchProject>): Promise<ResearchProject> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('更新专题失败');
    return response.json();
  },

  // 删除专题
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('删除专题失败');
  },

  // 获取专题下的任务
  getTasks: async (projectId: number): Promise<GtdTask[]> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/tasks`);
    if (!response.ok) throw new Error('获取专题任务失败');
    return response.json();
  },

  // 添加任务到专题
  addTask: async (projectId: number, taskId: number): Promise<void> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/tasks/${taskId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('添加任务到专题失败');
  },

  // 从专题移除任务
  removeTask: async (projectId: number, taskId: number): Promise<void> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('从专题移除任务失败');
  },

  // 获取专题下的卡片
  getCards: async (projectId: number): Promise<any[]> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/cards`);
    if (!response.ok) throw new Error('获取专题卡片失败');
    return response.json();
  },

  // 关联卡片到专题
  linkCard: async (projectId: number, cardId: number): Promise<void> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/cards/${cardId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('关联卡片到专题失败');
  },
};

// ========== 团队项目管理服务 ==========
export interface TeamProject {
  id?: number;
  name: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  startDate?: string;
  endDate?: string;
  progress?: number;
  assignedMembers?: number[];
  tasks?: TeamProjectTask[];
}

export interface TeamProjectTask {
  id?: number;
  projectId?: number;
  title: string;
  description?: string;
  status?: 'todo' | 'in-progress' | 'review' | 'completed' | 'pending';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: number;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const projectService = {
  // 获取所有项目
  getAll: async (): Promise<TeamProject[]> => {
    return apiCall<TeamProject[]>('/team-projects');
  },

  // 获取单个项目
  getById: async (id: number): Promise<TeamProject> => {
    return apiCall<TeamProject>(`/team-projects/${id}`);
  },

  // 创建项目
  create: async (project: Omit<TeamProject, 'id'>): Promise<TeamProject> => {
    return apiCall<TeamProject>('/team-projects', {
      method: 'POST',
      body: JSON.stringify({
        ...project,
        assigned_members: project.assignedMembers || [],
        tasks: project.tasks || [],
        start_date: project.startDate,
        end_date: project.endDate,
      }),
    });
  },

  // 更新项目
  update: async (id: number, project: Partial<TeamProject>): Promise<void> => {
    const updateData: any = { ...project };
    if (project.assignedMembers !== undefined) {
      updateData.assigned_members = project.assignedMembers;
    }
    if (project.tasks !== undefined) {
      updateData.tasks = project.tasks;
    }
    if (project.startDate !== undefined) {
      updateData.start_date = project.startDate;
    }
    if (project.endDate !== undefined) {
      updateData.end_date = project.endDate;
    }
    return apiCall<void>(`/team-projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  // 删除项目
  delete: async (id: number): Promise<void> => {
    return apiCall<void>(`/team-projects/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========== 权限检查API ==========
export const permissionService = {
  // 检查成员权限
  check: async (memberId: number, permission: string): Promise<{has_permission: boolean}> => {
    return apiCall<{has_permission: boolean}>('/check-permission', {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId, permission }),
    });
  },
};

// ========== 审计日志API ==========
export interface AuditLog {
  id?: number;
  timestamp?: string;
  event_type: string;
  actor: string;
  resource: string;
  action: string;
  result?: string;
  details?: string;
}

export const auditLogService = {
  // 获取审计日志
  getLogs: async (params?: { limit?: number; event_type?: string; actor?: string }): Promise<AuditLog[]> => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.event_type) query.set('event_type', params.event_type);
    if (params?.actor) query.set('actor', params.actor);
    return apiCall<AuditLog[]>(`/audit-logs?${query.toString()}`);
  },
};

// ========== 专题研究扩展服务（统计+工作流） ==========
export const researchStatsService = {
  // 获取专题统计
  getStats: async (projectId: number): Promise<{
    cards: Record<string, number>;
    total_cards: number;
    tasks: { total: number; completed: number; pending: number };
    task_progress: number;
    calendar_events: number;
    backlinks: number;
  }> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/stats`);
    if (!response.ok) throw new Error('获取专题统计失败');
    return response.json();
  },

  // 获取专题日历事件
  getCalendarEvents: async (projectId: number): Promise<any[]> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/calendar-events`);
    if (!response.ok) throw new Error('获取专题日历事件失败');
    return response.json();
  },

  // 获取专题工作流概览
  getWorkflow: async (projectId: number): Promise<{
    project: ResearchProject;
    cards: any[];
    tasks: any[];
    unconverted_cards: any[];
    calendar_events: any[];
    backlinks: any[];
  }> => {
    const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/workflow`);
    if (!response.ok) throw new Error('获取专题工作流失败');
    return response.json();
  },

  // 获取统一项目列表
  getUnifiedProjects: async (): Promise<{
    research_projects: any[];
    team_projects: any[];
    total: number;
  }> => {
    const response = await fetch(`${RESEARCH_API_BASE}/unified-projects`);
    if (!response.ok) throw new Error('获取统一项目列表失败');
    return response.json();
  },
};

// ========== 源文件溯源服务 ==========
const KNOWLEDGE_API_BASE = `${getApiBaseUrl()}/api/knowledge`;

export interface SourceFileInfo {
  has_source: boolean;
  source_file_id?: string;
  original_name?: string;
  stored_path?: string;
  file_type?: string;
  file_size?: number;
  created_at?: string;
  location_in_source?: string;
  message?: string;
}

export interface SourceFileCards {
  source_file_id: string;
  original_name: string;
  stored_path: string;
  cards: any[];
  total: number;
}

// 源文件 Markdown 内容（用于溯源高亮查看）
export interface SourceFileMarkdown {
  success: boolean;
  source_file: {
    id: string;
    name: string;
    type: string;
    markdown_content: string;
    created_at: string;
  };
  cards: {
    card_id: number | string;
    title: string;
    card_type: string;
    location_in_source: string;
    content_preview: string;
  }[];
}

// 同批次兄弟卡片（同一源文件导入的其他卡片）
export interface SiblingCard {
  id: number;
  title: string;
  content: string;
  card_type: string;
  category: string;
  location_in_source: string;
  created_at: string;
  link_type?: string;  // 与当前卡片的已有链接类型（如 same_batch）
}

export interface SiblingCardsResponse {
  success: boolean;
  source_file: {
    source_file_id: string;
    original_name: string;
    file_type: string;
  } | null;
  total: number;
  siblings: SiblingCard[];
  message?: string;
}

export const sourceFileService = {
  // 获取卡片关联的源文件信息
  getCardSourceFile: async (cardId: number): Promise<SourceFileInfo> => {
    const response = await fetch(`${KNOWLEDGE_API_BASE}/cards/${cardId}/source-file`);
    if (!response.ok) throw new Error('获取源文件信息失败');
    return response.json();
  },

  // 获取源文件生成的所有卡片
  getSourceFileCards: async (sourceFileId: string): Promise<SourceFileCards> => {
    const response = await fetch(`${KNOWLEDGE_API_BASE}/source-files/${sourceFileId}/cards`);
    if (!response.ok) throw new Error('获取源文件卡片失败');
    return response.json();
  },

  // 下载源文件
  downloadSourceFile: (sourceFileId: string) => {
    window.open(`${KNOWLEDGE_API_BASE}/source-files/${sourceFileId}/download`, '_blank');
  },

  // 获取源文件 Markdown 内容（用于溯源查看和高亮）
  getSourceFileMarkdown: async (sourceFileId: string): Promise<SourceFileMarkdown> => {
    const response = await fetch(`${KNOWLEDGE_API_BASE}/source-files/${sourceFileId}/markdown`);
    if (!response.ok) throw new Error('获取源文件内容失败');
    return response.json();
  },

  // 获取同批次兄弟卡片（同一源文件导入的其他卡片）
  getCardSiblings: async (cardId: number): Promise<SiblingCardsResponse> => {
    const response = await fetch(`${KNOWLEDGE_API_BASE}/cards/${cardId}/siblings`);
    if (!response.ok) throw new Error('获取同批次卡片失败');
    return response.json();
  },
};
