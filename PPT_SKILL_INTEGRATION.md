# 🎨 PPT技能集成方案 - 增强Antinet PPT功能

## 📋 发现的PPT技能

在 `C:\test\StepFun\resources\skill\pptx` 目录下发现了强大的PPT处理技能：

### 核心功能

| 功能 | 说明 | 技术 |
|------|------|------|
| **创建PPT** | 从HTML转换为PPT | html2pptx.js |
| **编辑PPT** | 修改现有PPT内容 | OOXML XML编辑 |
| **分析PPT** | 提取文本和结构 | markitdown + XML解析 |
| **模板复用** | 基于模板创建新PPT | 模板复制+内容替换 |
| **可视化验证** | 生成缩略图网格 | thumbnail.py |

### 关键特性

1. **HTML to PPT 转换**
   - 支持精确定位和布局
   - 支持图表、表格、图片
   - 支持复杂样式和格式

2. **设计系统**
   - 18种预设配色方案
   - 多种布局创新
   - 视觉细节选项

3. **OOXML 编辑**
   - 直接编辑XML内容
   - 支持注释、备注、动画
   - 完整的验证机制

---

## 🎯 当前Antinet的PPT功能

### 现有实现

查看 `backend/routes/ppt_routes.py`：

```python
# 当前功能
- POST /api/ppt/create - 创建PPT
- POST /api/ppt/export - 导出分析结果为PPT
```

### 使用的库

- `python-pptx` (1.0.2) - 基础PPT创建

---

## 🚀 集成方案

### 方案1: 增强现有PPT路由（推荐）

#### 1.1 复制技能文件到项目

```cmd
# 创建技能目录
mkdir C:\test\antinet\backend\skills
mkdir C:\test\antinet\backend\skills\pptx

# 复制PPT技能
xcopy "C:\test\StepFun\resources\skill\pptx" "C:\test\antinet\backend\skills\pptx" /E /I /Y
```

#### 1.2 安装额外依赖

```cmd
cd C:\test\antinet
venv_arm64\Scripts\activate

# 安装Node.js依赖（用于html2pptx）
npm install -g pptxgenjs

# 安装Python依赖
pip install markitdown
pip install lxml
pip install pillow
```

#### 1.3 创建增强的PPT服务

创建 `backend/services/enhanced_ppt_service.py`：

```python
"""
增强的PPT服务
集成 html2pptx 和 OOXML 编辑功能
"""
import os
import subprocess
from pathlib import Path
from typing import Dict, List, Any

class EnhancedPPTService:
    def __init__(self):
        self.skill_dir = Path(__file__).parent.parent / "skills" / "pptx"
        self.html2pptx_script = self.skill_dir / "scripts" / "html2pptx.js"
        self.thumbnail_script = self.skill_dir / "scripts" / "thumbnail.py"
    
    def create_from_html(
        self, 
        html_slides: List[str], 
        output_path: str,
        design_palette: str = "Classic Blue"
    ) -> Dict[str, Any]:
        """
        从HTML幻灯片创建PPT
        
        Args:
            html_slides: HTML幻灯片列表
            output_path: 输出PPT路径
            design_palette: 设计配色方案
        
        Returns:
            创建结果
        """
        # 实现HTML to PPT转换
        pass
    
    def extract_text(self, ppt_path: str) -> str:
        """
        提取PPT文本内容
        
        Args:
            ppt_path: PPT文件路径
        
        Returns:
            Markdown格式的文本
        """
        result = subprocess.run(
            ["python", "-m", "markitdown", ppt_path],
            capture_output=True,
            text=True
        )
        return result.stdout
    
    def generate_thumbnails(
        self, 
        ppt_path: str, 
        output_dir: str,
        cols: int = 4
    ) -> str:
        """
        生成PPT缩略图网格
        
        Args:
            ppt_path: PPT文件路径
            output_dir: 输出目录
            cols: 列数
        
        Returns:
            缩略图路径
        """
        subprocess.run([
            "python",
            str(self.thumbnail_script),
            ppt_path,
            output_dir,
            "--cols", str(cols)
        ])
        return output_dir
    
    def edit_with_ooxml(
        self,
        ppt_path: str,
        edits: List[Dict[str, Any]]
    ) -> str:
        """
        使用OOXML编辑PPT
        
        Args:
            ppt_path: PPT文件路径
            edits: 编辑操作列表
        
        Returns:
            编辑后的PPT路径
        """
        # 实现OOXML编辑
        pass
```

#### 1.4 更新PPT路由

更新 `backend/routes/ppt_routes.py`：

```python
from backend.services.enhanced_ppt_service import EnhancedPPTService

enhanced_ppt = EnhancedPPTService()

@router.post("/api/ppt/create-advanced")
async def create_advanced_ppt(request: AdvancedPPTRequest):
    """
    使用增强功能创建PPT
    支持HTML转换、自定义设计、图表集成
    """
    result = enhanced_ppt.create_from_html(
        html_slides=request.html_slides,
        output_path=request.output_path,
        design_palette=request.design_palette
    )
    return result

@router.post("/api/ppt/extract-text")
async def extract_ppt_text(file: UploadFile):
    """
    提取PPT文本内容
    """
    # 保存上传的文件
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    
    # 提取文本
    text = enhanced_ppt.extract_text(temp_path)
    return {"text": text}

@router.post("/api/ppt/generate-thumbnails")
async def generate_ppt_thumbnails(file: UploadFile):
    """
    生成PPT缩略图
    """
    # 实现缩略图生成
    pass
```

---

### 方案2: 创建独立的PPT增强模块

#### 2.1 模块结构

```
backend/
├── skills/
│   └── pptx/                    # 复制的技能文件
│       ├── scripts/
│       │   ├── html2pptx.js
│       │   ├── thumbnail.py
│       │   └── ...
│       ├── ooxml/
│       │   └── ...
│       ├── SKILL.md
│       └── html2pptx.md
├── services/
│   ├── enhanced_ppt_service.py  # 增强PPT服务
│   └── ppt_design_service.py    # 设计系统服务
└── routes/
    └── ppt_routes.py            # 更新的路由
```

#### 2.2 设计系统服务

创建 `backend/services/ppt_design_service.py`：

```python
"""
PPT设计系统服务
提供18种预设配色方案和设计模板
"""

class PPTDesignService:
    # 18种预设配色方案
    COLOR_PALETTES = {
        "Classic Blue": {
            "primary": "#1C2833",
            "secondary": "#2E4053",
            "accent": "#AAB7B8",
            "background": "#F4F6F6"
        },
        "Teal & Coral": {
            "primary": "#5EA8A7",
            "secondary": "#277884",
            "accent": "#FE4447",
            "background": "#FFFFFF"
        },
        # ... 其他16种配色
    }
    
    def get_palette(self, name: str) -> Dict[str, str]:
        """获取配色方案"""
        return self.COLOR_PALETTES.get(name, self.COLOR_PALETTES["Classic Blue"])
    
    def generate_html_slide(
        self,
        content: Dict[str, Any],
        palette: str = "Classic Blue",
        layout: str = "title-content"
    ) -> str:
        """
        生成HTML幻灯片
        
        Args:
            content: 幻灯片内容
            palette: 配色方案
            layout: 布局类型
        
        Returns:
            HTML字符串
        """
        colors = self.get_palette(palette)
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    width: 720pt;
                    height: 405pt;
                    margin: 0;
                    padding: 40pt;
                    display: flex;
                    flex-direction: column;
                    background-color: {colors['background']};
                    font-family: Arial, sans-serif;
                }}
                h1 {{
                    color: {colors['primary']};
                    font-size: 48pt;
                    margin-bottom: 20pt;
                }}
                p {{
                    color: {colors['secondary']};
                    font-size: 18pt;
                    line-height: 1.5;
                }}
            </style>
        </head>
        <body>
            <h1>{content.get('title', '')}</h1>
            <p>{content.get('content', '')}</p>
        </body>
        </html>
        """
        return html
```

---

## 📊 功能对比

### 当前功能 vs 增强功能

| 功能 | 当前 (python-pptx) | 增强 (html2pptx + OOXML) |
|------|-------------------|------------------------|
| **创建PPT** | 基础 | 高级（HTML转换） |
| **布局控制** |  有限 | 精确定位 |
| **设计系统** | ❌ 无 | 18种配色方案 |
| **图表集成** | 基础 | 高级（占位符） |
| **编辑现有PPT** |  有限 | 完整OOXML编辑 |
| **文本提取** | ❌ 无 | Markdown转换 |
| **可视化验证** | ❌ 无 | 缩略图网格 |
| **模板支持** |  基础 | 高级模板复用 |

---

## 🔧 实施步骤

### 阶段1: 基础集成（1-2小时）

1. **复制技能文件**
   ```cmd
   mkdir C:\test\antinet\backend\skills\pptx
   xcopy "C:\test\StepFun\resources\skill\pptx" "C:\test\antinet\backend\skills\pptx" /E /I /Y
   ```

2. **安装依赖**
   ```cmd
   cd C:\test\antinet
   venv_arm64\Scripts\activate
   pip install markitdown lxml pillow
   ```

3. **创建基础服务**
   - 创建 `enhanced_ppt_service.py`
   - 实现文本提取功能
   - 实现缩略图生成功能

### 阶段2: HTML转换集成（2-3小时）

1. **安装Node.js依赖**
   ```cmd
   npm install -g pptxgenjs
   ```

2. **实现HTML转PPT转换**
   - 创建 `ppt_design_service.py`
   - 实现18种配色方案
   - 实现HTML幻灯片生成

3. **更新API路由**
   - 添加 `/api/ppt/create-advanced`
   - 添加 `/api/ppt/extract-text`
   - 添加 `/api/ppt/generate-thumbnails`

### 阶段3: OOXML编辑集成（3-4小时）

1. **实现OOXML编辑功能**
   - 解包/打包PPT
   - XML编辑
   - 验证机制

2. **添加高级编辑API**
   - 添加 `/api/ppt/edit-slide`
   - 添加 `/api/ppt/add-comment`
   - 添加 `/api/ppt/update-layout`

### 阶段4: 前端集成（2-3小时）

1. **更新前端PPT功能**
   - 添加设计选择器
   - 添加缩略图预览
   - 添加高级编辑界面

---

##  使用示例

### 示例1: 创建带设计的PPT

```python
from backend.services.enhanced_ppt_service import EnhancedPPTService
from backend.services.ppt_design_service import PPTDesignService

# 初始化服务
ppt_service = EnhancedPPTService()
design_service = PPTDesignService()

# 准备内容
slides_content = [
    {"title": "Antinet智能知识管家", "content": "端侧智能数据中枢"},
    {"title": "核心功能", "content": "NPU加速、四色卡片、知识沉淀"},
]

# 生成HTML幻灯片
html_slides = []
for content in slides_content:
    html = design_service.generate_html_slide(
        content=content,
        palette="Teal & Coral",
        layout="title-content"
    )
    html_slides.append(html)

# 创建PPT
result = ppt_service.create_from_html(
    html_slides=html_slides,
    output_path="output.pptx",
    design_palette="Teal & Coral"
)
```

### 示例2: 提取PPT文本

```python
# 提取文本
text = ppt_service.extract_text("presentation.pptx")
print(text)  # Markdown格式
```

### 示例3: 生成缩略图

```python
# 生成缩略图网格
thumbnail_path = ppt_service.generate_thumbnails(
    ppt_path="presentation.pptx",
    output_dir="thumbnails",
    cols=4
)
```

---

## 📚 相关文档

### 技能文档

```desktop-local-file
{
  "localPath": "C:\\test\\StepFun\\resources\\skill\\pptx\\SKILL.md",
  "fileName": "SKILL.md"
}
```
**PPT技能主文档** - 完整的功能说明

```desktop-local-file
{
  "localPath": "C:\\test\\StepFun\\resources\\skill\\pptx\\html2pptx.md",
  "fileName": "html2pptx.md"
}
```
**HTML转PPT指南** - 详细的转换规则

```desktop-local-file
{
  "localPath": "C:\\test\\StepFun\\resources\\skill\\pptx\\ooxml.md",
  "fileName": "ooxml.md"
}
```
**OOXML编辑指南** - XML编辑详细说明

---

## 🎯 预期效果

### 增强后的功能

1. **更专业的设计**
   - 18种预设配色方案
   - 精确的布局控制
   - 一致的视觉风格

2. **更强大的编辑**
   - 修改现有PPT
   - 添加注释和备注
   - 更新布局和样式

3. **更好的分析**
   - 提取文本内容
   - 生成缩略图预览
   - 可视化验证

4. **更灵活的创建**
   - HTML转PPT
   - 模板复用
   - 图表集成

---

## 🚀 立即开始

### 快速测试

```cmd
# 1. 复制技能文件
cd C:\test\antinet
mkdir backend\skills\pptx
xcopy "C:\test\StepFun\resources\skill\pptx" "backend\skills\pptx" /E /I /Y

# 2. 测试文本提取
cd backend\skills\pptx
python -m markitdown sample.pptx

# 3. 测试缩略图生成
python scripts\thumbnail.py sample.pptx thumbnails --cols 4
```

---

##  总结

### 优势

- 强大的HTML转PPT功能
- 18种专业配色方案
- 完整的OOXML编辑能力
- 可视化验证机制
- 与现有系统兼容

### 建议

1. **优先实施**: 文本提取和缩略图生成（最简单）
2. **逐步集成**: HTML转PPT（需要Node.js）
3. **高级功能**: OOXML编辑（最复杂）

**这些PPT技能可以显著增强Antinet的PPT处理能力！** 🎨

---

*集成方案创建时间: 2026-01-26*  
*技能来源: C:\test\StepFun\resources\skill\pptx*  
*状态: 准备就绪*
