/**
 * 增强版聊天服务
 * 集成知识库查询、图片解析、技能调用
 * 参考: https://github.com/anbeime/skill/tree/main/projects
 */

import { toast } from 'sonner';

// API 基础路径
const API_BASE = 'http://localhost:8000/api/chat/enhanced';

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
  | 'image_analysis' 
  | 'skill_ppt' 
  | 'skill_excel' 
  | 'skill_word' 
  | 'greeting' 
  | 'help';

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

      const response = await api.post<ChatResponse>(`${API_BASE}/message`, request);

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
    const icons: Record<SceneType, string> = {
      'general': '💬',
      'card_search': '🔍',
      'image_analysis': '🖼️',
      'skill_ppt': '📊',
      'skill_excel': '📈',
      'skill_word': '📝',
      'greeting': '👋',
      'help': '❓'
    };
    return icons[sceneType] || '💬';
  }

  /**
   * 获取场景名称
   */
  getSceneName(sceneType: SceneType): string {
    const names: Record<SceneType, string> = {
      'general': '通用对话',
      'card_search': '知识查询',
      'image_analysis': '图片分析',
      'skill_ppt': 'PPT生成',
      'skill_excel': 'Excel分析',
      'skill_word': 'Word生成',
      'greeting': '欢迎消息',
      'help': '帮助信息'
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
}

// 创建服务实例
const enhancedChatService = new EnhancedChatService();

export default enhancedChatService;