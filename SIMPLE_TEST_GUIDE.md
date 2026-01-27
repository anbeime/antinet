# 🚀 NPU BURST 模式测试 - 简单步骤

## ✅ BURST 代码已经在文件中了！

只需要 3 步测试：

---

## 📋 **方式 1：PowerShell 脚本（推荐）**

```powershell
cd C:\test\antinet
.\test_burst_mode.ps1
```

---

## 📋 **方式 2：手动测试（最简单）**

### **步骤 1：停止后端**
```cmd
taskkill /F /IM python.exe
```

### **步骤 2：启动后端**
```cmd
cd C:\test\antinet
venv_arm64\Scripts\activate
python backend\main.py
```

**重要**：查看启动日志，应该看到：
```
[OK] 已通过环境变量启用 BURST 性能模式  ← 这个很重要！
```

### **步骤 3：新开一个命令行窗口，运行测试**
```cmd
cd C:\test\antinet
venv_arm64\Scripts\python.exe test_burst_mode.py
```

---

## 📋 **方式 3：使用原有测试脚本**

如果后端已经重启，直接运行：
```cmd
cd C:\test\antinet
venv_arm64\Scripts\python.exe test_npu_quick.py
```

---

## 📊 **预期结果**

### **优化前（你之前的测试）**
```
8 tokens:   715ms
16 tokens:  1203ms
32 tokens:  1294ms
64 tokens:  1322ms
平均:       1200-1300ms
```

### **优化后（BURST 模式）**
```
预期: 700-900ms  (提升 30-40%)
目标: < 500ms
```

---

## ✅ **成功标志**

### 1. 后端启动日志
```
[INFO] qai_hub_models未安装，尝试通过环境变量启用BURST模式
[OK] 已通过环境变量启用 BURST 性能模式  ← 必须看到这个
[OK] 确认使用 QnnHtp backend (NPU)
```

### 2. 性能测试结果
- **优秀**: < 500ms
- **良好**: 500-800ms  
- **可接受**: 800-1000ms
- **需改进**: > 1000ms

---

## 🔍 **验证 BURST 代码已存在**

```cmd
findstr "QNN_PERFORMANCE_MODE" backend\models\model_loader.py
```

如果找到结果 = ✅ 代码已修改

---

## ⚠️ **如果批处理文件报错**

**不用担心！** 批处理文件有编码问题，但代码本身已经修改好了。

**直接用手动方式测试**（方式 2）最可靠！

---

## 🎯 **最简单的测试流程**

1. **打开命令行 1**：
   ```cmd
   cd C:\test\antinet
   venv_arm64\Scripts\activate
   python backend\main.py
   ```
   查看是否有 BURST 激活消息

2. **打开命令行 2**（等待 15 秒后）：
   ```cmd
   cd C:\test\antinet
   venv_arm64\Scripts\python.exe test_burst_mode.py
   ```
   查看性能测试结果

---

## 📞 **需要帮助？**

如果遇到问题，提供：
1. 后端启动日志（前 50 行）
2. 测试结果截图
3. 是否看到 BURST 激活消息

---

**推荐：直接用手动方式（方式 2）最简单可靠！** 👍
