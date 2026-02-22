// src/services/dataService.ts - 数据管理服务
// 提供团队成员、知识空间、协作活动等数据的API调用
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000/api/data';

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
  add: async (member: Omit<TeamMember, 'id'>): Promise<TeamMember> => {
    return apiCall<TeamMember>('/team-members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  // 更新团队成员
  update: async (id: number, member: Partial<TeamMember>): Promise<void> => {
    return apiCall<void>(`/team-members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(member),
    });
  },

  // 删除团队成员
  delete: async (id: number): Promise<void> => {
    return apiCall<void>(`/team-members/${id}`, {
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


