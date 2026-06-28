# -*- coding: utf-8 -*-
"""
投研场景 DEMO 服务（精简入口）

仅挂载投研路由，绕过 main.py 中复杂的中间件/数据库/AI 依赖，
用于本地部署与 DEMO 录制。

启动：
    cd backend && python3 -m uvicorn demo_server:app --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.investment_research_routes import router as investment_router

app = FastAPI(
    title="知易 · 投研场景 DEMO",
    description="投研工作台演示服务（行业/公司/策略/机会/风险/自选股/投资组合/行业对比/市场情绪/全局搜索）",
    version="1.0.0",
)

# 允许跨域（DEMO 用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载投研路由
app.include_router(investment_router)


@app.get("/", tags=["健康检查"])
async def root():
    return {
        "service": "知易 · 投研场景 DEMO",
        "status": "ok",
        "docs": "/docs",
        "endpoints": 22,
    }


@app.get("/api/investment-research/_meta", tags=["元信息"])
async def meta():
    """返回本 DEMO 服务的端点清单，便于录制 DEMO 时参考"""
    return {
        "tabs": [
            {"key": "overview", "name": "总览", "desc": "投研工作台首页仪表盘"},
            {"key": "companies", "name": "公司", "desc": "研究对象列表 + 财务详情"},
            {"key": "reports", "name": "研报", "desc": "研究报告 + Markdown 导出"},
            {"key": "opportunities", "name": "机会", "desc": "市场机会信号"},
            {"key": "risks", "name": "风险", "desc": "风险预警"},
            {"key": "notes", "name": "笔记", "desc": "四色研究卡片"},
            {"key": "watchlist", "name": "自选股", "desc": "自选股管理 + 价格预警"},
            {"key": "portfolio", "name": "投资组合", "desc": "持仓/盈亏/行业配置"},
            {"key": "sectors", "name": "行业对比", "desc": "PE/PB/ROE 横向对比"},
            {"key": "sentiment", "name": "市场情绪", "desc": "情绪指数 + 市场广度"},
        ],
        "global_search": "顶部搜索按钮，支持公司/研报/机会/风险/笔记全量检索",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
