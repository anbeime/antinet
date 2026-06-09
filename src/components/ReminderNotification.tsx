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

      // 恢复 AudioContext（解决浏览器自动播放限制）
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
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

  const speak = async (text: string) => {
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
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('voice_enabled') !== 'false';
    }
    return true;
  });

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

  const toggleVoice = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    localStorage.setItem('voice_enabled', String(enabled));
  };

  const showNotification = React.useCallback((title: string, body: string, taskId: number, enableVoice?: boolean) => {
    if (notifiedIds.current.has(taskId)) {
      console.log('[Reminder] 跳过已通知的任务:', taskId);
      return;
    }
    notifiedIds.current.add(taskId);
    saveNotifiedIds();
    console.log('[Reminder] 发送通知:', taskId, title);

    const shouldSpeak = enableVoice !== undefined ? enableVoice : voiceEnabled;
    if (shouldSpeak && 'speechSynthesis' in window) {
      speak(body);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `gtd-reminder-${taskId}`,
        requireInteraction: true,
      });
    }
    
    toast.info(body, {
      description: title,
      duration: 10000,
      id: `reminder-${taskId}`,
    });
  }, [speak, voiceEnabled]);

  return { showNotification, voiceEnabled, toggleVoice };
};

export const ReminderNotification: React.FC = () => {
  const { showNotification, voiceEnabled, toggleVoice } = useNotifications();
  const [currentReminder, setCurrentReminder] = useState<{ id: number; title: string; due_date?: string; remind_at?: string } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const dismissedToday = useRef<Set<number>>(new Set());

  useEffect(() => {
    const checkReminders = async () => {
      try {
        const response = await fetch(getApiBaseUrl() + '/api/data/gtd/reminders/pending');
        if (response.ok) {
          const data = await response.json();
          const reminders = data.reminders || [];
          
          // 找出未忽略的提醒
          const activeReminder = reminders.find((r: any) => !dismissedToday.current.has(r.id));
          
          if (activeReminder) {
            setCurrentReminder(activeReminder);
            setIsVisible(true);
            
            // 自动播放语音提醒
            if (voiceEnabled && 'speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(`提醒：${activeReminder.title}`);
              utterance.lang = 'zh-CN';
              speechSynthesis.speak(utterance);
            }
          }
        }
      } catch (error) {
        console.error('获取提醒失败:', error);
      }
    };

    // 立即检查一次
    checkReminders();
    // 然后每小时检查一次
    const interval = setInterval(checkReminders, 3600000);

    return () => clearInterval(interval);
  }, [voiceEnabled]);

  const dismissToday = () => {
    if (currentReminder) {
      dismissedToday.current.add(currentReminder.id);
    }
    setIsVisible(false);
    setCurrentReminder(null);
  };

  const viewNow = () => {
    if (currentReminder) {
      showNotification('🔔 任务提醒', currentReminder.title, currentReminder.id);
      dismissedToday.current.add(currentReminder.id);
    }
    setIsVisible(false);
    setCurrentReminder(null);
  };

  if (!isVisible || !currentReminder) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🔔</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              {currentReminder.title}
            </h3>
            {currentReminder.due_date && (
              <p className="text-xs text-gray-500 mt-1">
                📅 {currentReminder.due_date}
              </p>
            )}
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => toggleVoice(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded"
                />
                <span className="text-xs text-gray-500">语音播报</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={dismissToday}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  今日不再提醒
                </button>
                <button
                  onClick={viewNow}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationSettings: React.FC = () => {
  const { voiceEnabled, toggleVoice } = useNotifications();
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
            onChange={(e) => toggleVoice(e.target.checked)}
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