# Requests 到 Httpx 迁移文档

## 概述

本次修改将所有 Agent 文件中的同步 `requests` 替换为异步 `httpx`，以保持 FastAPI 异步框架的一致性。

## 修改文件列表

### 1. requirements.txt
- 添加了 `httpx>=0.25.0` 作为主要 HTTP 客户端
- 保留了 `requests>=2.31.0` 作为可选依赖（如用户要求）

### 2. backend/agents/orchestrator.py
- 移除了 `requests` 的可选依赖导入
- 以下方法从同步改为异步：
  - `dispatch_task()` - 任务下发
  - `monitor_agent_status()` - 状态监控
  - `receive_all_results()` - 成果接收
- 所有 `requests.post()` 改为 `httpx.AsyncClient().post()` 异步调用

### 3. backend/agents/jianchayuan.py
- 导入：`requests` → `httpx`
- 方法：`run()` 从同步改为异步
- HTTP 调用：`requests.post()` → `httpx.AsyncClient().post()`

### 4. backend/agents/xingyusi.py
- 导入：`requests` → `httpx`
- 方法：`run()` 从同步改为异步
- HTTP 调用：`requests.post()` → `httpx.AsyncClient().post()`

### 5. backend/agents/tongzhengsi.py
- 导入：`requests` → `httpx`
- 方法：`run()` 从同步改为异步
- HTTP 调用：`requests.post()` → `httpx.AsyncClient().post()`

### 6. backend/agents/mijuanfang.py
- 导入：`requests` → `httpx`
- 方法：`run()` 从同步改为异步
- HTTP 调用：`requests.post()` → `httpx.AsyncClient().post()`

### 7. backend/agents/canmousi.py
- 导入：`requests` → `httpx`
- 方法：`run()` 从同步改为异步
- HTTP 调用：`requests.post()` → `httpx.AsyncClient().post()`

### 8. backend/agents/taishige.py
- 导入：`requests` → `httpx`
- 方法：`run()` 从同步改为异步
- HTTP 调用：`requests.post()` → `httpx.AsyncClient().post()`

## 代码对比示例

### 修改前（使用 requests）
```python
import requests

def run(self, task: str, result: dict):
    response = requests.post(
        url=f"{YICHUANSI_API}receive_result",
        json={"agent_result": result, "sender": self.agent_name}
    )
    return response.json()
```

### 修改后（使用 httpx）
```python
import httpx

async def run(self, task: str, result: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url=f"{YICHUANSI_API}receive_result",
            json={"agent_result": result, "sender": self.agent_name}
        )
        return response.json()
```

## 优势

1. **异步一致性**：所有 HTTP 调用现在是异步的，与 FastAPI 的异步特性保持一致
2. **性能提升**：异步 HTTP 调用不会阻塞事件循环，提高并发性能
3. **代码清晰**：统一使用 httpx，避免混合使用同步/异步代码
4. **未来兼容**：httpx 是现代 Python HTTP 客户端，支持 HTTP/2 和异步操作

## 注意事项

1. **调用时需要使用 await**：所有调用这些异步方法的地方都需要使用 `await`
   ```python
   # 修改前
   result = agent.run(task, data)

   # 修改后
   result = await agent.run(task, data)
   ```

2. **测试文件未修改**：以下测试文件仍使用 requests，因为它们是独立测试脚本：
   - `test_pdf_api.py`
   - `test_api_endpoints.py`
   - `test_api.py`
   - `test_all_apis.py`
   - `quick_api_test.py`

## 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

这将安装：
- `httpx>=0.25.0`（主要 HTTP 客户端）
- `requests>=2.31.0`（可选依赖）

## 验证方法

1. 检查编译错误：
   ```bash
   cd backend
   python -m py_compile agents/*.py
   ```

2. 运行单元测试（如果有）：
   ```bash
   python -m pytest tests/
   ```

3. 启动后端服务：
   ```bash
   python main.py
   ```

## 后续工作

1. 更新所有调用这些 Agent 的代码，确保使用 `await`
2. 添加单元测试验证异步行为
3. 性能测试对比（异步 vs 同步）

## 提交信息

```
feat: 将所有 Agent 的 requests 迁移到 httpx

工作时段: 2026-02-01 XX:XX-XX:XX
完成内容:
- 将所有 Agent 文件从 requests 迁移到 httpx
- 所有 HTTP 调用从同步改为异步
- 保持异步一致性（与 FastAPI 一致）
- 添加 httpx 到 requirements.txt
- 保留 requests 作为可选依赖

修改文件:
- requirements.txt (添加 httpx>=0.25.0)
- agents/orchestrator.py (移除 requests，使用 httpx)
- agents/jianchayuan.py (异步化)
- agents/xingyusi.py (异步化)
- agents/tongzhengsi.py (异步化)
- agents/mijuanfang.py (异步化)
- agents/canmousi.py (异步化)
- agents/taishige.py (异步化)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```
