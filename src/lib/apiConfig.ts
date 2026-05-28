// src/lib/apiConfig.ts - 统一的 API 配置
// 支持局域网访问，自动获取当前主机地址

/**
 * 获取 API 基础地址
 * 开发环境：自动使用当前主机 IP
 * 生产环境：使用相对路径
 */
export const getApiBaseUrl = (): string => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 开发环境：返回空字符串，让请求走 Vite dev server 的 /api 代理（无 CORS 问题）
  // 生产环境：serve --single 无代理能力，需直连后端
  if (import.meta.env.DEV) {
    return '';
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:8000`;
};

/**
 * 构建完整的 API URL
 */
export const buildApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
};

// 预定义的 API 基础路径
export const API_PATHS = {
  KNOWLEDGE: '/api/knowledge',
  CHAT: '/api/chat',
  DATA: '/api/data',
  SKILL: '/api/skill',
  AGENT: '/api/agent',
  NPU: '/api/npu',
  MULTI: '/api/multi',
  RESEARCH: '/api/research',
  SPEECH: '/api/speech',
  WIKI: '/api/wiki',
  MEETING: '/api/meeting',
  ANALYSIS: '/api/analysis',
  EXCEL: '/api/excel',
  PDF: '/api/pdf',
  PPT: '/api/ppt',
  GENIE: '/api/genie-playground',
  EVOLVING_CHAT: '/api/evolving-chat',
  VISION: '/api/vision',
} as const;