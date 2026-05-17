// 自动生成的API配置文件
// 生成时间: 2026-01-27 19:58:42.763318

// 动态获取API地址，支持局域网访问
const getApiBaseUrl = () => {
  // 生产环境使用相对路径，由vite代理或nginx转发
  if (import.meta.env.PROD) {
    return '';
  }
  // 开发环境优先使用环境变量，否则使用当前主机地址
  return import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {

  // 知识管理
  'DATA_KNOWLEDGE_SPACES': '/api/data/knowledge-spaces',
  'KNOWLEDGE_CARDS': '/api/knowledge/cards',
  'KNOWLEDGE_CARDS_CARD_ID': '/api/knowledge/cards/{card_id}',
  'KNOWLEDGE_GRAPH': '/api/knowledge/graph',
  'KNOWLEDGE_IMPORT': '/api/knowledge/import',
  'KNOWLEDGE_SEARCH': '/api/knowledge/search',
  'KNOWLEDGE_SOURCES': '/api/knowledge/sources',
  'KNOWLEDGE_STATS': '/api/knowledge/stats',
  'MOCK_TEAM_KNOWLEDGE': '/api/mock/team/knowledge',
  'PDF_EXTRACT_KNOWLEDGE': '/api/pdf/extract/knowledge',

  // 数据分析
  'ANALYSIS_ANALYZE_EXISTING': '/api/analysis/analyze-existing',
  'ANALYSIS_BATCH_ANALYZE': '/api/analysis/batch-analyze',
  'ANALYSIS_DEMO_DATA': '/api/analysis/demo-data',
  'ANALYSIS_DOWNLOAD_FILENAME': '/api/analysis/download/{filename}',
  'ANALYSIS_LIST_ANALYSES': '/api/analysis/list-analyses',
  'ANALYSIS_UPLOAD_AND_ANALYZE': '/api/analysis/upload-and-analyze',
  'PPT_EXPORT_ANALYSIS': '/api/ppt/export/analysis',

  // 8-Agent系统
  'AGENT_ANALYZE': '/api/agent/analyze',
  'AGENT_CARDS': '/api/agent/cards',
  'AGENT_CHAT': '/api/agent/chat',
  'AGENT_MEMORY_RETRIEVE': '/api/agent/memory/retrieve',
  'AGENT_MEMORY_STORE': '/api/agent/memory/store',
  'AGENT_STATS': '/api/agent/stats',
  'AGENT_STATUS': '/api/agent/status',
  'SKILL_AGENT_AGENT_NAME': '/api/skill/agent/{agent_name}',

  // 技能系统
  'SKILL_BATCH_EXECUTE': '/api/skill/batch-execute',
  'SKILL_CATEGORIES': '/api/skill/categories',
  'SKILL_EXECUTE': '/api/skill/execute',
  'SKILL_LIST': '/api/skill/list',
  'SKILL_SKILL_SKILL_NAME': '/api/skill/skill/{skill_name}',
  'SKILL_STATS': '/api/skill/stats',

  // NPU性能
  'NPU_ANALYZE': '/api/npu/analyze',
  'NPU_BENCHMARK': '/api/npu/benchmark',
  'NPU_MODELS': '/api/npu/models',
  'NPU_STATUS': '/api/npu/status',
  'NPU_TEST_ROUTER': '/api/npu/test-router',

  // 聊天机器人
  'CHAT_CARD_CARD_ID': '/api/chat/card/{card_id}',
  'CHAT_CARDS': '/api/chat/cards',
  'CHAT_HEALTH': '/api/chat/health',
  'CHAT_QUERY': '/api/chat/query',
  'CHAT_SEARCH': '/api/chat/search',

  // 数据管理
  'DATA_ACTIVITIES': '/api/data/activities',
  'DATA_ANALYTICS_CATEGORY': '/api/data/analytics/{category}',
  'DATA_CHECKLIST': '/api/data/checklist',
  'DATA_COMMENTS': '/api/data/comments',
  'DATA_COMMENTS_TARGET_ID': '/api/data/comments/{target_id}',
  'DATA_GTD_TASKS': '/api/data/gtd/tasks',
  'DATA_GTD_TASKS_TASK_ID': '/api/data/gtd/tasks/{task_id}',
  'DATA_TEAM_MEMBERS': '/api/data/team-members',
  'DATA_TEAM_MEMBERS_MEMBER_ID': '/api/data/team-members/{member_id}',

  // 文档处理
  'EXCEL_DELETE_FILENAME': '/api/excel/delete/{filename}',
  'EXCEL_DOWNLOAD_FILENAME': '/api/excel/download/{filename}',
  'EXCEL_EXPORT_ANALYSIS': '/api/excel/export-analysis',
  'EXCEL_EXPORT_CARDS': '/api/excel/export-cards',
  'EXCEL_LIST': '/api/excel/list',
  'PDF_BATCH_PROCESS': '/api/pdf/batch/process',
  'PDF_EXPORT_CARDS': '/api/pdf/export/cards',
  'PDF_EXTRACT_TABLES': '/api/pdf/extract/tables',
  'PDF_EXTRACT_TEXT': '/api/pdf/extract/text',
  'PDF_HEALTH': '/api/pdf/health',
  'PDF_STATUS': '/api/pdf/status',
  'PPT_CARD_TYPES': '/api/ppt/card-types',
  'PPT_EXPORT_CARDS': '/api/ppt/export/cards',
  'PPT_HEALTH': '/api/ppt/health',
  'PPT_STATUS': '/api/ppt/status',
  'PPT_TEMPLATE_CREATE': '/api/ppt/template/create',

  // 多模型API - 新增
  'MULTI_CHAT': '/api/multi/chat',
  'MULTI_CHAT_WITH_IMAGE': '/api/multi/chat-with-image',
  'MULTI_MODELS': '/api/multi/models',
  'MULTI_MODEL_INFO': '/api/multi/model-info',
  'MULTI_STATUS': '/api/multi/status',
  'MULTI_EMBEDDING': '/api/multi/embedding',

  // Genie 模型测试场
  'GENIE_MODELS': '/api/genie-playground/models',
  'GENIE_SERVICE_STATUS': '/api/genie-playground/service-status',
  'GENIE_CHAT': '/api/genie-playground/chat',
  'GENIE_CHAT_STREAM': '/api/genie-playground/chat/stream',
  'GENIE_VISION_CHAT': '/api/genie-playground/vision-chat',
  'GENIE_BATCH_TEST': '/api/genie-playground/batch-test',

  // 其他
  '_ACTIVITIES': '/activities',
  'MOCK_ANALYTICS_REPORT': '/api/mock/analytics/report',
  'MOCK_CHECKLIST_ITEMS': '/api/mock/checklist/items',
  'MOCK_GTD_TASKS': '/api/mock/gtd/tasks',
  'MOCK_TEAM_COLLABORATION': '/api/mock/team/collaboration',
  '_BATCH': '/batch',
'_CARDS': '/api/knowledge/cards',
  '_GRAPH': '/graph',
  '_REPORT': '/report',
  '_SEARCH': '/api/knowledge/search',
  '_CARD_ID': '/{card_id}',
  '_RULE_ID': '/{rule_id}',
  '_RULE_ID_TOGGLE': '/{rule_id}/toggle',
};

export const API_METHODS = {
  '_ACTIVITIES': ['GET'],
  'AGENT_ANALYZE': ['POST'],
  'AGENT_CARDS': ['GET', 'POST'],
  'AGENT_CHAT': ['POST'],
  'AGENT_MEMORY_RETRIEVE': ['GET'],
  'AGENT_MEMORY_STORE': ['POST'],
  'AGENT_STATS': ['GET'],
  'AGENT_STATUS': ['GET'],
  'ANALYSIS_ANALYZE_EXISTING': ['POST'],
  'ANALYSIS_BATCH_ANALYZE': ['POST'],
  'ANALYSIS_DEMO_DATA': ['GET'],
  'ANALYSIS_DOWNLOAD_FILENAME': ['GET'],
  'ANALYSIS_LIST_ANALYSES': ['GET'],
  'ANALYSIS_UPLOAD_AND_ANALYZE': ['POST'],
  'CHAT_CARD_CARD_ID': ['GET', 'GET'],
  'CHAT_CARDS': ['GET', 'GET'],
  'CHAT_HEALTH': ['GET', 'GET'],
  'CHAT_QUERY': ['POST', 'POST'],
  'CHAT_SEARCH': ['POST', 'POST'],
  'DATA_ACTIVITIES': ['GET', 'POST'],
  'DATA_ANALYTICS_CATEGORY': ['GET', 'PUT'],
  'DATA_CHECKLIST': ['GET', 'PUT'],
  'DATA_COMMENTS': ['POST'],
  'DATA_COMMENTS_TARGET_ID': ['GET'],
  'DATA_GTD_TASKS': ['GET', 'POST'],
  'DATA_GTD_TASKS_TASK_ID': ['PUT', 'DELETE'],
  'DATA_KNOWLEDGE_SPACES': ['GET', 'POST'],
  'DATA_TEAM_MEMBERS': ['GET', 'POST'],
  'DATA_TEAM_MEMBERS_MEMBER_ID': ['PUT', 'DELETE'],
  'EXCEL_DELETE_FILENAME': ['DELETE'],
  'EXCEL_DOWNLOAD_FILENAME': ['GET'],
  'EXCEL_EXPORT_ANALYSIS': ['POST'],
  'EXCEL_EXPORT_CARDS': ['POST'],
  'EXCEL_LIST': ['GET'],
  'KNOWLEDGE_CARDS': ['GET', 'POST'],
  'KNOWLEDGE_CARDS_CARD_ID': ['GET', 'DELETE'],
  'KNOWLEDGE_GRAPH': ['GET'],
  'KNOWLEDGE_IMPORT': ['POST'],
  'KNOWLEDGE_SEARCH': ['POST'],
  'KNOWLEDGE_SOURCES': ['GET'],
  'KNOWLEDGE_STATS': ['GET'],
  'MOCK_ANALYTICS_REPORT': ['GET'],
  'MOCK_CHECKLIST_ITEMS': ['GET'],
  'MOCK_GTD_TASKS': ['GET'],
  'MOCK_TEAM_COLLABORATION': ['GET'],
  'MOCK_TEAM_KNOWLEDGE': ['GET'],
  'NPU_ANALYZE': ['POST'],
  'NPU_BENCHMARK': ['GET'],
  'NPU_MODELS': ['GET'],
  'NPU_STATUS': ['GET'],
  'NPU_TEST_ROUTER': ['POST'],
  'PDF_BATCH_PROCESS': ['POST'],
  'PDF_EXPORT_CARDS': ['POST'],
  'PDF_EXTRACT_KNOWLEDGE': ['POST'],
  'PDF_EXTRACT_TABLES': ['POST'],
  'PDF_EXTRACT_TEXT': ['POST'],
  'PDF_HEALTH': ['GET'],
  'PDF_STATUS': ['GET'],
  'PPT_CARD_TYPES': ['GET'],
  'PPT_EXPORT_ANALYSIS': ['POST'],
  'PPT_EXPORT_CARDS': ['POST'],
  'PPT_HEALTH': ['GET'],
  'PPT_STATUS': ['GET'],
  'PPT_TEMPLATE_CREATE': ['POST'],
  'MULTI_CHAT': ['POST'],
  'MULTI_CHAT_WITH_IMAGE': ['POST'],
  'MULTI_MODELS': ['GET'],
  'MULTI_MODEL_INFO': ['GET'],
  'MULTI_STATUS': ['GET'],
  'MULTI_EMBEDDING': ['POST'],
  'GENIE_MODELS': ['GET'],
  'GENIE_SERVICE_STATUS': ['GET'],
  'GENIE_CHAT': ['POST'],
  'GENIE_CHAT_STREAM': ['POST'],
  'GENIE_VISION_CHAT': ['POST'],
  'GENIE_BATCH_TEST': ['POST'],
  'SKILL_AGENT_AGENT_NAME': ['GET'],
  'SKILL_BATCH_EXECUTE': ['POST'],
  'SKILL_CATEGORIES': ['GET'],
  'SKILL_EXECUTE': ['POST'],
  'SKILL_LIST': ['GET'],
  'SKILL_SKILL_SKILL_NAME': ['GET'],
  'SKILL_STATS': ['GET'],
  '_BATCH': ['POST'],
  '_CARDS': ['POST'],
  '_GRAPH': ['GET'],
  '_REPORT': ['POST'],
  '_SEARCH': ['POST'],
  '_CARD_ID': ['GET', 'DELETE'],
  '_RULE_ID': ['PUT', 'DELETE'],
  '_RULE_ID_TOGGLE': ['POST'],
};

// 辅助函数
export const buildUrl = (endpoint: string, params?: Record<string, string>) => {
  let url = API_BASE_URL + endpoint;
  if (params) {
    Object.keys(params).forEach(key => {
      url = url.replace(`{${key}}`, params[key]);
    });
  }
  return url;
};

export const apiRequest = async (
  endpoint: string,
  method: string = 'GET',
  data?: any,
  params?: Record<string, string>
) => {
  const url = buildUrl(endpoint, params);

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
};
