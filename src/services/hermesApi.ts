/**
 * Hermes AI API 服务
 * 
 * 前端调用 Hermes AI 的接口，保持四色卡片、聊天、语音等现有功能
 * 同时享受 Hermes 的自进化、记忆和自动执行技能能力
 */

import { fetchPost, fetchGet } from './fetch';
import { toast } from 'sonner';

// ==================== 类型定义 ====================

export interface HermesChatRequest {
  message: string;
  session_id?: string;
  user_id?: string;
  enable_8agent?: boolean;
  context?: Record<string, any>;
}

export interface HermesChatResponse {
  response: string;
  session_id: string;
  reasoning?: string;
  tool_calls?: any[];
  cards?: FourColorCard[];
  agent_logs?: string[];
  mode: 'hermes' | '8agent' | '8agent_fallback' | 'error';
}

export interface FourColorCard {
  card_type: 'blue' | 'green' | 'yellow' | 'red';
  card_type_cn: '事实' | '解释' | '风险' | '行动';
  title?: string;
  content?: string;
  [key: string]: any;
}

export interface HermesHealth {
  status: 'healthy' | 'initializing';
  hermes_ready: boolean;
  agent_8_ready: boolean;
}

// ==================== API 函数 ====================

/**
 * Hermes AI 聊天接口
 * 
 * @param message 用户消息
 * @param sessionId 会话ID（可选，自动生成）
 * @param options 额外选项
 * @returns AI 响应
 */
export async function hermesChat(
  message: string,
  sessionId?: string,
  options: {
    userId?: string;
    enable8Agent?: boolean;
    context?: Record<string, any>;
  } = {}
): Promise<HermesChatResponse> {
  const { userId = 'default', enable8Agent = true, context } = options;

  try {
    const response = await fetchPost<HermesChatResponse>(
      '/api/hermes/chat',
      {
        message,
        session_id: sessionId,
        user_id: userId,
        enable_8agent: enable8Agent,
        context,
      },
      {
        showLoading: false, // 聊天不需要全局loading
      }
    );

    return response;
  } catch (error: any) {
    console.error('[Hermes] 聊天请求失败:', error);
    toast.error(error.msg || 'Hermes AI 响应失败');
    throw error;
  }
}

/**
 * Hermes 流式聊天（如果后端支持）
 */
export async function hermesChatStream(
  message: string,
  sessionId: string,
  onChunk: (text: string) => void,
  options: {
    userId?: string;
    enable8Agent?: boolean;
  } = {}
): Promise<HermesChatResponse> {
  const { userId = 'default', enable8Agent = true } = options;

  // 使用 EventSource 或 WebSocket 进行流式处理
  // 这里先实现一个简单的轮询版本
  return new Promise((resolve, reject) => {
    // 启动请求
    hermesChat(message, sessionId, { userId, enable8Agent })
      .then((res) => {
        if (res.response) {
          onChunk(res.response);
        }
        resolve(res);
      })
      .catch(reject);
  });
}

/**
 * Hermes 健康检查
 */
export async function hermesHealth(): Promise<HermesHealth> {
  try {
    const response = await fetchGet<HermesHealth>('/api/hermes/health');
    return response;
  } catch (error) {
    console.error('[Hermes] 健康检查失败:', error);
    return {
      status: 'initializing',
      hermes_ready: false,
      agent_8_ready: false,
    };
  }
}

/**
 * 切换 8 Agent 协同模式
 */
export async function toggle8Agent(enabled: boolean): Promise<void> {
  // 这个设置可以通过 localStorage 在前端保存
  localStorage.setItem('hermes_8agent_enabled', String(enabled));
}

/**
 * 获取当前 8 Agent 模式设置
 */
export function get8AgentEnabled(): boolean {
  const stored = localStorage.getItem('hermes_8agent_enabled');
  return stored === null ? true : stored === 'true';
}

// ==================== 辅助函数 ====================

/**
 * 格式化四色卡片显示
 */
export function formatCards(cards: FourColorCard[]): {
  blue: FourColorCard[];
  green: FourColorCard[];
  yellow: FourColorCard[];
  red: FourColorCard[];
} {
  return {
    blue: cards.filter((c) => c.card_type === 'blue'),
    green: cards.filter((c) => c.card_type === 'green'),
    yellow: cards.filter((c) => c.card_type === 'yellow'),
    red: cards.filter((c) => c.card_type === 'red'),
  };
}

/**
 * 获取卡片颜色对应的 Tailwind 类
 */
export function getCardColorClass(cardType: string): string {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };
  return colorMap[cardType] || 'bg-gray-50 border-gray-200';
}

/**
 * 获取卡片图标
 */
export function getCardIcon(cardType: string): string {
  const iconMap: Record<string, string> = {
    blue: '📋', // 事实
    green: '💡', // 解释
    yellow: '⚠️', // 风险
    red: '🎯', // 行动
  };
  return iconMap[cardType] || '📄';
}

// ==================== 默认导出 ====================

export default {
  chat: hermesChat,
  chatStream: hermesChatStream,
  health: hermesHealth,
  toggle8Agent,
  get8AgentEnabled,
  formatCards,
  getCardColorClass,
  getCardIcon,
};