#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
语音路由 - TTS 语音合成 + STT 语音识别
"""
import asyncio
import logging
import tempfile
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, Response, JSONResponse
from pydantic import BaseModel

from services.speech_service import (
    tts_speak,
    tts_speak_bytes,
    stt_transcribe_audio,
    stt_transcribe_bytes,
    list_tts_voices,
    list_stt_models,
    get_speech_status,
    cleanup_temp_audio,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/speech", tags=["语音"])

PROJECT_ROOT = Path(__file__).parent.parent.parent
TEMP_DIR = PROJECT_ROOT / "data" / "speech_temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "zh-CN-XiaoxiaoNeural"
    model_size: Optional[str] = "base"


class TTSResponse(BaseModel):
    audio_url: str
    duration: float


class STTResponse(BaseModel):
    text: str
    language: str
    duration: float


@router.get("/status")
async def speech_status():
    """获取语音服务状态"""
    return get_speech_status()


@router.get("/tts/voices")
async def get_voices():
    """获取可用的 TTS 语音列表"""
    return {"voices": list_tts_voices()}


@router.get("/stt/models")
async def get_models():
    """获取可用的 STT 模型列表"""
    return {"models": list_stt_models()}


@router.post("/tts/speak", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """文字转语音 - 生成音频文件并返回URL"""
    try:
        audio_path = await tts_speak(
            text=request.text,
            voice=request.voice
        )
        
        filename = Path(audio_path).name
        
        return {
            "audio_url": f"/api/speech/tts/audio/{filename}",
            "duration": len(request.text) / 5.0
        }
    except Exception as e:
        logger.error(f"[TTS] 合成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts/speak-bytes")
async def text_to_speech_bytes(request: TTSRequest):
    """文字转语音 - 直接返回音频字节流"""
    try:
        audio_bytes = await tts_speak_bytes(
            text=request.text,
            voice=request.voice
        )
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"inline; filename=speech.mp3"
            }
        )
    except Exception as e:
        logger.error(f"[TTS] 合成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tts/audio/{filename}")
async def get_tts_audio(filename: str):
    """获取 TTS 生成的音频文件"""
    audio_dir = PROJECT_ROOT / "data" / "tts_audio"
    audio_path = audio_dir / filename
    
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="音频文件不存在")
    
    return FileResponse(
        audio_path,
        media_type="audio/mpeg",
        filename=filename
    )


@router.post("/stt/transcribe", response_model=STTResponse)
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Query(default="auto", description="语言：zh/auto"),
    model_size: str = Query(default="base", description="模型大小：tiny/base/small/medium/large")
):
    """语音转文字 - 上传音频文件"""
    try:
        suffix = Path(file.filename).suffix or ".wav"
        temp_filename = f"temp_{os.getpid()}_{id(file)}{suffix}"
        temp_path = TEMP_DIR / temp_filename
        
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = stt_transcribe_audio(
            audio_path=str(temp_path),
            language=language,
            model_size=model_size
        )
        
        return result
        
    except Exception as e:
        logger.error(f"[STT] 转写失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except:
                pass


@router.post("/stt/transcribe-bytes", response_model=STTResponse)
async def speech_to_text_bytes(
    file: UploadFile = File(..., description="音频数据"),
    language: str = Query(default="auto"),
    model_size: str = Query(default="base")
):
    """语音转文字 - 直接接收音频字节流"""
    try:
        audio_bytes = await file.read()
        return stt_transcribe_bytes(
            audio_bytes=audio_bytes,
            language=language,
            model_size=model_size
        )
    except Exception as e:
        logger.error(f"[STT] 转写失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stt/transcribe-base64", response_model=STTResponse)
async def speech_to_text_base64(
    audio_data: str = Form(..., description="Base64编码的音频数据"),
    language: str = Form(default="auto"),
    model_size: str = Form(default="base")
):
    """语音转文字 - 接收Base64编码的音频（前端WebRTC录制用）"""
    try:
        import base64 as b64
        audio_bytes = b64.b64decode(audio_data)
        return stt_transcribe_bytes(
            audio_bytes=audio_bytes,
            language=language,
            model_size=model_size
        )
    except Exception as e:
        logger.error(f"[STT] 转写失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts/speak-card")
async def tts_read_card(
    title: str = Form(...),
    content: str = Form(...),
    voice: str = Form(default="zh-CN-XiaoxiaoNeural")
):
    """为四色卡片生成朗读音频"""
    try:
        full_text = f"{title}。{content}"
        audio_path = await tts_speak(text=full_text, voice=voice)
        filename = Path(audio_path).name
        
        return {
            "audio_url": f"/api/speech/tts/audio/{filename}",
            "text_length": len(full_text)
        }
    except Exception as e:
        logger.error(f"[TTS] 卡片朗读失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cleanup")
async def cleanup_audio(max_age_seconds: int = Query(default=3600, description="文件最大保留秒数")):
    """清理临时音频文件"""
    cleaned = cleanup_temp_audio(max_age_seconds)
    return {"cleaned_files": cleaned}


@router.get("/")
async def speech_index():
    """语音服务索引"""
    return {
        "service": "语音服务",
        "tts": "TTS 语音合成（edge-tts）",
        "stt": "STT 语音识别（OpenAI Whisper）",
        "endpoints": {
            "tts": {
                "POST /api/speech/tts/speak": "文字转语音，返回音频URL",
                "POST /api/speech/tts/speak-bytes": "文字转语音，返回音频流",
                "POST /api/speech/tts/speak-card": "朗读卡片内容",
                "GET /api/speech/tts/voices": "获取可用语音列表",
            },
            "stt": {
                "POST /api/speech/stt/transcribe": "语音转文字（文件上传）",
                "POST /api/speech/stt/transcribe-bytes": "语音转文字（字节流）",
                "POST /api/speech/stt/transcribe-base64": "语音转文字（Base64，前端WebRTC用）",
                "GET /api/speech/stt/models": "获取可用模型列表",
            }
        }
    }