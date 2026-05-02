/**
 * 视觉服务 - 处理图片上传和分析
 */

import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';

const VISION_API_BASE = getApiBaseUrl() + '/api/vision'

/**
 * 上传图片
 */
export const uploadImage = async (file: File): Promise<{
  success: boolean;
  image_path?: string;
  image_url?: string;
  filename?: string;
  error?: string;
}> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${VISION_API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('图片上传失败:', error);
    toast.error('图片上传失败');
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
};

/**
 * 分析图片
 */
export const analyzeImage = async (file: File, question: string = '请详细描述这张图片的内容'): Promise<{
  success: boolean;
  analysis?: any;
  error?: string;
}> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('question', question);

    const response = await fetch(`${VISION_API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`分析失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('图片分析失败:', error);
    toast.error('图片分析失败');
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
};

/**
 * 图文对话
 */
export const visionChat = async (
  query: string,
  imagePath: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<{
  success: boolean;
  response?: string;
  error?: string;
}> => {
  try {
    const response = await fetch(`${VISION_API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        image_path: imagePath,
        conversation_history: conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`视觉对话失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      response: result.response,
    };
  } catch (error) {
    console.error('视觉对话失败:', error);
    toast.error('视觉对话失败');
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
};

/**
 * 将文件转换为Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};