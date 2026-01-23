// src/services/chatService.ts - 知识库聊天服务
// 提供与后端知识库对话机器人API的接口
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000/api/chat';

// 如果后端在其他端口运行，可以修改这个常量
// const API_BASE_URL = 'http://localhost:8910/api/chat';

// ========== 类型定义 ==========

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  query: string;
  conversation_history?: ChatMessage[];
  context?: Record<string, any>;
}

export interface CardSource {
  card_id: string;
  card_type: string;
  title: string;
  similarity: number;
}

export interface ChatResponse {
  response: string;
  sources: CardSource[];
  cards: any[];
}

export interface CardSearchRequest {
  query: string;
  card_type?: 'blue' | 'green' | 'yellow' | 'red' | null;
  limit?: number;
}

export interface CardSearchResponse {
  cards: any[];
  total: number;
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
      const errorText = await response.text();
      throw new Error(`API请求失败 (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API调用失败:', error);
    toast.error('知识库服务不可用，请检查后端服务');
    throw error;
  }
}

// ========== 聊天API ==========

export const chatService = {
  /**
   * 知识库查询
   * @param query 用户查询
   * @param conversationHistory 对话历史（可选）
   * @returns 基于知识库的回复
   */
  query: async (
    query: string,
    conversationHistory?: ChatMessage[]
  ): Promise<ChatResponse> => {
    try {
      const request: ChatRequest = {
        query,
        conversation_history: conversationHistory || [],
      };

      return apiCall<ChatResponse>('/query', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      console.error('知识库查询失败:', error);
      throw error;
    }
  },

  /**
   * 搜索知识卡片
   * @param query 搜索查询
   * @param cardType 卡片类型过滤（可选）
   * @param limit 返回数量限制（默认10）
   * @returns 搜索结果
   */
  searchCards: async (
    query: string,
    cardType?: 'blue' | 'green' | 'yellow' | 'red',
    limit: number = 10
  ): Promise<CardSearchResponse> => {
    try {
      const request: CardSearchRequest = {
        query,
        card_type: cardType || null,
        limit,
      };

      return apiCall<CardSearchResponse>('/search', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      console.error('搜索卡片失败:', error);
      throw error;
    }
  },

  /**
   * 列出知识卡片
   * @param cardType 卡片类型过滤（可选）
   * @param limit 返回数量限制（默认50）
   * @param offset 偏移量（默认0）
   * @returns 卡片列表
   */
  listCards: async (
    cardType?: 'blue' | 'green' | 'yellow' | 'red',
    limit: number = 50,
    offset: number = 0
  ): Promise<CardSearchResponse> => {
    try {
      let url = `/cards?limit=${limit}&offset=${offset}`;
      if (cardType) {
        url += `&card_type=${cardType}`;
      }

      return apiCall<CardSearchResponse>(url);
    } catch (error) {
      console.error('列出卡片失败:', error);
      throw error;
    }
  },

  /**
   * 获取单个卡片详情
   * @param cardId 卡片ID
   * @returns 卡片详情
   */
  getCard: async (cardId: string): Promise<any> => {
    try {
      return apiCall<any>(`/card/${cardId}`);
    } catch (error) {
      console.error('获取卡片详情失败:', error);
      throw error;
    }
  },

  /**
   * 健康检查
   * @returns 服务状态
   */
  healthCheck: async (): Promise<{ status: string; database_initialized: boolean }> => {
    try {
      return apiCall<{ status: string; database_initialized: boolean }>('/health');
    } catch (error) {
      console.error('健康检查失败:', error);
      throw error;
    }
  },
};

// ========== 辅助函数 ==========

/**
 * 格式化卡片类型名称
 */
export function formatCardType(cardType: string): string {
  const typeMap: Record<string, string> = {
    blue: '事实',
    green: '解释',
    yellow: '风险',
    red: '行动',
  };
  return typeMap[cardType] || cardType;
}

/**
 * 格式化相似度分数
 */
export function formatSimilarity(similarity: number): string {
  return `${(similarity * 100).toFixed(1)}%`;
}

/**
 * 获取卡片类型颜色
 */
export function getCardTypeColor(cardType: string): string {
  const colorMap: Record<string, string> = {
    blue: 'blue',
    green: 'green',
    yellow: 'yellow',
    red: 'red',
  };
  return colorMap[cardType] || 'gray';
}
