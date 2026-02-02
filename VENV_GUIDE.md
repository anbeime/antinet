# Antinet 虚拟环境使用指南

## 快速命令

### 启动后端（虚拟环境）
```bash
start_backend_with_venv.bat
```

### 运行 Python 脚本（虚拟环境）
```bash
run_venv_python.bat script.py
```

### 测试虚拟环境
```bash
test_venv_env.bat
```

### 安装依赖
```bash
install_venv_deps.bat
```

## 当前状态

- Python 版本: 3.12.10
- 虚拟环境: venv_arm64/
- QAI AppBuilder: 2.38.0 ✓
- 核心依赖: 已全部安装 ✓

## 手动使用虚拟环境

```bash
# 激活虚拟环境（可选）
venv_arm64\Scripts\activate.bat

# 使用虚拟环境的 Python（推荐）
venv_arm64\Scripts\python.exe your_script.py

# 安装包
venv_arm64\Scripts\pip.exe install package_name

# 查看已安装包
venv_arm64\Scripts\pip.exe list
```

## 常见操作

### 查看依赖
```bash
venv_arm64\Scripts\pip.exe list
```

### 导出依赖列表
```bash
venv_arm64\Scripts\pip.exe freeze > requirements.txt
```

### 测试导入
```bash
venv_arm64\Scripts\python.exe -c "import fastapi; import qai_appbuilder"
```
