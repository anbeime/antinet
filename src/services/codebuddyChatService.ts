// src/services/codebuddyChatService.ts - CodeBuddy SDK 增强聊天服务
// 提供与后端 CodeBuddy 增强对话机器人 API 的接口
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000/api/codebuddy-chat';

// ========== 类型定义 ==========

export interface CodeBuddyChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CodeBuddyChatRequest {
  query: string;
  conversation_history?: CodeBuddyChatMessage[];
  context?: Record<string, any>;
  use_knowledge_base?: boolean;
  model?: string;
}

export interface CodeBuddyChatResponse {
  response: string;
  enhanced_by_sdk: boolean;
  knowledge_used: boolean;
  sources?: Array<{
    card_id: string;
    card_type: string;
    title: string;
    similarity: number;
  }>;
  latency_ms?: number;
  error?: string;
}

export interface CodeBuddyHealthResponse {
  sdk_available: boolean;
  knowledge_available: boolean;
  status: string;
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
    toast.error('CodeBuddy 服务不可用，请检查后端服务');
    throw error;
  }
}

// ========== 聊天API ==========

export const codebuddyChatService = {
  /**
   * CodeBuddy 增强聊天查询
   * 使用 CodeBuddy SDK 提供智能对话能力，并集成共享记忆知识库
   *
   * @param query 用户查询
   * @param conversationHistory 对话历史（可选）
   * @param useKnowledgeBase 是否使用知识库（默认 true）
   * @param model 使用的模型（可选）
   * @returns 增强的聊天响应
   */
  chat: async (
    query: string,
    conversationHistory?: CodeBuddyChatMessage[],
    useKnowledgeBase: boolean = true,
    model?: string
  ): Promise<CodeBuddyChatResponse> => {
    try {
      const request: CodeBuddyChatRequest = {
        query,
        conversation_history: conversationHistory || [],
        use_knowledge_base: useKnowledgeBase,
        model: model || 'claude-sonnet-4.5',
      };

      return apiCall<CodeBuddyChatResponse>('/chat', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      console.error('CodeBuddy 聊天查询失败:', error);
      throw error;
    }
  },

  /**
   * 健康检查
   * @returns SDK 和知识库状态
   */
  healthCheck: async (): Promise<CodeBuddyHealthResponse> => {
    try {
      return apiCall<CodeBuddyHealthResponse>('/health');
    } catch (error) {
      console.error('CodeBuddy 健康检查失败:', error);
      throw error;
    }
  },

  /**
   * 检查 CodeBuddy SDK 是否可用
   * @returns true 如果 SDK 可用，否则 false
   */
  isSdkAvailable: async (): Promise<boolean> => {
    try {
      const health = await codebuddyChatService.healthCheck();
      return health.sdk_available;
    } catch (error) {
      console.error('检查 SDK 可用性失败:', error);
      return false;
    }
  },
};

// ========== 辅助函数 ==========

/**
 * 格式化延迟时间
 */
export function formatLatency(latencyMs?: number): string {
  if (!latencyMs) return '未知';
  if (latencyMs < 1000) {
    return `${latencyMs.toFixed(0)}ms`;
  }
  return `${(latencyMs / 1000).toFixed(2)}s`;
}

/**
 * 检查响应是否由 SDK 增强
 */
export function isEnhancedResponse(response: CodeBuddyChatResponse): boolean {
  return response.enhanced_by_sdk;
}

/**
 * 检查是否使用了知识库
 */
export function isKnowledgeUsed(response: CodeBuddyChatResponse): boolean {
  return response.knowledge_used;
}

/**
 * 获取增强状态描述
 */
export function getEnhancementStatus(response: CodeBuddyChatResponse): string {
  if (response.enhanced_by_sdk && response.knowledge_used) {
    return '✨ CodeBuddy SDK 增强 + 知识库';
  } else if (response.enhanced_by_sdk) {
    return '✨ CodeBuddy SDK 增强';
  } else if (response.knowledge_used) {
    return '📚 知识库';
  }
  return '基础';
}

export default codebuddyChatService;
