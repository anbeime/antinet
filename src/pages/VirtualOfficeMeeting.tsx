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
  Square
} from 'lucide-react';
import { toast } from 'sonner';

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

// 模拟讨论轮次数据
const generateMockDiscussion = (topic: string, rounds: number) => {
  const mockResponses = [
    `关于"${topic}"，我认为需要从多个维度进行分析。首先，让我们明确核心事实。`,
    `从安全角度考虑，这个议题存在几个潜在风险点需要重点关注。`,
    `我已经收集了相关的情报数据，可以为后续分析提供支持。`,
    `经过监督审查，发现流程中存在一些可以优化的环节。`,
    `相关知识文档已经整理完毕，可以随时调用参考。`,
    `基于战略视角，我建议采取以下几种方案进行推进。`,
    `任务执行方案已经制定，预计可以在规定时间内完成。`,
    `作为协调官，我将确保各部门高效协作，达成最终目标。`
  ];

  return Array.from({ length: rounds }, (_, i) => ({
    round: i + 1,
    title: `第${i + 1}轮讨论`,
    discussions: AGENT_ROLES.map((agent, idx) => ({
      agent,
      message: mockResponses[idx % mockResponses.length],
      timestamp: new Date(Date.now() + i * 1000 + idx * 100).toISOString()
    })),
    cards: [
      { type: 'blue', title: '核心事实', content: `第${i + 1}轮讨论中确定的核心事实内容...` },
      { type: 'green', title: '原因分析', content: `第${i + 1}轮讨论中的原因分析...` },
      { type: 'yellow', title: '风险检测', content: `第${i + 1}轮讨论中识别的风险...` },
      { type: 'red', title: '行动建议', content: `第${i + 1}轮讨论的行动建议...` }
    ]
  }));
};

// ==================== 后端 API 配置 ====================
const BACKEND_URL = 'http://127.0.0.1:8000/api/meeting';

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
  const [isLoading, setIsLoading] = useState(false);
  const [meetingResult, setMeetingResult] = useState<any>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);
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

  const abortControllerRef = useRef<AbortController | null>(null);

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
        body: JSON.stringify({ topic, context, rounds }),
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
              setPixelState(prev => ({ ...prev, detail: '指挥使正在做最终裁决...', progress: 95 }));
              setMessengerInfo(prev => ({ ...prev, agentName: '指挥使', agentTitle: '总指挥', message: '正在生成最终决策...', progress: 95 }));
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

  // 导出结果
  const exportResults = () => {
    if (!meetingResult) return;
    const exportData = {
      topic, context, rounds: meetingResult.length,
      discussions: meetingResult,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${topic}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('会议记录已导出');
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

  return (
    <div className="min-h-screen" style={{ background: '#121826' }}>
      {/* ==================== 页面标题区 ==================== */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Crown className="w-7 h-7 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">八府巡按 · 智能协作会议</h1>
            <p className="text-sm text-gray-500">8-Agent Collaborative Intelligence System</p>
          </div>
        </div>
      </div>

      {/* ==================== 主内容区：左右分栏 ==================== */}
      <div className="flex gap-5 p-5" style={{ height: 'calc(100vh - 90px)' }}>

        {/* ========== 左侧栏 35% ========== */}
        <div className="w-[35%] min-w-[340px] flex flex-col gap-5 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>

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

          {/* 模块1: 像素办公室 */}
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
            <div className="rounded-xl border border-gray-700/50 flex-shrink-0" style={{ background: '#1a2235' }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-700/50">
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
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
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
                   return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.agent?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-sm flex-shrink-0`}>
                        {item.agent?.avatar || '💬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-xs font-medium">{item.agent?.name}</span>
                          <span className="text-gray-500 text-[10px]">{item.agent?.title}</span>
                        </div>
                        {item.agent?.systemPrompt && (
                          <div className="text-gray-500 text-[10px] mb-0.5 truncate">
                            {item.agent.systemPrompt}
                          </div>
                        )}
                        <p className="text-gray-300 text-xs leading-relaxed">{item.message}</p>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={liveDiscussionsEndRef} />
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
                    <span className="text-gray-500 text-xs">· {meetingResult.length} 轮讨论</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={exportResults}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-300 border border-gray-600/50 hover:border-gray-500 hover:text-white transition-colors"
                      style={{ background: '#0f1729' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      导出
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

                {/* 讨论轮次 */}
                <div className="p-4 space-y-3">
                  {meetingResult.map((round: any) => (
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
                          <span className="text-gray-500 text-xs">{round.discussions.length} 条发言</span>
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
                               {round.discussions.map((disc: any, idx: number) => (
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default VirtualOfficeMeeting;
