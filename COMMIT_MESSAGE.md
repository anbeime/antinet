feat: 修复 NPU 模型加载器并更新性能文档

工作时段: 2026-01-17 11:00-12:00
完成内容:
- 修复 backend/models/model_loader.py 中的局部导入问题
  - 移除局部导入 `from qai_appbuilder import QNNConfig` (第198行)
  - 移除局部导入 `from qai_appbuilder import GenieContext` (第156行)
  - 解决 "cannot access local variable" 错误
- 更新 backend/PERFORMANCE_RESULTS.md
  - 添加完整的性能测试文档
  - 包含 QNNConfig 配置说明
  - 添加 GenieContext 加载流程
  - 包含异构计算和隐私保护说明
- 创建多个测试脚本用于验证 NPU 功能

性能数据:
- 模型: Qwen2.0-7B-SSD
- 预期推理延迟: ~450ms (目标 < 500ms)
- 运行设备: NPU (Hexagon HTP)
- QNN 版本: 2.34

技术架构:
- 使用 GenieContext 加载 7B+ 大模型
- QNNConfig 配置 HTP 后端 (NPU)
- Query() 方法执行真实推理
- CPU/GPU/NPU 异构计算

问题修复:
- 修复变量作用域冲突导致的错误
- 确保模块级导入避免遮蔽

遗留问题:
- 需要在真实 AIPC 验证端到端性能

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>