# 🔄 CodeBuddy SDK 清理和本地 NPU 模型重建方案

## 📊 当前状态分析

### ✅ 已有的本地聊天功能
**后端：** `backend/routes/chat_routes.py`
- 基于预设知识库的关键词匹配
- 四色卡片系统（蓝/绿/黄/红）
- 无需 NPU，使用简单的文本搜索

**前端：** `src/services/chatService.ts`
- 调用 `/api/chat/query` 接口
- 显示知识卡片来源
- 格式化四色卡片

### ❌ 需要清除的 CodeBuddy SDK
**前端：**
1. `src/services/codebuddyChatService.ts` - CodeBuddy 服务封装
2. `src/components/ChatBotModal.tsx` - 包含 CodeBuddy 集成代码

**后端：**
1. `backend/routes/codebuddy_chat_routes.py.disabled` - 已禁用

---

## 🎯 重建目标

### 方案 A：保持现有关键词匹配（推荐）⭐
**优势：**
- ✅ 已经可用，无需开发
- ✅ 响应快速（无 NPU 延迟）
- ✅ 基于预设知识库，准确可靠
- ✅ 适合演示和实际使用

**操作：**
只需清除 CodeBuddy 前端代码，保留现有 `chatService`

### 方案 B：集成 NPU 模型推理
**优势：**
- ✅ 展示 NPU 能力
- ✅ 更智能的回答
- ✅ 可以处理开放式问题

**劣势：**
- ⚠️ 当前 NPU 延迟 2840ms（目标 <500ms）
- ⚠️ 需要优化模型和性能
- ⚠️ 开发工作量大

**操作：**
清除 CodeBuddy 代码 + 创建新的 NPU 聊天接口

---

## 🧹 清理步骤

### 步骤 1：删除 CodeBuddy 前端服务

**文件：** `src/services/codebuddyChatService.ts`

**操作：** 删除整个文件

### 步骤 2：清理 ChatBotModal 组件

**文件：** `src/components/ChatBotModal.tsx`

**需要删除的代码：**
```typescript
// 第 6 行：删除导入
import { codebuddyChatService, ... } from '../services/codebuddyChatService';

// 第 33 行：删除状态
const [useCodeBuddy, setUseCodeBuddy] = useState(false);
const [sdkAvailable, setSdkAvailable] = useState(false);

// 第 58-76 行：删除 SDK 检查函数
const checkSdkAvailability = async () => { ... };

// 第 169-172 行：删除条件判断，只保留本地知识库调用
// 删除：
if (useCodeBuddy && sdkAvailable) {
  response = await codebuddyChatService.chat(input, history);
} else {
  response = await chatService.query(input, history);
}
// 改为：
response = await chatService.query(input, history);

// 第 368-405 行：删除 CodeBuddy 增强选项 UI
{sdkAvailable && (
  <div className="flex items-center gap-2">
    <Switch checked={useCodeBuddy} onCheckedChange={setUseCodeBuddy} />
    <span>CodeBuddy 增强</span>
  </div>
)}
```

### 步骤 3：删除后端 CodeBuddy 路由文件

**文件：** `backend/routes/codebuddy_chat_routes.py.disabled`

**操作：** 删除整个文件

### 步骤 4：验证清理结果

**检查点：**
- ✅ `src/services/codebuddyChatService.ts` 已删除
- ✅ `ChatBotModal.tsx` 中无 CodeBuddy 相关代码
- ✅ `backend/routes/codebuddy_chat_routes.py.disabled` 已删除
- ✅ 前端编译无错误
- ✅ 聊天功能正常工作

---

## 🚀 方案 A：使用现有关键词匹配（推荐）

### 清理后的架构

```
用户输入
    ↓
ChatBotModal.tsx
    ↓
chatService.query()
    ↓
后端 /api/chat/query
    ↓
关键词搜索预设知识库
    ↓
返回四色卡片 + 格式化回答
    ↓
显示给用户
```

### 优势
1. ✅ **立即可用** - 无需开发
2. ✅ **响应快速** - 无 NPU 延迟
3. ✅ **准确可靠** - 基于预设知识库
4. ✅ **符合演示需求** - 展示知识管理能力

### 知识库内容
- **蓝色卡片（12 张）**：系统概述、技术架构、NPU 性能等事实
- **绿色卡片（8 张）**：为什么使用 Antinet、NPU 优势等解释
- **黄色卡片（8 张）**：数据备份、性能延迟等风险
- **红色卡片（12 张）**：启动服务、优化延迟等行动建议

---

## 🔧 方案 B：集成 NPU 模型推理（可选）

### 新架构

```
用户输入
    ↓
ChatBotModal.tsx
    ↓
chatService.query() → 后端 /api/chat/npu-query (新接口)
    ↓
调用 NPU 模型推理
    ↓
生成智能回答
    ↓
返回给用户
```

### 需要创建的新接口

**后端：** `backend/routes/chat_routes.py`

```python
@router.post("/npu-query")
async def npu_chat_query(request: ChatRequest):
    """
    NPU 增强的聊天查询
    
    使用本地 NPU 模型生成智能回答
    """
    try:
        # 1. 加载 NPU 模型
        from models.model_loader import get_model_loader
        loader = get_model_loader()
        
        # 2. 构建 prompt
        prompt = f"用户问题：{request.query}\n\n请基于 Antinet 智能知识管家的功能回答用户问题。"
        
        # 3. NPU 推理
        response_text = loader.infer(
            prompt=prompt,
            max_new_tokens=256,
            temperature=0.7
        )
        
        # 4. 返回结果
        return ChatResponse(
            response=response_text,
            sources=[],
            cards=[]
        )
    except Exception as e:
        logger.error(f"NPU 查询失败: {e}")
        # 降级到关键词匹配
        return await chat_query(request)
```

### 前端调用

```typescript
// src/services/chatService.ts
export const chatService = {
  // 现有的关键词查询
  query: async (query: string, history?: ChatMessage[]) => { ... },
  
  // 新增：NPU 增强查询
  npuQuery: async (query: string, history?: ChatMessage[]) => {
    return apiCall<ChatResponse>('/npu-query', {
      method: 'POST',
      body: JSON.stringify({ query, conversation_history: history || [] }),
    });
  },
};
```

### 优化建议

1. **切换到轻量模型**
   - Qwen2-1.5B（预期延迟 280-400ms）
   - Llama3.2-3B（预期延迟 300-450ms）

2. **启用 BURST 性能模式**
   ```python
   from qai_hub_models.models._shared.perf_profile import PerfProfile
   PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
   ```

3. **减少生成长度**
   - `max_new_tokens=128` 或更少

4. **混合策略**
   - 简单问题用关键词匹配（快速）
   - 复杂问题用 NPU 推理（智能）

---

## 📋 推荐执行计划

### 阶段 1：清理 CodeBuddy（立即执行）⭐

```powershell
cd C:\test\antinet
.\cleanup_codebuddy_full.ps1
```

**清理内容：**
1. ✅ 删除 `src/services/codebuddyChatService.ts`
2. ✅ 清理 `src/components/ChatBotModal.tsx`
3. ✅ 删除 `backend/routes/codebuddy_chat_routes.py.disabled`
4. ✅ 删除模拟数据注释

**结果：**
- 聊天功能使用本地知识库（关键词匹配）
- 无 CodeBuddy 残留
- 代码简洁清晰

### 阶段 2：测试验证

```powershell
# 启动后端
.\quick_start.ps1

# 启动前端
cd frontend
npm run dev

# 测试聊天功能
# 打开 http://localhost:3000
# 点击右下角聊天机器人
# 输入："如何启动系统"
# 应该返回基于知识库的回答
```

### 阶段 3：（可选）集成 NPU 推理

如果需要展示 NPU 能力：

1. 优化 NPU 性能（切换模型 + BURST 模式）
2. 创建 `/api/chat/npu-query` 接口
3. 前端添加 NPU 查询选项
4. 测试验证延迟 <500ms

---

## 🎯 总结

### 推荐方案：方案 A（关键词匹配）

**理由：**
1. ✅ 已经可用，无需开发
2. ✅ 响应快速，用户体验好
3. ✅ 基于预设知识库，准确可靠
4. ✅ 符合演示需求
5. ✅ 清理 CodeBuddy 后立即可用

### 可选方案：方案 B（NPU 推理）

**适用场景：**
- 需要展示 NPU 能力
- 需要处理开放式问题
- 有时间优化 NPU 性能

**前提条件：**
- NPU 延迟优化到 <500ms
- 切换到轻量模型
- 启用 BURST 性能模式

---

## 🚀 立即执行

### 步骤 1：运行清理脚本

```powershell
cd C:\test\antinet
.\cleanup_codebuddy_full.ps1
```

### 步骤 2：启动服务

```powershell
.\quick_start.ps1
```

### 步骤 3：测试聊天功能

打开浏览器：http://localhost:3000  
点击右下角聊天机器人  
输入："如何启动系统"  
验证返回正确的知识库回答

---

**创建时间：** 2026-01-26  
**方案：** 清理 CodeBuddy + 使用本地知识库  
**状态：** 等待执行确认
