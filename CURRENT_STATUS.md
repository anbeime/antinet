# NPU 问题总结

## 当前状态

### ✅ 已完成的代码修复

**修改的6个核心文件**：
1. `backend/models/model_loader.py` - 修复GenieContext调用（移除QNNConfig，只传config_path）
2. `backend/config.py` - 移除USE_NPU配置（强制使用真实NPU）
3. `backend/main.py` - 更新模型加载逻辑
4. `backend/npu_core.py` - 更新
5. `backend/routes/npu_routes.py` - 修复字段引用
6. `backend/requirements.txt` - 更新依赖

**关键修复**：
- 移除了所有模拟模式代码
- GenieContext只传一个参数（参考官方GenieSample.py）
- 不再调用QNNConfig.Config()

---

## ❌ 当前核心问题

### 错误信息
```
[ERROR] "Unable to load backend. dlerror(): dlopen error #126"
[ERROR] "Qnn getQnnInterface FAILED!"
```

### 根本原因
`qai_libs` 目录下**没有DLL文件**，只有一个 `.cat` 文件

```
C:\ai-engine-direct-helper\samples\qai_libs
└── libqnnhtpv73.cat  (1.2KB)
```

**缺少的DLL文件**：
- libQnnHtp.dll 或类似文件
- QNN运行时库

---

## 尝试过的解决方案

### ✅ 方案1：运行官方setup.py（找到正确流程）

**发现的问题**：
- 之前缺少 `qai-hub==0.30.0` 依赖

**已修复**：
```bash
# 1. 安装依赖（已完成）
pip install requests==2.32.3 py3-wget==1.0.12 tqdm==4.67.1 importlib-metadata==8.5.0 qai-hub==0.30.0

# 2. 运行setup.py（待执行）
cd "C:\ai-engine-direct-helper\samples"
python "python\setup.py"
```

**setup.py会做什么**：
1. 下载 QAI AppBuilder wheel包
2. 下载 QNN SDK（2.38版本）到 `C:\Qualcomm\AIStack\QAIRT\`
3. 复制DLL文件到 `C:\ai-engine-direct-helper\samples\qai_libs`

**架构信息**：
- 目标平台：`arm64x-windows-msvc`（Python x64 + Windows ARM64的桥接库）
- QNN SDK位置：`C:\Qualcomm\AIStack\QAIRT\`
- 目标目录：`C:\ai-engine-direct-helper\samples\qai_libs`

**已创建脚本**：
```bash
c:\test\antinet\run_qai_setup.bat
```

注意：脚本使用英文文本避免编码问题。手动运行此脚本完成安装。

---

## 🎯 今晚直播问高通技术支持的问题

### 当前状态
**已经找到正确的安装流程**：
1. ✅ 安装依赖：`pip install qai-hub==0.30.0`（已完成）
2. ⏳ 运行setup.py下载QNN SDK（待执行）

### 仍然需要确认的问题

**1. setup.py下载失败怎么办？**
   - qai_hub的hub_id是否需要配置？
   - 是否需要高通账号登录？
   - 如何配置API token？

**2. DLL文件确认**
   - setup.py成功后，qai_libs目录应该包含哪些DLL文件？
   - 如何验证DLL文件正确？

**3. Python架构兼容性**
   - Python x64 + Windows ARM64 是否完全支持？
   - 是否推荐使用ARM64 Python？

**4. API确认（基于我们的修复）**
   ```python
   # 当前代码
   self.model = GenieContext(config_path)
   ```
   - 是否正确？
   - 还需要什么配置？

---

## 当前可运行的测试

### 第一步：运行setup.py（必须）
```bash
# 方式1：直接运行
cd "C:\ai-engine-direct-helper\samples"
python "python\setup.py"

# 方式2：使用批处理脚本
c:\test\antinet\run_qai_setup.bat
```

**预期**：
- 下载QAI AppBuilder wheel包
- 下载QNN SDK到C:\Qualcomm\AIStack\QAIRT\
- 复制DLL文件到qai_libs目录

### 第二步：验证DLL文件
```bash
dir "C:\ai-engine-direct-helper\samples\qai_libs"
```

**预期**：应该看到多个DLL文件（之前只有1个.cat文件）

### 第三步：测试模型加载
```bash
cd backend
python main.py
```

**预期**：模型加载成功（如果DLL文件正确）

---

## 代码提交建议

**提交信息**：
```
fix: 修复NPU模型加载器，移除模拟模式

- 修复GenieContext调用（移除QNNConfig）
- 删除USE_NPU配置（强制真实NPU）
- 移除所有模拟相关代码
- 更新npu_routes.py字段引用

修改文件：
- backend/models/model_loader.py
- backend/config.py
- backend/main.py
- backend/npu_core.py
- backend/routes/npu_routes.py
- backend/requirements.txt

待解决问题：qai_libs目录缺少DLL文件
```

---

## 文档资源

- ✅ 高通开发.md（已恢复）
- 官方示例：`C:\ai-engine-direct-helper\samples\genie\python\GenieSample.py`
- 模型路径：`C:\model\Qwen2.0-7B-SSD-8380-2.34\`

---

## 总结

**代码层面**：已修复完成，基于官方GenieSample.py

**环境层面**：
- ✅ qai-hub依赖已安装
- ⏳ 需要运行setup.py下载QNN SDK和DLL文件

**下一步**：
1. 运行 `c:\test\antinet\run_qai_setup.bat`
2. 验证qai_libs目录的DLL文件
3. 测试模型加载

**备选方案**：如果setup.py失败，今晚直播咨询高通技术支持
