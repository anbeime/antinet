# NPU设备创建错误修复指南

## 问题描述

错误信息：
```
[ERROR] "Failed to create device: 14001"
[ERROR] "Device Creation failure"
```

## 解决方案

### 方案1：自动修复脚本（推荐）

1. 运行自动修复脚本：
```bash
fix_npu_device.bat
```

这个脚本会：
- 检查并终止占用NPU的Python进程
- 等待资源释放
- 重新启动后端服务

### 方案2：手动检查和清理

1. 检查占用进程：
```bash
python check_npu_processes.py
```

2. 如果发现进程占用，手动终止：
```bash
taskkill /F /PID <进程ID>
```

3. 重启后端服务：
```bash
start_backend.bat
```

### 方案3：彻底重启（最可靠）

如果上述方案无效，请执行：

1. **完全重启AIPC**
   - 点击"开始" -> "电源" -> "重启"
   - 等待系统完全重启

2. 重新启动服务：
   ```bash
   start_backend.bat
   ```

### 方案4：诊断和日志

1. 运行诊断脚本：
```bash
python diagnose_npu_device.py
```

2. 检查Windows事件查看器：
   - 右键点击"开始" -> "事件查看器"
   - 导航到"Windows日志" -> "应用程序"
   - 查找与NPU、QNN、Genie相关的错误

## 代码改进

已实现的改进：

1. **DLL预加载逻辑**
   - 在导入GenieContext前预加载QNN核心DLL
   - 确保正确的加载顺序

2. **增强错误处理**
   - 特殊处理14001错误，提供详细诊断信息
   - 增加重试次数（2次 -> 3次）
   - 增加重试间隔（1秒 -> 2秒）

3. **详细日志输出**
   - 添加DLL加载路径验证
   - 添加PATH环境变量检查
   - 添加QNN配置验证

## 预防措施

1. **避免同时运行多个Python服务**
   - 每次启动新服务前，先停止旧服务
   - 使用Ctrl+C正确停止服务

2. **定期重启AIPC**
   - 长时间使用后，NPU资源可能累积占用
   - 建议每8小时重启一次

3. **检查进程状态**
   - 运行`tasklist | findstr python`检查Python进程
   - 确保没有残留进程

## 联系支持

如果问题持续存在：

1. 收集以下信息：
   - 完整的错误日志（backend.log）
   - Windows事件查看器中的NPU错误
   - diagnose_npu_device.py的输出

2. 联系高通技术支持：
   - 官方论坛：https://bbs.csdn.net/forums/qualcomm
   - 微信群：联系赛事小助手

## 常见错误代码

| 错误代码 | 含义 | 解决方案 |
|---------|------|---------|
| 14001 | 设备创建失败 | 重启AIPC，检查NPU驱动 |
| 14002 | 内存分配失败 | 减少模型大小，释放内存 |
| 14003 | 设备被占用 | 终止占用进程，重启系统 |
