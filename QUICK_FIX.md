# Antinet 一键修复脚本

## 使用方法

### 1. 修复 PDF 解析功能

```bash
# 激活虚拟环境
cd C:\test\antinet
venv_arm64\Scripts\activate

# 安装 PDF 库
pip install pypdf pdfplumber reportlab

# 验证安装
python C:\test\check_pdf_libs.py
```

### 2. 升级聊天回答质量

```bash
# 应用改进的回答生成函数
python C:\test\antinet\backend\scripts\upgrade_chat_response.py
```

### 3. 重启服务

```bash
# 停止当前服务（Ctrl+C）
# 重新启动
python -m backend.main
```

### 4. 测试验证

#### 测试 PDF 上传
1. 打开 http://localhost:3000
2. 进入 PDF 分析页面
3. 上传测试 PDF
4. 检查解析结果

#### 测试聊天回答
```bash
python C:\test\test_chat_api.py
```

---

## 预期结果

### PDF 解析
- ✅ 能够上传 PDF 文件
- ✅ 正确提取文本内容
- ✅ 识别表格结构
- ✅ 生成知识卡片

### 聊天回答
- ✅ 回答更自然流畅
- ✅ 根据问题类型调整风格
- ✅ 提供精准的信息
- ✅ 包含来源引用

---

## 如果遇到问题

### PDF 库安装失败
```bash
# 尝试升级 pip
python -m pip install --upgrade pip

# 重新安装
pip install --no-cache-dir pypdf pdfplumber reportlab
```

### 聊天回答仍不理想
- 检查数据库中的卡片内容质量
- 确认搜索能找到相关卡片
- 查看后端日志排查问题

---

## 下一步

修复完成后，可以开始实施向量搜索和 RAG 溯源：

1. **Phase 1: 向量搜索**（3-5天）
   - 安装 sqlite-vec
   - 生成向量嵌入
   - 实现语义搜索

2. **Phase 2: RAG 溯源**（2-3天）
   - 精确来源追踪
   - 前端显示引用
   - 点击跳转功能

详见：`DEVELOPMENT_PLAN.md`
