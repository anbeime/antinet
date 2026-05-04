import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';

const useEdgeTTS = () => {
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const isMounted = useRef(true);
  const isSpeaking = useRef(false);
  const pendingQueue = useRef<string[]>([]);

  const processQueue = async () => {
    if (isSpeaking.current || pendingQueue.current.length === 0 || !isMounted.current) return;
    
    isSpeaking.current = true;
    const text = pendingQueue.current.shift()!;
    
    try {
      // 停止当前播放
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current = null;
      }

      // 调用后端 TTS API (使用与增强版聊天相同的 API)
      const response = await fetch(getApiBaseUrl() + '/api/speech/tts/speak-bytes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'zh-CN-XiaoxiaoNeural' })
      });

      if (!isMounted.current) return;

      if (response.ok && response.headers.get('content-type')?.includes('audio')) {
        // 直接播放返回的音频
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          isSpeaking.current = false;
          processQueue();
        };
        audio.onerror = () => {
          isSpeaking.current = false;
          processQueue();
        };
        await audio.play();
        currentAudio.current = audio;
      } else {
        // 回退到浏览器 TTS
        console.log('[Reminder] Edge-TTS 不可用，使用浏览器 TTS');
        _fallbackSpeak(text);
        isSpeaking.current = false;
        processQueue();
      }
    } catch (e) {
      console.error('[Reminder] TTS 播放失败:', e);
      if (isMounted.current) {
        _fallbackSpeak(text);
      }
      isSpeaking.current = false;
      processQueue();
    }
  };

  const speak = async (text: string, voice: string = '晓伊') => {
    if (!isMounted.current) return;
    
    // 将文本添加到队列
    pendingQueue.current.push(text);
    
    // 如果没有正在播放，立即开始处理队列
    if (!isSpeaking.current) {
      processQueue();
    }
  };

  const _fallbackSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      // 尝试选择更好的中文声音
      const voices = speechSynthesis.getVoices();
      const cnVoice = voices.find(v => v.lang.includes('zh-CN') && v.name.includes('Xiaoyi'));
      if (cnVoice) utterance.voice = cnVoice;
      speechSynthesis.speak(utterance);
    }
  };

  const stop = () => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    isSpeaking.current = false;
    pendingQueue.current = [];
  };

  // 组件卸载时清理
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stop();
    };
  }, []);

  return { speak, stop };
};

export const useNotifications = () => {
  const { speak } = useEdgeTTS();
  const notifiedIds = useRef<Set<number>>(new Set());
  const isInitialized = useRef(false);

  // 从 localStorage 恢复已通知的 ID
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    try {
      const saved = localStorage.getItem('notified_reminder_ids');
      if (saved) {
        const ids = JSON.parse(saved) as number[];
        ids.forEach(id => notifiedIds.current.add(id));
        console.log('[Reminder] 已恢复已通知ID:', ids.length);
      }
    } catch (e) {
      console.error('[Reminder] 恢复已通知ID失败:', e);
    }
  }, []);

  // 保存已通知的 ID 到 localStorage
  const saveNotifiedIds = () => {
    try {
      const ids = Array.from(notifiedIds.current);
      localStorage.setItem('notified_reminder_ids', JSON.stringify(ids));
    } catch (e) {
      console.error('[Reminder] 保存已通知ID失败:', e);
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = React.useCallback((title: string, body: string, taskId: number, enableVoice: boolean = true) => {
    // 避免重复通知
    if (notifiedIds.current.has(taskId)) {
      console.log('[Reminder] 跳过已通知的任务:', taskId);
      return;
    }
    notifiedIds.current.add(taskId);
    saveNotifiedIds();
    console.log('[Reminder] 发送通知:', taskId, title);

    // 语音通知
    if (enableVoice && 'speechSynthesis' in window) {
      speak(body);
    }

    // 系统通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `gtd-reminder-${taskId}`,
        requireInteraction: true,
      });
    }
    
    // Toast 通知
    toast.info(body, {
      description: title,
      duration: 10000,
      id: `reminder-${taskId}`,
    });
  }, [speak]);

  return { showNotification };
};

export const ReminderNotification: React.FC = () => {
  const { showNotification } = useNotifications();
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    const checkReminders = async () => {
      try {
        const response = await fetch(getApiBaseUrl() + '/api/data/gtd/reminders/pending');
        if (response.ok) {
          const data = await response.json();
          if (data.reminders && data.reminders.length > 0) {
            data.reminders.forEach((reminder: { id: number; title: string; due_date?: string; remind_at?: string }) => {
              const body = reminder.due_date 
                ? `${reminder.title} - 到期: ${reminder.due_date}`
                : `${reminder.title}`;
              
              showNotification(
                '🔔 任务提醒',
                body,
                reminder.id,
                voiceEnabled
              );
            });
          }
        }
      } catch (error) {
        console.error('获取提醒失败:', error);
      }
    };

    // 每天检查一次
    const interval = setInterval(checkReminders, 86400000); // 24 hours in milliseconds
    checkReminders();

    return () => clearInterval(interval);
  }, [showNotification, voiceEnabled]);

  return null;
};

export const NotificationSettings: React.FC = () => {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const requestPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const testNotification = async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('测试通知', {
        body: '通知功能正常！',
        icon: '/logo.png',
      });
    } else {
      toast.error('请先允许浏览器通知权限');
    }

    // 使用 Edge TTS
    try {
      const response = await fetch(getApiBaseUrl() + '/api/speech/tts/speak-bytes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '通知功能测试成功', voice: 'zh-CN-XiaoxiaoNeural' })
      });

      if (response.ok && response.headers.get('content-type')?.includes('audio')) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      } else {
        // 回退
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('通知功能测试成功');
          utterance.lang = 'zh-CN';
          speechSynthesis.speak(utterance);
        }
      }
    } catch (e) {
      console.error('TTS测试失败:', e);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">通知设置</h3>
      
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => {
              setNotificationsEnabled(e.target.checked);
              if (e.target.checked) requestPermission();
            }}
            className="w-5 h-5 text-blue-600"
          />
          <span>启用系统通知</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
            className="w-5 h-5 text-blue-600"
          />
          <span>启用语音提醒</span>
        </label>

        <button
          onClick={testNotification}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          测试通知
        </button>
      </div>
    </div>
  );
};