# Antinet 智能知识管家

一个部署于Windows ARM64的端侧智能数据工作站，通过NPU加速的Qwen2.0-7B实现自然语言驱动的数据分析与知识管理闭环。支持四色卡片生成、批量处理、OCR识别、知识图谱关联，基于锦衣卫风格的8-Agent协作架构。

## 核心特性

### 四色卡片体系
- **蓝色卡片（蓝卡）**：基础事实，客观、稳定、可验证
- **绿色卡片（绿卡）**：积极事实，增长、优化、改善
- **黄色卡片（黄卡）**：警示事实，异常、波动、潜在风险
- **红色卡片（红卡）**：严重事实，危机、严重错误、重大损失

### 8-Agent协作架构（锦衣卫风格）

1. **锦衣卫总指挥使（Orchestrator）**：系统最高调度核心，负责任务分解、流程控制、异常处理、结果聚合
2. **密卷房（Preprocessor）**：数据感知与预处理专家，负责原始数据的清洗、转换、特征提取
3. **通政司（Fact Generator）**：事实生成专家，基于数据挖掘关键事实，生成结构化事实卡片
4. **监察院（Interpreter）**：解释生成专家，基于事实和知识库，生成可理解的解释说明
5. **刑狱司（Risk Detector）**：风险检测专家，基于历史数据和规则，识别潜在风险
6. **参谋司（Action Advisor）**：行动建议专家，基于事实、解释和风险，生成可执行的行动建议
7. **太史阁（Memory）**：记忆管理专家，负责知识的存储、检索、更新和关联
8. **驿传司（Messenger）**：消息传递专家，负责Agent间的消息转发、通知推送、人工协同

## 技术栈

### 后端
- **框架**：FastAPI + Python 3.10+
- **数据库**：SQLite（元数据）+ DuckDB（分析数据）
- **模型**：Qwen2.0-7B-SSD-8380-2.34
- **向量检索**：BGE-M3 + FAISS/Chroma
- **NPU**：QNN SDK + GenieAPIService（HTTP API）

### 前端
- **框架**：React 18 + TypeScript + Vite
- **样式**：Tailwind CSS
- **动画**：Framer Motion
- **图表**：Recharts
- **图标**：Lucide React
- **HTTP客户端**：Axios

## 性能指标

- NPU推理延迟：<500ms
- 本地向量检索响应：<100ms
- 数据存储：端侧AES-256加密存储
- 数据安全：数据不出域

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- Windows ARM64
- QAI AppBuilder
- QNN SDK
- GenieAPIService

### 安装部署

#### Windows环境

1. **克隆项目**
```bash
git clone <repository-url>
cd data-analysis-iteration
```

2. **运行部署脚本**
```cmd
deploy.bat
```

3. **配置环境变量**
编辑 `.env` 文件，配置GenieAPIService、QNN SDK、模型路径等参数。

4. **启动后端服务**
```cmd
start.bat
```

5. **启动前端服务**
```cmd
cd frontend
npm install
npm run dev
```

#### Linux/Mac环境

1. **克隆项目**
```bash
git clone <repository-url>
cd data-analysis-iteration
```

2. **运行部署脚本**
```bash
chmod +x deploy.sh
./deploy.sh
```

3. **配置环境变量**
编辑 `.env` 文件，配置GenieAPIService、QNN SDK、模型路径等参数。

4. **启动后端服务**
```bash
chmod +x start.sh
./start.sh
```

5. **启动前端服务**
```bash
cd frontend
npm install
npm run dev
```

## 目录结构

```
data-analysis-iteration/
├── agents/              # 8-Agent智能体模块
│   ├── __init__.py
│   ├── orchestrator.py      # 锦衣卫总指挥使
│   ├── preprocessor.py      # 密卷房
│   ├── fact_generator.py    # 通政司
│   ├── interpreter.py        # 监察院
│   ├── risk_detector.py     # 刑狱司
│   ├── action_advisor.py    # 参谋司
│   ├── memory.py            # 太史阁
│   └── messenger.py         # 驿传司
├── api/                 # FastAPI路由
│   ├── __init__.py
│   ├── cards.py            # 卡片管理API
│   ├── knowledge.py         # 知识图谱API
│   ├── rules.py            # 规则管理API
│   └── generate.py         # 报告生成API
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── api/          # API客户端
│   │   ├── components/   # React组件
│   │   ├── App.tsx       # 主应用组件
│   │   └── main.tsx      # 应用入口
│   ├── package.json
│   └── vite.config.ts
├── data/                # 数据目录
├── logs/                # 日志目录
├── temp/                # 临时目录
├── config.py            # 应用配置
├── main.py              # FastAPI主应用
├── requirements.txt     # Python依赖
├── .env.example         # 环境变量示例
├── deploy.sh/bat        # 部署脚本
└── start.sh/bat         # 启动脚本
```

## 核心功能

### 1. 卡片管理
- 创建、查看、编辑、删除四色卡片
- 按颜色、分类、关键词筛选卡片
- 批量导入导出卡片

### 2. 知识图谱
- 可视化展示知识关联
- 节点交互（点击、缩放、旋转）
- 语义检索相关知识

### 3. 规则配置
- 自定义规则引擎
- 规则启用/禁用
- 规则执行监控

### 4. 报告生成
- 四色卡片自动生成
- 完整分析报告生成
- 批量查询处理

### 5. 知识管理
- 知识存储与检索
- 知识关联与更新
- 知识图谱构建

## API文档

启动后端服务后，访问以下地址查看API文档：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 配置说明

### 环境变量（.env）

```env
# GenieAPIService配置
GENIE_API_BASE_URL=http://localhost:5000
GENIE_MODEL_PATH=C:/model/Qwen2.0-7B-SSD-8380-2.34/

# QNN SDK配置
QNN_SDK_PATH=C:/QNN/2.22.0.240122

# 数据库配置
DATABASE_URL=sqlite:///./data/antinet.db
DUCKDB_PATH=./data/antinet.duckdb

# 向量检索配置
VECTOR_DB_PATH=./data/vector_db
EMBEDDING_MODEL=bge-m3
EMBEDDING_DIM=1024

# 应用配置
APP_NAME=Antinet
APP_VERSION=1.0.0
DEBUG=true

# CORS配置
ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_CREDENTIALS=true

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log

# 性能配置
MAX_WORKERS=4
REQUEST_TIMEOUT=30
BATCH_SIZE=100
```

## 开发指南

### 添加新的Agent

1. 在 `agents/` 目录下创建新的Agent模块
2. 继承基础Agent类（如需要）
3. 实现核心方法
4. 在 `agents/__init__.py` 中注册

### 添加新的API路由

1. 在 `api/` 目录下创建新的路由模块
2. 定义路由处理函数
3. 在 `main.py` 中注册路由

### 添加新的前端组件

1. 在 `frontend/src/components/` 目录下创建新组件
2. 导入必要的依赖
3. 定义组件接口和逻辑
4. 在 `App.tsx` 中使用

## 故障排除

### 常见问题

1. **GenieAPIService连接失败**
   - 检查GenieAPIService是否启动
   - 检查端口配置是否正确
   - 查看日志文件 `logs/server.log`

2. **模型加载失败**
   - 检查模型路径是否正确
   - 检查QNN SDK是否正确配置
   - 检查NPU驱动是否正常

3. **前端无法访问后端API**
   - 检查CORS配置
   - 检查后端服务是否启动
   - 检查代理配置是否正确

### 日志查看

```bash
# 查看后端日志
tail -f logs/server.log

# 查看应用日志
tail -f logs/app.log
```

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱：support@antinet.ai
- 官网：https://antinet.ai
- 文档：https://docs.antinet.ai
