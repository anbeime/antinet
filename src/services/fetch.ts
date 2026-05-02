// src/services/fetch.ts - 统一请求服务
// 参考 SiYuan kernel/util/fetch.ts 模式
// 提供统一的 HTTP 请求处理、错误处理和响应处理

import { toast } from 'sonner';
import { processResponse, ResponseCode } from './responseProcessor';

// 动态获取API地址，支持局域网访问
const getApiBaseUrl = () => {
  // 生产环境使用相对路径
  if (import.meta.env.PROD) {
    return '';
  }
  // 开发环境优先使用环境变量，否则使用当前主机地址
  return import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
};

const API_BASE_URL = getApiBaseUrl();

// 请求ID缓存，用于请求去重
const requestIds: Record<string, number> = {};

// 需要去重的请求路径
const DEDUP_ENDPOINTS = [
  '/api/search/searchRefBlock',
  '/api/graph/getGraph',
  '/api/graph/getLocalGraph',
  '/api/block/getRecentUpdatedBlocks',
  '/api/search/fullTextSearchBlock',
];

// 请求超时时间
const REQUEST_TIMEOUT = 30000;

interface RequestOptions extends RequestInit {
  /** 请求唯一标识，用于去重 */
  requestId?: string;
  /** 是否显示加载提示 */
  showLoading?: boolean;
  /** 自定义错误处理 */
  onError?: (error: ResponseError) => void;
  /** 自定义成功处理 */
  onSuccess?: (data: any) => void;
}

interface ResponseError {
  code: number;
  msg: string;
  data?: any;
}

/**
 * 生成请求ID
 */
function generateRequestId(url: string): number {
  return new Date().getTime();
}

/**
 * 检查是否应该去重请求
 */
function shouldDeduplicate(url: string): boolean {
  return DEDUP_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

/**
 * 统一 POST 请求
 * 参考 SiYuan fetchPost 模式
 */
export async function fetchPost<T = any>(
  url: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  const { requestId, showLoading = false, onError, onSuccess, ...fetchOptions } = options;
  
  // 请求去重检查
  if (shouldDeduplicate(url) && requestId) {
    const newReqId = generateRequestId(url);
    if (requestIds[url] && requestIds[url] > newReqId) {
      console.warn(`[Fetch] 请求去重: ${url}`);
      return Promise.reject({ code: -1, msg: '请求已忽略（去重）' });
    }
    requestIds[url] = newReqId;
    if (data) {
      data.reqId = newReqId;
    }
  }

  // 为 transactions 接口添加请求ID
  if (url === '/api/transactions' && data) {
    data.reqId = generateRequestId(url);
  }

  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  if (data) {
    if (data instanceof FormData) {
      init.body = data;
      delete init.headers['Content-Type']; // 让浏览器自动设置 Content-Type
    } else {
      init.body = JSON.stringify(data);
    }
  }

  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  init.signal = controller.signal;

  try {
    if (showLoading) {
      toast.loading('请求中...');
    }

    const response = await fetch(`${API_BASE_URL}${url}`, init);
    clearTimeout(timeoutId);

    // 处理 HTTP 错误状态码
    if (response.status === 403 || response.status === 404) {
      throw { code: -response.status, msg: response.statusText };
    }

    if (response.status === 401) {
      // 认证失败，3秒后刷新页面
      toast.error('认证失败，正在刷新...');
      setTimeout(() => window.location.reload(), 3000);
      throw { code: -response.status, msg: '认证失败' };
    }

    // 解析响应
    let result: any;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    // 统一响应处理
    const processed = processResponse(result);
    if (!processed) {
      // processResponse 返回 false 表示不需要继续处理
      return result as T;
    }

    // 调用自定义成功回调
    if (onSuccess && processed) {
      onSuccess(processed);
    }

    return processed as T;

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // 处理取消请求
    if (error.name === 'AbortError') {
      toast.error('请求超时');
      throw { code: -1, msg: '请求超时' };
    }

    // 处理网络错误
    if (error.message === 'Failed to fetch' || error.message === 'Unexpected end of JSON input') {
      if (url === '/api/transactions') {
        toast.error('内核连接失败，请检查服务是否正常运行');
      }
    }

    const errorResult = {
      code: error.code || -1,
      msg: error.msg || error.message || '请求失败',
    };

    // 调用自定义错误回调
    if (onError) {
      onError(errorResult);
    }

    throw errorResult;
  } finally {
    if (showLoading) {
      toast.dismiss();
    }
  }
}

/**
 * 统一 GET 请求
 */
export async function fetchGet<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { showLoading = false, onError, onSuccess, ...fetchOptions } = options;

  const init: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  init.signal = controller.signal;

  try {
    if (showLoading) {
      toast.loading('加载中...');
    }

    const response = await fetch(`${API_BASE_URL}${url}`, init);
    clearTimeout(timeoutId);

    let result: any;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    // 统一响应处理
    const processed = processResponse(result);
    if (!processed) {
      return result as T;
    }

    if (onSuccess && processed) {
      onSuccess(processed);
    }

    return processed as T;

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    const errorResult = {
      code: error.code || -1,
      msg: error.msg || error.message || '请求失败',
    };

    if (onError) {
      onError(errorResult);
    }

    throw errorResult;
  } finally {
    if (showLoading) {
      toast.dismiss();
    }
  }
}

/**
 * 同步 POST 请求（等待响应）
 */
export async function fetchSyncPost<T = any>(
  url: string,
  data?: any
): Promise<T> {
  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    if (data instanceof FormData) {
      init.body = data;
    } else {
      init.body = JSON.stringify(data);
    }
  }

  const response = await fetch(`${API_BASE_URL}${url}`, init);
  const result = await response.json();
  
  // 处理响应消息
  processResponse(result);
  
  return result as T;
}

/**
 * 文件上传请求
 */
export async function fetchUpload<T = any>(
  url: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const result = JSON.parse(xhr.responseText);
        const processed = processResponse(result);
        resolve(processed || result);
      } catch (e) {
        reject({ code: -1, msg: '解析响应失败' });
      }
    });

    xhr.addEventListener('error', () => {
      reject({ code: -1, msg: '上传失败' });
    });

    xhr.open('POST', `${API_BASE_URL}${url}`);
    xhr.send(formData);
  });
}

// 导出请求ID缓存（供其他模块使用）
export { requestIds };