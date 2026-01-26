# 🔍 PPT技能外部API依赖分析与本地化方案

## 📋 外部API依赖检查结果

### 无需外部API的技能（3个）

| 技能名称 | 依赖情况 | 说明 |
|---------|---------|------|
| **pptx-generator** | 完全本地 | 只使用 python-pptx，无外部API |
| **ppt-generator** | 完全本地 | 七角色协作是工作流程，不调用API |
| **nanobanana-ppt-visualizer** | 完全本地 | 只使用 Pillow 处理图像 |

###  需要外部API的技能（1个）

| 技能名称 | 外部API | 用途 | 是否必需 |
|---------|---------|------|---------|
| **ppt-roadshow-generator** | COZE TTS API | 文字转语音（配音） |  可选 |

---

## 🔍 详细分析

### 1. pptx-generator 完全本地

**功能**：JSON转PPTX文件生成

**依赖**：
```python
python-pptx>=1.0.2  # 本地库
pillow>=9.0.0       # 本地库
openpyxl>=3.1.0     # 本地库
```

**是否需要外部API**：❌ 否

**工作原理**：
- 读取JSON数据
- 使用 python-pptx 库在本地生成 .pptx 文件
- 完全离线运行

---

### 2. ppt-generator 完全本地

**功能**：七角色协作智能PPT生成

**依赖**：
```python
python-pptx>=0.6.21  # 本地库
```

**是否需要外部API**：❌ 否

**工作原理**：
- 七角色是**工作流程设计**，不是AI调用
- 角色1-7是指导用户按步骤完成PPT
- 输出JSON格式的PPT数据
- 完全离线运行

**说明**：
这个技能的"七角色"是一种**方法论**，类似于：
```
角色1（主题分析师）：请分析PPT主题
角色2（模板推荐师）：推荐合适的模板
角色3（内容规划师）：规划PPT结构
...
```

不是调用AI API，而是引导用户思考和输入。

---

### 3. nanobanana-ppt-visualizer 完全本地

**功能**：PPT视觉增强

**依赖**：
```python
pillow>=9.0.0        # 本地库
python-dotenv>=0.19.0  # 本地库
```

**是否需要外部API**：❌ 否

**工作原理**：
- 使用 Pillow 库在本地处理图像
- 生成 HTML 播放器
- 完全离线运行

---

### 4. ppt-roadshow-generator  需要外部API

**功能**：路演视频生成（配音+字幕+视频合成）

**依赖**：
```python
moviepy>=1.0.3   # 本地库（视频处理）
pillow>=9.0.0    # 本地库（图像处理）
pydub>=0.25.1    # 本地库（音频处理）
requests>=2.28.0 # 网络请求库
```

**外部API**：
- **COZE TTS API** - 文字转语音（配音功能）

**代码片段**：
```python
SKILL_ID = "7598365301381791753"
TTS_API_KEY = os.getenv(f"COZE_TTS_API_{SKILL_ID}", "")

class TTSVoiceGenerator:
    """Generator for TTS voiceover using COZE TTS API."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or TTS_API_KEY
        if not self.api_key:
            raise ValueError("TTS API key is required")
```

**哪些功能需要API**：
- 视频合成 - 本地（moviepy）
- 字幕生成 - 本地
- 音效处理 - 本地（pydub）
-  **配音（TTS）** - 需要 COZE TTS API

---

## 🎯 本地化改造方案

### 方案1: 使用本地TTS模型（推荐）

#### 1.1 使用 pyttsx3（离线TTS）

**优点**：
- 完全离线
- 跨平台（Windows/Mac/Linux）
- 无需额外安装
- 支持多种语音

**缺点**：
-  音质一般（机器人声音）
-  语音选择有限

**实现**：
```python
import pyttsx3

class LocalTTSGenerator:
    """本地TTS生成器（使用pyttsx3）"""
    
    def __init__(self, voice: str = "zh-CN"):
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 150)  # 语速
        self.engine.setProperty('volume', 0.9)  # 音量
        
        # 设置中文语音
        voices = self.engine.getProperty('voices')
        for v in voices:
            if 'chinese' in v.name.lower() or 'zh' in v.id.lower():
                self.engine.setProperty('voice', v.id)
                break
    
    def generate(self, text: str, output_path: str):
        """生成语音文件"""
        self.engine.save_to_file(text, output_path)
        self.engine.runAndWait()
        return output_path
```

**安装**：
```cmd
pip install pyttsx3
```

---

#### 1.2 使用 Coqui TTS（高质量离线TTS）

**优点**：
- 完全离线
- 音质好（接近真人）
- 支持多语言
- 开源免费

**缺点**：
-  模型文件较大（几百MB）
-  首次加载较慢
-  需要较好的CPU/GPU

**实现**：
```python
from TTS.api import TTS

class CoquiTTSGenerator:
    """高质量本地TTS生成器（使用Coqui TTS）"""
    
    def __init__(self, model_name: str = "tts_models/zh-CN/baker/tacotron2-DDC-GST"):
        # 加载中文TTS模型
        self.tts = TTS(model_name=model_name)
    
    def generate(self, text: str, output_path: str):
        """生成语音文件"""
        self.tts.tts_to_file(
            text=text,
            file_path=output_path
        )
        return output_path
```

**安装**：
```cmd
pip install TTS
```

---

#### 1.3 使用 Antinet 现有的 NPU 模型

**优点**：
- 完全离线
- 利用现有NPU加速
- 与项目集成度高
- 音质可控

**缺点**：
-  需要集成TTS模型到NPU
-  开发工作量较大

**实现思路**：
```python
from backend.models.model_loader import get_model_loader

class NPUTTSGenerator:
    """基于NPU的TTS生成器"""
    
    def __init__(self):
        self.loader = get_model_loader()
        # 加载TTS模型到NPU
        # 需要先转换TTS模型为QNN格式
    
    def generate(self, text: str, output_path: str):
        """使用NPU生成语音"""
        # 调用NPU推理
        audio_data = self.loader.infer_tts(text)
        # 保存音频文件
        self._save_audio(audio_data, output_path)
        return output_path
```

---

### 方案2: 移除配音功能（最简单）

如果不需要配音功能，可以：

**修改 `audio_processor.py`**：
```python
class LocalAudioProcessor:
    """本地音频处理器（无TTS）"""
    
    def __init__(self):
        pass
    
    def generate_voiceover(self, text: str, output_path: str):
        """生成静音音频（占位符）"""
        from pydub import AudioSegment
        from pydub.generators import Sine
        
        # 生成静音音频
        duration_ms = len(text) * 200  # 估算时长
        silence = AudioSegment.silent(duration=duration_ms)
        silence.export(output_path, format="mp3")
        return output_path
    
    def add_background_music(self, video_path: str, music_path: str):
        """添加背景音乐（可选）"""
        # 使用本地音乐文件
        pass
```

---

### 方案3: 使用开源TTS API（在线但免费）

如果可以联网，可以使用免费的开源TTS API：

#### 3.1 Edge TTS（微软免费TTS）

**优点**：
- 免费无限制
- 音质好
- 支持多语言
- 无需API Key

**实现**：
```python
import edge_tts
import asyncio

class EdgeTTSGenerator:
    """微软Edge TTS生成器（免费）"""
    
    def __init__(self, voice: str = "zh-CN-XiaoxiaoNeural"):
        self.voice = voice
    
    async def generate_async(self, text: str, output_path: str):
        """异步生成语音"""
        communicate = edge_tts.Communicate(text, self.voice)
        await communicate.save(output_path)
        return output_path
    
    def generate(self, text: str, output_path: str):
        """同步生成语音"""
        asyncio.run(self.generate_async(text, output_path))
        return output_path
```

**安装**：
```cmd
pip install edge-tts
```

---

## 📊 方案对比

| 方案 | 是否离线 | 音质 | 速度 | 难度 | 推荐度 |
|------|---------|------|------|------|--------|
| **pyttsx3** | 是 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| **Coqui TTS** | 是 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **NPU TTS** | 是 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **移除配音** | 是 | ❌ 无 | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| **Edge TTS** | ❌ 否 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |

---

## 🎯 推荐方案

### 短期方案：Coqui TTS（推荐）

**理由**：
- 完全离线
- 音质好
- 实现简单
- 开源免费

**实施步骤**：

1. **安装依赖**
```cmd
cd C:\test\antinet
venv_arm64\Scripts\activate
pip install TTS
```

2. **修改 audio_processor.py**
```python
# 替换 COZE TTS API 为 Coqui TTS
from TTS.api import TTS

class LocalTTSGenerator:
    def __init__(self):
        # 使用中文模型
        self.tts = TTS(model_name="tts_models/zh-CN/baker/tacotron2-DDC-GST")
    
    def generate(self, text: str, output_path: str):
        self.tts.tts_to_file(text=text, file_path=output_path)
        return output_path
```

3. **测试**
```python
generator = LocalTTSGenerator()
generator.generate("欢迎使用Antinet智能知识管家", "test.wav")
```

---

### 长期方案：集成到NPU

**理由**：
- 利用现有NPU硬件
- 推理速度快
- 与项目深度集成

**实施步骤**：

1. **选择TTS模型**
   - 推荐：FastSpeech2 或 VITS
   - 需要转换为QNN格式

2. **转换模型**
```bash
# 将PyTorch TTS模型转换为ONNX
python convert_tts_to_onnx.py

# 将ONNX转换为QNN
qnn-onnx-converter --input tts_model.onnx --output tts_model.dlc
```

3. **集成到NPU加载器**
```python
class NPUModelLoader:
    def load_tts_model(self):
        # 加载TTS模型到NPU
        pass
    
    def infer_tts(self, text: str):
        # NPU推理生成语音
        pass
```

---

## 🔧 立即实施

### 步骤1: 修改 ppt-roadshow-generator

创建 `backend/skills/ppt-roadshow-generator/scripts/local_audio_processor.py`：

```python
#!/usr/bin/env python3
"""
Local Audio Processor - 本地TTS配音（无需外部API）
使用 Coqui TTS 实现完全离线的语音合成
"""

from TTS.api import TTS
from pathlib import Path
from typing import Optional

class LocalTTSGenerator:
    """本地TTS生成器"""
    
    def __init__(self, model_name: str = "tts_models/zh-CN/baker/tacotron2-DDC-GST"):
        """
        初始化本地TTS生成器
        
        Args:
            model_name: TTS模型名称
        """
        print(f"[LocalTTS] 加载模型: {model_name}")
        self.tts = TTS(model_name=model_name)
        print("[LocalTTS] 模型加载完成")
    
    def generate_voiceover(
        self,
        text: str,
        output_path: str,
        speaker: Optional[str] = None
    ) -> str:
        """
        生成配音文件
        
        Args:
            text: 要转换的文本
            output_path: 输出音频文件路径
            speaker: 说话人（可选）
        
        Returns:
            生成的音频文件路径
        """
        print(f"[LocalTTS] 生成配音: {text[:50]}...")
        
        self.tts.tts_to_file(
            text=text,
            file_path=output_path,
            speaker=speaker
        )
        
        print(f"[LocalTTS] 配音已保存: {output_path}")
        return output_path
    
    def batch_generate(
        self,
        texts: list,
        output_dir: str
    ) -> list:
        """
        批量生成配音
        
        Args:
            texts: 文本列表
            output_dir: 输出目录
        
        Returns:
            生成的音频文件路径列表
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        audio_files = []
        for idx, text in enumerate(texts):
            output_path = output_dir / f"voiceover_{idx:03d}.wav"
            self.generate_voiceover(text, str(output_path))
            audio_files.append(str(output_path))
        
        return audio_files


# 使用示例
if __name__ == "__main__":
    generator = LocalTTSGenerator()
    
    # 测试单个配音
    generator.generate_voiceover(
        text="欢迎使用Antinet智能知识管家，这是一款端侧智能数据工作站。",
        output_path="test_voiceover.wav"
    )
    
    print("[测试] 配音生成成功！")
```

### 步骤2: 安装依赖

```cmd
cd C:\test\antinet
venv_arm64\Scripts\activate
pip install TTS
```

### 步骤3: 测试

```cmd
cd backend\skills\ppt-roadshow-generator\scripts
python local_audio_processor.py
```

---

##  总结

### 外部API依赖情况

| 技能 | 外部API | 本地化方案 | 状态 |
|------|---------|-----------|------|
| pptx-generator | ❌ 无 | - | 可直接使用 |
| ppt-generator | ❌ 无 | - | 可直接使用 |
| nanobanana-ppt-visualizer | ❌ 无 | - | 可直接使用 |
| ppt-roadshow-generator |  COZE TTS | Coqui TTS | 可本地化 |

### 推荐方案

**立即可用**（3个技能）：
- pptx-generator
- ppt-generator  
- nanobanana-ppt-visualizer

**需要改造**（1个技能）：
-  ppt-roadshow-generator → 使用 Coqui TTS 替代

### 改造难度

- **难度**：⭐⭐（简单）
- **时间**：30分钟
- **效果**：完全离线，音质良好

**所有技能都可以实现完全本地化！** 🎉

---

*分析报告创建时间: 2026-01-26*  
*外部API依赖: 仅1个（可替代）*  
*本地化方案: 可行*  
*状态: 分析完成*
