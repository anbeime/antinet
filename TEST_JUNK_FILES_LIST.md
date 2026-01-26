# 测试垃圾文件列表（排除在上传仓库外）

## 🗑️ 测试脚本文件
- `quick_test.py` - 快速测试脚本
- `test_*.py` - 所有测试脚本（test_communication.py, test_npu_simple.py, test_api_simple.py等）
- `diagnose_*.py` - 诊断脚本（diagnose_npu_device.py, diagnose_npu_error.py等）
- `fix_*.py` - 修复脚本（fix_venv.py, fix_npu_device.py相关）
- `verify_*.py` - 验证脚本（verify_fix.py, verify_npu_inference.py等）
- `check_*.py` - 检查脚本（check_dll_deps.py, check_npu_processes.py等）
- `run_*.bat` - 运行批处理脚本
- `*.bat`, `*.cmd` - 各种批处理文件（除必要的启动脚本）

## 📋 文档垃圾文件（已删除的总结文档）
- `*_SUMMARY_*.md` - 进度总结文档
- `*_PLAN.md` - 计划文档
- `*_COMPLETED.md` - 完成报告
- `*_REFACTORING_SUMMARY.md` - 重构总结
- `*_INTEGRATION.md` - 集成文档
- `*_GUIDE.md` - 指南文档（临时性的）
- `*_README.md` - 临时README
- `*_CONTENT.md` - 内容文档
- `*_OUTLINE.md` - 大纲文档

## 📊 具体要排除的文件
- API_INTEGRATION_GUIDE.md
- CLEANUP_COMPLETED.md
- COMPONENTS_REFACTORING_SUMMARY.md
- KNOWLEDGE_CHATBOT_INTEGRATION.md
- PPT_CONTENT.md
- PPT_OUTLINE.md
- PPT_README.md
- PROTECTED_FILES.md
- REASONABLE_CLEANUP_PLAN.md
- TODAY_PROGRESS_SUMMARY_2026-01-24.md
- TODAY_SUMMARY_2026-01-24.md
- TOMORROW_PLAN.md
- UNIFIED_BACKEND_GUIDE.md
- quick_test.py
- test_new_apis.py
- test_npu_real.py
- venv/ - 整个虚拟环境目录
- 各种日志文件（backend*.log等）
- 临时输出文件（test_output.pptx, test_report.pdf等）
- 演示文件（demo_screencast.bat等）
- 部署脚本（deploy_*.bat等）

## ✅ 保留的核心文件
- 源代码文件（backend/, src/, data-analysis/）
- 核心配置文件（package.json, tsconfig.json, tailwind.config.js等）
- 必要的启动脚本（start_backend_direct.bat等）
- 核心文档（README.md, LICENSE, 重要的设计文档）
- .gitignore 文件