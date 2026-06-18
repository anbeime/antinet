/**
 * 增强版聊天服务
 * 集成知识库查询、图片解析、技能调用
 * 参考: https://github.com/anbeime/skill/tree/main/projects
 */

import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';

// API 基础路径
const API_BASE = getApiBaseUrl() + '/api/chat/enhanced'

// 简单的 fetch wrapper
const api = {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },
  async post<T>(url: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }
};

// 消息角色类型
export type MessageRole = 'user' | 'assistant' | 'system' | 'skill';

// 场景类型
export type SceneType = 
  | 'general' 
  | 'card_search' 
  | 'card_create'
  | 'image_analysis' 
  | 'skill_ppt' 
  | 'skill_excel' 
  | 'skill_word' 
  | 'greeting' 
  | 'help'
  | 'document_analysis'
  | 'task_manage'
  | 'performance_check'
  | 'workflow'
  | 'kg_organize';

// 意图类型（9大核心意图）
export type IntentType =
  | 'create_card'
  | 'search_cards'
  | 'organize_cards'
  | 'analyze_document'
  | 'generate_ppt'
  | 'manage_tasks'
  | 'analyze_image'
  | 'check_performance'
  | 'complex_workflow'
  | 'general_chat'
  | 'greeting'
  | 'help';

// 意图识别结果
export interface IntentDetectionResult {
  success: boolean;
  query: string;
  intent: {
    primary: IntentType;
    primary_name: string;
    primary_emoji: string;
    confidence: number;
    alternative?: { intent: string; name: string }[];
    needs_clarification?: boolean;
    clarification_question?: string;
  };
  entities: {
    topics: string[];
    colors: string[];
    time_range?: { raw: string; matched: string };
    filters: Record<string, any>;
    file_types: string[];
    people: string[];
  };
}

// 工作流模板
export interface WorkflowTemplate {
  template_id: string;
  name: string;
  description: string;
  category: string;
  estimated_steps: number;
  estimated_time_minutes: number;
  tags: string[];
  icon: string;
  primary_intent: string;
}

// 工作流步骤
export interface WorkflowStep {
  step_id: string;
  name: string;
  description: string;
  status: string;
  requires_input?: boolean;
  input_prompt?: string;
}

// 工作流执行结果
export interface WorkflowStartResult {
  success: boolean;
  execution_id?: string;
  template_id?: string;
  intent?: { primary: string; name: string; emoji: string };
  total_steps?: number;
  steps?: WorkflowStep[];
  status?: string;
  error?: string;
}

// 工作流状态
export interface WorkflowStatus {
  success: boolean;
  execution_id?: string;
  template_id?: string;
  status?: string;
  current_step?: number;
  total_steps?: number;
  steps?: WorkflowStep[];
  execution_log?: string[];
}

// 聊天消息接口
export interface ChatMessage {
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

// 卡片引用接口
export interface CardReference {
  id: string;
  card_type: string;
  title: string;
  content: string;
  match_score: number;
  color: string;
}

// 技能结果接口
export interface SkillResult {
  skill_name: string;
  success: boolean;
  result?: string;
  file_path?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// 图片分析结果接口
export interface ImageAnalysisResult {
  description: string;
  facts: string[];
  insights: string[];
  cards_generated: CardReference[];
  confidence: number;
}

// 聊天响应接口
export interface ChatResponse {
  reply: string;
  scene_type: SceneType;
  cards: CardReference[];
  skill_result?: SkillResult;
  image_analysis?: ImageAnalysisResult;
  suggestions: string[];
  metadata: Record<string, any>;
}

// 技能信息接口
export interface SkillInfo {
  name: string;
  description: string;
  trigger_patterns: string[];
  parameters: Record<string, any>;
  enabled: boolean;
}

// 聊天请求接口
export interface ChatRequest {
  query: string;
  conversation_history: ChatMessage[];
  context?: Record<string, any>;
  image_data?: string;
  session_id?: string;
}

/**
 * 生成会话ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 增强版聊天服务
 */
class EnhancedChatService {
  private sessionId: string;
  private conversationHistory: ChatMessage[] = [];
  private maxHistoryLength: number = 20;

  constructor() {
    this.sessionId = generateSessionId();
  }

  /**
   * 获取当前会话ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * 重置会话
   */
  resetSession(): void {
    this.sessionId = generateSessionId();
    this.conversationHistory = [];
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * 清空对话历史
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 添加消息到历史
   */
  private addToHistory(message: ChatMessage): void {
    this.conversationHistory.push(message);
    
    // 限制历史长度
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  /**
   * 发送聊天消息
   */
  async sendMessage(
    query: string,
    options: {
      imageData?: string;
      context?: Record<string, any>;
    } = {}
  ): Promise<ChatResponse> {
    try {
      // 添加用户消息到历史
      this.addToHistory({
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
        metadata: options.imageData ? { hasImage: true } : undefined
      });

      // 构建符合后端ChatRequest模型的请求
      const cleanHistory = [];
      if (this.conversationHistory && Array.isArray(this.conversationHistory)) {
        for (const msg of this.conversationHistory) {
          if (msg &&
              typeof msg.role === 'string' &&
              typeof msg.content === 'string' &&
              msg.content.trim().length > 0) {
            // 严格映射role到后端期望的值
            const cleanRole = msg.role === 'user' ? 'user' : 'assistant';
            cleanHistory.push({
              role: cleanRole,
              content: msg.content.trim()
            });
          }
        }
      }

      const request = {
        message: query.trim(),
        history: cleanHistory,
        image_data: options.imageData,
        context: options.context
      };

      const rawResponse = await api.post<any>(`${API_BASE}/message`, request);

      // 兼容后端字段名差异
      const response: ChatResponse = {
        reply: rawResponse.reply || rawResponse.response || '',
        scene_type: rawResponse.scene_type || 'general',
        cards: (rawResponse.cards || []).map((c: any) => ({
          id: c.id || c.card_id || '',
          card_type: c.card_type || 'blue',
          title: c.title || '',
          content: c.content || '',
          match_score: c.match_score ?? c.similarity ?? 0,
          color: c.color || 'blue'
        })),
        skill_result: rawResponse.skill_result,
        suggestions: rawResponse.suggestions || rawResponse.suggested_questions || [],
        metadata: rawResponse.metadata || {}
      };

      // 添加助手回复到历史
      this.addToHistory({
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      console.error('聊天请求失败:', error);
      toast.error('聊天请求失败: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * 分析图片
   */
  async analyzeImage(imageData: string): Promise<{ success: boolean; analysis?: ImageAnalysisResult; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('image', imageData);

      const response = await api.post(`${API_BASE}/analyze-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response as { success: boolean; analysis?: ImageAnalysisResult; error?: string };
    } catch (error) {
      console.error('图片分析失败:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 获取场景图标
   */
  getSceneIcon(sceneType: SceneType): string {
    const icons: Record<string, string> = {
      'general': '💬',
      'card_search': '🔍',
      'card_create': '📝',
      'image_analysis': '🖼️',
      'skill_ppt': '📊',
      'skill_excel': '📈',
      'skill_word': '📝',
      'greeting': '👋',
      'help': '❓',
      'document_analysis': '📄',
      'task_manage': '✅',
      'performance_check': '💻',
      'workflow': '🔄',
      'kg_organize': '🔗',
    };
    return icons[sceneType] || '💬';
  }

  /**
   * 获取场景名称
   */
  getSceneName(sceneType: SceneType): string {
    const names: Record<string, string> = {
      'general': '通用对话',
      'card_search': '知识查询',
      'card_create': '创建卡片',
      'image_analysis': '图片分析',
      'skill_ppt': 'PPT生成',
      'skill_excel': 'Excel分析',
      'skill_word': 'Word生成',
      'greeting': '欢迎消息',
      'help': '帮助信息',
      'document_analysis': '文档分析',
      'task_manage': '任务管理',
      'performance_check': '系统检查',
      'workflow': '工作流执行',
      'kg_organize': '知识组织',
    };
    return names[sceneType] || '未知场景';
  }

  /**
   * 格式化卡片类型
   */
  formatCardType(cardType: string): string {
    const types: Record<string, string> = {
      'blue': '事实卡片',
      'green': '解释卡片', 
      'yellow': '风险卡片',
      'red': '行动卡片'
    };
    return types[cardType] || cardType;
  }

  /**
   * 格式化相似度
   */
  formatSimilarity(matchScore: number | undefined | null): string {
    if (matchScore == null || isNaN(matchScore)) {
      return '相似度: --';
    }
    // 确保值在合理范围内 (0-1)
    const validScore = Math.max(0, Math.min(1, matchScore));
    return `相似度: ${(validScore * 100).toFixed(1)}%`;
  }

  /**
   * 检测意图
   */
  async detectIntent(query: string, useLLM: boolean = false): Promise<IntentDetectionResult> {
    try {
      const response = await api.post<IntentDetectionResult>(`${API_BASE}/intent/detect`, {
        query,
        use_llm: useLLM,
      });
      return response;
    } catch (error) {
      console.error('意图检测失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有工作流模板
   */
  async getWorkflowTemplates(category?: string): Promise<any> {
    try {
      const url = category ? `${API_BASE}/workflow/templates?category=${encodeURIComponent(category)}` : `${API_BASE}/workflow/templates`;
      return await api.get(url);
    } catch (error) {
      console.error('获取工作流模板失败:', error);
      throw error;
    }
  }

  /**
   * 启动工作流
   */
  async startWorkflow(query: string, templateId?: string): Promise<WorkflowStartResult> {
    try {
      const response = await api.post<WorkflowStartResult>(`${API_BASE}/workflow/start`, {
        query,
        template_id: templateId,
      });
      return response;
    } catch (error) {
      console.error('启动工作流失败:', error);
      throw error;
    }
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowStatus(executionId: string): Promise<WorkflowStatus> {
    try {
      return await api.get(`${API_BASE}/workflow/status/${executionId}`);
    } catch (error) {
      console.error('获取工作流状态失败:', error);
      throw error;
    }
  }

  /**
   * 取消工作流
   */
  async cancelWorkflow(executionId: string): Promise<{ success: boolean }> {
    try {
      return await api.post(`${API_BASE}/workflow/cancel/${executionId}`);
    } catch (error) {
      console.error('取消工作流失败:', error);
      throw error;
    }
  }

  /**
   * 获取场景名称（支持新的意图类型）
   */
  getIntentName(intentType: IntentType): string {
    const names: Record<string, string> = {
      'create_card': '创建卡片',
      'search_cards': '搜索卡片',
      'organize_cards': '组织知识',
      'analyze_document': '文档分析',
      'generate_ppt': '生成PPT',
      'manage_tasks': '任务管理',
      'analyze_image': '图片分析',
      'check_performance': '系统检查',
      'complex_workflow': '复杂工作流',
      'general_chat': '通用对话',
      'greeting': '问候',
      'help': '帮助',
    };
    return names[intentType] || intentType;
  }

  /**
   * 获取意图图标
   */
  getIntentIcon(intentType: IntentType): string {
    const icons: Record<string, string> = {
      'create_card': '📝',
      'search_cards': '🔍',
      'organize_cards': '🔗',
      'analyze_document': '📄',
      'generate_ppt': '📊',
      'manage_tasks': '✅',
      'analyze_image': '🖼️',
      'check_performance': '💻',
      'complex_workflow': '🔄',
      'general_chat': '💬',
      'greeting': '👋',
      'help': '❓',
    };
    return icons[intentType] || '💬';
  }
}

// 创建服务实例
const enhancedChatService = new EnhancedChatService();

export default enhancedChatService;