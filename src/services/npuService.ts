/**
 * NPU 推理服务
 * 调用后端 8-Agent 系统进行数据分析
 */

const API_BASE = 'http://localhost:8000/api';

export interface FourColorCard {
  color: 'blue' | 'green' | 'yellow' | 'red';
  category: '事实' | '解释' | '风险' | '行动';
  title: string;
  content: string;
}

export interface AnalyzeRequest {
  query: string;
  data_source?: string;
  analysis_type?: string;
  max_tokens?: number;
  temperature?: number;
  model?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  query: string;
  cards: Record<string, FourColorCard[]>;
  facts: Record<string, FourColorCard[]>;
  explanations: Record<string, FourColorCard[]>;
  risks: Record<string, FourColorCard[]>;
  actions: Record<string, FourColorCard[]>;
  execution_time: number;
  generated_at: string;
  raw_output?: string;
  performance?: {
    inference_time_ms: number;
    total_time_ms: number;
    model: string;
    device: string;
    tokens_generated: number;
    meets_target: boolean;
  };
}

export interface Card {
  id?: string;
  title: string;
  content: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
  category: string;
  timestamp?: string;
  created_at?: string;
  address?: string;
  related_cards?: string[];
}

export interface KnowledgeNode {
  id: string;
  title: string;
  content: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
  category: string;
  created_at: string;
  connections: string[];
}

export interface BenchmarkResponse {
  avg_latency_ms: number;
  cpu_vs_npu_speedup: number;
  memory_usage_mb: number;
  throughput_qps: number;
  meets_target: boolean;
}

export const npuService = {
  /**
   * 数据分析 - 生成四色卡片（8-Agent 协作）
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    try {
      const response = await fetch(`${API_BASE}/generate/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: request.query,
          data_source: request.data_source,
          analysis_type: request.analysis_type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // 添加性能指标（如果没有，使用执行时间估算）
      if (!data.performance) {
        data.performance = {
          inference_time_ms: Math.round(data.execution_time * 1000),
          total_time_ms: Math.round(data.execution_time * 1000),
          model: 'Qwen2.0-7B',
          device: 'NPU',
          tokens_generated: 0,
          meets_target: data.execution_time < 30,
        };
      }

      // 确保返回格式正确
      return {
        success: true,
        query: request.query,
        cards: data.cards || {},
        facts: data.facts || {},
        explanations: data.explanations || {},
        risks: data.risks || {},
        actions: data.actions || {},
        execution_time: data.execution_time || 0,
        generated_at: data.generated_at || new Date().toISOString(),
        performance: data.performance,
      };
    } catch (error) {
      console.error('NPU 分析失败:', error);
      throw error;
    }
  },

  /**
   * 生成完整报告
   */
  async generateReport(request: AnalyzeRequest): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/generate/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: request.query,
          data_source: request.data_source,
          analysis_type: request.analysis_type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('生成报告失败:', error);
      throw error;
    }
  },

  /**
   * 获取所有卡片
   */
  async getCards(limit: number = 100, offset: number = 0): Promise<{ cards: Card[]; total: number }> {
    try {
      const response = await fetch(`${API_BASE}/cards?limit=${limit}&offset=${offset}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('获取卡片失败:', error);
      throw error;
    }
  },

  /**
   * 创建卡片
   */
  async createCard(card: Partial<Card>): Promise<Card> {
    try {
      const response = await fetch(`${API_BASE}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(card),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('创建卡片失败:', error);
      throw error;
    }
  },

  /**
   * 更新卡片
   */
  async updateCard(id: string, card: Partial<Card>): Promise<Card> {
    try {
      const response = await fetch(`${API_BASE}/cards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(card),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('更新卡片失败:', error);
      throw error;
    }
  },

  /**
   * 删除卡片
   */
  async deleteCard(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/cards/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('删除卡片失败:', error);
      throw error;
    }
  },

  /**
   * 获取知识图谱
   */
  async getKnowledgeGraph(limit: number = 100, offset: number = 0): Promise<{ nodes: KnowledgeNode[]; edges: any[]; total: number }> {
    try {
      const response = await fetch(`${API_BASE}/knowledge/graph?limit=${limit}&offset=${offset}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('获取知识图谱失败:', error);
      throw error;
    }
  },

  /**
   * 搜索知识
   */
  async searchKnowledge(keyword: string, limit: number = 10): Promise<{ results: any[]; total: number }> {
    try {
      const response = await fetch(`${API_BASE}/knowledge/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('搜索知识失败:', error);
      throw error;
    }
  },

  /**
   * 系统健康检查
   */
  async getHealth(): Promise<any> {
    try {
      const response = await fetch('http://localhost:8000/health');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('健康检查失败:', error);
      throw error;
    }
  },

  /**
   * 运行NPU性能基准测试
   */
  async benchmark(): Promise<BenchmarkResponse> {
    try {
      const response = await fetch(`${API_BASE}/npu/benchmark`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('基准测试失败:', error);
      throw error;
    }
  },

  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<any> {
    try {
      const response = await fetch('http://localhost:8000/');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('获取系统信息失败:', error);
      throw error;
    }
  }
};
