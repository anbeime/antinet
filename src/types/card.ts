// 统一卡片类型定义 - Antinet知识系统核心类型
// 解决 KnowledgeCard 接口在6+文件中重复定义且字段不一致的问题

// ============ 四色卡片类型 ============
export type CardColor = 'blue' | 'green' | 'yellow' | 'red';

export type CardTypeName = '事实' | '解释' | '风险' | '行动';

/** 卡片颜色→中文含义映射 */
export const CARD_COLOR_MAP: Record<CardColor, CardTypeName> = {
  blue: '事实',
  green: '解释',
  yellow: '风险',
  red: '行动',
};

/** 卡片颜色→CSS色值映射 */
export const CARD_COLOR_CSS: Record<CardColor, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

// ============ 链接关系类型 ============
export type LinkType = 'supports' | 'contradicts' | 'examples' | 'background' | 'same_project' | 'manual';

/** 链接关系→中文标签 */
export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  supports: '支撑',
  contradicts: '对比',
  examples: '举例',
  background: '背景',
  same_project: '同专题',
  manual: '手动关联',
};

// ============ 卡片生命周期 ============
export type CardLifecycle = 'draft' | 'reviewed' | 'published' | 'archived';

// ============ 核心知识卡片接口 ============
export interface KnowledgeCard {
  id: number;
  title: string;
  content: string;
  card_type: CardColor;
  category?: string;
  topic_id?: number;
  related_topics?: string;

  // 标签系统
  tags?: string[];        // JSON数组: 普通标签
  core_tags?: string[];   // JSON数组: 核心标签
  tag_weights?: Record<string, number>;  // JSON对象: {tag: weight}

  // 语义记忆
  memory_type?: 'light' | 'deep' | 'mesh';
  coherence_score?: number;
  last_accessed?: string;
  access_count?: number;

  // 关联
  related_cards?: number[];  // JSON数组: 关联卡片ID列表
  project_id?: number;       // 所属专题ID

  // 图片
  images?: Array<{
    id: string;
    filename: string;
    original_name: string;
    path: string;
    url: string;
    size: number;
  }>;

  // 地址编号 (Antinet风格)
  address?: string;  // 如 "21/3a"

  // 嵌入
  embedding?: number[];
  similarity?: number;

  // 时间戳
  created_at?: string;
  updated_at?: string;
}

// ============ 卡片关联链接接口 ============
export interface CardLink {
  source_card_id: number;
  target_card_id: number;
  link_type: LinkType;
  link_text?: string;
  created_at?: string;
}

// ============ 反向链接卡片 (带链接文本) ============
export interface BacklinkCard {
  id: number;
  title: string;
  card_type: CardColor;
  created_at: string;
  link_text?: string;
  link_type?: LinkType;
}

// ============ 双向链接图谱 ============
export interface BacklinkGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphNode {
  id: number;
  title: string;
  type: CardColor;
  category?: string;
  is_current?: boolean;
  size?: number;
  importance?: number;
}

export interface GraphLink {
  source: number;
  target: number;
  type: 'backlink' | 'forwardlink';
  label?: string;
  weight?: number;
}

// ============ 专题 (Collection) 接口 ============
export interface ResearchProject {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: 'active' | 'archived' | 'template' | 'deleted';
  created_at?: string;
  updated_at?: string;
}

/** 专题内的卡片项（含排序和备注） */
export interface CollectionCardItem {
  cardId: number;
  order: number;
  note?: string;  // 为什么加入此卡片
}

// ============ GTD任务接口 ============
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'inbox' | 'today' | 'later' | 'archive' | 'projects';

export interface GtdTask {
  id: number;
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  due_date?: string;
  source_type?: string;   // 'card' | 'project' | 'meeting' | null
  source_id?: number;     // 来源对象ID
  is_completed: boolean;
  completed_at?: string;
  recurrence?: string;
  reminder_enabled?: boolean;
  remind_at?: string;
  created_at?: string;
  updated_at?: string;
}

// ============ 卡片-任务关联 ============
export type CardTaskRelationType = 'extracted_from' | 'referenced';

export interface CardTaskRelation {
  card_id: number;
  task_id: number;
  relation_type: CardTaskRelationType;
  extract_paragraph?: string;
}

// ============ 会议中的知识卡片 ============

/** 会议中提取/查询到的四色卡片 */
export interface MeetingCard {
  id?: number;
  card_type: CardColor;
  title: string;
  content: string;
  source: 'agent_extracted' | 'human_query';
  agent_name?: string;
  match_score?: number;
  meeting_id?: string;
  round?: number;
  timestamp?: string;
  saved: boolean;
}

/** 人工干预查询返回 */
export interface MeetingHybridResponse {
  answer: string;
  cards: MeetingCard[];
  sources: Array<{
    card_id: string;
    title: string;
    similarity: number;
  }>;
}

/** 保存会议卡片到知识库的请求 */
export interface SaveMeetingCardRequest {
  card: MeetingCard;
  meeting_id: string;
  topic: string;
}

// ============ 会议记录 ============
export interface MeetingRecord {
  id: number;
  meeting_id: string;
  topic: string;
  context?: string;
  card_ids?: number[];
  rounds: number;
  participants: string[];
  summary?: string;
  decision?: string;
  action_items?: string[];
  start_time: string;
  end_time: string;
  duration_seconds: number;
  created_at?: string;
}

// ============ 会议到任务的映射 ============
export interface MeetingToTaskMapping {
  meetingId: string;
  extractedTasks: Array<{
    sourceCardId?: number;
    taskTitle: string;
    assignee?: string;
    priority: TaskPriority;
    dueDate?: string;
    contextTags: string[];
  }>;
  confirmedTasks: string[];
}

// ============ PPT生成配置 ============
export type NarrativeTemplate =
  | 'problem-analysis-solution'
  | 'timeline'
  | 'compare-contrast'
  | 'swot-analysis'
  | 'custom';

export type DesignTemplate = 'professional' | 'creative' | 'minimalist';

export interface PPTGenerationConfig {
  sourceType: 'collection' | 'search' | 'manual';
  sourceId?: number;  // 专题ID或搜索ID
  narrativeTemplate: NarrativeTemplate;
  aiEnhancements: {
    generateTransitions: boolean;
    polishLanguage: boolean;
    generateConclusions: boolean;
    extractKeyPoints: boolean;
  };
  designTemplate: DesignTemplate;
  customBranding?: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
}

// ============ 用户干预 (会议) ============
export type InterventionPoint = 'analysis_start' | 'fact_extracted' | 'risk_identified';

export interface UserIntervention {
  type: 'askFollowUp' | 'provideAdditionalContext' | 'adjustFocus' | 'terminateBranch';
  content: string;
  targetBranch?: 'risk' | 'explanation' | 'action';
}

// ============ 联想推荐 ============
export interface SuggestedRelation {
  card_id: number;
  title: string;
  card_type: CardColor;
  content?: string;
  score: number;
  reason: string;
}
