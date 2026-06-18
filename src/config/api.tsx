// 后端API配置文件
// 自动生成 - 请勿手动修改

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // 开发环境走 Vite /api 代理（无 CORS），生产环境直连后端
  if (import.meta.env.DEV) {
    return '';
  }
  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

// 注意：此值为模块加载时一次性计算，在移动设备网络切换后可能失效。
// 需要实时获取时，请使用 getApiBaseUrl() 函数或从 '@/lib/apiConfig' 导入。
export const API_BASE_URL = getApiBaseUrl();

// 实时获取 API Base URL（推荐在移动端使用）
export const getApiBaseUrlDynamic = getApiBaseUrl;

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

  // P0: 双向链接
  BACKLINKS_ADD: '/api/backlinks/add',
  BACKLINKS_REMOVE: '/api/backlinks/remove',
  BACKLINKS_CARD_BACKLINKS: '/api/backlinks/card/{card_id}/backlinks',
  BACKLINKS_CARD_FORWARDLINKS: '/api/backlinks/card/{card_id}/forwardlinks',
  BACKLINKS_CARD_GRAPH: '/api/backlinks/card/{card_id}/graph',
  BACKLINKS_CARD_STATS: '/api/backlinks/stats/{card_id}',
  BACKLINKS_HEALTH: '/api/backlinks/health',

  // P0: 日历整合
  CALENDAR_EVENTS: '/api/integration/calendar/events',
  CALENDAR_EVENTS_ALL: '/api/integration/calendar/events/all',
  CALENDAR_EVENT_BY_ID: '/api/integration/calendar/events/{event_id}',
  CALENDAR_CARD_EVENTS: '/api/integration/calendar/card/{card_id}/events',

  // P0: 卡片-任务关联
  CARD_CREATE_TASK: '/api/integration/card/create-task',
  CARD_TASKS: '/api/integration/card/{card_id}/tasks',
  TASK_CARDS: '/api/integration/task/{task_id}/cards',
  CARD_TASK_RELATION: '/api/integration/card/{card_id}/task/{task_id}',
  INTEGRATION_HEALTH: '/api/integration/health',

  // 语音服务
  SPEECH_STATUS: '/api/speech/status',
  SPEECH_TTS_VOICES: '/api/speech/tts/voices',
  SPEECH_TTS_SPEAK: '/api/speech/tts/speak',
  SPEECH_TTS_SPEAK_CARD: '/api/speech/tts/speak-card',
  SPEECH_TTS_AUDIO: '/api/speech/tts/audio/{filename}',
  SPEECH_STT_TRANSCRIBE: '/api/speech/stt/transcribe',
  SPEECH_STT_TRANSCRIBE_BASE64: '/api/speech/stt/transcribe-base64',
  SPEECH_STT_MODELS: '/api/speech/stt/models',
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
      if (requestOptions.headers) {
        delete (requestOptions.headers as Record<string, string>)['Content-Type'];
      }
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

// 语音服务 API
export const speechService = {
  getStatus: () => apiRequest<any>(API_ENDPOINTS.SPEECH_STATUS),
  
  getVoices: () => apiRequest<any>(API_ENDPOINTS.SPEECH_TTS_VOICES),
  
  getModels: () => apiRequest<any>(API_ENDPOINTS.SPEECH_STT_MODELS),
  
  textToSpeech: (text: string, voice: string = 'zh-CN-XiaoxiaoNeural') =>
    apiRequest<any>(API_ENDPOINTS.SPEECH_TTS_SPEAK, 'POST', { text, voice }),
  
  speakCard: (title: string, content: string, voice?: string) =>
    apiRequest<any>(API_ENDPOINTS.SPEECH_TTS_SPEAK_CARD, 'POST', {
      title,
      content,
      voice: voice || 'zh-CN-XiaoxiaoNeural'
    }),
  
  getAudioUrl: (filename: string) =>
    `${API_BASE_URL}${API_ENDPOINTS.SPEECH_TTS_AUDIO.replace('{filename}', filename)}`,
  
  transcribeAudio: async (audioBlob: Blob, language: string = 'zh', modelSize: string = 'base') => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('language', language);
    formData.append('model_size', modelSize);
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SPEECH_STT_TRANSCRIBE}`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  transcribeBase64: async (base64Audio: string, language: string = 'zh', modelSize: string = 'base') => {
    const formData = new FormData();
    formData.append('audio_data', base64Audio);
    formData.append('language', language);
    formData.append('model_size', modelSize);
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SPEECH_STT_TRANSCRIBE_BASE64}`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  
  playAudio: (url: string) => {
    const audio = new Audio(url);
    audio.play();
    return audio;
  },
  
  playFromUrl: (audioUrl: string) => {
    return speechService.playAudio(`${API_BASE_URL}${audioUrl}`);
  },
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildUrl,
  apiRequest,
  uploadFile,
  uploadFiles,
  downloadFile,
  speechService,
};
