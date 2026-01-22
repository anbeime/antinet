# Antinet智能知识管家 - 快速启动指南

## 系统架构

```
┌─────────────────────────────────────────┐
│  前端UI (端口3001)                      │
│  React + Vite + TypeScript              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  后端API (端口8000)                     │
│  FastAPI + 8-Agent + NPU               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  NPU推理引擎                             │
│  骁龙X Elite NPU + GenieContext        │
└─────────────────────────────────────────┘
```

## 快速启动

### 方法1：一键启动所有服务（推荐）

双击运行：
```
start_complete_system.bat
```

此脚本将：
1. 启动后端API服务（端口8000）
2. 启动前端UI服务（端口3001）
3. 检查答疑服务状态（端口8910，可选）
4. 验证所有服务正常运行

### 方法2：手动启动

**步骤1：启动后端**
```powershell
cd c:\test\antinet\data-analysis-iteration
..\venv_arm64\Scripts\python.exe main.py
```

**步骤2：启动前端（新窗口）**
```powershell
cd c:\test\antinet\data-analysis-iteration\frontend
npm run dev
```

**步骤3：访问系统**
打开浏览器访问：http://localhost:3001

## 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端UI | http://localhost:3001 | 主界面 |
| API文档 | http://localhost:8000/docs | Swagger文档 |
| 健康检查 | http://localhost:8000/api/health | 系统状态 |
| 备选前端 | http://localhost:5173 | 旧版前端 |

## 核心功能

### 1. 智能数据分析（8-Agent协作）
- **锦衣卫总指挥使**：任务分解与调度
- **密卷房**：数据预处理
- **通政司**：事实提取
- **监察院**：解释生成
- **刑狱司**：风险识别
- **参谋司**：行动建议
- **太史阁**：知识存储
- **驿传司**：结果整合

### 2. NPU加速推理
- 骁龙X Elite NPU
- 推理延迟：< 500ms
- 数据不出域
- 端侧AI处理

### 3. 四色卡片系统
- **蓝色卡片**：核心概念
- **绿色卡片**：关联链接
- **黄色卡片**：参考来源
- **红色卡片**：索引关键词

### 4. 知识图谱可视化
- 动态知识网络
- 智能关联发现
- 团队协作支持

## 配置检查

### 必需配置
- [ ] NPU模型路径：`C:/model/Qwen2.0-7B-SSD-8380-2.34/`
- [ ] DLL路径：`C:/ai-engine-direct-helper/samples/qai_libs`
- [ ] 桥接库：`C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc`
- [ ] Python环境：`venv_arm64` (ARM64原生)

### 验证命令
```powershell
# 检查Python架构
..\venv_arm64\Scripts\python.exe -c "import platform; print(platform.machine())"
# 应输出：ARM64

# 检查qai_appbuilder
..\venv_arm64\Scripts\pip.exe list | findstr qai
# 应输出：qai_appbuilder 2.38.0

# 测试NPU
cd data-analysis-iteration
..\venv_arm64\Scripts\python.exe test_arm64_integration.py
```

## 故障排除

### 问题1：前端无法访问
**现象**：localhost:3001 拒绝连接

**解决**：
1. 检查前端是否启动：`cd frontend && npm run dev`
2. 检查端口是否被占用：`netstat -ano | findstr :3001`
3. 检查package.json配置

### 问题2：后端API连接失败
**现象**：前端显示"后端服务连接失败"

**解决**：
1. 检查后端是否启动：访问 http://localhost:8000/api/health
2. 检查NPU是否加载：查看后端日志
3. 验证DLL路径：检查config.json配置

### 问题3：NPU未加载
**现象**：日志显示"NPU不可用"

**解决**：
1. 确认使用ARM64 Python：`platform.machine()`
2. 验证qai_appbuilder版本：`pip list | findstr qai`
3. 检查模型路径是否存在
4. 查看详细日志：backend.log

### 问题4：文件解析失败
**现象**：PDF/Excel/Word导入报错

**解决**：
1. 当前仅支持Markdown和文本文件
2. PDF/Excel/Word需要后端API支持（开发中）
3. 检查后端日志获取详细信息

## 关键改进（2025-01-22）

### ✅ 已移除所有模拟代码
- 前端不再提供模拟回复
- 后端严格模式拒绝模拟数据
- 所有错误明确显示问题根源
- 提供详细的修复指导

### ✅ 新前端整合
- 端口3001（data-analysis-iteration）
- 8-Agent协作架构
- NPU加速推理
- 现代化的React组件

### ✅ API一致性
- 前端统一调用`localhost:8000/api`
- 代理配置自动转发
- 类型定义匹配后端

## 开发文档

- [ARM64适配指南](data-analysis-iteration/ARM64_ADAPTATION.md)
- [严格模式说明](data-analysis-iteration/STRICT_MODE_README.md)
- [8-Agent架构](data-analysis-iteration/8_AGENT_IMPLEMENTATION_COMPLETE.md)
- [API文档](http://localhost:8000/docs)

## 许可证

MIT License - 企业级AI知识管理系统
