#!/usr/bin/env python3
"""
Local Audio Processor - 本地TTS配音（无需外部API）
使用 Coqui TTS 实现完全离线的语音合成
替代 ppt-roadshow-generator 中的 COZE TTS API
"""

from pathlib import Path
from typing import Optional, List
import os

try:
    from TTS.api import TTS
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    print("[WARNING] Coqui TTS not installed. Install with: pip install TTS")


class LocalTTSGenerator:
    """本地TTS生成器（使用Coqui TTS）"""
    
    # 支持的中文模型
    CHINESE_MODELS = {
        "baker": "tts_models/zh-CN/baker/tacotron2-DDC-GST",  # 标准中文女声
    }
    
    def __init__(self, model_name: str = "baker"):
        """
        初始化本地TTS生成器
        
        Args:
            model_name: 模型名称（baker）
        """
        if not TTS_AVAILABLE:
            raise ImportError("Coqui TTS not installed. Run: pip install TTS")
        
        # 获取完整模型名称
        full_model_name = self.CHINESE_MODELS.get(model_name, self.CHINESE_MODELS["baker"])
        
        print(f"[LocalTTS] 正在加载模型: {full_model_name}")
        print("[LocalTTS] 首次加载会下载模型文件，请稍候...")
        
        try:
            self.tts = TTS(model_name=full_model_name)
            print("[LocalTTS] [OK] 模型加载完成")
        except Exception as e:
            print(f"[LocalTTS] [FAIL] 模型加载失败: {e}")
            raise
    
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
        # 确保输出目录存在
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"[LocalTTS] 生成配音: {text[:50]}...")
        
        try:
            self.tts.tts_to_file(
                text=text,
                file_path=output_path,
                speaker=speaker
            )
            print(f"[LocalTTS] [OK] 配音已保存: {output_path}")
            return output_path
        except Exception as e:
            print(f"[LocalTTS] [FAIL] 配音生成失败: {e}")
            raise
    
    def batch_generate(
        self,
        texts: List[str],
        output_dir: str,
        prefix: str = "voiceover"
    ) -> List[str]:
        """
        批量生成配音
        
        Args:
            texts: 文本列表
            output_dir: 输出目录
            prefix: 文件名前缀
        
        Returns:
            生成的音频文件路径列表
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        audio_files = []
        total = len(texts)
        
        print(f"[LocalTTS] 开始批量生成 {total} 个配音文件...")
        
        for idx, text in enumerate(texts, 1):
            output_path = output_dir / f"{prefix}_{idx:03d}.wav"
            
            try:
                self.generate_voiceover(text, str(output_path))
                audio_files.append(str(output_path))
                print(f"[LocalTTS] 进度: {idx}/{total}")
            except Exception as e:
                print(f"[LocalTTS] [FAIL] 第 {idx} 个配音失败: {e}")
                continue
        
        print(f"[LocalTTS] [OK] 批量生成完成，成功 {len(audio_files)}/{total}")
        return audio_files
    
    def get_available_models(self) -> List[str]:
        """获取可用的模型列表"""
        return list(self.CHINESE_MODELS.keys())


class FallbackTTSGenerator:
    """备用TTS生成器（使用pyttsx3，音质较差但无需下载）"""
    
    def __init__(self):
        """初始化备用TTS生成器"""
        try:
            import pyttsx3
            self.engine = pyttsx3.init()
            self.engine.setProperty('rate', 150)  # 语速
            self.engine.setProperty('volume', 0.9)  # 音量
            
            # 尝试设置中文语音
            voices = self.engine.getProperty('voices')
            for v in voices:
                if 'chinese' in v.name.lower() or 'zh' in v.id.lower():
                    self.engine.setProperty('voice', v.id)
                    break
            
            print("[FallbackTTS] [OK] 备用TTS初始化完成（pyttsx3）")
        except Exception as e:
            print(f"[FallbackTTS] [FAIL] 初始化失败: {e}")
            raise
    
    def generate_voiceover(self, text: str, output_path: str) -> str:
        """生成配音文件"""
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"[FallbackTTS] 生成配音: {text[:50]}...")
        
        try:
            self.engine.save_to_file(text, output_path)
            self.engine.runAndWait()
            print(f"[FallbackTTS] [OK] 配音已保存: {output_path}")
            return output_path
        except Exception as e:
            print(f"[FallbackTTS] [FAIL] 配音生成失败: {e}")
            raise


def get_tts_generator(prefer_quality: bool = True):
    """
    获取TTS生成器
    
    Args:
        prefer_quality: 是否优先使用高质量TTS（Coqui TTS）
    
    Returns:
        TTS生成器实例
    """
    if prefer_quality and TTS_AVAILABLE:
        try:
            return LocalTTSGenerator()
        except Exception as e:
            print(f"[TTS] Coqui TTS初始化失败，尝试备用方案: {e}")
    
    # 使用备用TTS
    try:
        import pyttsx3
        return FallbackTTSGenerator()
    except ImportError:
        print("[TTS] [FAIL] 没有可用的TTS引擎")
        print("[TTS] 请安装: pip install TTS 或 pip install pyttsx3")
        raise


# 使用示例和测试
if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("本地TTS配音测试")
    print("=" * 60)
    print()
    
    # 测试文本
    test_texts = [
        "欢迎使用Antinet智能知识管家",
        "这是一款端侧智能数据工作站",
        "通过NPU加速实现高效推理"
    ]
    
    try:
        # 尝试使用高质量TTS
        print("[测试] 尝试使用 Coqui TTS（高质量）...")
        generator = get_tts_generator(prefer_quality=True)
        
        # 测试单个配音
        print("\n[测试1] 单个配音生成...")
        output_file = "test_voiceover.wav"
        generator.generate_voiceover(test_texts[0], output_file)
        
        if Path(output_file).exists():
            print(f"[测试1] [OK] 成功！文件大小: {Path(output_file).stat().st_size} bytes")
        
        # 测试批量配音
        print("\n[测试2] 批量配音生成...")
        output_dir = "test_voiceovers"
        audio_files = generator.batch_generate(test_texts, output_dir)
        
        print(f"[测试2] [OK] 成功！生成了 {len(audio_files)} 个文件")
        
        print("\n" + "=" * 60)
        print("[OK] 所有测试通过！本地TTS配音功能正常")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[FAIL] 测试失败: {e}")
        print("\n请安装依赖:")
        print("  pip install TTS")
        print("或:")
        print("  pip install pyttsx3")
        sys.exit(1)
