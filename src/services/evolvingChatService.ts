// src/services/evolvingChatService.ts
// 自进化聊天服务 - 集成8-Agent、Memory、四色卡片

import { getApiBaseUrl } from '@/lib/apiConfig';

const API_BASE = getApiBaseUrl() + '/api/evolving-chat'

export interface EvolvingChatRequest {
  query: string;
  context?: Record<string, any>;
  enable_evolution?: boolean;
  enable_memory?: boolean;
  enable_skill?: boolean;
  enable_8agent?: boolean;
  user_id?: string;
  llm_provider?: string;  // sensenova / nim / npu
}

export interface CardSource {
  card_id: string;
  card_type: string;
  title: string;
  similarity: number;
}

export interface EvolvingChatResponse {
  response: string;
  sources: CardSource[];
  cards: any[];
  suggested_questions: string[];
  evolution_info?: {
    cards_extracted?: any;
    relations_built?: number;
    exploration_suggestions?: string[];
    skill_executed?: string;
  };
  memory_context?: {
    recent_conversations?: any[];
    user_preferences?: any;
    context_history?: any[];
  };
  skill_used?: string;
}

export interface EvolutionStats {
  four_color_cards: {
    total_cards: number;
    by_type: {
      blue: number;
      green: number;
      yellow: number;
      red: number;
    };
    total_relations: number;
    explore_status: {
      待探索: number;
      探索中: number;
      已探索: number;
    };
  };
  memory: any;
  initialized: boolean;
}

export interface HealthCheckResult {
  status: 'healthy' | 'needs_attention';
  issues: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  checked_at: string;
}

class EvolvingChatService {
  /**
   * 发送自进化聊天消息
   */
  async chat(request: EvolvingChatRequest): Promise<EvolvingChatResponse> {
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: request.query,
          context: request.context || {},
          enable_evolution: request.enable_evolution ?? true,
          enable_memory: request.enable_memory ?? true,
          enable_skill: request.enable_skill ?? true,
          enable_8agent: request.enable_8agent ?? false,
          user_id: request.user_id || 'default_user',
          llm_provider: request.llm_provider || 'nim'
        }),
      });

      if (!response.ok) {
        throw new Error(`聊天失败 (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('自进化聊天失败:', error);
      throw error;
    }
  }

  /**
   * 获取自进化统计
   */
  async getStats(): Promise<EvolutionStats> {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      if (!response.ok) {
        throw new Error('获取统计失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取统计失败:', error);
      throw error;
    }
  }

  /**
   * 触发主动探索
   */
  async triggerExploration(): Promise<{ status: string; pending_cards: number; message: string }> {
    try {
      const response = await fetch(`${API_BASE}/explore`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('触发探索失败');
      }

      return await response.json();
    } catch (error) {
      console.error('触发探索失败:', error);
      throw error;
    }
  }

  /**
   * 执行知识库健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${API_BASE}/health-check`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('健康检查失败');
      }

      return await response.json();
    } catch (error) {
      console.error('健康检查失败:', error);
      throw error;
    }
  }
}

export const evolvingChatService = new EvolvingChatService();
export default evolvingChatService;