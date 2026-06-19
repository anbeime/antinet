#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
语音服务 - TTS 语音合成 + STT 语音识别
使用 edge-tts (TTS) 和 OpenAI Whisper (STT)
"""
import asyncio
import base64
import os
import re
import tempfile
import uuid
from pathlib import Path
from typing import Optional, BinaryIO
import logging

logger = logging.getLogger(__name__)

# 全量 emoji 正则（覆盖所有 Unicode emoji 区块）
EMOJI_PATTERN = re.compile(
    r'[\U0001F600-\U0001F64F'      # 表情符号
    r'\U0001F300-\U0001F5FF'        # 符号和象形文字
    r'\U0001F680-\U0001F6FF'        # 交通和地图符号
    r'\U0001F1E0-\U0001F1FF'        # 国旗（地区指示符号）
    r'\U00002702-\U000027B0'        # 杂项符号
    r'\U0001F900-\U0001F9FF'        # 补充符号和象形文字
    r'\U0001FA00-\U0001FA6F'        # 象棋符号
    r'\U0001FA70-\U0001FAFF'        # 符号和象形文字扩展-A
    r'\U00002600-\U000026FF'        # 杂项符号
    r'\U0000FE00-\U0000FE0F'        # 变体选择符
    r'\U0000200D'                    # 零宽连字符
    r']'
)

def strip_emoji(text: str) -> str:
    """移除文本中的 emoji 字符"""
    return EMOJI_PATTERN.sub('', text)


PROJECT_ROOT = Path(__file__).parent.parent.parent

TTS_TEMP_DIR = PROJECT_ROOT / "data" / "tts_audio"
TTS_TEMP_DIR.mkdir(parents=True, exist_ok=True)

STT_TEMP_DIR = PROJECT_ROOT / "data" / "stt_audio"
STT_TEMP_DIR.mkdir(parents=True, exist_ok=True)

_voice_cache: dict = {}
_whisper_model: Optional[any] = None
_whisper_model_name: Optional[str] = None
_use_faster_whisper = False


def _get_whisper_model(model_size: str = "base") -> any:
    """获取 Whisper 模型"""
    global _whisper_model, _whisper_model_name, _use_faster_whisper
    
    if _whisper_model is not None and _whisper_model_name == model_size:
        return _whisper_model
    
    try:
        # 尝试使用 faster-whisper（推荐）
        from faster_whisper import WhisperModel
        logger.info(f"[STT] 加载 Faster-Whisper 模型: {model_size}")
        _whisper_model = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8",
            download_root=str(PROJECT_ROOT / "data" / "whisper_models")
        )
        _whisper_model_name = model_size
        _use_faster_whisper = True
        logger.info("[STT] Faster-Whisper 模型加载成功")
        return _whisper_model
    except ImportError:
        pass
    
    try:
        # 回退到 openai-whisper
        import whisper
        logger.info(f"[STT] 加载 OpenAI Whisper 模型: {model_size}")
        _whisper_model = whisper.load_model(model_size)
        _whisper_model_name = model_size
        _use_faster_whisper = False
        logger.info("[STT] OpenAI Whisper 模型加载成功")
        return _whisper_model
    except ImportError:
        pass
    
    logger.warning("[STT] 未安装 Whisper 相关库，请运行: pip install faster-whisper 或 pip install openai-whisper")
    return None


async def tts_speak(text: str, voice: str = "zh-CN-XiaoxiaoNeural", output_path: Optional[str] = None) -> str:
    """
    文字转语音 - 使用 Microsoft Edge TTS
    
    Args:
        text: 要转换的文本
        voice: 语音名称，默认中文女声
        output_path: 可选，输出文件路径
    
    Returns:
        生成的音频文件路径
    """
    from edge_tts import Communicate
    
    if not text or not text.strip():
        raise ValueError("文本不能为空")
    
    text = strip_emoji(text)[:4000]
    
    if output_path is None:
        filename = f"tts_{uuid.uuid4().hex[:8]}.mp3"
        output_path = str(TTS_TEMP_DIR / filename)
    
    communicate = Communicate(text, voice)
    await communicate.save(output_path)
    logger.info(f"[TTS] 生成音频: {output_path}")
    return output_path


async def tts_speak_bytes(text: str, voice: str = "zh-CN-XiaoxiaoNeural", timeout: int = 10) -> bytes:
    """文字转语音 - 返回字节数据（用于API响应）"""
    import asyncio
    from edge_tts import Communicate
    
    if not text or not text.strip():
        raise ValueError("文本不能为空")
    
    text = strip_emoji(text)[:4000]
    
    try:
        communicate = Communicate(text, voice)
        audio_buffer = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer += chunk["data"]
        return audio_buffer
    except asyncio.TimeoutError:
        raise RuntimeError("TTS 服务超时（网络问题或无法访问 Microsoft TTS 服务器）")
    except Exception as e:
        if "connection" in str(e).lower() or "timeout" in str(e).lower() or "network" in str(e).lower():
            raise RuntimeError(f"TTS 服务连接失败：{e}")
        raise


def stt_transcribe_audio(audio_path: str, language: str = "zh", model_size: str = "base") -> dict:
    """语音转文字 - 使用 Faster-Whisper 或 OpenAI Whisper"""
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"音频文件不存在: {audio_path}")
    
    model = _get_whisper_model(model_size)
    if model is None:
        raise RuntimeError(
            "Whisper 模型未安装。请运行以下命令安装：\n"
            "  pip install faster-whisper  # 推荐，更快更准\n"
            "  或\n"
            "  pip install openai-whisper"
        )
    
    lang = None if language == "auto" else language
    logger.info(f"[STT] 开始转写: {audio_path}")
    
    if _use_faster_whisper:
        segments, info = model.transcribe(audio_path, language=lang, beam_size=5)
        text = " ".join([s.text for s in segments])
        return {"text": text.strip(), "language": info.language or "zh", "duration": round(info.duration or 0, 2)}
    else:
        result = model.transcribe(audio_path, language=lang, task="transcribe", fp16=False)
        duration = result.get("segments", [{}])[-1].get("end", 0) if result.get("segments") else 0
        return {"text": result["text"].strip(), "language": result.get("language", "zh"), "duration": round(duration, 2)}


def stt_transcribe_bytes(audio_bytes: bytes, language: str = "zh", model_size: str = "base", original_name: str = "audio.wav") -> dict:
    """从字节数据直接转写（不需要先存文件）"""
    filename = f"stt_{uuid.uuid4().hex[:8]}_{Path(original_name).suffix or '.wav'}"
    temp_path = STT_TEMP_DIR / filename
    try:
        temp_path.write_bytes(audio_bytes)
        return stt_transcribe_audio(str(temp_path), language, model_size)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def list_tts_voices() -> list:
    """列出可用的 TTS 语音"""
    return [
        {"name": "zh-CN-XiaoxiaoNeural", "gender": "Female", "lang": "zh-CN", "desc": "中文女声（晓晓）"},
        {"name": "zh-CN-YunxiNeural", "gender": "Male", "lang": "zh-CN", "desc": "中文男声（云希）"},
        {"name": "zh-CN-Xiaoyi", "gender": "Female", "lang": "zh-CN", "desc": "中文女声（晓伊）"},
        {"name": "zh-CN-Yunyang", "gender": "Male", "lang": "zh-CN", "desc": "中文男声（云扬）"},
        {"name": "en-US-JennyNeural", "gender": "Female", "lang": "en-US", "desc": "英文女声（珍妮）"},
        {"name": "en-US-GuyNeural", "gender": "Male", "lang": "en-US", "desc": "英文男声（盖伊）"},
    ]


def list_stt_models() -> list:
    """列出可用的 STT 模型"""
    return [
        {"name": "tiny", "params": "~39M", "speed": "最快", "recommend": False},
        {"name": "base", "params": "~74M", "speed": "快速", "recommend": True},
        {"name": "small", "params": "~244M", "speed": "中等", "recommend": False},
        {"name": "medium", "params": "~769M", "speed": "较慢", "recommend": False},
        {"name": "large", "params": "~1550M", "speed": "最慢", "recommend": False},
    ]


def get_speech_status() -> dict:
    """获取语音服务状态"""
    global _whisper_model, _whisper_model_name, _use_faster_whisper
    
    # 检查 Whisper 是否可用
    try:
        from faster_whisper import WhisperModel as _  # 检查 faster-whisper
        faster_whisper_available = True
    except ImportError:
        faster_whisper_available = False
    
    try:
        import whisper as _  # 检查 openai-whisper
        openai_whisper_available = True
    except ImportError:
        openai_whisper_available = False
    
    whisper_available = faster_whisper_available or openai_whisper_available
    
    return {
        "tts": {"engine": "Microsoft Edge TTS", "status": "ready", "voices_count": len(list_tts_voices())},
        "stt": {
            "engine": "Faster-Whisper" if _use_faster_whisper else ("OpenAI Whisper" if _whisper_model else "未安装"),
            "model_loaded": _whisper_model_name or "未加载",
            "model_available": whisper_available,
            "faster_whisper_available": faster_whisper_available,
            "openai_whisper_available": openai_whisper_available,
            "status": "ready" if _whisper_model else ("available" if whisper_available else "not_installed")
        }
    }


def cleanup_temp_audio(max_age_seconds: int = 3600):
    """清理临时音频文件"""
    import time
    cleaned = 0
    for temp_dir in [TTS_TEMP_DIR, STT_TEMP_DIR]:
        if temp_dir.exists():
            for f in temp_dir.glob("*"):
                if time.time() - f.stat().st_mtime > max_age_seconds:
                    f.unlink()
                    cleaned += 1
    return cleaned