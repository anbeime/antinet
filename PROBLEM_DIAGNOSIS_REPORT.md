# Antinet 系统问题诊断与修复报告

## 🔍 核心问题诊断

### 1. 字段名不一致问题
**数据库实际字段：** `card_type`  
**后端部分代码使用：** `type`  
**前端使用：** 混用 `type` 和 `card_type`

### 2. 功能失败清单
- ✅ 获取卡片列表 - 正常
- ❌ 创建卡片 - 失败（字段名错误）
- ❌ Excel 上传 - 白屏（Agent 初始化失败）
- ❌ 批量处理 - 白屏（同上）
- ❌ 聊天机器人 - 无结果（SQL 查询字段错误）

## 🔧 修复方案

### 方案 A：统一使用 card_type（推荐）
**优点：** 符合数据库实际结构  
**缺点：** 需要修改多处代码

**需要修改的文件：**
1. `backend/routes/knowledge_routes.py` - KnowledgeCard 模型和 SQL
2. `backend/routes/chat_routes.py` - SQL 查询（已修复）
3. `src/pages/Home.tsx` - 前端数据映射（已修复）
4. 其他使用 `type` 字段的地方

### 方案 B：数据库添加 type 别名
**优点：** 代码改动最小  
**缺点：** 数据库冗余

## 📋 当前状态

### 已修复
- ✅ Home.tsx 数据显示（card_type 映射）
- ✅ chat_routes.py SQL 查询字段顺序
- ✅ knowledge_routes.py 部分修复

### 待修复
- ❌ knowledge_routes.py 完整修复
- ❌ Excel/批量处理 Agent 初始化
- ❌ 前端其他页面字段映射

## 🎯 立即执行的修复

### 修复 1：knowledge_routes.py
当前问题：KnowledgeCard 模型已改为 card_type，但可能有缓存

### 修复 2：简化 Excel/批量处理
移除 Agent 依赖，直接返回基础分析结果

### 修复 3：前端统一字段
所有前端代码统一使用 card_type

## 💡 建议

**短期（立即）：**
1. 重建数据库连接，清除所有缓存
2. 简化 Excel/批量处理功能，移除 Agent 依赖
3. 前端统一使用 card_type

**长期（1-2天）：**
1. 重构 Agent 系统初始化逻辑
2. 统一前后端字段命名规范
3. 添加字段验证和错误提示
