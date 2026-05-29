import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Play,
  RotateCcw,
  Download,
  Crown,
  ChevronDown,
  ChevronUp,
  Settings,
  Monitor,
  Square,
  History,
  Calendar,
  Clock,
  FileText,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { gtdTaskService } from '@/services/dataService';
import { getApiBaseUrl } from '@/lib/apiConfig';
import MeetingCardPanel from '@/components/MeetingCardPanel';
import MeetingCardSaveModal from '@/components/MeetingCardSaveModal';
import type { MeetingCard } from '@/types/card';

// ==================== 像素办公室 AGENT 配置 ====================
const PIXEL_AGENTS: Record<string, { name: string; cnName: string; color: string; x: number; y: number }> = {
  orchestrator: { name: '锦衣卫', cnName: '陆绎', color: '#e74c3c', x: 400, y: 100 },
  mijuanfang: { name: '密卷房', cnName: '档案官', color: '#3498db', x: 120, y: 160 },
  tongzhengsi: { name: '通政司', cnName: '通讯官', color: '#2ecc71', x: 680, y: 160 },
  jianchayuan: { name: '监察院', cnName: '监察官', color: '#f39c12', x: 120, y: 290 },
  xingyusi: { name: '刑狱司', cnName: '风险官', color: '#9b59b6', x: 680, y: 290 },
  canmousi: { name: '参谋司', cnName: '参谋官', color: '#1abc9c', x: 250, y: 410 },
  taishige: { name: '太史阁', cnName: '记忆官', color: '#e67e22', x: 550, y: 410 },
  yichuansi: { name: '驿传司', cnName: '传令官', color: '#34495e', x: 400, y: 250 }
};

// Backend Agent Mapping
const AGENT_MAPPING: Record<string, { color: string }> = {
  "taishige": { color: "from-blue-500 to-blue-600" },
  "jinjiyu": { color: "from-red-500 to-red-600" },
  "tongzhengsi": { color: "from-green-500 to-green-600" },
  "jianchayuan": { color: "from-purple-500 to-purple-600" },
  "mijuanfang": { color: "from-indigo-500 to-indigo-600" },
  "chengxiangfu": { color: "from-yellow-500 to-yellow-600" },
  "junjichu": { color: "from-orange-500 to-orange-600" },
  "zhihuishi": { color: "from-teal-500 to-teal-600" }
};

const PIXEL_STATE_COLORS: Record<string, string> = {
  idle: '#95a5a6', writing: '#3498db', researching: '#2ecc71',
  executing: '#e74c3c', syncing: '#2ecc71', error: '#f39c12'
};

const PIXEL_STATE_NAMES: Record<string, string> = {
  idle: '待命中', writing: '整理文档', researching: '分析中',
  executing: '执行中', syncing: '同步中', error: '出错了'
};

// 像素办公室 AGENT key 到会议 AGENT id 的映射
const PIXEL_TO_MEETING: Record<string, string> = {
  orchestrator: 'jinjiyu', mijuanfang: 'mijuanfang', tongzhengsi: 'tongzhengsi',
  jianchayuan: 'jianchayuan', xingyusi: 'chengxiangfu', canmousi: 'junjichu',
  taishige: 'taishige', yichuansi: 'zhihuishi'
};

// 会议流程步骤
const MEETING_STEPS = [
  { agent: 'orchestrator', state: 'executing', detail: '总指挥使正在分解任务...' },
  { agent: 'mijuanfang', state: 'researching', detail: '档案官正在解析用户素材...' },
  { agent: 'tongzhengsi', state: 'writing', detail: '通讯官正在提取核心事实...' },
  { agent: 'jianchayuan', state: 'researching', detail: '监察官正在分析原因逻辑...' },
  { agent: 'xingyusi', state: 'researching', detail: '风险官正在检测潜在风险...' },
  { agent: 'canmousi', state: 'writing', detail: '参谋官正在生成行动建议...' },
  { agent: 'taishige', state: 'syncing', detail: '记忆官正在存储知识成果...' },
  { agent: 'yichuansi', state: 'idle', detail: '八府巡按会议完成，等待新指令' }
];

 // 8-Agent 角色定义
const AGENT_ROLES = [
  { id: 'taishige', name: '太史阁', title: '历史记录与反思官', avatar: '📚', color: 'from-blue-500 to-blue-600', description: '负责记录所有操作、决策和结果，构建组织的集体记忆与经验库' },
  { id: 'jinjiyu', name: '锦衣卫', title: '安全与情报收集官', avatar: '🛡️', color: 'from-red-500 to-red-600', description: '监控系统安全状态，识别潜在威胁和风险，收集内外部情报' },
  { id: 'tongzhengsi', name: '通政司', title: '信息与通讯中枢', avatar: '📡', color: 'from-green-500 to-green-600', description: '管理所有信息流，确保内外部通讯畅通，促进跨部门协作' },
  { id: 'jianchayuan', name: '监察院', title: '监督与审计官', avatar: '🔍', color: 'from-purple-500 to-purple-600', description: '监督各项操作和流程的执行情况，进行合规性审计' },
  { id: 'mijuanfang', name: '密卷房', title: '知识库与档案管理员', avatar: '📂', color: 'from-indigo-500 to-indigo-600', description: '专门负责非结构化知识的整理、归档、索引和检索' },
  { id: 'chengxiangfu', name: '丞相府', title: '战略规划与决策官', avatar: '🏛️', color: 'from-yellow-500 to-yellow-600', description: '制定战略规划，提供高层决策建议，协调各方资源' },
  { id: 'junjichu', name: '军机处', title: '执行与协调官', avatar: '⚔️', color: 'from-orange-500 to-orange-600', description: '负责任务执行、跨部门协调和进度跟踪' },
  { id: 'zhihuishi', name: '指挥使', title: '总指挥与裁决官', avatar: '👑', color: 'from-teal-500 to-teal-600', description: '统筹全局，做出最终裁决，确保各方协同高效运转' }
];

// 卡片类型映射
const CARD_TYPE_MAP = {
  blue: { color: 'bg-blue-900/40 border border-blue-700/50', icon: <span className="text-blue-400">📋</span> },
  green: { color: 'bg-green-900/40 border border-green-700/50', icon: <span className="text-green-400">🔗</span> },
  yellow: { color: 'bg-yellow-900/40 border border-yellow-700/50', icon: <span className="text-yellow-400">⚠️</span> },
  red: { color: 'bg-red-900/40 border border-red-700/50', icon: <span className="text-red-400">🎯</span> }
};

// 降级模拟讨论轮次数据（SSE 不可用时使用）
// 注意：模拟不伪造 Agent 发言和卡片。真实数据由 SSE agent_speech / agent_cards 推送。
const generateMockDiscussion = (topic: string, rounds: number) => {
  return Array.from({ length: rounds }, (_, i) => ({
    round: i + 1,
    title: `第${i + 1}轮讨论`,
    discussions: AGENT_ROLES.map((agent) => ({
      agent,
      message: `[模拟] 后端未连接，请启动 zhiyi 后端以获取真实 Agent 发言`,
      timestamp: new Date(Date.now() + i * 1000).toISOString()
    })),
    cards: []
  }));
};

// ==================== 后端 API 配置 ====================
const BACKEND_URL = getApiBaseUrl() + '/api/meeting';

// ==================== 像素办公室 Canvas 组件 ====================
const PixelOfficeCanvas: React.FC<{
  pixelState: {
    activeAgent: string;
    agentStates: Record<string, string>;
    detail: string;
    progress: number;
  };
}> = ({ pixelState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 背景 - 深色网格
      ctx.fillStyle = '#0f1729';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 网格线
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 绘制每个 Agent 节点
      Object.entries(PIXEL_AGENTS).forEach(([key, agent]) => {
        const agentState = pixelState.agentStates[key] || 'idle';
        const stateColor = PIXEL_STATE_COLORS[agentState] || '#95a5a6';
        const isActive = key === pixelState.activeAgent;
        const isWorking = agentState !== 'idle' && agentState !== 'error';

        const personX = agent.x;
        const personY = agent.y;
        const breath = Math.sin(frameRef.current * 0.05 + agent.x * 0.01) * 2;
        const blink = frameRef.current % 120 < 5;

        // 活跃节点 - 绿色高亮边框
        if (isActive) {
          const pulse = Math.sin(frameRef.current * 0.08) * 0.4 + 0.6;
          ctx.strokeStyle = `rgba(46, 204, 113, ${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(personX - 35, personY - 40, 70, 80, 8);
          ctx.stroke();
        }

        // 工作中的节点 - 底色
        if (isWorking) {
          ctx.fillStyle = `${agent.color}15`;
          ctx.beginPath();
          ctx.roundRect(personX - 30, personY - 35, 60, 70, 6);
          ctx.fill();
        }

        // 身体
        ctx.fillStyle = agent.color;
        ctx.fillRect(personX - 8, personY - 5 + breath, 16, 20);

        // 头
        ctx.fillStyle = '#ffd5a0';
        ctx.beginPath();
        ctx.arc(personX, personY - 18 + breath, 10, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛
        ctx.fillStyle = '#000';
        if (blink) {
          ctx.fillRect(personX - 4, personY - 20 + breath, 3, 1);
          ctx.fillRect(personX + 1, personY - 20 + breath, 3, 1);
        } else {
          ctx.beginPath();
          ctx.arc(personX - 3, personY - 20 + breath, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(personX + 3, personY - 20 + breath, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // 工作中的手臂摆动
        if (isWorking) {
          const armSwing = Math.sin(frameRef.current * 0.15 + agent.x) * 3;
          ctx.strokeStyle = agent.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(personX + 8, personY - 3 + breath);
          ctx.lineTo(personX + 15, personY + armSwing + breath);
          ctx.stroke();
        }

        // 名称
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillText(agent.name, personX, personY + 30);

        // 中文名
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "Microsoft YaHei"';
        ctx.fillText(agent.cnName, personX, personY + 44);

        // 状态标签
        const stateText = PIXEL_STATE_NAMES[agentState];
        const textWidth = ctx.measureText(stateText).width;
        const tagW = textWidth + 12;
        const tagH = 16;
        const tagX = personX - tagW / 2;
        const tagY = personY + 48;

        ctx.fillStyle = `${stateColor}30`;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 3);
        ctx.fill();
        ctx.fillStyle = stateColor;
        ctx.font = '10px "Microsoft YaHei"';
        ctx.fillText(stateText, personX, tagY + 12);

        // 活跃指示点
        if (isActive) {
          const pulse = Math.sin(frameRef.current * 0.1) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(46, 204, 113, ${pulse})`;
          ctx.beginPath();
          ctx.arc(personX + 25, personY - 35, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // 对话气泡（活跃 Agent）
        if (isActive && pixelState.detail) {
          const bubbleW = 180;
          const bubbleH = 32;
          const bubbleX = personX - bubbleW / 2;
          const bubbleY = personY - 70;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 6);
          ctx.fill();
          ctx.strokeStyle = agent.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 6);
          ctx.stroke();

          // 气泡箭头
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.moveTo(personX - 5, bubbleY + bubbleH);
          ctx.lineTo(personX + 5, bubbleY + bubbleH);
          ctx.lineTo(personX, bubbleY + bubbleH + 8);
          ctx.closePath();
          ctx.fill();

          // 气泡文字
          ctx.fillStyle = '#1f2937';
          ctx.font = '11px "Microsoft YaHei"';
          ctx.textAlign = 'center';
          let text = pixelState.detail;
          if (text.length > 20) text = text.substring(0, 20) + '...';
          ctx.fillText(text, personX, bubbleY + 20);
        }
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [pixelState]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={500}
      className="w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

// ==================== 主页面组件 ====================
const VirtualOfficeMeeting: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [rounds, setRounds] = useState(3);
  const [meetingMode, setMeetingMode] = useState('free');
  const [meetingModes, setMeetingModes] = useState<{id: string; name: string; description: string}[]>([]);
  const [meetingImage, setMeetingImage] = useState<string | null>(null);  // Base64 图片数据
  const [isLoading, setIsLoading] = useState(false);
  const [meetingResult, setMeetingResult] = useState<any>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'tasks'>('new');
  const [meetingHistory, setMeetingHistory] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [agentList, setAgentList] = useState<any[]>([]);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [hybridMode, setHybridMode] = useState(true);
  const [meetingCards, setMeetingCards] = useState<MeetingCard[]>([]);  // 会议中积累的知识卡片
  const [saveModalOpen, setSaveModalOpen] = useState(false);              // 卡片保存弹窗
  const [saveTargetCard, setSaveTargetCard] = useState<MeetingCard | null>(null);  // 待保存的卡片
  const [messageForm, setMessageForm] = useState({ from_agent: '', to_agent: '', message: '' });
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [collabMessages, setCollabMessages] = useState<Array<{user: string; content: string; self?: boolean}>>([]);
  const [collabStatus, setCollabStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [collabUserName, setCollabUserName] = useState(() => localStorage.getItem('collabUserName') || '参与者');
  const collabWsRef = useRef<WebSocket | null>(null);
  const collabUserId = useRef('meeting_' + Date.now());

  // 简化视图模式
  const [simplifiedView, setSimplifiedView] = useState(false);

  // 发送人类消息（混合模式）
  const sendHumanMessage = async (msg: string) => {
    // 本地显示人类消息
    setLiveDiscussions(prev => [...prev, {
      type: 'speech',
      agent: { name: collabUserName, title: '人类参与者', avatar: '👤', color: 'from-green-500 to-green-600' },
      message: msg,
      timestamp: new Date().toISOString()
    }]);
    
    // 发送 WebSocket 广播给其他用户
    if (collabWsRef.current?.readyState === WebSocket.OPEN) {
      collabWsRef.current.send(JSON.stringify({
        type: 'send_activity',
        user: collabUserName,
        userId: collabUserId.current,
        avatar: '👤',
        action: '发言',
        content: msg,
        meetingContext: { topic, currentRound: liveDiscussions.filter(d => d.round).length }
      }));
    }
    
    // 如果开启混合模式，调用后端混合查询（知识卡片 + LLM）
    if (hybridMode && isLoading) {
      try {
        const res = await fetch(getApiBaseUrl() + '/api/meeting/hybrid-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: msg, topic })
        });
        const data = await res.json();
        if (data.answer) {
          // 显示智能体响应
          setTimeout(() => {
            setLiveDiscussions(prev => [...prev, {
              type: 'speech',
              agent: { 
                name: '太史阁', 
                title: '知识管理官', 
                avatar: '📚', 
                color: 'from-blue-500 to-blue-600',
                systemPrompt: data.sources?.map((s: any) => s.title).join(', ')
              },
              message: data.answer,
              timestamp: new Date().toISOString()
            }]);
          }, 500);
          
          // 将查询返回的卡片追加到会议卡片列表
          if (data.cards && data.cards.length > 0) {
            const newCards: MeetingCard[] = data.cards.map((c: any) => ({
              card_type: c.card_type || 'blue',
              title: c.title || '',
              content: c.content || '',
              source: 'human_query' as const,
              match_score: c.similarity,
              saved: false,
              timestamp: new Date().toISOString()
            }));
            setMeetingCards(prev => [...prev, ...newCards]);
          }
        }
      } catch (err) {
        console.error('[Hybrid] 获取响应失败:', err);
      }
    }
  };
  
  const meetingTimerRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);

  // 实时讨论流（纯增量，不影响现有逻辑）
  const [liveDiscussions, setLiveDiscussions] = useState<Array<{
    type: 'round_header' | 'speech';
    round?: number;
    theme?: string;
    agent?: { name: string; title: string; avatar: string; color: string; systemPrompt?: string };
    message?: string;
    timestamp: string;
  }>>([]);
  const liveDiscussionsEndRef = useRef<HTMLDivElement>(null);

  // 诊断报告
  const [diagnosisReport, setDiagnosisReport] = useState<any>(null);

  // 像素办公室状态
  const [pixelState, setPixelState] = useState({
    activeAgent: 'orchestrator',
    agentStates: Object.keys(PIXEL_AGENTS).reduce((acc, k) => ({ ...acc, [k]: 'idle' }), {} as Record<string, string>),
    detail: '八府巡按，各司其职',
    progress: 0
  });

  // 信息使者状态
  const [messengerInfo, setMessengerInfo] = useState({
    agentName: '通政司',
    agentTitle: '通讯官',
    message: '等待会议开始...',
    progress: 0
  });

  const [meetingSessionId, setMeetingSessionId] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // ===== sessionStorage 持久化：切换页面后返回时恢复状态 =====
  const MEETING_STORAGE_KEY = 'virtual_meeting_state_v2';

  // 启动新会议时：清空旧数据，生成新 sessionId
  // （已在 startMeeting 中通过 setLiveDiscussions([]) 清空状态，sessionStorage 由 useEffect 自动更新）

  // 组件挂载时：从 sessionStorage 恢复状态（如果上次会议尚未结束）
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(MEETING_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.liveDiscussions?.length > 0) setLiveDiscussions(data.liveDiscussions);
        if (data.meetingCards?.length > 0) setMeetingCards(data.meetingCards);
        if (data.pixelState) setPixelState(data.pixelState);
        if (data.messengerInfo) setMessengerInfo(data.messengerInfo);
        if (data.isLoading !== undefined) setIsLoading(data.isLoading);
        if (data.meetingSessionId) setMeetingSessionId(data.meetingSessionId);
        if (data.topic) setTopic(data.topic);
        if (data.meetingResult) setMeetingResult(data.meetingResult);
        if (data.showResults) setShowResults(data.showResults);
        if (data.meetingResult && data.meetingResult.length > 0) {
          setExpandedRounds(new Set([1]));
        }
      }
    } catch (e) {
      console.warn('恢复会议状态失败:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅在挂载时执行一次

  // 状态变化时：自动保存到 sessionStorage（用于页面切换后恢复）
  useEffect(() => {
    try {
      const data = {
        liveDiscussions,
        meetingCards,
        pixelState,
        messengerInfo,
        isLoading,
        meetingSessionId,
        topic,
        meetingResult,
        showResults,
        savedAt: Date.now()
      };
      sessionStorage.setItem(MEETING_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // storage 可能满，忽略
    }
  }, [liveDiscussions, meetingCards, pixelState, messengerInfo, isLoading, meetingSessionId, topic, meetingResult, showResults]);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // 解析 SSE 事件行
  const parseSSE = (text: string): Array<{ event: string; data: any }> => {
    const events: Array<{ event: string; data: any }> = [];
    const blocks = text.split('\n\n').filter(Boolean);
    for (const block of blocks) {
      let eventType = '';
      let dataStr = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventType = line.slice(6).trim();
        if (line.startsWith('data:')) dataStr = line.slice(5).trim();
      }
      if (eventType && dataStr) {
        try { events.push({ event: eventType, data: JSON.parse(dataStr) }); } catch {}
      }
    }
    return events;
  };

  const fetchMeetingHistory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/history`);
      const data = await response.json();
      if (data.success) {
        setMeetingHistory(data.meetings || []);
      }
    } catch (error) {
      console.error('获取历史会议失败:', error);
    }
  };

useEffect(() => {
    if (activeTab === 'new') {
      fetchMeetingHistory();
      // 获取讨论模式
      fetch(`${BACKEND_URL}/modes`).then(r => r.json()).then(d => setMeetingModes(d.modes || [])).catch(console.error);
    } else if (activeTab === 'tasks') {
      fetch(`${BACKEND_URL}/tasks`).then(r => r.json()).then(d => setTaskList(d.tasks || [])).catch(console.error);
      // 同时加载协作历史消息（REST 回退）
      const collabProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      fetch(`${collabProtocol}//${getApiBaseUrl().replace(/^https?:\/\//, '')}/api/activities?limit=30`)
        .then(r => r.json())
        .then(activities => {
          if (Array.isArray(activities) && activities.length > 0) {
            setCollabMessages(activities.map((a: any) => ({
              user: a.user || '未知',
              content: a.content || '',
              self: a.userId === collabUserId.current,
            })));
          }
        })
        .catch(() => {}); // WS 连接后会通过 history 消息补全，静默失败
    }
  }, [activeTab]);

  // Agent ID → 像素办公室 key 的反向映射
  const MEETING_TO_PIXEL: Record<string, string> = Object.fromEntries(
    Object.entries(PIXEL_TO_MEETING).map(([k, v]) => [v, k])
  );

  // 启动会议 —— 使用 SSE 流式接口，实时驱动像素小人
  const startMeeting = async () => {
    if (!topic.trim()) {
      toast.error('请输入会议主题');
      return;
    }

    setIsLoading(true);
    setShowResults(false);
    setMeetingResult(null);
    setLiveDiscussions([]);

    // 初始化像素状态
    setPixelState({
      activeAgent: 'orchestrator',
      agentStates: Object.keys(PIXEL_AGENTS).reduce((acc, k) => ({ ...acc, [k]: 'idle' }), {}),
      detail: '正在连接八府巡按...',
      progress: 0
    });
    setMessengerInfo({ agentName: '锦衣卫', agentTitle: '陆绎', message: '正在召集八府成员...', progress: 0 });

    // 尝试 SSE 流式接口
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`${BACKEND_URL}/discuss/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, context, rounds, mode: meetingMode, image_data: meetingImage }),
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';
      const allRounds: any[] = [];
      let currentRound: any = null;
      let totalAgents = Object.keys(PIXEL_AGENTS).length;
      let speechCount = 0;
      let totalExpected = rounds * totalAgents;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = parseSSE(buffer);
        // 保留未完成的最后一块
        const lastDoubleNewline = buffer.lastIndexOf('\n\n');
        buffer = lastDoubleNewline >= 0 ? buffer.slice(lastDoubleNewline + 2) : buffer;

        for (const evt of events) {
          switch (evt.event) {
            case 'meeting_start':
              setPixelState(prev => ({ ...prev, detail: '八府巡按会议开始！', progress: 5 }));
              setMessengerInfo({ agentName: '锦衣卫', agentTitle: '陆绎', message: '八府巡按会议正式开始！', progress: 5 });
              break;

            case 'round_start':
              currentRound = { round: evt.data.round, title: evt.data.theme, discussions: [], cards: [] };
              setPixelState(prev => ({ ...prev, detail: `第${evt.data.round}轮: ${evt.data.theme}` }));
              setMessengerInfo(prev => ({ ...prev, message: `第${evt.data.round}轮讨论开始: ${evt.data.theme}` }));
              // 实时讨论流：添加轮次标题
              setLiveDiscussions(prev => [...prev, {
                type: 'round_header',
                round: evt.data.round,
                theme: evt.data.theme,
                timestamp: evt.data.timestamp || new Date().toISOString()
              }]);
              break;

            case 'agent_speaking': {
              const pixelKey = evt.data.pixel_id || MEETING_TO_PIXEL[evt.data.agent_id] || 'orchestrator';
              setPixelState(prev => ({
                ...prev,
                activeAgent: pixelKey,
                agentStates: { ...prev.agentStates, [pixelKey]: 'executing' },
                detail: `${evt.data.agent_name} 正在思考...`
              }));
              setMessengerInfo(prev => ({
                ...prev,
                agentName: evt.data.agent_name || '通政司',
                agentTitle: PIXEL_AGENTS[pixelKey]?.cnName || '通讯官',
                message: `${evt.data.agent_name} 正在发言...`
              }));
              break;
            }

            case 'agent_speech': {
              speechCount++;
              const progress = Math.round((speechCount / totalExpected) * 90) + 5;
              const pixelKey2 = evt.data.pixel_id || MEETING_TO_PIXEL[evt.data.agent_id] || 'orchestrator';

              // 该 Agent 发言完毕，切换为 syncing
              setPixelState(prev => ({
                ...prev,
                agentStates: { ...prev.agentStates, [pixelKey2]: 'syncing' },
                detail: `${evt.data.agent_name}: ${(evt.data.speech || '').slice(0, 18)}...`,
                progress
              }));
              setMessengerInfo(prev => ({
                ...prev,
                message: `${evt.data.agent_name}: ${(evt.data.speech || '').slice(0, 30)}...`,
                progress
              }));

              if (currentRound) {
                currentRound.discussions.push({
                  agent: {
                    name: evt.data.agent_name,
                    title: evt.data.agent_title,
                    avatar: evt.data.avatar,
                    color: AGENT_MAPPING[evt.data.agent_id]?.color || 'from-gray-500 to-gray-600',
                    systemPrompt: evt.data.system_prompt
                  },
                  message: evt.data.speech,
                  timestamp: evt.data.timestamp
                });
              }
              // 实时讨论流：添加发言
              setLiveDiscussions(prev => [...prev, {
                type: 'speech',
                agent: {
                  name: evt.data.agent_name,
                  title: evt.data.agent_title,
                  avatar: evt.data.avatar,
                  color: AGENT_MAPPING[evt.data.agent_id]?.color || 'from-gray-500 to-gray-600',
                  systemPrompt: evt.data.system_prompt
                },
                message: evt.data.speech,
                timestamp: evt.data.timestamp || new Date().toISOString()
              }]);
              break;
            }

            case 'agent_cards': {
              // 处理 Agent 发言中提取的四色卡片
              const { agent_name, round: cardRound, cards: extractedCards } = evt.data;
              if (extractedCards && extractedCards.length > 0) {
                const newCards: MeetingCard[] = extractedCards.map((c: any) => ({
                  card_type: c.card_type || 'blue',
                  title: c.title || '',
                  content: c.content || '',
                  source: 'agent_extracted' as const,
                  agent_name: agent_name || '',
                  round: cardRound || 1,
                  saved: false,
                  timestamp: new Date().toISOString()
                }));
                setMeetingCards(prev => [...prev, ...newCards]);
                // 同步写入 currentRound.cards，以便会议结果中展示真实卡片
                if (currentRound) {
                  currentRound.cards = [
                    ...currentRound.cards,
                    ...extractedCards.map((c: any) => ({ type: c.card_type, title: c.title, content: c.content }))
                  ];
                }
              }
              break;
            }

            case 'round_end':
              if (currentRound) {
                allRounds.push(currentRound);
                currentRound = null;
              }
              // 轮次结束，所有 Agent 短暂归位
              setPixelState(prev => ({
                ...prev,
                agentStates: Object.keys(PIXEL_AGENTS).reduce((acc, k) => ({ ...acc, [k]: 'idle' }), {}),
                detail: `第${evt.data.round}轮讨论完成`
              }));
              break;

            case 'meeting_decision':
              // 保存决策结果
              allRounds.push({
                summary: evt.data.summary,
                decision: evt.data.decision,
                actionItems: evt.data.action_items,
                round: allRounds.length + 1,
                theme: '最终决策'
              });
              setPixelState(prev => ({ ...prev, detail: '指挥使正在做最终裁决...', progress: 95 }));
              setMessengerInfo(prev => ({ ...prev, agentName: '指挥使', agentTitle: '总指挥', message: '正在生成最终决策...', progress: 95 }));
              break;

            case 'diagnosis':
              // 保存诊断报告
              setDiagnosisReport(evt.data);
              setMessengerInfo(prev => ({ ...prev, message: '诊断报告已生成', progress: 98 }));
              break;

            case 'meeting_end':
              // 会议结束 - 所有 Agent 归位
              setPixelState({
                activeAgent: 'orchestrator',
                agentStates: Object.keys(PIXEL_AGENTS).reduce((acc, k) => ({ ...acc, [k]: 'idle' }), {}),
                detail: '八府巡按会议圆满完成！',
                progress: 100
              });
              setMessengerInfo({ agentName: '驿传司', agentTitle: '传令官', message: '八府巡按会议已圆满完成！', progress: 100 });

              // 如果最后一轮还没 push
              if (currentRound) {
                allRounds.push(currentRound);
                currentRound = null;
              }

              setMeetingResult(allRounds);
              setIsLoading(false);
              setShowResults(true);
              setExpandedRounds(new Set([1]));
              toast.success('八府巡按会议已完成！');
              break;
          }
        }
      }

      // 如果流正常结束但没收到 meeting_end（兜底）
      if (allRounds.length > 0 && !showResults) {
        if (currentRound) allRounds.push(currentRound);
        setMeetingResult(allRounds);
        setIsLoading(false);
        setShowResults(true);
        setExpandedRounds(new Set([1]));
        setPixelState(prev => ({ ...prev, detail: '会议完成', progress: 100 }));
      }

      abortControllerRef.current = null;
      return;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Meeting SSE aborted by user');
        return;
      }
      console.error('SSE stream error:', error);
      
      // SSE 断开时：如果有累积的数据，也要显示结果
      if (allRounds.length > 0 || meetingCards.length > 0) {
        console.log('[Meeting] SSE断开，但有累积数据，显示结果');
        
        // 将 currentRound 也加入（如果还没加入）
        if (currentRound) {
          allRounds.push(currentRound);
          currentRound = null;
        }
        
        // 如果 allRounds 为空但有 meetingCards，创建一个包含卡片的虚拟轮次
        if (allRounds.length === 0 && meetingCards.length > 0) {
          allRounds.push({
            round: 1,
            title: '会议结果',
            theme: '会议结果',
            discussions: [],
            cards: meetingCards.map((c: MeetingCard) => ({
              type: c.card_type,
              title: c.title,
              content: c.content
            }))
          });
        }
        
        setMeetingResult([...allRounds]);
        setIsLoading(false);
        setShowResults(true);
        setExpandedRounds(new Set([1]));
        setPixelState(prev => ({ ...prev, detail: '会议已断开（数据已保存）', progress: 100 }));
        toast.error('SSE连接已断开，但已显示累积的会议数据');
      }
    }

    abortControllerRef.current = null;

    // SSE 不可用 → 降级到本地模拟动画
    toast.warning('后端服务未启动，使用本地模拟模式');
    let stepIndex = 0;
    meetingTimerRef.current = setInterval(() => {
      if (stepIndex < MEETING_STEPS.length) {
        const step = MEETING_STEPS[stepIndex];
        const progress = Math.round(((stepIndex + 1) / MEETING_STEPS.length) * 100);
        setPixelState(prev => ({
          ...prev,
          activeAgent: step.agent,
          agentStates: { ...prev.agentStates, [step.agent]: step.state },
          detail: step.detail,
          progress
        }));
        const agentInfo = PIXEL_AGENTS[step.agent];
        setMessengerInfo({
          agentName: agentInfo?.name || '通政司',
          agentTitle: agentInfo?.cnName || '通讯官',
          message: step.detail,
          progress
        });
        stepIndex++;
      } else {
        clearInterval(meetingTimerRef.current);
        meetingTimerRef.current = null;
        const mockResult = generateMockDiscussion(topic, rounds);
        setMeetingResult(mockResult);
        setIsLoading(false);
        setShowResults(true);
        setExpandedRounds(new Set([1]));
        toast.success('八府巡按会议已完成！');
      }
    }, 1500);
  };

  // 停止会议
  const stopMeeting = () => {
    // 中断 SSE 连接
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (meetingTimerRef.current) {
      clearInterval(meetingTimerRef.current);
      meetingTimerRef.current = null;
    }
    stopPolling();
    setIsLoading(false);
    setPixelState(prev => ({
      ...prev,
      activeAgent: 'orchestrator',
      detail: '会议已停止',
      progress: 0,
      agentStates: Object.keys(PIXEL_AGENTS).reduce((acc, k) => ({ ...acc, [k]: 'idle' }), {})
    }));
    setMessengerInfo({
      agentName: '通政司',
      agentTitle: '通讯官',
      message: '会议已停止',
      progress: 0
    });
    toast.info('会议已停止');
  };

  // 重置会议
  const resetMeeting = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (meetingTimerRef.current) clearInterval(meetingTimerRef.current);
    stopPolling();
    setTopic('');
    setContext('');
    setDeliverable('');
    setRounds(3);
    setMeetingImage(null);
    setMeetingResult(null);
    setExpandedRounds(new Set());
    setShowResults(false);
    setIsLoading(false);
    setLiveDiscussions([]);
    setPixelState({
      activeAgent: 'orchestrator',
      agentStates: Object.keys(PIXEL_AGENTS).reduce((acc, k) => ({ ...acc, [k]: 'idle' }), {}),
      detail: '八府巡按，各司其职',
      progress: 0
    });
    setMessengerInfo({
      agentName: '通政司',
      agentTitle: '通讯官',
      message: '等待会议开始...',
      progress: 0
    });
    toast.info('会议已重置');
  };

  // 保存到任务归档
  const saveToArchive = async () => {
    if (!meetingResult || meetingResult.length === 0) return;
    
    const summary = meetingResult[meetingResult.length - 1]?.summary || '';
    const decision = meetingResult[meetingResult.length - 1]?.decision || '';
    const actionItems = meetingResult[meetingResult.length - 1]?.actionItems || [];
    
    const taskContent = `【会议主题】${topic}
【背景】${context || '无'}
【讨论轮数】${meetingResult.length}轮

【总结】
${summary}

【决策】
${decision}

【行动项】
${actionItems.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n')}

【详细讨论】
${(meetingResult || []).slice(0, -1).map((round: any, i: number) => 
  `--- 第${i + 1}轮 (${round.theme}) ---\n${round.speeches?.map((s: any) => `【${s.agent_name}】${s.speech}`).join('\n')}`
).join('\n\n')}`;

    try {
      await gtdTaskService.add({
        title: `会议纪要: ${topic}`,
        description: taskContent,
        category: 'archive',
        priority: 'medium'
      });
      toast.success('会议记录已保存到任务归档');
    } catch (error) {
      console.error('保存归档失败:', error);
      toast.error('保存归档失败，请重试');
    }
  };

  const toggleRound = (round: number) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round); else next.add(round);
      return next;
    });
  };

  // 计算活跃数量
  const workingCount = Object.values(pixelState.agentStates).filter(s => s !== 'idle' && s !== 'error').length;

  // 实时讨论自动滚动到底部
  useEffect(() => {
    if (liveDiscussionsEndRef.current) {
      liveDiscussionsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveDiscussions]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (meetingTimerRef.current) clearInterval(meetingTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      stopPolling();
    };
  }, []);

  // 协作聊天 WebSocket 连接
  useEffect(() => {
    // 始终连接（不只是 tasks tab）
    const userId = collabUserId.current;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiBase = getApiBaseUrl().replace(/^https?:\/\//, ''); // 去掉协议前缀 http:// 或 https://
    const url = `${protocol}//${apiBase}/api/ws/collaboration/${userId}`;
    
    console.log('[Collab] 连接 WebSocket:', url);
    setCollabStatus('connecting');
    
    const ws = new WebSocket(url);
    collabWsRef.current = ws;
    
    ws.onopen = () => {
      console.log('[Collab] WebSocket 已连接');
      setCollabStatus('connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_activity' && msg.activity) {
          const isSelf = msg.activity.userId === userId;
          setCollabMessages(prev => [...prev, {
            user: msg.activity.user || '未知',
            content: msg.activity.content || '',
            self: isSelf
          }]);
          // 如果有会议进行中，也显示到实时讨论区
          if (isLoading && msg.activity.action === '发言') {
            setLiveDiscussions(prev => [...prev, {
              type: 'speech',
              agent: { name: msg.activity.user, title: '人类参与者', avatar: '👤', color: 'from-green-500 to-green-600' },
              message: msg.activity.content,
              timestamp: new Date().toISOString()
            }]);
          }
        } else if (msg.type === 'history' && msg.activities) {
          // 连接后推送的历史数据（刷新后恢复记录）
          console.log(`[Collab] 收到历史数据: ${msg.activities.length} 条活动`);
          if (msg.activities.length > 0) {
            setCollabMessages(msg.activities.map((a: any) => ({
              user: a.user || '未知',
              content: a.content || '',
              self: a.userId === userId,
            })));
          }
        }
      } catch (e) {
        console.error('[Collab] 解析消息失败:', e);
      }
    };
    
    ws.onclose = () => {
      console.log('[Collab] WebSocket 断开');
      setCollabStatus('disconnected');
    };
    
    ws.onerror = (e) => {
      console.error('[Collab] WebSocket 错误:', e);
    };
    
    return () => {
      ws.close();
      collabWsRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-auto" style={{ background: '#121826' }}>
      {/* ==================== 页面标题区 ==================== */}
      <div className="px-3 md:px-6 py-3 md:py-5 border-b border-gray-800">
        <div className="flex items-center gap-3 flex-wrap">
          <Crown className="w-7 h-7 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">八府巡按 · 智能协作会议</h1>
            <p className="text-sm text-gray-500">8-Agent Collaborative Intelligence System</p>
          </div>
        </div>
      </div>

      {/* ==================== 主内容区：左右分栏 ==================== */}
      <div className="flex flex-col lg:flex-row gap-5 p-5" style={{ height: 'calc(100vh - 90px)' }}>

        {/* ========== 左侧栏 35% ========== */}
        <div className="w-full lg:w-[35%] lg:min-w-[340px] flex flex-col gap-5 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>

          {/* 模块1: 会议配置 */}
          <div className="rounded-xl border border-gray-700/50" style={{ background: '#1a2235' }}>
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-700/50">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium text-sm">会议配置</span>
            </div>
            <div className="p-5 space-y-4">
              {/* 会议主题 */}
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">会议主题 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="输入会议讨论的核心议题..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 border border-gray-600/50 focus:border-blue-500 focus:outline-none transition-colors"
                  style={{ background: '#0f1729' }}
                />
              </div>

              {/* 会议成果 */}
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">会议成果</label>
                <input
                  type="text"
                  value={deliverable}
                  onChange={e => setDeliverable(e.target.value)}
                  placeholder="期望的会议产出..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 border border-gray-600/50 focus:border-blue-500 focus:outline-none transition-colors"
                  style={{ background: '#0f1729' }}
                />
              </div>

              {/* 背景资料 */}
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">背景资料</label>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="提供相关背景信息、数据或参考资料，帮助 Agent 更好地理解议题..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 border border-gray-600/50 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  style={{ background: '#0f1729' }}
                />
              </div>

              {/* 图片上传 - 视觉分析 */}
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">📎 参考图片（可选）</label>
                {meetingImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-600/50" style={{ background: '#0f1729' }}>
                    <img
                      src={`data:image/jpeg;base64,${meetingImage}`}
                      alt="上传的参考图片"
                      className="w-full h-32 object-cover"
                    />
                    <button
                      onClick={() => setMeetingImage(null)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="px-2 py-1 text-xs text-green-400 flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      视觉模型将分析此图片
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-20 rounded-lg border-2 border-dashed border-gray-600/50 hover:border-blue-500/50 cursor-pointer transition-colors" style={{ background: '#0f1729' }}>
                    <Monitor className="w-5 h-5 text-gray-500 mb-1" />
                    <span className="text-xs text-gray-500">点击上传图片，密卷房将用视觉模型分析</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('图片大小不能超过10MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const base64 = (reader.result as string).split(',')[1];
                            setMeetingImage(base64);
                            toast.success('图片已上传，会议中将由视觉模型分析');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* 讨论轮次 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-300">讨论轮次</label>
                  <span className="text-sm text-blue-400 font-medium">{rounds} 轮</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={rounds}
                  onChange={e => setRounds(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 ${(rounds - 1) * 25}%, #374151 ${(rounds - 1) * 25}%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1轮</span><span>2轮</span><span>3轮</span><span>4轮</span><span>5轮</span>
                </div>
              </div>

              {/* 讨论模式选择 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-300">讨论模式</label>
                  <span className="text-sm text-purple-400 font-medium">
                    {meetingModes.find(m => m.id === meetingMode)?.name || meetingMode}
                  </span>
                </div>
                <select
                  value={meetingMode}
                  onChange={e => setMeetingMode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white border border-gray-600/50 focus:border-purple-500 focus:outline-none transition-colors"
                  style={{ background: '#0f1729' }}
                >
                  {meetingModes.map(mode => (
                    <option key={mode.id} value={mode.id} className="text-white">
                      {mode.name} - {mode.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* 参与者模式 */}
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#0f1729' }}>
                <div>
                  <div className="text-white text-sm font-medium">混合会议模式</div>
                  <div className="text-gray-500 text-xs">开启后人类可实时参与讨论</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hybridMode}
                    onChange={(e) => setHybridMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-1">
                {!isLoading ? (
                  <button
                    onClick={startMeeting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                  >
                    <Play className="w-4 h-4" />
                    开始会议
                  </button>
                ) : (
                  <button
                    onClick={stopMeeting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                  >
                    <Square className="w-4 h-4" />
                    停止会议
                  </button>
                )}
                <button
                  onClick={resetMeeting}
                  className="p-2.5 rounded-lg border border-gray-600/50 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                  style={{ background: '#0f1729' }}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 模块2: 八府成员 */}
          <div className="rounded-xl border border-gray-700/50" style={{ background: '#1a2235' }}>
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-700/50">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium text-sm">八府成员</span>
              <span className="text-xs text-gray-500 ml-auto">({workingCount}/8 活跃)</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {Object.entries(PIXEL_AGENTS).map(([key, agent]) => {
                const state = pixelState.agentStates[key] || 'idle';
                const isActive = key === pixelState.activeAgent && state !== 'idle';
                const stateColor = PIXEL_STATE_COLORS[state];
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${
                      isActive
                        ? 'border-green-500/40'
                        : 'border-transparent'
                    }`}
                    style={{ background: isActive ? '#0f1729' : 'transparent' }}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: agent.color }}
                    >
                      {agent.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-xs font-medium truncate">{agent.name}</div>
                      <div className="text-gray-500 text-[10px] truncate">{agent.cnName}</div>
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ color: stateColor, background: `${stateColor}18` }}
                    >
                      {PIXEL_STATE_NAMES[state]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========== 右侧栏 65% ========== */}
        <div className="flex-1 flex flex-col gap-5 min-w-0 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('new')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              新建会议
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              历史会议
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              团队协作
            </button>
          </div>

          {activeTab === 'history' && (
            <div className="rounded-xl border border-gray-700/50" style={{ background: '#1a2235' }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-700/50">
                <History className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium text-sm">历史会议记录</span>
                <span className="text-gray-500 text-xs ml-auto">{meetingHistory.length} 条</span>
              </div>
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                {meetingHistory.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-8">暂无历史会议记录</div>
                ) : (
                  meetingHistory.map((meeting: any) => (
                    <div
                      key={meeting.meeting_id}
                      onClick={() => setSelectedMeeting(selectedMeeting?.meeting_id === meeting.meeting_id ? null : meeting)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedMeeting?.meeting_id === meeting.meeting_id ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700/50 hover:border-gray-600'
                      }`}
                      style={{ background: '#0f1729' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">{meeting.topic}</div>
                          <div className="flex items-center gap-3 mt-1.5 text-gray-500 text-xs">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {meeting.start_time ? new Date(meeting.start_time).toLocaleDateString('zh-CN') : '-'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {meeting.duration_seconds ? `${Math.round(meeting.duration_seconds / 60)}分钟` : '-'}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {meeting.rounds}轮
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedMeeting?.meeting_id === meeting.meeting_id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pt-4 border-t border-gray-700/50"
                        >
                          {meeting.summary && (
                            <div className="mb-3">
                              <div className="text-gray-400 text-xs mb-1">会议总结</div>
                              <div className="text-gray-300 text-sm">{meeting.summary}</div>
                            </div>
                          )}
                          {meeting.decision && (
                            <div className="mb-3">
                              <div className="text-gray-400 text-xs mb-1">决策</div>
                              <div className="text-green-400 text-sm">{meeting.decision}</div>
                            </div>
                          )}
                          {meeting.action_items && meeting.action_items.length > 0 && (
                            <div>
                              <div className="text-gray-400 text-xs mb-1">行动项</div>
                              <ul className="space-y-1">
                                {meeting.action_items.map((item: string, idx: number) => (
                                  <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                                    <span className="text-blue-400">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="rounded-xl border border-gray-700/50 flex flex-col" style={{ background: '#1a2235', minHeight: '0', flex: '1 1 0' }}>
              {/* 任务列表区 */}
              <div className="px-5 py-3 border-b border-gray-700/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-medium text-sm">团队协作</span>
                  <span className="text-gray-500 text-xs ml-auto">{taskList.length} 个任务</span>
                </div>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto flex-shrink-0" style={{ maxHeight: '220px', scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                {taskList.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-4">暂无协作任务</div>
                ) : (
                  taskList.map((task: any) => (
                    <div key={task.id} className="p-4 rounded-lg border border-gray-700/50" style={{ background: '#0f1729' }}>
                      <div className="flex items-center justify-between">
                        <div className="text-white font-medium">{task.title}</div>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待处理'}
                        </span>
                      </div>
                      <div className="mt-2 text-gray-400 text-sm">{task.description}</div>
                    </div>
                  ))
                )}
              </div>
              {/* 实时讨论区 —— 沉底，占满剩余空间 */}
              <div className="border-t border-gray-700/50 flex flex-col flex-1 min-h-0" style={{ marginTop: 'auto' }}>
                {/* 讨论头部 */}
                <div className="px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300 text-sm font-medium">实时讨论</span>
                  <input
                    id="collab-username"
                    type="text"
                    placeholder="你的名字"
                    value={collabUserName}
                    onChange={(e) => {
                      setCollabUserName(e.target.value);
                      localStorage.setItem('collabUserName', e.target.value);
                    }}
                    className="ml-2 w-24 bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                  <span className={`ml-auto text-xs ${
                    collabStatus === 'connected' ? 'text-green-400' :
                    collabStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {collabStatus === 'connected' ? '✓ 已连接' :
                     collabStatus === 'connecting' ? '连接中...' : '✗ 断开'}
                  </span>
                </div>
                {/* 消息列表 —— 自动填充剩余高度 */}
                <div className="flex-1 overflow-y-auto px-4 space-y-2 text-sm min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                  {collabMessages.length === 0 ? (
                    <div className="text-gray-400 text-xs text-center py-6">
                      {collabStatus === 'connected' ? '开始聊天吧' : '连接中...'}
                    </div>
                  ) : (
                    collabMessages.map((msg, idx) => (
                      <div key={idx} className={`p-2 rounded ${msg.self ? 'bg-blue-900/30' : 'bg-gray-800/50'}`}>
                        <span className={msg.self ? 'text-blue-300 font-bold' : 'text-blue-400'}>
                          {msg.user}:
                        </span>
                        <span className="text-white ml-1">{msg.content}</span>
                      </div>
                    ))
                  )}
                </div>
                {/* 输入框 —— 始终在底部 */}
                <div className="px-4 py-3 flex gap-2 flex-shrink-0 border-t border-gray-700/30">
                  <input
                    id="collab-input"
                    type="text"
                    placeholder="输入消息... (回车发送)"
                    className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && collabWsRef.current) {
                        const msg = (e.target as HTMLInputElement).value.trim();
                        if (msg) {
                          collabWsRef.current.send(JSON.stringify({
                            type: 'send_activity',
                            user: collabUserName,
                            userId: collabUserId.current,
                            avatar: '👤',
                            action: '发言',
                            content: msg
                          }));
                          setCollabMessages(prev => [...prev, { user: collabUserName, content: msg, self: true }]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('collab-input') as HTMLInputElement;
                      const msg = input?.value.trim();
                      if (msg && collabWsRef.current) {
                        collabWsRef.current.send(JSON.stringify({
                          type: 'send_activity',
                          user: collabUserName,
                          userId: collabUserId.current,
                          avatar: '👤',
                          action: '发言',
                          content: msg
                        }));
                        setCollabMessages(prev => [...prev, { user: collabUserName, content: msg, self: true }]);
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex-shrink-0"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'new' && (
            <>
              <div className="rounded-xl border border-gray-700/50 flex-shrink-0" style={{ background: '#1a2235' }}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-medium text-sm">像素办公室</span>
                  </div>
              <div className="flex items-center gap-3">
                <span className="text-white text-xs">进度: {pixelState.progress}%</span>
                <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: '#0f1729' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)' }}
                    animate={{ width: `${pixelState.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
            <PixelOfficeCanvas pixelState={pixelState} />
          </div>

          {/* 模块2: 信息使者 */}
          <div className="rounded-xl border border-gray-700/50 flex-shrink-0" style={{ background: '#1a2235' }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#2ecc7125' }}>
                  <MessageSquare className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="text-white text-sm font-medium">
                    信息使者 <span className="text-gray-500 font-normal">|</span> <span className="text-green-400">{messengerInfo.agentName}</span>
                    <span className="text-gray-500 text-xs ml-1">· {messengerInfo.agentTitle}</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">{messengerInfo.message}</div>
                </div>
              </div>
              <span className="text-white text-lg font-bold">{messengerInfo.progress}%</span>
            </div>
          </div>

{/* 实时讨论流面板 —— 会议进行中实时显示各Agent发言 */}
          {(isLoading || liveDiscussions.length > 0) && !showResults && (
            <div className="rounded-xl border border-gray-700/50 flex flex-col" style={{ background: '#1a2235', maxHeight: '580px' }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-700/50 flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium text-sm">实时讨论</span>
                <span className="text-gray-500 text-xs ml-auto">
                  {liveDiscussions.filter(d => d.type === 'speech').length} 条发言
                </span>
                {isLoading && (
                  <span className="flex items-center gap-1.5 text-green-400 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    进行中
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                {liveDiscussions.length === 0 && isLoading && (
                  <div className="text-gray-500 text-sm text-center py-4">等待 Agent 发言...</div>
                )}
                {liveDiscussions.map((item, idx) => {
                  if (item.type === 'round_header') {
                    return (
                      <div key={idx} className="flex items-center gap-2 py-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
                          {item.round}
                        </div>
                        <span className="text-blue-400 text-xs font-medium">第{item.round}轮 · {item.theme}</span>
                        <div className="flex-1 h-px bg-gray-700/50" />
                      </div>
                    );
                  }
                  const isHuman = item.agent?.avatar === '👤';
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${isHuman ? 'from-green-500 to-green-600' : (item.agent?.color || 'from-gray-500 to-gray-600')} flex items-center justify-center text-sm flex-shrink-0`}>
                        {item.agent?.avatar || '💬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-xs font-medium">{item.agent?.name}</span>
                          <span className="text-gray-500 text-[10px]">{item.agent?.title}</span>
                        </div>
                        {item.agent?.systemPrompt && (
                          <div className="text-gray-400 text-xs mb-0.5 truncate">
                            {item.agent.systemPrompt}
                          </div>
                        )}
                        {(() => {
                          const msg = item.message || '';
                          try {
                            const trimmed = msg.trim();
                            if (trimmed.startsWith('[')) {
                              const parsed = JSON.parse(trimmed);
                              if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((item: any) => typeof item === 'object' && item !== null && 'color' in item && 'content' in item)) {
                                const colorMap: Record<string, string> = { red: '#ef4444', green: '#22c55e', blue: '#3b82f6', yellow: '#eab308', gold: '#f59e0b', purple: '#a855f7', orange: '#f97316' };
                                return (
                                  <div className="space-y-1.5">
                                    {parsed.map((c: any, i: number) => (
                                      <div key={i} className="rounded p-2 text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderLeft: `3px solid ${colorMap[c.color] || '#6b7280'}`, color: '#e5e7eb' }}>
                                        {c.content}
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                            }
                          } catch {}
                          return <p className="text-gray-100 text-sm leading-relaxed">{msg}</p>;
                        })()}
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={liveDiscussionsEndRef} />
                {/* 会议中积累的知识卡片 */}
                <MeetingCardPanel
                  cards={meetingCards}
                  onSaveCard={(card) => {
                    setSaveTargetCard(card);
                    setSaveModalOpen(true);
                  }}
                />
              </div>
{/* 人类发言入口 */}
              <div className="border-t border-gray-700/50 px-4 py-3 flex gap-2 items-center flex-shrink-0">
                <span className="text-green-400 text-xs font-medium whitespace-nowrap">
                  {collabUserName}:
                </span>
                <input
                  id="meeting-human-input"
                  type="text"
                  placeholder="输入你的发言，回车发送（会被智能体感知）"
                  className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const msg = (e.target as HTMLInputElement).value.trim();
                      if (msg) {
                        sendHumanMessage(msg);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('meeting-human-input') as HTMLInputElement;
                    const msg = input?.value.trim();
                    if (msg) {
                      sendHumanMessage(msg);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  发言
                </button>
              </div>
            </div>
          )}

          {/* 会议结果区域 */}
          <AnimatePresence>
            {showResults && meetingResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="rounded-xl border border-gray-700/50 flex-shrink-0"
                style={{ background: '#1a2235' }}
              >
                {/* 结果头部 */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-white font-medium text-sm">会议纪要</span>
                    <span className="text-gray-500 text-xs">· {(meetingResult || []).length} 轮讨论</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveToArchive}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-300 border border-gray-600/50 hover:border-gray-500 hover:text-white transition-colors"
                      style={{ background: '#0f1729' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      保存归档
                    </button>
                    <button
                      onClick={() => setSimplifiedView(!simplifiedView)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        simplifiedView 
                          ? 'bg-blue-600 text-white border-blue-500' 
                          : 'text-gray-300 border-gray-600/50 hover:border-gray-500 hover:text-white'
                      }`}
                      style={{ background: simplifiedView ? undefined : '#0f1729' }}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      {simplifiedView ? '完整视图' : '简化视图'}
                    </button>
                    <button
                      onClick={resetMeeting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-300 border border-gray-600/50 hover:border-gray-500 hover:text-white transition-colors"
                      style={{ background: '#0f1729' }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      新会议
                    </button>
                  </div>
                </div>

                {/* 讨论轮次 - 完整视图 */}
                {!simplifiedView && (
                  <div className="p-4 space-y-3">
                    {(meetingResult || []).map((round: any) => (
                    <div key={round.round} className="rounded-lg border border-gray-700/40 overflow-hidden">
                      {/* 轮次标题 */}
                      <button
                        onClick={() => toggleRound(round.round)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                        style={{ background: '#0f1729' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
                          >
                            {round.round}
                          </div>
                          <span className="text-white text-sm font-medium">{round.title}</span>
                          <span className="text-gray-500 text-xs">{(round.discussions || []).length} 条发言</span>
                        </div>
                        {expandedRounds.has(round.round)
                          ? <ChevronUp className="w-4 h-4 text-gray-500" />
                          : <ChevronDown className="w-4 h-4 text-gray-500" />
                        }
                      </button>

                      {/* 展开内容 */}
                      <AnimatePresence>
                        {expandedRounds.has(round.round) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                              <div className="p-4 space-y-3">
                                {(round.discussions || []).map((disc: any, idx: number) => (
                                 <div key={idx} className="flex gap-3">
                                   <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${disc.agent.color} flex items-center justify-center text-lg flex-shrink-0`}>
                                     {disc.agent.avatar}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2 mb-1">
                                       <span className="text-white text-sm font-medium">{disc.agent.name}</span>
                                       <span className="text-gray-500 text-xs">{disc.agent.title}</span>
                                     </div>
                                     {disc.agent.systemPrompt && (
                                       <div className="text-gray-500 text-[10px] mb-0.5 truncate">
                                         {disc.agent.systemPrompt}
                                       </div>
                                     )}
                                     <p className="text-gray-300 text-sm leading-relaxed">{disc.message}</p>
                                   </div>
                                 </div>
                               ))}
                            </div>

                            {/* 卡片 */}
                            {round.cards && round.cards.length > 0 && (
                              <div className="grid grid-cols-2 gap-2.5 px-4 pb-4 pt-2 border-t border-gray-700/30 mx-4">
                                {round.cards.map((card: any, idx: number) => {
                                  const cardType = CARD_TYPE_MAP[card.type as keyof typeof CARD_TYPE_MAP];
                                  return (
                                    <div key={idx} className={`p-3 rounded-lg ${cardType?.color || 'bg-gray-800 border border-gray-700'}`}>
                                      <div className="flex items-center gap-1.5 mb-1">
                                        {cardType?.icon}
                                        <span className="text-white font-medium text-xs">{card.title}</span>
                                      </div>
                                      <p className="text-gray-400 text-xs">{card.content}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
                )}

                {/* 简化视图：关键结论 */}
                {simplifiedView && showResults && meetingResult && meetingResult.length > 0 && (
                  <div className="p-4 space-y-4">
                    {/* 最终决策 */}
                    {meetingResult[meetingResult.length - 1]?.title && (
                      <div className="rounded-lg border border-green-700/50 p-4" style={{ background: '#0f1729' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm font-medium">最终结论</span>
                        </div>
                        <div className="text-white text-sm font-medium mb-1">{meetingResult[meetingResult.length - 1].title}</div>
                        <div className="text-gray-400 text-xs">
                          共 {meetingResult.length} 轮讨论，产生 {(meetingResult[meetingResult.length - 1].discussions || []).length} 条观点
                        </div>
                      </div>
                    )}

                    {/* 行动项汇总 */}
                    {diagnosisReport && diagnosisReport.diagnosis_report && (
                      <div className="rounded-lg border border-blue-700/50 p-4" style={{ background: '#0f1729' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-sm font-medium">决策摘要</span>
                        </div>
                        <p className="text-gray-300 text-xs">{diagnosisReport.diagnosis_report}</p>
                      </div>
                    )}

                    {/* 共识点 */}
                    {diagnosisReport && diagnosisReport.consensus && diagnosisReport.consensus.length > 0 && (
                      <div className="rounded-lg border border-green-700/50 p-4" style={{ background: '#0f1729' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-green-400">✓</span>
                          <span className="text-green-400 text-sm font-medium">共识达成</span>
                        </div>
                        <ul className="space-y-1">
                          {diagnosisReport.consensus.slice(0, 3).map((item: string, idx: number) => (
                            <li key={idx} className="text-gray-300 text-xs flex items-start gap-2">
                              <span className="text-green-500">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 核心卡片 */}
                    {meetingCards.length > 0 && (
                      <div className="rounded-lg border border-purple-700/50 p-4" style={{ background: '#0f1729' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-purple-400">📋</span>
                          <span className="text-purple-400 text-sm font-medium">核心知识卡片</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {meetingCards.slice(0, 4).map((card: MeetingCard, idx: number) => {
                            const cardType = CARD_TYPE_MAP[card.card_type as keyof typeof CARD_TYPE_MAP];
                            return (
                              <div key={idx} className={`p-2 rounded ${cardType?.color || 'bg-gray-800 border border-gray-700'}`}>
                                <div className="text-white text-xs font-medium truncate">{card.title}</div>
                                <div className="text-gray-400 text-[10px] truncate mt-0.5">{card.content}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            )}

            {/* 诊断报告区域 */}
            {showResults && diagnosisReport && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-purple-700/50 flex-shrink-0"
                style={{ background: '#1a2235' }}
              >
                <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-700/50">
                  <Crown className="w-4 h-4 text-purple-500" />
                  <span className="text-white font-medium text-sm">多视角分析报告</span>
                </div>
                <div className="p-4 space-y-4">
                  {/* 共识 */}
                  {(diagnosisReport.consensus || []).length > 0 && (
                    <div>
                      <div className="text-green-400 text-xs font-medium mb-2">✓ 共识点</div>
                      <ul className="space-y-1">
                        {(diagnosisReport.consensus || []).map((item: string, idx: number) => (
                          <li key={`consensus-${idx}`} className="text-gray-300 text-xs flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* 分歧 */}
                  {(diagnosisReport.divergence || []).length > 0 && (
                    <div>
                      <div className="text-yellow-400 text-xs font-medium mb-2">⚠ 分歧点</div>
                      <ul className="space-y-2">
                        {(diagnosisReport.divergence || []).map((item: any, idx: number) => (
                          <li key={`div-${idx}`} className="text-gray-300 text-xs">
                            <div className="text-yellow-500">{item.issue}</div>
                            <div className="ml-3 text-gray-500">
                              {Object.entries(item.views || {}).map(([agent, view]: [string, any]) => (
                                <div key={`div-${idx}-${agent}`}>• {agent}: {view}</div>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* 独家观点 */}
                  {(diagnosisReport.unique || []).length > 0 && (
                    <div>
                      <div className="text-blue-400 text-xs font-medium mb-2">💡 独家观点</div>
                      <ul className="space-y-1">
                        {(diagnosisReport.unique || []).map((item: any, idx: number) => (
                          <li key={`unique-${idx}`} className="text-gray-300 text-xs flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>{item.agent}: {item.insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* 诊断报告摘要 */}
                  {diagnosisReport.diagnosis_report && (
                    <div className="pt-2 border-t border-gray-700/30">
                      <div className="text-purple-400 text-xs font-medium mb-2">📋 诊断摘要</div>
                      <p className="text-gray-400 text-xs">{diagnosisReport.diagnosis_report}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </>
          )}
        </div>
      </div>
      {/* 卡片保存弹窗 */}
      <MeetingCardSaveModal
        isOpen={saveModalOpen}
        onClose={() => { setSaveModalOpen(false); setSaveTargetCard(null); }}
        card={saveTargetCard}
        meetingId={meetingResult?.meeting_id || ''}
        topic={topic}
        onSaved={(_card, cardId) => {
          // 标记已保存的卡片
          setMeetingCards(prev =>
            prev.map(c =>
              c === saveTargetCard ? { ...c, saved: true, id: cardId } : c
            )
          );
        }}
      />
    </div>
  );
};

export default VirtualOfficeMeeting;
