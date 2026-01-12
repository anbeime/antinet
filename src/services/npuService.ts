/**
 * NPU 推理服务
 * 调用后端 NPU API 进行数据分析
 */
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/npu';

export interface FourColorCard {
  color: 'blue' | 'green' | 'yellow' | 'red';
  category: '事实' | '解释' | '风险' | '行动';
  title: string;
  content: string;
}

export interface AnalyzeRequest {
  query: string;
  max_tokens?: number;
  temperature?: number;
  model?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  query: string;
  cards: FourColorCard[];
  raw_output: string;
  performance: {
    inference_time_ms: number;
    total_time_ms: number;
    model: string;
    device: string;
    tokens_generated: number;
    meets_target: boolean;
  };
}

export interface ModelInfo {
  key: string;
  name: string;
  params: string;
  quantization: string;
  description: string;
  path: string;
  recommended: boolean;
}

export interface BenchmarkResponse {
  model_name: string;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  cpu_vs_npu_speedup: number;
  memory_usage_mb: number;
  test_count: number;
  status: string;
}

export const npuService = {
  /**
   * 数据分析 - 生成四色卡片
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    try {
      const response = await axios.post(`${API_BASE}/analyze`, request);
      return response.data;
    } catch (error) {
      console.error('NPU 分析失败:', error);
      throw error;
    }
  },

  /**
   * 列出可用模型
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await axios.get(`${API_BASE}/models`);
      return response.data;
    } catch (error) {
      console.error('获取模型列表失败:', error);
      throw error;
    }
  },

  /**
   * 性能基准测试
   */
  async benchmark(): Promise<BenchmarkResponse> {
    try {
      const response = await axios.get(`${API_BASE}/benchmark`);
      return response.data;
    } catch (error) {
      console.error('性能测试失败:', error);
      throw error;
    }
  },

  /**
   * 模型状态检查
   */
  async getStatus(): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE}/status`);
      return response.data;
    } catch (error) {
      console.error('获取状态失败:', error);
      throw error;
    }
  }
};
