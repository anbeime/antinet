# 受保护文件列表

这些文件是项目运行和开发必需的，**绝对不能删除**：

## 📋 核心文档（必须保留）

- `README.md` - 项目主文档
- `QUICK_START.md` - 快速启动指南
- `高通开发.md` - **高通AIPC开发指南（重要！）**
- `REASONABLE_CLEANUP_PLAN.md` - 合理清理计划
- `package.json` - 前端依赖配置
- `tsconfig.json` - TypeScript配置
- `vite.config.ts` - Vite配置
- `tailwind.config.js` - Tailwind配置
- `config.json` - 项目配置
- `index.html` - HTML入口

## 🚀 运行必需目录（必须保留）

- `venv/` - Python虚拟环境
- `venv_arm64/` - ARM64虚拟环境
- `node_modules/` - 前端依赖
- `tools/` - 工具文件（aria2c、wget等）
- `src/` - 前端源码
- `backend/` - 后端源码
- `data/` - 数据文件

## 🔧 重要文件

### 后端核心文件
- `backend/main.py` - 主服务器
- `backend/npu_core.py` - NPU核心逻辑
- `backend/config.py` - 配置文件
- `backend/routes/npu_routes.py` - NPU路由
- `backend/models/model_loader.py` - 模型加载器

### 前端核心文件
- `src/App.tsx` - 主应用
- `src/main.tsx` - 入口文件
- 所有 `src/components/*.tsx` 组件文件
- 所有 `src/pages/*.tsx` 页面文件
- `src/services/npuService.ts` - NPU服务

## ⚠️ 容易误删但必须保留的文件

以下文件曾经被误删，现在明确标记为受保护：

1. **`高通开发.md`** (299KB)
   - 用途：高通骁龙AIPC平台开发指南
   - 包含：NPU开发、模型部署、性能优化等重要信息
   - **重要性：⭐⭐⭐⭐⭐ (最高级)**

2. **`REASONABLE_CLEANUP_PLAN.md`**
   - 用途：合理的垃圾文件清理计划
   - **重要性：⭐⭐⭐⭐**

## 🚫 可以删除的文件类型

- `test_*.py` - 测试脚本
- `*_test.py` - 测试脚本
- `debug_*.py` - 调试脚本
- `diagnose*.py` - 诊断脚本
- `check*.py` - 检查脚本
- `*.log` - 日志文件
- `*.txt` - 临时文本文件（启动日志等）
- `*_REPORT.md` - 临时报告（除本文件外）
- `*_SUMMARY.md` - 临时总结（除核心文档外）
- `$null` - 空文件
- `*.skill` - 技能配置文件

---

**原则**：
- ❌ **永远不要删除**：核心文档、源代码、配置文件、运行必需目录
- ✅ **可以安全删除**：测试文件、日志、临时报告、空文件
- ⚠️ **删除前确认**：不确定的文件先检查内容，确认不影响系统运行

**更新记录**：
- 2026-01-23: 创建文件，添加`高通开发.md`到受保护列表（因曾被误删）
