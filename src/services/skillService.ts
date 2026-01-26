/**
 * 技能系统服务
 * 提供与后端技能系统的交互接口
 */

const API_BASE = 'http://localhost:8000/api';

export interface SkillInfo {
  name: string;
  description: string;
  category: string;
  agent_name: string;
  enabled: boolean;
  last_used?: string;
  usage_count: number;
}

export interface SkillCategory {
  category: string;
  agents: string[];
  skill_count: number;
}

export interface SkillExecutionRequest {
  skill_name: string;
  parameters?: Record<string, any>;
}

export interface SkillExecutionResponse {
  skill: string;
  success: boolean;
  result?: Record<string, any>;
  error?: string;
  usage_count: number;
  last_used: string;
}

export interface SkillStatistics {
  total_skills: number;
  enabled_skills: number;
  total_usage: number;
  skills_by_agent: Record<string, {
    total: number;
    enabled: number;
    usage_count: number;
  }>;
  skills_by_category: Record<string, {
    total: number;
    enabled: number;
    usage_count: number;
  }>;
}

/**
 * 技能系统服务类
 */
class SkillService {
  /**
   * 列出所有可用技能
   */
  async listSkills(
    agentName?: string,
    category?: string
  ): Promise<{ total: number; skills: SkillInfo[] }> {
    try {
      const params = new URLSearchParams();
      if (agentName) params.append('agent_name', agentName);
      if (category) params.append('category', category);

      const response = await fetch(`${API_BASE}/skill/list?${params}`);
      if (!response.ok) {
        throw new Error('列出技能失败');
      }
      return await response.json();
    } catch (error) {
      console.error('列出技能失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有技能类别
   */
  async getSkillCategories(): Promise<{
    categories: SkillCategory[];
    total_categories: number;
  }> {
    try {
      const response = await fetch(`${API_BASE}/skill/categories`);
      if (!response.ok) {
        throw new Error('获取技能类别失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取技能类别失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定技能的详细信息
   */
  async getSkillInfo(skillName: string): Promise<SkillInfo> {
    try {
      const response = await fetch(`${API_BASE}/skill/skill/${skillName}`);
      if (!response.ok) {
        throw new Error('获取技能信息失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取技能信息失败:', error);
      throw error;
    }
  }

  /**
   * 执行指定技能
   */
  async executeSkill(
    request: SkillExecutionRequest
  ): Promise<SkillExecutionResponse> {
    try {
      const response = await fetch(`${API_BASE}/skill/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '执行技能失败');
      }

      return await response.json();
    } catch (error) {
      console.error('执行技能失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定 Agent 的所有技能
   */
  async getAgentSkills(agentName: string): Promise<{
    agent_name: string;
    skill_count: number;
    skills: SkillInfo[];
  }> {
    try {
      const response = await fetch(`${API_BASE}/skill/agent/${agentName}`);
      if (!response.ok) {
        throw new Error('获取 Agent 技能失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取 Agent 技能失败:', error);
      throw error;
    }
  }

  /**
   * 批量执行技能
   */
  async batchExecuteSkills(
    requests: SkillExecutionRequest[]
  ): Promise<{
    total_requests: number;
    successful: number;
    failed: number;
    results: Array<{
      skill: string;
      success: boolean;
      result?: Record<string, any>;
      error?: string;
    }>;
  }> {
    try {
      const response = await fetch(`${API_BASE}/skill/batch-execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requests),
      });

      if (!response.ok) {
        throw new Error('批量执行技能失败');
      }

      return await response.json();
    } catch (error) {
      console.error('批量执行技能失败:', error);
      throw error;
    }
  }

  /**
   * 获取技能统计信息
   */
  async getSkillStatistics(): Promise<SkillStatistics> {
    try {
      const response = await fetch(`${API_BASE}/skill/stats`);
      if (!response.ok) {
        throw new Error('获取技能统计失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取技能统计失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const skillService = new SkillService();
