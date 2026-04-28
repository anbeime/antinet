// src/services/hermesService.ts - Hermes Agent 服务集成
// 提供与Hermes Agent API的接口

const HERMES_API_BASE = 'http://localhost:8001';

export interface HermesMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface HermesRequest {
  message: string;
  history?: HermesMessage[];
  model?: string;
  tools?: string[];
}

export interface HermesResponse {
  response: string;
  tool_calls?: any[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${HERMES_API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Hermes API请求失败 (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Hermes服务调用失败:', error);
    throw error;
  }
}

export const hermesService = {
  async chat(request: HermesRequest): Promise<HermesResponse> {
    return apiCall<HermesResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async getModels(): Promise<string[]> {
    return apiCall<string[]>('/api/models');
  },

  async setModel(model: string): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>('/api/model', {
      method: 'POST',
      body: JSON.stringify({ model }),
    });
  },

  async getConfig(): Promise<Record<string, any>> {
    return apiCall<Record<string, any>>('/api/config');
  },

  async setConfig(config: Record<string, any>): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>('/api/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async listSkills(): Promise<string[]> {
    return apiCall<string[]>('/api/skills');
  },

  async useSkill(skillName: string): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>('/api/skills/use', {
      method: 'POST',
      body: JSON.stringify({ skill: skillName }),
    });
  },
};

export default hermesService;