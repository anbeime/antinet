/**
 * Hermes 集成服务 - 包装现有 evolvingChatService
 * 
 * 同时支持：
 * - 原有 8 Agent 系统（EvolvingChat）
 * - Hermes AI + 8 Agent 协同
 * 
 * 前端可通过 `useHermesAI` hook 切换 AI 引擎
 */

import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  evolvingChatService,
} from './evolvingChatService';

const HERMES_API_BASE = getApiBaseUrl() + '/api/hermes';

// ==================== 类型定义 ====================

export interface HermesChatRequest {
  query: string;
  context?: Record<string, any>;
  enable_8agent?: boolean;
  user_id?: string;
}

export interface HermesChatResponse {
  response: string;
  session_id: string;
  reasoning?: string;
  tool_calls?: any[];
  cards?: any[];
  agent_logs?: string[];
  mode: 'hermes' | '8agent' | '8agent_fallback' | 'error';
}

// ==================== Hermes 聊天服务 ====================

class HermesChatService {
  /**
   * Hermes AI 聊天
   */
  async chat(request: HermesChatRequest): Promise<HermesChatResponse> {
    try {
      const response = await fetch(`${HERMES_API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: request.query,
          session_id: `hermes_${Date.now()}`,
          user_id: request.user_id || 'default_user',
          enable_8agent: request.enable_8agent ?? true,
          context: request.context || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Hermes 聊天失败 (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Hermes] 聊天失败:', error);
      throw error;
    }
  }

  /**
   * Hermes 健康检查
   */
  async health(): Promise<{ 
    status: string; 
    hermes_ready: boolean; 
    agent_8_ready: boolean 
  }> {
    try {
      const response = await fetch(`${HERMES_API_BASE}/health`);
      if (!response.ok) {
        throw new Error('健康检查失败');
      }
      return await response.json();
    } catch (error) {
      console.error('[Hermes] 健康检查失败:', error);
      return {
        status: 'offline',
        hermes_ready: false,
        agent_8_ready: false,
      };
    }
  }
}

export const hermesChatService = new HermesChatService();

// ==================== 统一聊天接口 ====================

export type AIProvider = 'hermes' | 'evolving';

export interface UnifiedChatRequest {
  query: string;
  provider?: AIProvider;
  context?: Record<string, any>;
  enable_8agent?: boolean;
  user_id?: string;
}

export interface UnifiedChatResponse {
  response: string;
  cards?: any[];
  provider: AIProvider;
  mode?: string;
  [key: string]: any;
}

/**
 * 统一聊天服务 - 根据 provider 选择 AI 引擎
 */
export async function unifiedChat(
  request: UnifiedChatRequest
): Promise<UnifiedChatResponse> {
  const { query, provider = 'hermes', context, enable_8agent, user_id } = request;

  if (provider === 'hermes') {
    try {
      const result = await hermesChatService.chat({
        query,
        context,
        enable_8agent,
        user_id,
      });

      return {
        response: result.response,
        cards: result.cards || [],
        provider: 'hermes',
        mode: result.mode,
        reasoning: result.reasoning,
        agent_logs: result.agent_logs,
      };
    } catch (error) {
      // Hermes 失败时回退到 evolving
      console.warn('[Hermes] 失败，回退到 Evolving...');
    }
  }

  // 回退到 EvolvingChat
  const evolvingResult = await evolvingChatService.chat({
    query,
    context,
    enable_evolution: true,
    enable_memory: true,
    enable_skill: true,
    enable_8agent: enable_8agent ?? false,
    user_id,
  });

  return {
    provider: 'evolving',
    ...evolvingResult,
  };
}

// ==================== React Hook ====================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hermes AI 状态 Hook
 */
export function useHermesAI() {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem('ai_provider') !== 'evolving';
  });
  const [health, setHealth] = useState<{
    hermes_ready: boolean;
    agent_8_ready: boolean;
  }>({ hermes_ready: false, agent_8_ready: false });

  // 从 localStorage 恢复设置
  useEffect(() => {
    const stored = localStorage.getItem('ai_provider');
    setEnabled(stored !== 'evolving');
  }, []);

  // 健康检查
  useEffect(() => {
    if (enabled) {
      hermesChatService.health().then(setHealth).catch(() => {
        setHealth({ hermes_ready: false, agent_8_ready: false });
      });
    }
  }, [enabled]);

  // 切换 AI 引擎
  const toggleAI = useCallback(() => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    localStorage.setItem('ai_provider', newEnabled ? 'hermes' : 'evolving');
  }, [enabled]);

  // 设置 AI 引擎
  const setAIProvider = useCallback((provider: AIProvider) => {
    setEnabled(provider === 'hermes');
    localStorage.setItem('ai_provider', provider);
  }, []);

  return {
    enabled,           // true = Hermes, false = Evolving
    toggleAI,
    setAIProvider,
    hermesReady: health.hermes_ready,
    agent8Ready: health.agent_8_ready,
  };
}

export default hermesChatService;