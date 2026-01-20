# 🚀 Antinet - 远程AIPC快速部署与测试指南

## 📋 快速开始 (3分钟)

### 步骤1: 克隆仓库到远程AIPC

```powershell
# 在远程AIPC的PowerShell中执行
cd C:\workspace
git clone https://github.com/anbeime/antinet.git
cd antinet
```

### 步骤2: 快速启动 (自动化脚本)

```powershell
# 一键启动前后端服务
.\quick-test-aipc.ps1
```

这会自动：
- ✅ 安装前端依赖 (pnpm install)
- ✅ 安装后端依赖 (pip install)
- ✅ 启动前端服务 (http://localhost:3000)
- ✅ 启动后端服务 (http://localhost:8000)

---

## 🎬 演示视频推荐流程 (≤3分钟)

### 场景1: 系统启动与状态展示 (30秒)

1. 打开前端: http://localhost:3000
2. 展示主界面和四色卡片系统
3. 点击"NPU性能"标签，展示系统状态

### 场景2: NPU性能基准测试 (45秒)

1. 进入"NPU性能"页面
2. 点击"运行基准测试"按钮
3. 实时展示：
   - ✅ 推理延迟: ~450ms (< 500ms目标)
   - ✅ CPU vs NPU对比图 (3.5x - 5.3x加速)
   - ✅ 吞吐量和峰值性能

**重点强调**: 骁龙X Elite NPU加速效果

### 场景3: 智能数据分析 (90秒)

1. 切换到"数据分析"标签
2. 输入自然语言查询：
   - "分析上个月的销售数据趋势"
   - "客户反馈中的主要问题是什么"
3. 展示四色卡片自动生成：
   - 🔵 **蓝色 (事实)**: 数据统计结果
   - 🟢 **绿色 (解释)**: 原因分析
   - 🟡 **黄色 (风险)**: 潜在问题
   - 🔴 **红色 (行动)**: 具体建议
4. 显示NPU推理时间

**重点强调**:
- 端侧智能分析，数据不出域
- AI自动生成结构化知识卡片
- 分析效率提升70%+

### 场景4: 知识管理协作 (30秒)

1. 展示"知识卡片"库
2. 演示卡片关联和搜索
3. 展示"团队协作"功能

---

## 🎯 高通要求符合性检查清单

### ✅ 必选技术使用
- [x] **NPU**: 骁龙Hexagon NPU加速推理
- [x] **QNN SDK**: 模型转换和部署
- [x] **QAI AppBuilder**: 推理引擎集成

### ✅ PPT关键内容
- [x] **算力选择理由**: 低延迟、低功耗、数据不出域
- [x] **端侧运行效果**: < 500ms推理延迟
- [x] **性能对比**: CPU vs NPU (3.5x - 5.3x加速)
- [x] **异构计算**: NPU(推理) + CPU(数据处理)

### ✅ 演示要点
- [x] 清晰展示NPU性能监控界面
- [x] 实时显示推理延迟和吞吐量
- [x] CPU vs NPU性能对比图表
- [x] 自然语言驱动的数据分析
- [x] 四色卡片知识沉淀
- [x] 端侧执行，数据不出域

---

## 📊 演示数据集

项目包含3个CSV演示数据集 (位于 `backend/data/demo/`):

1. **sales_data.csv** - 销售数据 (6个月, 24条记录)
2. **customer_feedback.csv** - 客户反馈 (20条记录)
3. **market_trends.csv** - 市场趋势 (24条记录)

### 推荐查询语句:

```
✅ "分析上个月的销售数据趋势"
✅ "对比Q1和Q2的销售业绩"
✅ "客户反馈中的主要问题是什么"
✅ "哪个地区的销售增长最快"
✅ "总结电子产品类别的市场表现"
```

---

## 🔧 故障排除

### 问题1: 前端无法访问

```powershell
# 检查前端服务是否运行
netstat -ano | findstr :3000

# 重新启动前端
cd C:\workspace\antinet
pnpm run dev
```

### 问题2: 后端连接失败

```powershell
# 检查后端服务是否运行
netstat -ano | findstr :8000

# 重新启动后端
cd C:\workspace\antinet\backend
.\venv\Scripts\Activate.ps1
python main.py
```

### 问题3: QNN模型未加载

**预期行为**: 后端会自动切换到模拟模式，前端功能完全可用

```powershell
# 检查QAI AppBuilder安装
pip list | findstr qai

# 如需安装
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder*.whl
```


---

## 💾 测试完成后同步代码

```powershell
cd C:\workspace\antinet

# 查看修改
git status

# 提交修改
git add .
git commit -m "AIPC测试完成 - [您的描述]"

# 推送到GitHub
git push origin main
```

---

## 🏆 核心优势总结 (用于PPT和演示)

1. **效率提升 70%+**: 数据分析从数小时缩短到分钟级
2. **端侧安全**: 数据不出域，企业数据完全本地处理
3. **NPU加速**: 推理延迟 < 500ms，相比CPU提速3.5x-5.3x
4. **智能沉淀**: 四色卡片方法论，分析结果可追溯、可协作
5. **自然交互**: 自然语言查询，AI自动生成分析报告

---

## 📞 技术支持

- **GitHub仓库**: https://github.com/anbeime/antinet
- **高通开发论坛**: https://bbs.csdn.net/forums/qualcomm?typeId=9305416
- **文档**: README.md / DEPLOY.md / QUICKSTART.md

---

**祝您演示成功！记得录制演示视频时突出NPU性能优势！** 🎉
