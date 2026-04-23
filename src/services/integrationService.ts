// P0 功能前端 API 服务：双向链接 + 日历整合 + 卡片-任务关联
import { API_BASE_URL } from '../config/api';

// ============ 类型定义 ============

// --- 双向链接 ---
export interface BacklinkCard {
  id: number;
  title: string;
  card_type: string;
  created_at: string;
  link_text?: string;
}

export interface BacklinkGraph {
  nodes: {
    id: number;
    title: string;
    type: string;
    is_current: boolean;
  }[];
  links: {
    source: number;
    target: number;
    type: 'backlink' | 'forwardlink';
  }[];
}

export interface BacklinkStats {
  card_id: number;
  backlink_count: number;
  forwardlink_count: number;
  total_links: number;
}

// --- 日历事件 ---
export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location?: string;
  category: string;
  color?: string;
  source_card_id?: number;
  source_paragraph?: string;
  created_at: string;
  updated_at: string;
  is_completed: boolean;
}

export interface CalendarEventCreate {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  location?: string;
  category?: string;
  color?: string;
  source_card_id?: number;
  source_paragraph?: string;
}

export interface CalendarEventUpdate {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  location?: string;
  category?: string;
  color?: string;
  is_completed?: boolean;
}

// --- 卡片-任务关联 ---
export interface TaskWithRelation {
  id: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  is_completed: boolean;
  relation_type: string;
  extract_paragraph?: string;
}

export interface CardWithRelation {
  id: number;
  title: string;
  content: string;
  card_type: string;
  type: string;
  created_at: string;
  updated_at: string;
  relation_type: string;
  extract_paragraph?: string;
}

export interface CreateTaskFromCardRequest {
  card_id: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: 'inbox' | 'today' | 'later' | 'archive' | 'projects';
  due_date?: string;
  extract_paragraph?: string;
}

export interface CreateTaskFromCardResponse {
  success: boolean;
  task: {
    id: number;
    title: string;
    description?: string;
    priority: string;
    category: string;
    due_date?: string;
    source_type: string;
    source_id: number;
    is_completed: number;
    created_at: string;
    updated_at: string;
  };
  card_id: number;
  relation_created: boolean;
}

// ============ API 辅助 ============

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ============ 双向链接 API ============

export const backlinkService = {
  /** 添加双向链接 */
  add(source_card_id: number, target_card_id: number, link_text?: string) {
    return apiFetch<{ success: boolean; inserted: boolean; source_card_id: number; target_card_id: number }>(
      '/api/backlinks/add',
      { method: 'POST', body: JSON.stringify({ source_card_id, target_card_id, link_text }) }
    );
  },

  /** 移除双向链接 */
  remove(source_card_id: number, target_card_id: number) {
    return apiFetch<{ success: boolean; deleted: boolean }>(
      `/api/backlinks/remove?source_card_id=${source_card_id}&target_card_id=${target_card_id}`,
      { method: 'DELETE' }
    );
  },

  /** 获取卡片的反向链接（谁链到了我） */
  getBacklinks(card_id: number) {
    return apiFetch<BacklinkCard[]>(`/api/backlinks/card/${card_id}/backlinks`);
  },

  /** 获取卡片的正向链接（我链到了谁） */
  getForwardlinks(card_id: number) {
    return apiFetch<BacklinkCard[]>(`/api/backlinks/card/${card_id}/forwardlinks`);
  },

  /** 获取卡片双向链接图谱（可视化用） */
  getGraph(card_id: number, max_depth: number = 2) {
    return apiFetch<BacklinkGraph>(`/api/backlinks/card/${card_id}/graph?max_depth=${max_depth}`);
  },

  /** 获取卡片双向链接统计 */
  getStats(card_id: number) {
    return apiFetch<BacklinkStats>(`/api/backlinks/stats/${card_id}`);
  },

  /** 健康检查 */
  health() {
    return apiFetch<{ status: string; message: string; total_links: number }>('/api/backlinks/health');
  },
};

// ============ 日历事件 API ============

export const calendarEventService = {
  /** 创建日历事件 */
  create(data: CalendarEventCreate) {
    return apiFetch<CalendarEvent>('/api/integration/calendar/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** 按日期范围获取事件 */
  getByRange(start_date: string, end_date: string) {
    return apiFetch<CalendarEvent[]>(
      `/api/integration/calendar/events?start_date=${start_date}&end_date=${end_date}`
    );
  },

  /** 获取所有事件 */
  getAll() {
    return apiFetch<CalendarEvent[]>('/api/integration/calendar/events/all');
  },

  /** 获取单个事件 */
  getById(event_id: number) {
    return apiFetch<CalendarEvent>(`/api/integration/calendar/events/${event_id}`);
  },

  /** 更新事件 */
  update(event_id: number, data: CalendarEventUpdate) {
    return apiFetch<CalendarEvent>(`/api/integration/calendar/events/${event_id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /** 删除事件 */
  delete(event_id: number) {
    return apiFetch<{ success: boolean; deleted: boolean }>(
      `/api/integration/calendar/events/${event_id}`,
      { method: 'DELETE' }
    );
  },

  /** 获取知识卡片关联的日历事件 */
  getByCardId(card_id: number) {
    return apiFetch<CalendarEvent[]>(`/api/integration/calendar/card/${card_id}/events`);
  },
};

// ============ 卡片-任务关联 API ============

export const cardTaskService = {
  /** 从卡片创建任务（自动建立关联） */
  createTaskFromCard(data: CreateTaskFromCardRequest) {
    return apiFetch<CreateTaskFromCardResponse>('/api/integration/card/create-task', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** 获取卡片关联的所有任务 */
  getTasksByCard(card_id: number) {
    return apiFetch<TaskWithRelation[]>(`/api/integration/card/${card_id}/tasks`);
  },

  /** 获取任务关联的所有卡片 */
  getCardsByTask(task_id: number) {
    return apiFetch<CardWithRelation[]>(`/api/integration/task/${task_id}/cards`);
  },

  /** 移除卡片与任务的关联 */
  removeRelation(card_id: number, task_id: number) {
    return apiFetch<{ success: boolean; deleted: boolean }>(
      `/api/integration/card/${card_id}/task/${task_id}`,
      { method: 'DELETE' }
    );
  },

  /** 整合功能健康检查 */
  health() {
    return apiFetch<{
      status: string;
      integrations: { card_task_relations: string; calendar_events: string };
      counts: { relations: number; events: number };
    }>('/api/integration/health');
  },
};

export default { backlinkService, calendarEventService, cardTaskService };
