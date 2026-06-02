import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Activity } from 'lucide-react';

// 8-AGENT 配置（与 Phaser 版本一致）
const AGENTS: Record<string, { name: string; cnName: string; color: string; x: number; y: number }> = {
  orchestrator: { name: '锦衣卫', cnName: '陆绎', color: '#e74c3c', x: 400, y: 130 },
  mijuanfang: { name: '密卷房', cnName: '档案官', color: '#3498db', x: 120, y: 180 },
  tongzhengsi: { name: '通政司', cnName: '通讯官', color: '#2ecc71', x: 680, y: 180 },
  jianchayuan: { name: '监察院', cnName: '监察官', color: '#f39c12', x: 120, y: 320 },
  xingyusi: { name: '刑狱司', cnName: '风险官', color: '#9b59b6', x: 680, y: 320 },
  canmousi: { name: '参谋司', cnName: '参谋官', color: '#1abc9c', x: 250, y: 480 },
  taishige: { name: '太史阁', cnName: '记忆官', color: '#e67e22', x: 550, y: 480 },
  yichuansi: { name: '驿传司', cnName: '传令官', color: '#34495e', x: 400, y: 280 }
};

const STATE_COLORS: Record<string, string> = {
  idle: '#95a5a6',
  writing: '#3498db',
  researching: '#9b59b6',
  executing: '#e74c3c',
  syncing: '#2ecc71',
  error: '#f39c12'
};

const STATE_NAMES: Record<string, string> = {
  idle: '待命',
  writing: '整理文档',
  researching: '搜索信息',
  executing: '执行任务',
  syncing: '同步备份',
  error: '出错了'
};

interface PixelOfficeState {
  active_agent: string;
  agent_states: Record<string, string>;
  detail: string;
  progress: number;
}

interface PixelOfficePhaserProps {
  state: PixelOfficeState;
  isRunning: boolean;
}

const PixelOfficePhaser: React.FC<PixelOfficePhaserProps> = ({ state, isRunning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frameRef = useRef(0);
  const characterPosRef = useRef({ x: 400, y: 130 });
  const targetPosRef = useRef({ x: 400, y: 130 });
  const [canvasReady, setCanvasReady] = useState(false);

  // 动画循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setCanvasReady(true);

    const animate = () => {
      frameRef.current++;
      
      if (!isRunning) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666666';
        ctx.font = '18px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('⏸ 协作已暂停', canvas.width / 2, canvas.height / 2);
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制背景
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制标题
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 24px Microsoft YaHei';
      ctx.textAlign = 'center';
      ctx.fillText('八府巡按 · 像素办公室', canvas.width / 2, 35);
      
      // 绘制装饰线
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(200, 55);
      ctx.lineTo(600, 55);
      ctx.stroke();
      
      // 平滑移动角色
      const targetAgent = AGENTS[state.active_agent] || AGENTS.orchestrator;
      targetPosRef.current = { x: targetAgent.x, y: targetAgent.y - 60 };
      
      characterPosRef.current.x += (targetPosRef.current.x - characterPosRef.current.x) * 0.1;
      characterPosRef.current.y += (targetPosRef.current.y - characterPosRef.current.y) * 0.1;
      
      // 绘制 AGENT 工位
      Object.entries(AGENTS).forEach(([key, agent]) => {
        const agentState = state.agent_states[key] || 'idle';
        const stateColor = STATE_COLORS[agentState];
        const isActive = state.active_agent === key;
        
        // 工位背景
        ctx.fillStyle = 'rgba(44, 62, 80, 0.5)';
        ctx.fillRect(agent.x - 60, agent.y - 40, 120, 80);
        
        // 边框
        ctx.strokeStyle = isActive ? agent.color : agent.color + '80';
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeRect(agent.x - 60, agent.y - 40, 120, 80);
        
        // AGENT 图标（小像素人）
        ctx.fillStyle = agent.color;
        ctx.fillRect(agent.x - 50, agent.y - 25, 20, 30);
        
        // AGENT 名称
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(agent.name, agent.x, agent.y - 25);
        
        // AGENT 中文名
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '10px Microsoft YaHei';
        ctx.fillText(agent.cnName, agent.x, agent.y - 10);
        
        // 状态文本
        ctx.fillStyle = stateColor;
        ctx.font = '11px Microsoft YaHei';
        ctx.fillText(STATE_NAMES[agentState], agent.x, agent.y + 15);
        
        // 状态指示点
        ctx.beginPath();
        ctx.arc(agent.x + 50, agent.y - 25, 5, 0, Math.PI * 2);
        ctx.fillStyle = stateColor;
        ctx.fill();
        
        // 活跃标记
        if (isActive) {
          ctx.strokeStyle = '#e94560';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(agent.x + 50, agent.y - 25, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      
      // 绘制主角（像素小人）
      const charX = characterPosRef.current.x;
      const charY = characterPosRef.current.y;
      const activeAgent = AGENTS[state.active_agent] || AGENTS.orchestrator;
      const charColor = activeAgent.color;
      const breath = Math.sin(frameRef.current * 0.05) * 2;
      const blink = Math.sin(frameRef.current * 0.1) > 0.95;
      
      // 身体
      ctx.fillStyle = charColor;
      ctx.fillRect(charX - 15, charY - 20 + breath, 30, 40);
      
      // 头
      ctx.fillStyle = '#ffdbac';
      ctx.beginPath();
      ctx.arc(charX, charY - 30 + breath, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // 眼睛
      ctx.fillStyle = '#000000';
      if (blink) {
        ctx.fillRect(charX - 8, charY - 32 + breath, 6, 1);
        ctx.fillRect(charX + 2, charY - 32 + breath, 6, 1);
      } else {
        ctx.beginPath();
        ctx.arc(charX - 5, charY - 32 + breath, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(charX + 5, charY - 32 + breath, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // 名字标签
      ctx.fillStyle = charColor;
      ctx.fillRect(charX - 25, charY - 55 + breath, 50, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Microsoft YaHei';
      ctx.fillText(activeAgent.cnName, charX, charY - 42 + breath);
      
      // 气泡提示
      if (state.detail) {
        const bubbleWidth = 280;
        const bubbleHeight = 50;
        const bubbleX = charX - bubbleWidth / 2;
        const bubbleY = charY - 90 + breath;
        
        // 气泡背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
        
        // 小三角
        ctx.beginPath();
        ctx.moveTo(charX - 8, bubbleY + bubbleHeight);
        ctx.lineTo(charX + 8, bubbleY + bubbleHeight);
        ctx.lineTo(charX, bubbleY + bubbleHeight + 10);
        ctx.fill();
        
        // 文字
        ctx.fillStyle = '#333333';
        ctx.font = '12px Microsoft YaHei';
        ctx.fillText(state.detail, charX, bubbleY + 28);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, isRunning]);

  const activeAgent = AGENTS[state.active_agent] || AGENTS.orchestrator;
  const workingCount = Object.values(state.agent_states).filter(s => s !== 'idle' && s !== 'error').length;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border-2 border-red-500/50">
      {/* 标题栏 */}
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-red-400 font-bold flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          八府巡按协作中
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">活跃: {workingCount}/8</span>
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${isRunning ? 'text-red-500 animate-pulse' : 'text-gray-600'}`} />
            <span className="text-gray-400 text-sm">{state.progress}%</span>
            {!canvasReady && <span className="text-gray-600 text-xs">初始化中...</span>}
          </div>
        </div>
      </div>
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={550}
        className="w-full"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* 状态栏 */}
      <div className="p-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeAgent.color }} />
            <span className="text-white font-medium">
              {activeAgent.cnName} ({activeAgent.name})
            </span>
            <span className="text-gray-400">|</span>
            <span style={{ color: STATE_COLORS[state.agent_states[state.active_agent] || 'idle'] }}>
              {STATE_NAMES[state.agent_states[state.active_agent] || 'idle']}
            </span>
          </div>
          <div className="w-48 bg-gray-700 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
        <p className="mt-2 text-gray-300 text-sm text-center">{state.detail}</p>
      </div>
    </div>
  );
};

export default PixelOfficePhaser;
