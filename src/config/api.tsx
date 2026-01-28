// 后端API配置文件
// 自动生成 - 请勿手动修改

export const API_BASE_URL = 'http://localhost:8000';

// API端点定义
export const API_ENDPOINTS = {
  // 知识管理
  KNOWLEDGE_GRAPH: '/api/knowledge/graph',
  KNOWLEDGE_CARDS: '/api/knowledge/cards',
  KNOWLEDGE_CARD_BY_ID: '/api/knowledge/cards/{card_id}',
  KNOWLEDGE_STATS: '/api/knowledge/stats',
  KNOWLEDGE_SEARCH: '/api/knowledge/search',
  KNOWLEDGE_IMPORT: '/api/knowledge/import',
  KNOWLEDGE_EXPORT: '/api/knowledge/export',
  KNOWLEDGE_BATCH_IMPORT: '/api/knowledge/batch-import',
  KNOWLEDGE_BATCH_DELETE: '/api/knowledge/batch-delete',

  // 数据分析
  ANALYSIS_UPLOAD: '/api/analysis/upload-and-analyze',
  ANALYSIS_EXISTING: '/api/analysis/analyze-existing',
  ANALYSIS_BATCH: '/api/analysis/batch-analyze',
  ANALYSIS_DOWNLOAD: '/api/analysis/download/{filename}',
  ANALYSIS_LIST: '/api/analysis/list-analyses',
  ANALYSIS_DEMO: '/api/analysis/demo-data',

  // 报告生成
  GENERATE_CARDS: '/api/generate/cards',
  GENERATE_REPORT: '/api/generate/report',
  GENERATE_BATCH: '/api/generate/batch',

  // 8-Agent系统
  AGENT_STATUS: '/api/agent/status',
  AGENT_ANALYZE: '/api/agent/analyze',
  AGENT_MEMORY_STORE: '/api/agent/memory/store',
  AGENT_MEMORY_RETRIEVE: '/api/agent/memory/retrieve',
  AGENT_CARDS: '/api/agent/cards',
  AGENT_CHAT: '/api/agent/chat',
  AGENT_STATS: '/api/agent/stats',

  // 技能系统
  SKILL_LIST: '/api/skill/list',
  SKILL_CATEGORIES: '/api/skill/categories',
  SKILL_EXECUTE: '/api/skill/execute',
  SKILL_BATCH_EXECUTE: '/api/skill/batch-execute',
  SKILL_STATS: '/api/skill/stats',
  SKILL_HISTORY: '/api/skill/history',

  // NPU性能
  NPU_STATUS: '/api/npu/status',
  NPU_BENCHMARK: '/api/performance/benchmark',
  NPU_METRICS: '/api/performance/metrics',

  // 聊天机器人
  CHAT_QUERY: '/api/chat/query',
  CHAT_SEARCH: '/api/chat/search',
  CHAT_CARDS: '/api/chat/cards',
  CHAT_CARD_BY_ID: '/api/chat/card/{card_id}',
  CHAT_HEALTH: '/api/chat/health',

  // 数据管理
  DATA_TEAM_MEMBERS: '/api/data/team-members',
  DATA_TEAM_MEMBER_BY_ID: '/api/data/team-members/{member_id}',
  DATA_KNOWLEDGE_SPACES: '/api/data/knowledge-spaces',
  DATA_ACTIVITIES: '/api/data/activities',
  DATA_COMMENTS: '/api/data/comments/{target_id}',
  DATA_ANALYTICS: '/api/data/analytics/{category}',
  DATA_CHECKLIST: '/api/data/checklist',
  DATA_GTD_TASKS: '/api/data/gtd-tasks',
  DATA_GTD_TASK_BY_ID: '/api/data/gtd-tasks/{task_id}',

  // 文档处理
  PDF_EXTRACT: '/api/pdf/extract',
  PDF_BATCH_EXTRACT: '/api/pdf/batch-extract',
  PDF_ANALYZE: '/api/pdf/analyze',
  PPT_GENERATE: '/api/ppt/generate',
  PPT_DOWNLOAD: '/api/ppt/download/{filename}',
  EXCEL_EXPORT_CARDS: '/api/excel/export-cards',
  EXCEL_EXPORT_ANALYSIS: '/api/excel/export-analysis',
  EXCEL_DOWNLOAD: '/api/excel/download/{filename}',
  EXCEL_LIST: '/api/excel/list',

  // 系统
  HEALTH: '/api/health',
};

// 辅助函数：构建URL
export const buildUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  let url = API_BASE_URL + endpoint;
  if (params) {
    Object.keys(params).forEach(key => {
      url = url.replace(`{${key}}`, String(params[key]));
    });
  }
  return url;
};

// 辅助函数：API请求
export const apiRequest = async <T = any>(
  endpoint: string,
  method: string = 'GET',
  data?: any,
  params?: Record<string, string | number>,
  options?: RequestInit
): Promise<T> => {
  const url = buildUrl(endpoint, params);
  
  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };

  if (data && method !== 'GET') {
    if (data instanceof FormData) {
      // FormData不需要设置Content-Type
      delete requestOptions.headers['Content-Type'];
      requestOptions.body = data;
    } else {
      requestOptions.body = JSON.stringify(data);
    }
  }

  const response = await fetch(url, requestOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
};

// 辅助函数：文件上传
export const uploadFile = async (
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.keys(additionalData).forEach(key => {
      formData.append(key, String(additionalData[key]));
    });
  }

  return apiRequest(endpoint, 'POST', formData);
};

// 辅助函数：批量上传
export const uploadFiles = async (
  endpoint: string,
  files: File[],
  additionalData?: Record<string, any>
): Promise<any> => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  if (additionalData) {
    Object.keys(additionalData).forEach(key => {
      formData.append(key, String(additionalData[key]));
    });
  }

  return apiRequest(endpoint, 'POST', formData);
};

// 辅助函数：下载文件
export const downloadFile = (url: string, filename?: string) => {
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildUrl,
  apiRequest,
  uploadFile,
  uploadFiles,
  downloadFile,
};
