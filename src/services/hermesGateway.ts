// src/services/hermesGateway.ts - Hermes TUI Gateway WebSocket 客户端
// 连接 Hermes TUI Gateway，使用 JSON-RPC 协议

export interface HermesMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface HermesStreamEvent {
  type: 'message.delta' | 'message.complete' | 'tool.start' | 'tool.complete' | 'thinking' | 'gateway.ready' | 'session.info' | 'error';
  payload: any;
}

// 回调类型
export type StreamCallback = (event: HermesStreamEvent) => void;
export type ErrorCallback = (error: Error) => void;

class HermesGatewayClient {
  private ws: WebSocket | null = null;
  private url: string;
  private sessionId: string = '';
  private messageHistory: HermesMessage[] = [];

  public getMessageHistory(): HermesMessage[] {
    return this.messageHistory;
  }
  private streamCallbacks: StreamCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private pendingRequests: Map<string, { resolve: (data: any) => void; reject: (err: Error) => void }> = new Map();
  private requestId = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(url: string = 'ws://localhost:18119/ws') {
    this.url = url;
  }

  // 连接到 Hermes Gateway
  connect(sessionId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Already connecting...'));
        return;
      }

      this.isConnecting = true;
      this.sessionId = sessionId || `zhiyi_${Date.now()}`;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[HermesGateway] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[HermesGateway] WebSocket error:', error);
          this.isConnecting = false;
          this.notifyError(new Error('WebSocket connection error'));
        };

        this.ws.onclose = () => {
          console.log('[HermesGateway] Disconnected');
          this.isConnecting = false;
          this.handleDisconnect();
        };

        // Wait for gateway.ready
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout - Hermes Gateway not responding'));
        }, 10000);

        this.once('gateway.ready', () => {
          clearTimeout(timeout);
          resolve();
        });

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // 断开连接
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
    this.messageHistory = [];
    this.streamCallbacks = [];
    this.errorCallbacks = [];
    this.sessionId = '';
    this.reconnectAttempts = 0;
  }

  // 发送消息并获取流式响应
  async sendMessage(text: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to Hermes Gateway');
    }

    const sid = await this.ensureSession();

    const request = {
      jsonrpc: '2.0',
      id: `req_${++this.requestId}`,
      method: 'prompt.submit',
      params: {
        session_id: sid,
        text: text,
        history_version: 0
      }
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id, { resolve, reject });
      this.ws?.send(JSON.stringify(request));

      // 超时处理 - prompt.submit 返回很快（{status:"streaming"}），
      // 真正的流式内容通过 events 推送
      setTimeout(() => {
        const pending = this.pendingRequests.get(request.id);
        if (pending) {
          this.pendingRequests.delete(request.id);
          pending.reject(new Error('Request timeout'));
        }
      }, 120000);
    });
  }

  // 确保有活跃session
  private async ensureSession(): Promise<string> {
    if (this.sessionId) {
      return this.sessionId;
    }

    // 创建新session
    const response = await this.call('session.create', {
      name: `zhiyi_${Date.now()}`
    });

    this.sessionId = response.result?.session_id || '';
    return this.sessionId;
  }

  // 调用RPC方法（同步等待响应）
  async call(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `req_${++this.requestId}`;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });
      this.ws?.send(JSON.stringify(request));

      // 默认30秒超时
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(new Error(`RPC call ${method} timeout`));
        }
      }, 30000);
    });
  }

  // 订阅流式事件
  onStream(callback: StreamCallback) {
    this.streamCallbacks.push(callback);
    return () => {
      this.streamCallbacks = this.streamCallbacks.filter(cb => cb !== callback);
    };
  }

  // 取消订阅流式事件
  offStream(callback: StreamCallback) {
    this.streamCallbacks = this.streamCallbacks.filter(cb => cb !== callback);
  }

  // 订阅错误
  onError(callback: ErrorCallback) {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  // 一次性订阅事件
  private once(type: string, callback: StreamCallback) {
    const wrapper: StreamCallback = (event) => {
      if (event.type === type) {
        callback(event);
        this.streamCallbacks = this.streamCallbacks.filter(cb => cb !== wrapper);
      }
    };
    this.streamCallbacks.push(wrapper);
  }

  // 处理收到的消息
  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data);

      // 事件推送
      if (msg.method === 'event' || msg.event) {
        const event = msg.event || msg;
        const callback: HermesStreamEvent = {
          type: event.type,
          payload: event.payload || event.params || {}
        };
        this.streamCallbacks.forEach(cb => cb(callback));
        return;
      }

      // RPC响应
      if (msg.id && this.pendingRequests.has(msg.id)) {
        const { resolve, reject } = this.pendingRequests.get(msg.id)!;
        this.pendingRequests.delete(msg.id);

        if (msg.error) {
          reject(new Error(msg.error.message || 'RPC Error'));
        } else {
          resolve(msg.result || msg);
        }
      }
    } catch (e) {
      console.error('[HermesGateway] Parse error:', e);
    }
  }

  // 处理断开连接
  private handleDisconnect() {
    // 自动重连
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[HermesGateway] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(this.sessionId), delay);
    }
  }

  private notifyError(error: Error) {
    this.errorCallbacks.forEach(cb => cb(error));
  }

  // 获取可用模型
  async getModels(): Promise<string[]> {
    const response = await this.call('model.options', {});
    return response.result?.models || [];
  }

  // 获取可用命令
  async getCommands(): Promise<any[]> {
    const response = await this.call('commands.catalog', {});
    return response.result?.commands || [];
  }

  // 获取session历史
  async getHistory(): Promise<HermesMessage[]> {
    const response = await this.call('session.history', {
      session_id: this.sessionId
    });
    return response.result?.messages || [];
  }

  // 中断当前操作
  async interrupt() {
    try {
      await this.call('session.interrupt', { session_id: this.sessionId });
    } catch (e) {
      // ignore
    }
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

// 单例
export const hermesGateway = new HermesGatewayClient();

export default hermesGateway;