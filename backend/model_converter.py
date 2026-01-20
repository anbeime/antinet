#!/usr/bin/env python3
# backend/model_converter.py - 模型转换工具 (ONNX → QNN)
"""
Antinet智能知识管家 - 模型转换脚本
将Hugging Face模型转换为QNN格式并部署到骁龙NPU

转换流程:
1. 下载Qwen2-1.5B模型 (PyTorch格式)
2. 转换为ONNX格式
3. 优化ONNX模型 (量化、算子融合)
4. 转换为QNN格式
5. 编译到NPU

使用方法:
    python model_converter.py --model qwen2-1.5b --output ./models
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Optional
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ModelConverter:
    """模型转换器"""

    def __init__(self, model_name: str, output_dir: Path):
        self.model_name = model_name
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def step1_download_model(self) -> Path:
        """步骤1: 下载预训练模型"""
        logger.info(f"[1/5] 下载模型: {self.model_name}")

        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer

            model_path = self.output_dir / "pytorch" / self.model_name
            model_path.mkdir(parents=True, exist_ok=True)

            logger.info(f"  从Hugging Face下载模型...")
            model = AutoModelForCausalLM.from_pretrained(
                f"Qwen/{self.model_name}",
                trust_remote_code=True,
                torch_dtype="float32"  # 使用FP32便于后续转换
            )
            tokenizer = AutoTokenizer.from_pretrained(
                f"Qwen/{self.model_name}",
                trust_remote_code=True
            )

            # 保存模型
            model.save_pretrained(model_path)
            tokenizer.save_pretrained(model_path)

            logger.info(f"  ✓ 模型已保存到: {model_path}")
            return model_path

        except Exception as e:
            logger.error(f"  ✗ 下载失败: {e}")
            logger.info(f"  提示: 如果网络问题,可以手动下载后放到 {model_path}")
            raise

    def step2_convert_to_onnx(self, pytorch_model_path: Path) -> Path:
        """步骤2: 转换为ONNX格式"""
        logger.info(f"[2/5] 转换为ONNX格式")

        try:
            import torch
            from transformers import AutoModelForCausalLM

            onnx_path = self.output_dir / "onnx" / f"{self.model_name}.onnx"
            onnx_path.parent.mkdir(parents=True, exist_ok=True)

            logger.info(f"  加载PyTorch模型...")
            model = AutoModelForCausalLM.from_pretrained(
                pytorch_model_path,
                trust_remote_code=True
            )
            model.eval()

            # 准备示例输入
            dummy_input = {
                "input_ids": torch.randint(0, 1000, (1, 128)),
                "attention_mask": torch.ones(1, 128, dtype=torch.long)
            }

            logger.info(f"  导出为ONNX...")
            torch.onnx.export(
                model,
                (dummy_input["input_ids"],),
                str(onnx_path),
                input_names=["input_ids"],
                output_names=["logits"],
                dynamic_axes={
                    "input_ids": {0: "batch", 1: "sequence"},
                    "logits": {0: "batch", 1: "sequence"}
                },
                opset_version=14
            )

            logger.info(f"  ✓ ONNX模型已保存到: {onnx_path}")
            return onnx_path

        except Exception as e:
            logger.error(f"  ✗ 转换失败: {e}")
            raise

    def step3_optimize_onnx(self, onnx_path: Path) -> Path:
        """步骤3: 优化ONNX模型"""
        logger.info(f"[3/5] 优化ONNX模型")

        try:
            from onnxruntime.quantization import quantize_dynamic, QuantType
            import onnx
            from onnx import optimizer

            optimized_path = onnx_path.parent / f"{onnx_path.stem}_optimized.onnx"
            quantized_path = onnx_path.parent / f"{onnx_path.stem}_quantized.onnx"

            # 步骤3.1: 图优化
            logger.info(f"  执行图优化...")
            model = onnx.load(str(onnx_path))
            optimized_model = optimizer.optimize(model, passes=[
                'eliminate_deadend',
                'eliminate_identity',
                'eliminate_nop_transpose',
                'fuse_consecutive_transposes',
                'fuse_matmul_add_bias_into_gemm',
            ])
            onnx.save(optimized_model, str(optimized_path))
            logger.info(f"  ✓ 图优化完成")

            # 步骤3.2: 动态量化 (INT8)
            logger.info(f"  执行INT8量化...")
            quantize_dynamic(
                str(optimized_path),
                str(quantized_path),
                weight_type=QuantType.QInt8
            )
            logger.info(f"  ✓ 量化完成")

            # 比较模型大小
            orig_size = os.path.getsize(onnx_path) / (1024**2)
            quant_size = os.path.getsize(quantized_path) / (1024**2)
            reduction = (1 - quant_size / orig_size) * 100

            logger.info(f"  模型大小: {orig_size:.2f}MB → {quant_size:.2f}MB (减少{reduction:.1f}%)")
            return quantized_path

        except Exception as e:
            logger.error(f"  ✗ 优化失败: {e}")
            logger.info(f"  跳过优化,使用原始ONNX模型")
            return onnx_path

    def step4_convert_to_qnn(self, onnx_path: Path) -> Path:
        """步骤4: 转换为QNN格式 (需要在AIPC上执行)"""
        logger.info(f"[4/5] 转换为QNN格式")

        qnn_path = self.output_dir / "qnn" / f"{self.model_name}.bin"
        qnn_path.parent.mkdir(parents=True, exist_ok=True)

        logger.warning(f"  ⚠ 此步骤需要在骁龙AIPC上执行!")
        logger.info(f"  请在AIPC上运行以下命令:")
        logger.info(f"  ")
        logger.info(f"  # 方法1: 使用QNN工具链")
        logger.info(f"  qnn-onnx-converter \\")
        logger.info(f"      --input_network {onnx_path} \\")
        logger.info(f"      --output_path {qnn_path.parent / f'{self.model_name}.cpp'}")
        logger.info(f"  ")
        logger.info(f"  qnn-model-lib-generator \\")
        logger.info(f"      -c {qnn_path.parent / f'{self.model_name}.cpp'} \\")
        logger.info(f"      -o {qnn_path}")
        logger.info(f"  ")
        logger.info(f"  # 方法2: 使用QAI AppBuilder (推荐)")
        logger.info(f"  python -c \"")
        logger.info(f"  import qai_appbuilder as qai")
        logger.info(f"  model = qai.convert_onnx_to_qnn(")
        logger.info(f"      '{onnx_path}',")
        logger.info(f"      backend='QNN',")
        logger.info(f"      device='NPU'")
        logger.info(f"  )")
        logger.info(f"  model.save('{qnn_path}')")
        logger.info(f"  \"")
        logger.info(f"  ")

        # 创建辅助脚本
        helper_script = self.output_dir / "convert_to_qnn_on_aipc.py"
        with open(helper_script, 'w', encoding='utf-8') as f:
            f.write(f'''#!/usr/bin/env python3
"""
在骁龙AIPC上运行此脚本以完成QNN转换
使用方法: python convert_to_qnn_on_aipc.py
"""

import sys
try:
    import qai_appbuilder as qai
except ImportError:
    print("错误: 请先安装 qai_appbuilder")
    print("pip install qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl")
    sys.exit(1)

print("开始转换ONNX模型到QNN格式...")
print(f"输入: {onnx_path}")
print(f"输出: {qnn_path}")

# 转换模型
model = qai.convert_onnx_to_qnn(
    str({repr(str(onnx_path))}),
    backend='QNN',
    device='NPU',
    precision='INT8'  # 使用量化模型
)

# 保存模型
model.save(str({repr(str(qnn_path))}))
print(f"✓ QNN模型已保存到: {qnn_path}")

# 性能测试
print("\\n运行性能测试...")
import numpy as np
test_input = np.random.randint(0, 1000, (1, 128), dtype=np.int64)

import time
latencies = []
for i in range(10):
    start = time.time()
    output = model.infer(input_ids=test_input)
    latency = (time.time() - start) * 1000
    latencies.append(latency)
    print(f"  Run {{i+1}}: {{latency:.2f}}ms")

avg_latency = sum(latencies) / len(latencies)
print(f"\\n平均延迟: {{avg_latency:.2f}}ms")
print(f"吞吐量: {{1000/avg_latency:.2f}} QPS")
''')

        logger.info(f"  ✓ 辅助脚本已创建: {helper_script}")
        logger.info(f"  在AIPC上运行: python {helper_script.name}")

        return qnn_path

    def step5_create_deployment_package(self):
        """步骤5: 创建部署包"""
        logger.info(f"[5/5] 创建部署包")

        deployment_script = self.output_dir / "deploy.py"
        with open(deployment_script, 'w', encoding='utf-8') as f:
            f.write(f'''#!/usr/bin/env python3
"""
Antinet智能知识管家 - 模型部署脚本
在骁龙AIPC上加载并测试QNN模型
"""

import sys
from pathlib import Path

# 模型路径
MODEL_PATH = Path(__file__).parent / "qnn" / "{self.model_name}.bin"

def load_model():
    """加载QNN模型"""
    try:
        import qai_appbuilder as qai
    except ImportError:
        print("错误: 请先安装 qai_appbuilder")
        sys.exit(1)

    print(f"加载QNN模型: {{MODEL_PATH}}")
    model = qai.load_model(str(MODEL_PATH), device="NPU")
    print("✓ 模型加载成功")
    return model

def test_inference(model):
    """测试推理"""
    import numpy as np
    import time

    print("\\n运行推理测试...")
    test_prompts = [
        "分析上个月的销售数据",
        "本季度营收增长趋势",
        "客户满意度调查结果"
    ]

    for prompt in test_prompts:
        print(f"\\n提示词: {{prompt}}")

        # 真实tokenization（需要实现）
        raise NotImplementedError("真实tokenization未实现。请使用真实的tokenizer将提示词转换为input_ids。")

        start = time.time()
        output = model.infer(input_ids=input_ids)
        latency = (time.time() - start) * 1000

        print(f"  延迟: {{latency:.2f}}ms")
        print(f"  输出形状: {{output.shape}}")

if __name__ == "__main__":
    model = load_model()
    test_inference(model)
    print("\\n✓ 部署测试完成!")
''')

        logger.info(f"  ✓ 部署脚本已创建: {deployment_script}")
        logger.info(f"  ")
        logger.info(f"=" * 60)
        logger.info(f"模型转换流程完成!")
        logger.info(f"=" * 60)
        logger.info(f"")
        logger.info(f"下一步操作:")
        logger.info(f"1. 将 {self.output_dir} 目录复制到AIPC")
        logger.info(f"2. 在AIPC上运行: python convert_to_qnn_on_aipc.py")
        logger.info(f"3. 测试部署: python deploy.py")
        logger.info(f"")


def main():
    parser = argparse.ArgumentParser(description='Antinet模型转换工具')
    parser.add_argument('--model', type=str, default='qwen2-1.5b',
                       help='模型名称 (默认: qwen2-1.5b)')
    parser.add_argument('--output', type=str, default='./models',
                       help='输出目录 (默认: ./models)')
    parser.add_argument('--skip-download', action='store_true',
                       help='跳过模型下载 (如果已下载)')

    args = parser.parse_args()

    print("=" * 60)
    print(f"Antinet智能知识管家 - 模型转换工具")
    print("=" * 60)
    print(f"模型: {args.model}")
    print(f"输出: {args.output}")
    print("")

    converter = ModelConverter(args.model, Path(args.output))

    try:
        # 步骤1: 下载模型
        if not args.skip_download:
            pytorch_model_path = converter.step1_download_model()
        else:
            pytorch_model_path = Path(args.output) / "pytorch" / args.model
            logger.info(f"[1/5] 跳过下载,使用现有模型: {pytorch_model_path}")

        # 步骤2: 转换为ONNX
        onnx_path = converter.step2_convert_to_onnx(pytorch_model_path)

        # 步骤3: 优化ONNX
        optimized_onnx_path = converter.step3_optimize_onnx(onnx_path)

        # 步骤4: 转换为QNN (在AIPC上执行)
        qnn_path = converter.step4_convert_to_qnn(optimized_onnx_path)

        # 步骤5: 创建部署包
        converter.step5_create_deployment_package()

    except KeyboardInterrupt:
        logger.info("\\n用户中断")
        sys.exit(0)
    except Exception as e:
        logger.error(f"转换失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
