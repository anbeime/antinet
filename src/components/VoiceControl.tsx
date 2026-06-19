import { useState, useRef, useEffect, useCallback } from 'react';
import { speechService } from '@/config/api';

interface Voice {
  name: string;
  gender: string;
  lang: string;
  desc: string;
}

export default function VoiceControl() {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('zh-CN-XiaoxiaoNeural');
  const [lastResult, setLastResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    speechService.getVoices().then(res => {
      if (res?.voices) setVoices(res.voices);
    }).catch(console.error);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setStatus('processing');
        const blob = new Blob(chunksRef.current, { type: mimeType });
        try {
          const result = await speechService.transcribeAudio(blob, 'zh', 'base');
          setLastResult(result.text || '未识别到语音');
        } catch (err) {
          setError('语音识别失败');
          console.error(err);
        } finally {
          setStatus('idle');
        }
      };

      recorder.start();
      setStatus('recording');
    } catch (err) {
      setError('无法访问麦克风，请检查权限设置');
      console.error(err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const speakText = useCallback(async (text: string) => {
    const clean = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, m => m.replace(/`/g, '')).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1').replace(/^>\s+/gm, '').replace(/\|/g, '').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '').trim();
    if (!clean) return;
    try {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
      const result = await speechService.textToSpeech(clean, selectedVoice);
      if (result?.audio_url) {
        const audio = speechService.playAudio(speechService.getAudioUrl(result.audio_url.split('/').pop() || ''));
        setCurrentAudio(audio);
      }
    } catch (err) {
      setError('语音朗读失败');
      console.error(err);
    }
  }, [selectedVoice, currentAudio]);

  const stopSpeaking = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
  }, [currentAudio]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <span>🎤</span> 语音控制
        </h3>
        {status !== 'idle' && (
          <button
            onClick={stopRecording}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            停止
          </button>
        )}
      </div>

      {/* 状态显示 */}
      <div className="flex items-center gap-3">
        <button
          onClick={status === 'idle' ? startRecording : stopRecording}
          disabled={status === 'processing'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            status === 'recording'
              ? 'bg-red-500 animate-pulse'
              : status === 'processing'
              ? 'bg-gray-400'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white text-xl`}
        >
          {status === 'recording' ? '⏹' : status === 'processing' ? '⏳' : '🎤'}
        </button>
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {status === 'idle' && '点击麦克风开始语音输入'}
            {status === 'recording' && '正在录音...'}
            {status === 'processing' && '识别中...'}
          </p>
        </div>
      </div>

      {/* 语音输入结果 */}
      {lastResult && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">识别结果：</p>
          <p className="text-gray-800 dark:text-white">{lastResult}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => speakText(lastResult)}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              🔊 朗读
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(lastResult)}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              📋 复制
            </button>
          </div>
        </div>
      )}

      {/* TTS 朗读器 */}
      <div className="border-t dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🔊 语音朗读</h4>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>{v.desc}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-2">
          选择语音后，可在上方"识别结果"点击朗读，或在四色卡片中使用朗读功能
        </p>
      </div>

      {/* 当前播放控制 */}
      {currentAudio && (
        <div className="border-t dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">正在播放...</span>
            <button
              onClick={stopSpeaking}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              ⏹ 停止
            </button>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
    </div>
  );
}