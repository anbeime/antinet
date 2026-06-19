/**
 * 实时协作服务
 * 通过 WebSocket 与后端 /api/ws/collaboration/{userId} 通信
 * 所有局域网用户实时接收同一消息流
 */
import { getApiBaseUrl } from '@/lib/apiConfig';

const COLLAB_API = getApiBaseUrl() + '/api';

export interface ActivityMessage {
  id: string;
  user: string;
  userId: string;
  avatar: string;
  action: string;
  content: string;
  timestamp: string;
  type: string;
}

export interface CommentMessage {
  id: number;
  user: string;
  userId: string;
  avatar: string;
  content: string;
  parentId?: number;
  targetId: number;
  targetType: string;
  timestamp: string;
}

export type CollabMessageType = 
  | 'pong'
  | 'user_online'
  | 'user_offline'
  | 'new_activity'
  | 'new_comment'
  | 'member_added'
  | 'history';

export interface CollabMessage {
  type: CollabMessageType;
  activity?: ActivityMessage;
  comment?: CommentMessage;
  userId?: string;
  member?: any;
  activities?: ActivityMessage[];
  members?: any[];
  timestamp?: string;
}

type MessageHandler = (msg: CollabMessage) => void;

class CollaborationService {
  private ws: WebSocket | null = null;
  private userId: string = '';
  private nickname: string = '';
  private userAvatar: string = '👤';
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  private destroyed = false;
  private _hasLoggedConnError = false;

  /**
   * 连接 WebSocket 协作频道
   * @param userId 当前用户ID（本地生成或后端用户ID）
   * @param nickname 用户昵称（登录时输入）
   * @param avatar 用户头像 emoji
   */
  connect(userId: string, nickname?: string, avatar?: string): void {
    this.userId = userId;
    this.nickname = nickname || '';
    this.userAvatar = avatar || '👤';
    this.destroyed = false;
    this._hasLoggedConnError = false;
    this._connect();
  }

  private _connect(): void {
    if (this.destroyed) return;
    
    // 直连后端 WebSocket（后端在 8000，局域网可访问）
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname + ':8000'; // 强制 8000 端口
    const params = new URLSearchParams();
    if (this.nickname) params.set('nickname', this.nickname);
    if (this.userAvatar) params.set('avatar', this.userAvatar);
    const query = params.toString();
    const url = `${protocol}//${host}/api/ws/collaboration/${this.userId}${query ? '?' + query : ''}`;

    console.log(`[Collab] 连接 WebSocket: ${url} (host=${window.location.host})`);

    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = this._onOpen.bind(this);
      this.ws.onmessage = this._onMessage.bind(this);
      this.ws.onclose = this._onClose.bind(this);
      this.ws.onerror = this._onError.bind(this);
    } catch (e) {
      console.error('[Collab] WebSocket 创建失败:', e);
      this._scheduleReconnect();
    }
  }

  private _onOpen(): void {
    console.log('[Collab] WebSocket 已连接');
    this.reconnectDelay = 2000; // 重置重连延迟
    // 发送心跳
    this._sendPing();
  }

  private _onMessage(event: MessageEvent): void {
    try {
      const msg: CollabMessage = JSON.parse(event.data);
      if (msg.type === 'pong') return; // 心跳响应不触发回调
      this.messageHandlers.forEach(handler => handler(msg));
    } catch (e) {
      console.error('[Collab] 解析消息失败:', e);
    }
  }

  private _onClose(event: CloseEvent): void {
    console.log(`[Collab] WebSocket 断开: code=${event.code}`);
    if (!this.destroyed) {
      this._scheduleReconnect();
    }
  }

  private _onError(_event: Event): void {
    if (!this._hasLoggedConnError) {
      console.warn('[Collab] WebSocket 连接失败，后台会自动重连。如需协作功能请确保后端已启动 (localhost:8000)');
      this._hasLoggedConnError = true;
    }
  }

  private _scheduleReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    console.log(`[Collab] ${this.reconnectDelay}ms 后重连...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this._connect();
    }, this.reconnectDelay);
  }

  private _sendPing(): void {
    this._send({ type: 'ping' });
  }

  private _send(data: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /** 发送协作活动消息 */
  sendActivity(params: {
    user: string;
    userId: string;
    avatar: string;
    action: string;
    content: string;
    type?: string;
  }): void {
    this._send({
      type: 'send_activity',
      ...params,
    });
  }

  /** 发送评论 */
  sendComment(params: {
    user: string;
    userId: string;
    avatar: string;
    content: string;
    parentId?: number;
    targetId?: number;
    targetType?: string;
  }): void {
    this._send({
      type: 'send_comment',
      ...params,
    });
  }

  /** 订阅消息 */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /** 断开连接 */
  disconnect(): void {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000, '用户主动断开');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 单例
export const collaborationService = new CollaborationService();

// REST 兼容（当 WebSocket 不可用时回退）
export const collaborationREST = {
  async getMembers() {
    const res = await fetch(`${COLLAB_API}/team-members`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async getActivities(limit = 50) {
    const res = await fetch(`${COLLAB_API}/activities?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async addActivity(data: Partial<ActivityMessage>) {
    const res = await fetch(`${COLLAB_API}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async getComments(targetId: number, targetType = 'space') {
    const res = await fetch(`${COLLAB_API}/comments/${targetId}?target_type=${targetType}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async addComment(data: Partial<CommentMessage>) {
    const res = await fetch(`${COLLAB_API}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  async getStatus() {
    const res = await fetch(`${COLLAB_API}/collaboration/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};