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
  card_id: string;
  card_type: string;
  title: string;
  content: string;
  similarity: number;
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
  response: string;
  scene_type: SceneType;
  cards: CardReference[];
  skill_result?: SkillResult;
  image_analysis?: ImageAnalysisResult;
  suggested_questions: string[];
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
        timestamp: new Date().toISOString()
      });

      const request: ChatRequest = {
        query,
        conversation_history: this.conversationHistory,
        context: options.context || {},
        image_data: options.imageData,
        session_id: this.sessionId
      };

      const response = await api.post<ChatResponse>(`${API_BASE}/chat`, request);

      // 添加助手回复到历史
      this.addToHistory({
        role: 'assistant',
        content: response.response,
        metadata: {
          scene_type: response.scene_type,
          cards_count: response.cards?.length,
          has_skill_result: !!response.skill_result,
          has_image_analysis: !!response.image_analysis
        },
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      console.error('聊天请求失败:', error);
      toast.error('发送消息失败，请重试');
      throw error;
    }
  }

  /**
   * 发送图片并分析
   */
  async analyzeImage(file: File): Promise<{
    success: boolean;
    analysis?: ImageAnalysisResult;
    error?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`${API_BASE}/analyze-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response;
    } catch (error) {
      console.error('图片分析失败:', error);
      toast.error('图片分析失败，请重试');
      throw error;
    }
  }

  /**
   * 获取图片的Base64编码
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // 移除 data:image/xxx;base64, 前缀
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 获取所有可用技能
   */
  async getSkills(): Promise<SkillInfo[]> {
    try {
      return await api.get<SkillInfo[]>(`${API_BASE}/skills`);
    } catch (error) {
      console.error('获取技能列表失败:', error);
      return [];
    }
  }

  /**
   * 执行指定技能
   */
  async executeSkill(
    skillName: string, 
    query: string,
    context?: Record<string, any>
  ): Promise<SkillResult> {
    try {
      const request: ChatRequest = {
        query,
        conversation_history: this.conversationHistory,
        context: context || {},
        session_id: this.sessionId
      };

      return await api.post<SkillResult>(
        `${API_BASE}/skills/${skillName}/execute`, 
        request
      );
    } catch (error) {
      console.error('技能执行失败:', error);
      toast.error('技能执行失败');
      throw error;
    }
  }

  /**
   * 检测场景类型
   */
  detectScene(query: string): SceneType {
    const patterns: Record<SceneType, RegExp[]> = {
      card_search: [
        /查.*卡片/, /找.*知识/, /搜索.*卡片/, /知识库.*查询/,
        /卡片.*(在哪|在哪里|在哪裡)/, /有.*(事实|解释|风险|行动).*卡片/
      ],
      image_analysis: [
        /分析.*图片/, /解析.*图片/, /识别.*图片/, /看图/,
        /图片.*(内容|是什么|什么意思)/, /这张.*(图|图片).*/
      ],
      skill_ppt: [
        /生成.*PPT/i, /制作.*PPT/i, /创建.*PPT/i, /做.*PPT/i,
        /PPT.*(生成|制作|创建)/i, /幻灯片.*(生成|制作)/
      ],
      skill_excel: [
        /生成.*Excel/i, /制作.*Excel/i, /创建.*Excel/i, /做.*Excel/i,
        /Excel.*(生成|制作|创建)/i, /表格.*(生成|制作|分析)/
      ],
      skill_word: [
        /生成.*Word/i, /制作.*Word/i, /创建.*Word/i, /做.*Word/i,
        /Word.*(生成|制作|创建)/i, /文档.*(生成|制作)/
      ],
      greeting: [
        /^你好/, /^您好/, /^嗨/, /^Hello/i, /^Hi/i,
        /在吗/, /在嘛/, /在不在/
      ],
      help: [
        /帮助/, /怎么用/, /功能/, /能做什么/, /有什么功能/,
        /如何使用/, /说明/
      ],
      general: []
    };

    for (const [scene, scenePatterns] of Object.entries(patterns)) {
      for (const pattern of scenePatterns) {
        if (pattern.test(query)) {
          return scene as SceneType;
        }
      }
    }

    return 'general';
  }

  /**
   * 格式化卡片类型
   */
  formatCardType(type: string): string {
    const typeMap: Record<string, string> = {
      '事实': '📋 事实',
      '解释': '💡 解释',
      '风险': '⚠️ 风险',
      '行动': '✅ 行动',
      'fact': '📋 事实',
      'explanation': '💡 解释',
      'risk': '⚠️ 风险',
      'action': '✅ 行动'
    };
    return typeMap[type] || type;
  }

  /**
   * 格式化相似度
   */
  formatSimilarity(similarity: number): string {
    const percentage = Math.round(similarity * 100);
    if (percentage >= 90) return '🔥 高度相关';
    if (percentage >= 70) return '⭐ 非常相关';
    if (percentage >= 50) return '✓ 相关';
    return '○ 可能相关';
  }

  /**
   * 获取场景图标
   */
  getSceneIcon(sceneType: SceneType): string {
    const iconMap: Record<SceneType, string> = {
      general: '💬',
      card_search: '📚',
      image_analysis: '🖼️',
      skill_ppt: '📊',
      skill_excel: '📈',
      skill_word: '📝',
      greeting: '👋',
      help: '❓'
    };
    return iconMap[sceneType] || '💬';
  }

  /**
   * 获取场景名称
   */
  getSceneName(sceneType: SceneType): string {
    const nameMap: Record<SceneType, string> = {
      general: '对话',
      card_search: '知识库查询',
      image_analysis: '图片分析',
      skill_ppt: 'PPT生成',
      skill_excel: 'Excel分析',
      skill_word: 'Word生成',
      greeting: '问候',
      help: '帮助'
    };
    return nameMap[sceneType] || '对话';
  }
}

// 导出单例实例
export const enhancedChatService = new EnhancedChatService();

// 导出便捷函数
export const sendMessage = (query: string, options?: { imageData?: string; context?: Record<string, any> }) => 
  enhancedChatService.sendMessage(query, options);

export const analyzeImage = (file: File) => 
  enhancedChatService.analyzeImage(file);

export const getSkills = () => 
  enhancedChatService.getSkills();

export const executeSkill = (skillName: string, query: string, context?: Record<string, any>) => 
  enhancedChatService.executeSkill(skillName, query, context);

export const detectScene = (query: string) => 
  enhancedChatService.detectScene(query);

export default EnhancedChatService;
