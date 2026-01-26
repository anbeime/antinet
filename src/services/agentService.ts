/**
 * 8-Agent 系统服务
 * 提供与后端 8-Agent 系统的交互接口
 */

const API_BASE = 'http://localhost:8000/api';

export interface FourColorCard {
  card_id: string;
  card_type: 'blue' | 'green' | 'yellow' | 'red';
  title: string;
  content: string;
  category: '事实' | '解释' | '风险' | '行动';
  similarity?: number;
  created_at: string;
}

export interface AnalysisReport {
  report_id: string;
  query: string;
  summary: string;
  cards: FourColorCard[];
  agent_results: Record<string, any>;
  performance: Record<string, number>;
  created_at: string;
}

export interface AgentTaskRequest {
  query: string;
  context?: Record<string, any>;
  priority?: 'high' | 'medium' | 'low';
  material?: string;
}

export interface AgentStatus {
  system_initialized: boolean;
  agents: Record<string, string>;
  agent_count: number;
  active_tasks: number;
  timestamp: string;
}

export interface KnowledgeData {
  knowledge_id: string;
  knowledge_type: string;
  title: string;
  content: string;
  source_agent: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MemoryResponse {
  results: KnowledgeData[];
  total: number;
  query: string;
  retrieved_at: string;
}

/**
 * 8-Agent 系统服务类
 */
class AgentService {
  /**
   * 获取所有 Agent 状态
   */
  async getAgentStatus(): Promise<AgentStatus> {
    try {
      const response = await fetch(`${API_BASE}/agent/status`);
      if (!response.ok) {
        throw new Error('获取 Agent 状态失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取 Agent 状态失败:', error);
      throw error;
    }
  }

  /**
   * 使用 8-Agent 系统进行数据分析
   */
  async analyzeWithAgents(request: AgentTaskRequest): Promise<AnalysisReport> {
    try {
      const response = await fetch(`${API_BASE}/agent/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '分析失败');
      }

      return await response.json();
    } catch (error) {
      console.error('8-Agent 分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有四色卡片
   */
  async getAllCards(): Promise<{ cards: FourColorCard[]; total: number }> {
    try {
      const response = await fetch(`${API_BASE}/agent/cards`);
      if (!response.ok) {
        throw new Error('获取卡片失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取卡片失败:', error);
      throw error;
    }
  }

  /**
   * 创建新卡片
   */
  async createCard(cardData: {
    card_type: string;
    title: string;
    content: string;
    category?: string;
    similarity?: number;
  }): Promise<{ card_id: string; status: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE}/agent/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        throw new Error('创建卡片失败');
      }

      return await response.json();
    } catch (error) {
      console.error('创建卡片失败:', error);
      throw error;
    }
  }

  /**
   * 存储知识到记忆系统
   */
  async storeKnowledge(
    knowledgeType: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      const params = new URLSearchParams();
      params.append('knowledge_type', knowledgeType);

      const response = await fetch(`${API_BASE}/agent/memory/store?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('存储知识失败');
      }

      return await response.json();
    } catch (error) {
      console.error('存储知识失败:', error);
      throw error;
    }
  }

  /**
   * 从记忆系统检索知识
   */
  async retrieveKnowledge(
    knowledgeType: string,
    query: string,
    limit: number = 10
  ): Promise<MemoryResponse> {
    try {
      const params = new URLSearchParams();
      params.append('knowledge_type', knowledgeType);
      params.append('query', query);
      params.append('limit', limit.toString());

      const response = await fetch(`${API_BASE}/agent/memory/retrieve?${params}`);
      if (!response.ok) {
        throw new Error('检索知识失败');
      }

      return await response.json();
    } catch (error) {
      console.error('检索知识失败:', error);
      throw error;
    }
  }

  /**
   * 使用 8-Agent 系统进行对话
   */
  async chatWithAgent(
    query: string,
    context?: Record<string, any>
  ): Promise<{ response: string; sources: any[]; cards: any[] }> {
    try {
      const params = new URLSearchParams();
      params.append('query', query);
      if (context) {
        params.append('context', JSON.stringify(context));
      }

      const response = await fetch(`${API_BASE}/agent/chat?${params}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('对话失败');
      }

      return await response.json();
    } catch (error) {
      console.error('对话失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统统计信息
   */
  async getSystemStats(): Promise<{
    total_cards: number;
    cards_by_type: Record<string, number>;
    agent_status: Record<string, string>;
    system_initialized: boolean;
  }> {
    try {
      const response = await fetch(`${API_BASE}/agent/stats`);
      if (!response.ok) {
        throw new Error('获取统计信息失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const agentService = new AgentService();
