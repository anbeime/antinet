// src/services/responseProcessor.ts - 统一响应处理器
// 参考 SiYuan kernel/util/processMessage.ts 模式
// 提供统一的响应处理、消息显示和错误处理

import { toast } from 'sonner';
import { exportLayout } from '@/components/Layout';

export interface ResponseData {
  code: number;
  msg: string;
  data?: any;
  cmd?: string;
  closeTimeout?: number;
  id?: string;
  reqId?: number;
}

export enum ResponseCode {
  SUCCESS = 0,
  ERROR = -1,
  WARNING = -2,
}

/**
 * 处理响应数据
 * 参考 SiYuan processMessage 模式
 * @returns 返回 false 表示不需要继续处理（已处理完成）
 */
export function processResponse(response: ResponseData | any): ResponseData | false {
  // 如果不是对象或没有 code 字段，直接返回
  if (typeof response !== 'object' || response === null) {
    return response as ResponseData;
  }

  // 处理特殊命令
  if (response.cmd) {
    return handleCommand(response);
  }

  // 处理错误码
  if (typeof response.code === 'number') {
    if (response.code < 0) {
      // 错误消息
      const duration = response.data?.closeTimeout || 0;
      const toastFn = response.code === ResponseCode.ERROR ? toast.error : toast.info;
      toastFn(response.msg, { duration });
      return false;
    }

    if (response.code === ResponseCode.SUCCESS && response.msg) {
      // 成功消息（可选显示）
      // toast.success(response.msg);
    }
  }

  return response;
}

/**
 * 处理特殊命令
 * 参考 SiYuan processMessage 中的命令处理
 */
function handleCommand(response: ResponseData): ResponseData | false {
  const { cmd, msg, data } = response;

  switch (cmd) {
    case 'msg':
      // 显示消息
      toast.message(msg, {
        duration: data?.closeTimeout || 0,
      });
      // 添加微软防御者排除项点击处理
      document.querySelector('#message #addMicrosoftDefenderExclusion')?.addEventListener('click', () => {
        toast.loading('正在添加排除项...');
        fetch('/api/system/addMicrosoftDefenderExclusion', { method: 'POST' })
          .then(() => toast.success('已添加排除项'))
          .catch(() => toast.error('添加失败'));
      }, { once: true });
      return false;

    case 'cmsg':
      // 关闭消息
      toast.dismiss();
      return false;

    case 'cprogress':
      // 关闭进度条
      const progressEl = document.getElementById('progress');
      if (progressEl) {
        progressEl.remove();
      }
      return false;

    case 'reloadui':
      // 重新加载UI
      if (data?.resetScroll) {
        // 重置滚动位置
        localStorage.removeItem('filePosition');
      }
      // 导出布局并刷新
      exportLayout(() => {
        window.location.reload();
      }, false);
      return false;

    case 'closepublishpage':
      // 关闭发布页面
      if (isBrowser()) {
        sessionStorage.setItem('publishServiceClosed', msg || '');
        window.location.reload();
      }
      return false;

    default:
      return response;
  }
}

/**
 * 检查发布服务是否已关闭
 */
export function checkPublishServiceClosed(): boolean {
  if (isBrowser()) {
    const closedMsg = sessionStorage.getItem('publishServiceClosed');
    if (closedMsg) {
      sessionStorage.removeItem('publishServiceClosed');
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh">
          ${closedMsg}
        </div>
      `;
      return true;
    }
  }
  return false;
}

/**
 * 判断是否为浏览器环境
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * 创建错误响应对象
 */
export function createErrorResponse(msg: string, code: number = ResponseCode.ERROR): ResponseData {
  return {
    code,
    msg,
  };
}

/**
 * 创建成功响应对象
 */
export function createSuccessResponse(data?: any, msg?: string): ResponseData {
  return {
    code: ResponseCode.SUCCESS,
    msg: msg || '操作成功',
    data,
  };
}

// 导出 toast 以便其他模块使用
export { toast };