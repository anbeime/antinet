# Excel 技能快速启动指南

## 🚀 5分钟快速开始

### 1. 验证安装

```bash
# 检查 openpyxl 是否已安装
C:\test\antinet\venv_arm64\Scripts\python.exe -c "import openpyxl; print('OK')"
```

### 2. 运行测试

```bash
# 进入项目目录
cd C:\test\antinet\backend

# 运行测试脚本
C:\test\antinet\venv_arm64\Scripts\python.exe skills\xlsx\test_excel_export.py
```

### 3. 查看生成的文件

打开以下文件查看效果：
- `C:\test\antinet\backend\data\exports\test_simple_export.xlsx`
- `C:\test\antinet\backend\data\exports\test_full_report.xlsx`

### 4. 启动后端服务

```bash
# 启动 Antinet 后端
cd C:\test\antinet
start_backend.bat
```

### 5. 测试 API

```bash
# 使用 curl 测试（需要先启动后端）
curl -X POST http://localhost:8000/api/excel/export-cards ^
  -H "Content-Type: application/json" ^
  -d "{\"cards\":[{\"id\":\"test_001\",\"type\":\"fact\",\"title\":\"测试\",\"content\":\"测试内容\",\"confidence\":0.9,\"created_at\":\"2025-01-26\",\"tags\":[\"测试\"]}],\"title\":\"测试导出\"}"

# 查看导出列表
curl http://localhost:8000/api/excel/list
```

## 📝 常用代码片段

### Python 使用

```python
# 导入模块
from skills.xlsx import export_cards_to_excel, export_analysis_to_excel

# 导出卡片
cards = [{"id": "001", "type": "fact", "title": "标题", "content": "内容", 
          "confidence": 0.9, "created_at": "2025-01-26", "tags": ["标签"]}]
export_cards_to_excel(cards, "output.xlsx", "我的卡片")
```

### API 调用（JavaScript/TypeScript）

```typescript
// 导出卡片
async function exportCards(cards) {
  const response = await fetch('/api/excel/export-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards, title: '分析结果' })
  });
  const result = await response.json();
  window.location.href = result.download_url;
}
```

## 🔧 故障排查

### 问题 1: ModuleNotFoundError: No module named 'openpyxl'

**解决方案：**
```bash
C:\test\antinet\venv_arm64\Scripts\pip.exe install openpyxl
```

### 问题 2: 编码错误

**解决方案：** 确保使用 UTF-8 编码，或避免在 print 中使用特殊字符。

### 问题 3: 文件路径错误

**解决方案：** 使用绝对路径或确保工作目录正确。

## 📚 更多资源

- 完整文档: `skills\xlsx\README.md`
- 集成报告: `skills\xlsx\INTEGRATION_REPORT.md`
- API 文档: http://localhost:8000/docs

## ✅ 验证清单

- [ ] openpyxl 已安装
- [ ] 测试脚本运行成功
- [ ] 生成的 Excel 文件可以打开
- [ ] 后端服务正常启动
- [ ] API 端点响应正常
- [ ] 前端可以调用导出功能

## 🎉 完成！

现在您可以在 Antinet 项目中使用 Excel 导出功能了！
