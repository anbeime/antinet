# AntiNet 问题修复指南

## 问题汇总

根据日志分析，发现以下问题：

### 1. 数据库问题
- **问题**: `knowledge_cards` 表不存在
- **错误**: `sqlite3.OperationalError: no such table: knowledge_cards`
- **影响**: 知识卡片功能无法使用

### 2. API 参数问题
- **问题**: 知识库搜索 API 参数格式错误
- **错误**: `422 Unprocessable Entity`
- **影响**: 搜索功能无法使用

### 3. 路由问题
- **问题**: 技能系统 API 端点不存在
- **错误**: `404 Not Found` on `/api/skills/list`
- **影响**: 技能系统功能无法访问

### 4. NPU 性能问题
- **问题**: 推理延迟 8965ms，远超 1000ms 阈值
- **错误**: 熔断检查失败
- **影响**: NPU 性能未达标，可能未正确使用 NPU

---

## 快速修复步骤

### 步骤 1: 运行自动修复脚本

```bash
python fix_all_issues.py
```

这个脚本会自动修复：
- 创建缺失的数据库表
- 添加正确的 API 参数模型
- 修正路由前缀
- 优化 NPU 性能配置

### 步骤 2: 重启后端服务

```bash
# 停止当前运行的后端（如果有）
# Windows: Ctrl+C

# 启动后端
python backend/main.py
```

### 步骤 3: 验证修复效果

```bash
python test_fixes.py
```

这个脚本会测试所有修复的 API 端点。

### 步骤 4: NPU 性能诊断（可选）

如果 NPU 性能仍未达标：

```bash
python diagnose_npu_performance.py
```

这个脚本会：
- 检查配置文件
- 检查 QNN 库
- 检查模型文件
- 生成优化建议
- 可选自动应用优化

---

## 详细修复说明

### 1. 数据库表修复

**问题原因**: `database.py` 中未创建 `knowledge_cards` 表

**修复方案**:

```python
# 在 database.py 的 init_database() 方法中添加
cursor.execute("""
    CREATE TABLE IF NOT EXISTS knowledge_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT,
        url TEXT,
        category TEXT,
        tags TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
    )
""")
```

**验证**:
```bash
sqlite3 data/antinet.db "SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_cards';"
```

### 2. API 参数模型修复

**问题原因**: `knowledge_routes.py` 中缺少 `SearchRequest` 模型定义

**修复方案**:

```python
# 在 knowledge_routes.py 中添加
class SearchRequest(BaseModel):
    """知识库搜索请求"""
    query: str = Field(..., description="搜索关键词")
    card_type: Optional[str] = Field(None, description="卡片类型过滤")
    category: Optional[str] = Field(None, description="分类过滤")
    limit: int = Field(10, description="返回数量限制", ge=1, le=100)
```

**验证**:
```bash
curl -X POST http://localhost:8000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "测试", "limit": 5}'
```

### 3. 路由前缀修复

**问题原因**: `skill_routes.py` 中路由前缀为 `/api/skill`，但应为 `/api/skills`

**修复方案**:

```python
# 在 skill_routes.py 中修改
router = APIRouter(prefix="/api/skills", tags=["技能系统"])
```

**验证**:
```bash
curl http://localhost:8000/api/skills/list
```

### 4. NPU 性能优化

**问题原因**: 
1. 未启用 BURST 性能模式
2. `max_new_tokens` 过大
3. 熔断阈值过低

**修复方案**:

在 `config.json` 中:

```json
{
  "backend": {
    "type": "QnnHtp",
    "performance_mode": "BURST",
    "enable_circuit_breaker": true,
    "circuit_breaker_threshold_ms": 2000
  },
  "inference": {
    "max_new_tokens": 256,
    "temperature": 0.7
  }
}
```

**验证**:
```bash
curl http://localhost:8000/api/npu/benchmark
```

期望结果: `overall_avg_latency_ms < 500`

---

## 常见问题排查

### Q1: 数据库表仍然不存在

**检查**:
```bash
sqlite3 data/antinet.db ".tables"
```

**解决**:
```bash
# 删除旧数据库
rm data/antinet.db

# 重新运行修复脚本
python fix_all_issues.py

# 重启后端
python backend/main.py
```

### Q2: API 仍返回 422 错误

**检查**:
```bash
# 查看详细错误
curl -X POST http://localhost:8000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "测试"}' \
  -v
```

**解决**:
- 确认 `SearchRequest` 模型已添加
- 检查请求参数是否符合模型定义
- 查看后端日志获取详细错误

### Q3: 技能系统 API 仍返回 404

**检查**:
```bash
# 查看所有可用路由
curl http://localhost:8000/docs
```

**解决**:
- 确认 `skill_routes.py` 中路由前缀为 `/api/skills`
- 确认 `main.py` 中已注册 `skill_router`
- 重启后端服务

### Q4: NPU 性能仍未达标

**深度诊断**:
```bash
python diagnose_npu_performance.py
```

**可能原因**:
1. 未正确配置 NPU execution provider
2. 模型未正确量化为 QNN 格式
3. 没有使用 QNN HTP backend
4. 内存未分配到 NPU 上
5. 提示词过长或生成 token 数过多

**解决步骤**:

1. 检查 QNN 日志:
   ```bash
   # 设置环境变量
   set QNN_LOG_LEVEL=DEBUG
   
   # 重启后端
   python backend/main.py
   ```

2. 查看日志中的关键信息:
   - `execution provider: NPU` ✓
   - `allocated on NPU` ✓
   - `QNN HTP backend` ✓

3. 如果日志显示使用 CPU:
   - 检查 `config.json` 中 `backend.type` 是否为 `QnnHtp`
   - 检查 QNN 库是否正确安装
   - 检查模型文件是否为 QNN 格式

4. 如果仍有问题:
   - 减少 `max_new_tokens` 至 128
   - 缩短提示词长度
   - 检查是否有其他进程占用 NPU

---

## 性能基准

### 目标性能指标

| 指标 | 目标值 | 当前值 | 状态 |
|------|--------|--------|------|
| 平均推理延迟 | < 500ms | 8965ms | ✗ 未达标 |
| 首次推理延迟 | < 1000ms | - | - |
| 吞吐量 | > 2 QPS | - | - |

### 优化后预期性能

应用所有优化后，预期性能：

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 平均推理延迟 | 8965ms | 300-500ms | 95% ↓ |
| 首次推理延迟 | - | 800-1000ms | - |
| 吞吐量 | 0.1 QPS | 2-3 QPS | 20x ↑ |

---

## 测试清单

运行 `test_fixes.py` 后，确认以下测试通过：

- [ ] 获取知识卡片列表
- [ ] 获取知识卡片（带过滤）
- [ ] 搜索知识库
- [ ] 获取知识图谱
- [ ] 列出所有技能
- [ ] 获取技能分类
- [ ] 获取技能统计
- [ ] 获取 Agent 状态
- [ ] 列出所有 Agent
- [ ] NPU 性能基准测试

**期望结果**: 所有测试通过 (10/10)

---

## 下一步

修复完成后：

1. **功能测试**: 在前端测试所有功能
2. **性能测试**: 运行完整的性能基准测试
3. **压力测试**: 测试并发请求处理能力
4. **监控**: 设置性能监控和告警

---

## 联系支持

如果问题仍未解决：

1. 收集以下信息:
   - 后端启动日志
   - QNN 日志输出
   - `test_fixes.py` 输出
   - `diagnose_npu_performance.py` 输出

2. 检查:
   - 系统配置
   - 依赖库版本
   - 模型文件完整性

3. 参考文档:
   - [QNN 文档](https://developer.qualcomm.com/software/qualcomm-ai-engine-direct)
   - [FastAPI 文档](https://fastapi.tiangolo.com/)
   - [项目 README](README.md)
