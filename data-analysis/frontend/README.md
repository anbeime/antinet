# Antinet 智能知识管家

一个基于React + TypeScript的前端应用，提供卡片管理、知识图谱可视化、规则配置和报告生成功能。

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion（动画）
- Recharts（图表）
- Lucide React（图标）
- Axios（HTTP客户端）

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 项目结构

```
frontend/
├── src/
│   ├── api/           # API客户端
│   ├── components/    # React组件
│   ├── App.tsx        # 主应用组件
│   ├── main.tsx       # 应用入口
│   └── index.css      # 全局样式
├── index.html         # HTML模板
├── package.json       # 依赖配置
├── vite.config.ts     # Vite配置
├── tailwind.config.js # Tailwind配置
└── tsconfig.json      # TypeScript配置
```

## 主要功能

### 1. 卡片管理

- 四色卡片展示（蓝色/绿色/黄色/红色）
- 卡片筛选（按颜色、分类、关键词）
- 卡片详情查看

### 2. 知识图谱

- 可视化展示知识关联
- 节点交互（点击、缩放、旋转）
- 节点详情查看

### 3. 规则配置

- 规则创建、编辑、删除
- 规则启用/禁用
- 规则条件配置

### 4. 报告生成

- 四色卡片生成
- 完整报告生成
- 批量查询处理

## API对接

应用通过Vite代理与后端API对接：

- 基础URL：`/api`
- 开发环境代理到：`http://localhost:8000`
- 生产环境需要配置相应的API地址

## 注意事项

- 确保后端API服务正常运行
- 检查CORS配置是否正确
- 验证API接口返回的数据格式
