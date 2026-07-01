#!/usr/bin/env python3
"""
锦衣卫投研卡片 - Demo Server
提供 /api/investment-research/cards/review 复盘卡端点
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import random

app = FastAPI(title="锦衣卫投研卡片 Demo Server")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_mock_review_card():
    """生成模拟复盘卡数据"""
    now = datetime.now()
    
    # 模拟全市场数据
    total_stocks = 4994
    up_count = random.randint(2800, 4200)
    down_count = total_stocks - up_count - random.randint(30, 80)
    flat_count = total_stocks - up_count - down_count
    
    limit_up = random.randint(80, 250)
    limit_down = random.randint(5, 30)
    avg_change = round(random.uniform(-1.5, 3.5), 2)
    
    # 模拟涨幅榜 TOP5 (A股涨红跌绿)
    top_gainers = [
        {"name": "C惠科", "code": "001399.SZ", "change": round(random.uniform(18, 22), 2)},
        {"name": "朗源股份", "code": "300175.SZ", "change": round(random.uniform(18, 21), 2)},
        {"name": "汇宇制药", "code": "688553.SH", "change": round(random.uniform(18, 21), 2)},
        {"name": "华民股份", "code": "300345.SZ", "change": round(random.uniform(18, 21), 2)},
        {"name": "金道科技", "code": "301279.SZ", "change": round(random.uniform(18, 21), 2)},
    ]
    
    # 模拟跌幅榜 TOP5
    top_losers = [
        {"name": "卡倍亿", "code": "300863.SZ", "change": round(random.uniform(-20, -10), 2)},
        {"name": "阳光电源", "code": "300274.SZ", "change": round(random.uniform(-15, -8), 2)},
        {"name": "欧林生物", "code": "688319.SH", "change": round(random.uniform(-15, -8), 2)},
        {"name": "恒运昌", "code": "688785.SH", "change": round(random.uniform(-12, -6), 2)},
        {"name": "苏州天脉", "code": "301626.SZ", "change": round(random.uniform(-12, -6), 2)},
    ]
    
    # 情绪判断
    if avg_change > 1.5 and up_count > down_count * 2:
        sentiment = "偏多"
    elif avg_change < -1 and down_count > up_count * 2:
        sentiment = "偏空"
    else:
        sentiment = "震荡"
    
    # 主线
    main_theme = f"全市场涨跌比 {up_count}:{down_count}，{'多头' if up_count > down_count else '空头'}占优，领涨：{top_gainers[0]['name']}"
    
    # 风险提示
    risk = f"跌停 {limit_down} 只，警惕杀跌扩散；跌破前低则逻辑失效"
    
    # 连续追踪
    last_3_days = [
        {"date": now.strftime("%m/%d"), "summary": f"全市场涨跌比 {up_count}:{down_count}，{'多头' if up_count > down_count else '空头'}占优，领涨：{top_gainers[0]['name']}（{sentiment}）"}
    ]
    
    return {
        "header": {
            "title": "盘后复盘 · 锦衣卫监正",
            "confidence": round(random.uniform(0.5, 0.85), 2),
            "sentiment": sentiment,
            "style": "白话腔"
        },
        "body": {
            "snapshot": {
                "total_stocks": total_stocks,
                "up_count": up_count,
                "down_count": down_count,
                "flat_count": flat_count,
                "limit_up": limit_up,
                "limit_down": limit_down,
                "avg_change": avg_change
            },
            "main_theme": main_theme,
            "top_gainers": top_gainers,
            "top_losers": top_losers,
            "risk": risk
        },
        "trace": {
            "last_3_days": last_3_days,
            "invalidation_rule": "平均涨幅转负且跌停数 > 涨停数 ×2，则多头逻辑失效"
        },
        "meta": {
            "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
            "data_source": "模拟数据（演示模式）",
            "web_sources": ["AKShare 模拟", "AnySearch 模拟"]
        }
    }

@app.get("/")
async def root():
    return {"message": "锦衣卫投研卡片 Demo Server 运行中", "port": 8000}

@app.get("/api/investment-research/cards/review")
async def get_review_card():
    """获取复盘卡"""
    card = generate_mock_review_card()
    return card

@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}