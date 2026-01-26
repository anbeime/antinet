# 🚀 Antinet 完整功能集成方案

## 📋 推荐技术栈

### 核心组件

| 功能模块 | 推荐工具 | 用途 | 状态 |
|---------|---------|------|------|
| **语音识别** | Faster-Whisper | 语音→文字 | 推荐 |
| **语音合成** | Coqui TTS | 文字→语音 | 推荐 |
| **PPT生成** | pptx-generator | JSON→PPTX | 推荐 |
| **PPT规划** | ppt-generator | 智能内容规划 | 推荐 |
| **PPT视觉** | nanobanana-ppt-visualizer | 视觉增强 | 推荐 |
| **知识库** | Antinet 现有 | 四色卡片知识库 | 已有 |
| **NPU推理** | QNN + Qwen2-7B | 端侧AI | 已有 |

---

## 🎯 完整功能架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Antinet 智能知识管家                      │
│                  完整功能集成架构图                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      输入层                                   │
├──────────────────────────────────────────────────────────────┤
│  文字输入  │  语音输入(Faster-Whisper)  │  文件上传         │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                      处理层                                   │
├──────────────────────────────────────────────────────────────┤
│  • NPU推理 (Qwen2-7B)                                        │
│  • 知识库查询 (四色卡片)                                      │
│  • 数据分析                                                  │
│  • 内容生成                                                  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                      输出层                                   │
├──────────────────────────────────────────────────────────────┤
│  文字回答  │  语音回答(Coqui TTS)  │  PPT文档  │  可视化   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 详细集成方案

### 阶段1: 基础集成（1-2天）

#### 1.1 安装所有依赖

```cmd
cd C:\test\antinet
venv_arm64\Scripts\activate

# 语音功能
pip install faster-whisper TTS

# PPT功能（已有python-pptx，补充其他）
pip install pillow openpyxl python-dotenv

# 其他可选
pip install moviepy pydub  # 如果需要视频功能
```

#### 1.2 复制PPT技能

```cmd
cd C:\test\antinet
integrate_new_ppt_skills.bat
```

#### 1.3 创建统一服务目录

```
backend/
├── services/
│   ├── voice_service.py          # 语音服务（新增）
│   ├── advanced_ppt_service.py   # PPT服务（新增）
│   ├── chat_service.py           # 聊天服务（已有）
│   └── npu_service.py            # NPU服务（已有）
├── skills/
│   ├── pptx-generator/           # PPT技能
│   ├── ppt-generator/
│   ├── nanobanana-ppt-visualizer/
│   └── local_audio_processor.py  # 本地音频处理
└── routes/
    ├── voice_routes.py           # 语音路由（新增）
    ├── ppt_routes.py             # PPT路由（更新）
    └── chat_routes.py            # 聊天路由（已有）
```

---

### 阶段2: 语音功能集成（2-3天）

#### 2.1 创建语音服务

创建 `backend/services/voice_service.py`：

```python
"""
语音服务
集成 Faster-Whisper (ASR) 和 Coqui TTS (TTS)
"""
from faster_whisper import WhisperModel
from TTS.api import TTS
from pathlib import Path
import time
from typing import Optional, Dict, Any

class VoiceService:
    """统一的语音服务"""
    
    def __init__(
        self,
        whisper_model: str = "base",
        tts_model: str = "tts_models/zh-CN/baker/tacotron2-DDC-GST"
    ):
        """
        初始化语音服务
        
        Args:
            whisper_model: Whisper模型大小（tiny/base/small/medium/large）
            tts_model: TTS模型名称
        """
        print("[VoiceService] 初始化中...")
        
        # 初始化ASR（语音识别）
        print(f"[VoiceService] 加载Whisper模型: {whisper_model}")
        self.asr = WhisperModel(
            whisper_model,
            device="cpu",
            compute_type="int8"
        )
        
        # 初始化TTS（语音合成）
        print(f"[VoiceService] 加载TTS模型: {tts_model}")
        self.tts = TTS(model_name=tts_model)
        
        print("[VoiceService] ✓ 初始化完成")
    
    def speech_to_text(
        self,
        audio_path: str,
        language: str = "zh"
    ) -> Dict[str, Any]:
        """
        语音转文字
        
        Args:
            audio_path: 音频文件路径
            language: 语言代码（zh/en）
        
        Returns:
            {
                "text": "识别的文字",
                "segments": [{"start": 0.0, "end": 1.5, "text": "..."}]
            }
        """
        print(f"[VoiceService] 识别语音: {audio_path}")
        
        segments, info = self.asr.transcribe(
            audio_path,
            language=language,
            beam_size=5
        )
        
        # 收集所有片段
        all_segments = []
        text_parts = []
        
        for segment in segments:
            all_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
            text_parts.append(segment.text)
        
        full_text = " ".join(text_parts)
        
        print(f"[VoiceService] 识别结果: {full_text[:50]}...")
        
        return {
            "text": full_text,
            "segments": all_segments,
            "language": info.language,
            "duration": info.duration
        }
    
    def text_to_speech(
        self,
        text: str,
        output_path: Optional[str] = None
    ) -> str:
        """
        文字转语音
        
        Args:
            text: 要转换的文字
            output_path: 输出路径（可选）
        
        Returns:
            语音文件路径
        """
        if output_path is None:
            output_dir = Path("output/voice")
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = str(output_dir / f"tts_{int(time.time())}.wav")
        
        print(f"[VoiceService] 生成语音: {text[:50]}...")
        
        self.tts.tts_to_file(
            text=text,
            file_path=output_path
        )
        
        print(f"[VoiceService] 语音已保存: {output_path}")
        return output_path
    
    def voice_dialogue(
        self,
        audio_path: str,
        chat_service
    ) -> Dict[str, Any]:
        """
        完整的语音对话
        
        Args:
            audio_path: 用户录音文件
            chat_service: 聊天服务实例
        
        Returns:
            {
                "user_text": "用户说的话",
                "assistant_text": "助手回答",
                "assistant_audio": "语音文件路径",
                "sources": "知识来源"
            }
        """
        # 1. 语音识别
        asr_result = self.speech_to_text(audio_path)
        user_text = asr_result["text"]
        
        # 2. 查询知识库
        response = chat_service.query(user_text, [])
        assistant_text = response['response']
        sources = response.get('sources', [])
        
        # 3. 语音合成
        assistant_audio = self.text_to_speech(assistant_text)
        
        return {
            "user_text": user_text,
            "assistant_text": assistant_text,
            "assistant_audio": assistant_audio,
            "sources": sources
        }


# 全局单例
_voice_service = None

def get_voice_service() -> VoiceService:
    """获取语音服务单例"""
    global _voice_service
    if _voice_service is None:
        _voice_service = VoiceService()
    return _voice_service
```

#### 2.2 创建语音路由

创建 `backend/routes/voice_routes.py`：

```python
"""
语音功能路由
提供语音识别、语音合成、语音对话等API
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import time

from backend.services.voice_service import get_voice_service
from backend.routes.chat_routes import chatService

router = APIRouter(prefix="/api/voice", tags=["语音功能"])

class TextToSpeechRequest(BaseModel):
    """文字转语音请求"""
    text: str
    output_path: Optional[str] = None

class SpeechToTextResponse(BaseModel):
    """语音转文字响应"""
    text: str
    segments: list
    language: str
    duration: float

class VoiceDialogueResponse(BaseModel):
    """语音对话响应"""
    user_text: str
    assistant_text: str
    assistant_audio: str
    sources: list


@router.post("/speech-to-text", response_model=SpeechToTextResponse)
async def speech_to_text(file: UploadFile = File(...)):
    """
    语音转文字
    上传音频文件，返回识别的文字
    """
    try:
        # 保存上传的文件
        temp_path = f"temp/audio_{int(time.time())}_{file.filename}"
        os.makedirs("temp", exist_ok=True)
        
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 语音识别
        voice_service = get_voice_service()
        result = voice_service.speech_to_text(temp_path)
        
        # 清理临时文件
        os.remove(temp_path)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """
    文字转语音
    输入文字，返回语音文件路径
    """
    try:
        voice_service = get_voice_service()
        audio_path = voice_service.text_to_speech(
            text=request.text,
            output_path=request.output_path
        )
        
        return {
            "audio_path": audio_path,
            "text": request.text
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dialogue", response_model=VoiceDialogueResponse)
async def voice_dialogue(file: UploadFile = File(...)):
    """
    语音对话
    上传用户录音，返回文字回答和语音回答
    """
    try:
        # 保存上传的文件
        temp_path = f"temp/dialogue_{int(time.time())}_{file.filename}"
        os.makedirs("temp", exist_ok=True)
        
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 完整对话流程
        voice_service = get_voice_service()
        result = voice_service.voice_dialogue(temp_path, chatService)
        
        # 清理临时文件
        os.remove(temp_path)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def voice_health():
    """语音服务健康检查"""
    try:
        voice_service = get_voice_service()
        return {
            "status": "healthy",
            "asr": "faster-whisper",
            "tts": "coqui-tts"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
```

---

### 阶段3: PPT功能集成（2-3天）

#### 3.1 创建高级PPT服务

创建 `backend/services/advanced_ppt_service.py`：

```python
"""
高级PPT服务
集成 pptx-generator、ppt-generator、nanobanana-ppt-visualizer
"""
import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional

class AdvancedPPTService:
    """高级PPT服务"""
    
    def __init__(self):
        self.skills_dir = Path(__file__).parent.parent / "skills"
        self.pptx_generator = self.skills_dir / "pptx-generator"
        self.ppt_generator = self.skills_dir / "ppt-generator"
        self.visualizer = self.skills_dir / "nanobanana-ppt-visualizer"
    
    def create_ppt_from_topic(
        self,
        topic: str,
        pages: int = 10,
        style: str = "modern"
    ) -> Dict[str, Any]:
        """
        从主题创建PPT（完整流程）
        
        Args:
            topic: PPT主题
            pages: 页数
            style: 样式（business/minimal/modern）
        
        Returns:
            {
                "json_data": PPT JSON数据,
                "pptx_path": PPTX文件路径
            }
        """
        # 1. 使用ppt-generator生成内容（这里简化为示例）
        json_data = self._generate_content(topic, pages)
        
        # 2. 使用pptx-generator转换为PPTX
        pptx_path = self.json_to_pptx(json_data, style)
        
        return {
            "json_data": json_data,
            "pptx_path": pptx_path
        }
    
    def _generate_content(self, topic: str, pages: int) -> Dict[str, Any]:
        """
        生成PPT内容（简化版）
        实际应该调用ppt-generator的七角色协作流程
        """
        # 示例JSON结构
        json_data = {
            "metadata": {
                "title": topic,
                "author": "Antinet",
                "theme": "modern"
            },
            "slides": []
        }
        
        # 生成幻灯片
        for i in range(pages):
            if i == 0:
                # 封面
                slide = {
                    "layout": "title",
                    "title": topic,
                    "subtitle": "由Antinet智能知识管家生成"
                }
            else:
                # 内容页
                slide = {
                    "layout": "content",
                    "title": f"第{i}部分",
                    "content": [
                        f"要点 {i}.1",
                        f"要点 {i}.2",
                        f"要点 {i}.3"
                    ]
                }
            
            json_data["slides"].append(slide)
        
        return json_data
    
    def json_to_pptx(
        self,
        json_data: Dict[str, Any],
        style: str = "modern",
        output_path: Optional[str] = None
    ) -> str:
        """
        JSON转PPTX
        
        Args:
            json_data: PPT JSON数据
            style: 样式
            output_path: 输出路径
        
        Returns:
            PPTX文件路径
        """
        import tempfile
        
        if output_path is None:
            output_dir = Path("output/ppt")
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = str(output_dir / f"presentation_{int(time.time())}.pptx")
        
        # 保存JSON到临时文件
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.json',
            delete=False,
            encoding='utf-8'
        ) as f:
            json.dump(json_data, f, ensure_ascii=False)
            json_path = f.name
        
        # 调用pptx_builder.py
        script_path = self.pptx_generator / "scripts" / "pptx_builder.py"
        style_path = self.pptx_generator / "assets" / "styles" / f"{style}.json"
        
        try:
            subprocess.run([
                sys.executable,
                str(script_path),
                "--input", json_path,
                "--style", str(style_path),
                "--output", output_path
            ], check=True, capture_output=True, text=True)
            
            print(f"[PPTService] PPTX已生成: {output_path}")
            return output_path
            
        finally:
            # 清理临时文件
            if os.path.exists(json_path):
                os.remove(json_path)
    
    def enhance_visuals(
        self,
        json_data: Dict[str, Any],
        style: str = "gradient-glass"
    ) -> Dict[str, Any]:
        """
        使用nanobanana-ppt-visualizer增强视觉
        
        Args:
            json_data: PPT JSON数据
            style: 视觉风格
        
        Returns:
            增强后的JSON数据
        """
        # TODO: 实现视觉增强逻辑
        return json_data


# 全局单例
_ppt_service = None

def get_ppt_service() -> AdvancedPPTService:
    """获取PPT服务单例"""
    global _ppt_service
    if _ppt_service is None:
        _ppt_service = AdvancedPPTService()
    return _ppt_service
```

#### 3.2 更新PPT路由

更新 `backend/routes/ppt_routes.py`，添加新的API端点：

```python
from backend.services.advanced_ppt_service import get_ppt_service

@router.post("/api/ppt/create-from-topic")
async def create_ppt_from_topic(request: CreatePPTRequest):
    """
    从主题创建PPT
    使用完整的PPT生成流程
    """
    try:
        ppt_service = get_ppt_service()
        result = ppt_service.create_ppt_from_topic(
            topic=request.topic,
            pages=request.pages,
            style=request.style
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/ppt/json-to-pptx")
async def json_to_pptx(request: JSONToPPTXRequest):
    """
    JSON转PPTX
    """
    try:
        ppt_service = get_ppt_service()
        pptx_path = ppt_service.json_to_pptx(
            json_data=request.json_data,
            style=request.style
        )
        return {"pptx_path": pptx_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### 阶段4: 功能整合（1-2天）

#### 4.1 创建综合服务

创建 `backend/services/integrated_service.py`：

```python
"""
综合服务
整合语音、PPT、知识库等所有功能
"""
from backend.services.voice_service import get_voice_service
from backend.services.advanced_ppt_service import get_ppt_service
from backend.routes.chat_routes import chatService

class IntegratedService:
    """综合服务"""
    
    def __init__(self):
        self.voice_service = get_voice_service()
        self.ppt_service = get_ppt_service()
        self.chat_service = chatService
    
    def voice_to_ppt(
        self,
        audio_path: str,
        style: str = "modern"
    ) -> dict:
        """
        语音转PPT
        用户说出PPT主题，自动生成PPT
        
        Args:
            audio_path: 用户录音
            style: PPT样式
        
        Returns:
            {
                "topic": "识别的主题",
                "pptx_path": "生成的PPT路径"
            }
        """
        # 1. 语音识别
        asr_result = self.voice_service.speech_to_text(audio_path)
        topic = asr_result["text"]
        
        # 2. 生成PPT
        ppt_result = self.ppt_service.create_ppt_from_topic(
            topic=topic,
            style=style
        )
        
        # 3. 生成语音确认
        confirm_text = f"已为您生成关于{topic}的演示文稿"
        audio_confirm = self.voice_service.text_to_speech(confirm_text)
        
        return {
            "topic": topic,
            "pptx_path": ppt_result["pptx_path"],
            "audio_confirm": audio_confirm
        }
    
    def knowledge_to_ppt(
        self,
        query: str,
        style: str = "modern"
    ) -> dict:
        """
        知识库转PPT
        基于知识库内容生成PPT
        
        Args:
            query: 查询内容
            style: PPT样式
        
        Returns:
            PPT生成结果
        """
        # 1. 查询知识库
        response = self.chat_service.query(query, [])
        
        # 2. 基于知识库内容生成PPT
        # TODO: 将知识库内容转换为PPT JSON格式
        
        return {}
```

---

## 📊 完整功能清单

### 已实现功能

| 功能 | 状态 | 技术 |
|------|------|------|
| 文字对话 | 已有 | 知识库 + NPU |
| 数据分析 | 已有 | pandas + DuckDB |
| 四色卡片 | 已有 | SQLite |
| Excel处理 | 已有 | openpyxl |
| PDF处理 | 已有 | pypdf |
| 基础PPT | 已有 | python-pptx |

### 新增功能

| 功能 | 状态 | 技术 |
|------|------|------|
| **语音识别** | 🆕 新增 | Faster-Whisper |
| **语音合成** | 🆕 新增 | Coqui TTS |
| **语音对话** | 🆕 新增 | Whisper + TTS |
| **高级PPT生成** | 🆕 新增 | pptx-generator |
| **智能PPT规划** | 🆕 新增 | ppt-generator |
| **PPT视觉增强** | 🆕 新增 | nanobanana-ppt-visualizer |
| **语音转PPT** | 🆕 新增 | 综合服务 |
| **语音转文档** | 🆕 新增 | Whisper + Markdown |

---

## 🚀 快速开始

### 一键安装所有依赖

创建 `install_all_features.bat`：

```cmd
@echo off
echo ========================================
echo   Antinet 完整功能安装
echo ========================================
echo.

cd /d C:\test\antinet
call venv_arm64\Scripts\activate.bat

echo [1/4] 安装语音功能依赖...
pip install faster-whisper TTS

echo [2/4] 安装PPT功能依赖...
pip install python-pptx pillow openpyxl python-dotenv

echo [3/4] 复制PPT技能...
call integrate_new_ppt_skills.bat

echo [4/4] 测试安装...
python -c "import faster_whisper, TTS, pptx; print('All OK!')"

echo.
echo ========================================
echo   安装完成！
echo ========================================
pause
```

### 测试所有功能

创建 `test_all_features.py`：

```python
"""
测试所有新功能
"""
import sys
sys.path.insert(0, '.')

def test_voice():
    """测试语音功能"""
    print("\n=== 测试语音功能 ===")
    from backend.services.voice_service import get_voice_service
    
    service = get_voice_service()
    
    # 测试TTS
    audio = service.text_to_speech("测试语音合成")
    print(f"✓ TTS测试通过: {audio}")

def test_ppt():
    """测试PPT功能"""
    print("\n=== 测试PPT功能 ===")
    from backend.services.advanced_ppt_service import get_ppt_service
    
    service = get_ppt_service()
    
    # 测试PPT生成
    result = service.create_ppt_from_topic("测试主题", pages=3)
    print(f"✓ PPT测试通过: {result['pptx_path']}")

if __name__ == "__main__":
    try:
        test_voice()
        test_ppt()
        print("\n✓ 所有功能测试通过！")
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
```

---

##  API端点总览

### 语音API

```
POST /api/voice/speech-to-text    # 语音转文字
POST /api/voice/text-to-speech    # 文字转语音
POST /api/voice/dialogue           # 语音对话
GET  /api/voice/health             # 健康检查
```

### PPT API

```
POST /api/ppt/create-from-topic    # 从主题创建PPT
POST /api/ppt/json-to-pptx         # JSON转PPTX
POST /api/ppt/enhance-visuals      # 视觉增强
```

### 综合API

```
POST /api/integrated/voice-to-ppt      # 语音转PPT
POST /api/integrated/knowledge-to-ppt  # 知识库转PPT
```

---

##  使用场景

### 场景1: 语音助手

```python
# 用户说话
user_audio = "user_question.wav"

# 语音对话
result = voice_service.voice_dialogue(user_audio, chat_service)

# 播放回答
play_audio(result['assistant_audio'])
```

### 场景2: 快速生成PPT

```python
# 从主题生成
result = ppt_service.create_ppt_from_topic(
    topic="Antinet产品介绍",
    pages=10,
    style="modern"
)

# 打开PPT
open_file(result['pptx_path'])
```

### 场景3: 语音转PPT

```python
# 用户说出PPT主题
user_audio = "recording.wav"

# 自动生成PPT
result = integrated_service.voice_to_ppt(
    audio_path=user_audio,
    style="modern"
)

# 返回PPT
return result['pptx_path']
```

---

## 🎉 总结

### 推荐技术栈

**Faster-Whisper** - 语音识别  
**Coqui TTS** - 语音合成  
**pptx-generator** - PPT文件生成  
**ppt-generator** - PPT内容规划  
**nanobanana-ppt-visualizer** - PPT视觉增强  

### 核心优势

1. 完全本地化 - 所有功能离线运行
2. 深度集成 - 与现有知识库无缝对接
3. 功能丰富 - 语音+PPT+知识库
4. 性能优秀 - NPU加速+优化模型
5. 易于扩展 - 模块化设计

### 立即开始

```cmd
cd C:\test\antinet
install_all_features.bat
```

**完整的语音+PPT功能集成方案已准备就绪！** 🚀

---

*集成方案创建时间: 2026-01-26*  
*推荐技术栈: Faster-Whisper + Coqui TTS + PPT技能*  
*状态: 准备实施*
