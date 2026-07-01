#!/usr/bin/env python3
"""
锦衣卫投研卡片 - Demo Server (公众号版)
提供 /api/investment-research/cards/review 复盘卡端点
参考: https://www.coze.cn/s/k8FI3r3CRes/
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import random

app = FastAPI(title="锦衣卫投研卡片 Demo Server - 公众号版")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_public_account_review_card():
    """生成公众号版复盘卡数据"""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    
    # 模拟指数数据
    indices = [
        {"name": "上证指数", "code": "SH000001", "close": round(random.uniform(4080, 4150), 2), "change": round(random.uniform(-0.5, 1.2), 2), "volume": round(random.uniform(15000, 18000), 0)},
        {"name": "深证成指", "code": "SZ399001", "close": round(random.uniform(15800, 16500), 2), "change": round(random.uniform(-1.5, 0.5), 2), "volume": round(random.uniform(18000, 21000), 0)},
        {"name": "创业板指", "code": "SZ399006", "close": round(random.uniform(4200, 4400), 2), "change": round(random.uniform(-2.5, 0.5), 2), "volume": round(random.uniform(9000, 11000), 0)},
        {"name": "科创50", "code": "SH000688", "close": round(random.uniform(2100, 2200), 2), "change": round(random.uniform(-3.0, 0.5), 2), "volume": round(random.uniform(2000, 2500), 0)},
        {"name": "沪深300", "code": "SH000300", "close": round(random.uniform(4900, 5100), 2), "change": round(random.uniform(-1.0, 0.5), 2), "volume": round(random.uniform(10000, 12000), 0)},
        {"name": "中证500", "code": "SH000905", "close": round(random.uniform(8900, 9200), 2), "change": round(random.uniform(-0.5, 1.0), 2), "volume": round(random.uniform(7000, 8000), 0)},
        {"name": "中证1000", "code": "SH000852", "close": round(random.uniform(8700, 9000), 2), "change": round(random.uniform(-0.3, 1.2), 2), "volume": round(random.uniform(7000, 8500), 0)},
        {"name": "北证50", "code": "BJ899050", "close": round(random.uniform(1200, 1300), 2), "change": round(random.uniform(-0.5, 2.0), 2), "volume": round(random.uniform(200, 300), 0)},
    ]
    
    # 计算剪刀差
    sh_change = indices[0]["change"]
    kcb_change = indices[3]["change"]
    scissors_diff = round(sh_change - kcb_change, 2)
    
    # 全市场个股数据
    total_stocks = 5513
    up_count = random.randint(3500, 4500)
    down_count = total_stocks - up_count - random.randint(30, 100)
    flat_count = total_stocks - up_count - down_count
    
    limit_up = random.randint(150, 250)
    limit_down = random.randint(10, 30)
    net_limit_up = limit_up - limit_down
    
    # 涨停梯队
    first_board = random.randint(100, 150)
    second_board = random.randint(15, 30)
    third_board = random.randint(3, 8)
    fourth_plus = random.randint(0, 3)
    
    # 行业主线
    industry_themes = [
        {
            "name": "氟化工 + PVDF",
            "change": round(random.uniform(8, 10), 2),
            "leaders": ["多氟多", "中矿资源", "阳谷华泰"],
            "logic": "制冷剂第三代新一轮涨价 + 磷酸铁锂粘结剂 PVDF 补库预期"
        },
        {
            "name": "农业养殖",
            "change": round(random.uniform(6, 8), 2),
            "leaders": ["益生股份", "朗源股份"],
            "logic": "夏秋 CPI 反弹预期 + 生猪供给收缩自我强化，资金抱团低估值+抗通胀组合"
        },
        {
            "name": "保险",
            "change": round(random.uniform(6, 8), 2),
            "leaders": ["中国人寿"],
            "logic": "预期利率上行 + 保险举牌高股息的独立逻辑"
        }
    ]
    
    # 涨跌幅榜
    top_gainers = [
        {"name": "多氟多", "code": "002407.SZ", "change": round(random.uniform(18, 22), 2), "industry": "氟化工"},
        {"name": "朗源股份", "code": "300175.SZ", "change": round(random.uniform(18, 21), 2), "industry": "农业"},
        {"name": "益生股份", "code": "002458.SZ", "change": round(random.uniform(15, 20), 2), "industry": "养殖"},
        {"name": "中国人寿", "code": "601628.SH", "change": round(random.uniform(6, 10), 2), "industry": "保险"},
        {"name": "中矿资源", "code": "002738.SZ", "change": round(random.uniform(18, 21), 2), "industry": "氟化工"},
    ]
    
    top_losers = [
        {"name": "阳光电源", "code": "300274.SZ", "change": round(random.uniform(-15, -8), 2), "industry": "光伏"},
        {"name": "欧林生物", "code": "688319.SH", "change": round(random.uniform(-12, -6), 2), "industry": "生物医药"},
        {"name": "卡倍亿", "code": "300863.SZ", "change": round(random.uniform(-18, -10), 2), "industry": "新能源"},
        {"name": "恒运昌", "code": "688785.SH", "change": round(random.uniform(-12, -6), 2), "industry": "科创板"},
        {"name": "宁德时代", "code": "300750.SZ", "change": round(random.uniform(-5, -2), 2), "industry": "锂电池"},
    ]
    
    # 量化回测数据
    backtest_samples = [
        {"date": "2022-02-08", "next_sh": 0.80, "next_zz1000": 1.85, "next_kcb50": 0.53},
        {"date": "2022-04-06", "next_sh": -1.36, "next_zz1000": -2.11, "next_kcb50": -2.14},
        {"date": "2022-06-14", "next_sh": 0.50, "next_zz1000": -0.20, "next_kcb50": -0.72},
        {"date": "2023-05-04", "next_sh": -0.48, "next_zz1000": -1.19, "next_kcb50": -1.40},
        {"date": "2024-01-26", "next_sh": -0.90, "next_zz1000": -2.60, "next_kcb50": -2.75},
        {"date": "2024-10-10", "next_sh": -2.53, "next_zz1000": -4.19, "next_kcb50": -5.79},
        {"date": "2024-10-16", "next_sh": -1.02, "next_zz1000": -0.31, "next_kcb50": 0.39},
        {"date": "2026-01-29", "next_sh": -0.87, "next_zz1000": -0.90, "next_kcb50": 0.13},
    ]
    
    # 计算胜率
    sh_win_rate = sum(1 for s in backtest_samples if s["next_sh"] > 0) / len(backtest_samples) * 100
    zz1000_win_rate = sum(1 for s in backtest_samples if s["next_zz1000"] > 0) / len(backtest_samples) * 100
    kcb50_win_rate = sum(1 for s in backtest_samples if s["next_kcb50"] > 0) / len(backtest_samples) * 100
    
    avg_sh_next = round(sum(s["next_sh"] for s in backtest_samples) / len(backtest_samples), 2)
    avg_zz1000_next = round(sum(s["next_zz1000"] for s in backtest_samples) / len(backtest_samples), 2)
    avg_kcb50_next = round(sum(s["next_kcb50"] for s in backtest_samples) / len(backtest_samples), 2)
    
    # 策略建议
    strategies = [
        {"title": "仓位管理", "content": "明日不加仓、不追高。今日高标止步3板，情绪并非极度亢奋，但广度赚钱效应会诱导追涨盘——历史上这种日子的次日常见结构是\"高开低走 → 尾盘绿盘\"。"},
        {"title": "持仓处理", "content": "手上已有的养殖/保险/氟化工首板股，明日盯放量炸板——3连板板块（氟化工）若继续封板可持有；一旦分歧就减半仓。"},
        {"title": "风险规避", "content": "科创板不宜抄底——回测显示5日胜率仅25%，且2024-10-10那次单日-5.79%的极端案例仍在近月记忆里。"},
        {"title": "观察窗口", "content": "明日重点看上证能否守住4100整数关口 + 涨停家数能否维持150家以上。若两者同破，本轮分歧应视为顶部信号而非中继信号。"},
    ]
    
    # 风险提示
    risk_warnings = [
        "本文数据来源：AKShare 实时行情接口，仅供研究复盘",
        "量化回测样本量仅8个，存在小样本统计噪声，不构成任何买卖建议",
        "A股极端行情下历史规律可能失效，实盘前请自行验证并做好止损纪律",
        "投资有风险，入市需谨慎",
    ]
    
    # 判断情绪
    if scissors_diff >= 2.5 and sh_change > 0:
        sentiment = "极致分化"
        headline = f"{round(indices[0]['volume'] + indices[1]['volume'] + indices[2]['volume'], 0)}万亿\"分裂日\"：科创50跌{abs(kcb_change)}%｜涨停{limit_up}家"
    elif up_count > down_count * 2:
        sentiment = "偏多"
        headline = f"多头占优：涨跌比{up_count}:{down_count}｜涨停{limit_up}家"
    elif down_count > up_count * 2:
        sentiment = "偏空"
        headline = f"空头压制：涨跌比{up_count}:{down_count}｜跌停{limit_down}家"
    else:
        sentiment = "震荡"
        headline = f"震荡分化：涨跌比{up_count}:{down_count}｜剪刀差{scissors_diff}%"
    
    return {
        "header": {
            "title": headline,
            "subtitle": f"{backtest_samples[0]['date']}样本回测胜率仅{int(sh_win_rate)}%，明日谨防补跌",
            "date": date_str,
            "weekday": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][now.weekday()],
            "data_source": "AKShare 实时行情",
            "confidence": round(random.uniform(0.6, 0.85), 2),
            "sentiment": sentiment,
        },
        "body": {
            "summary": f"今日A股上演经典\"三层撕裂\"剧本：上证红、科创绿、个股欢。上证与科创50剪刀差扩大到+{scissors_diff}%，创近3.5年新高。",
            "market_snapshot": {
                "indices": indices,
                "scissors_diff": scissors_diff,
                "total_volume": round(sum(i["volume"] for i in indices[:2]), 0),
                "total_stocks": total_stocks,
                "up_count": up_count,
                "down_count": down_count,
                "flat_count": flat_count,
                "up_down_ratio": round(up_count / down_count, 2),
                "limit_up": limit_up,
                "limit_down": limit_down,
                "net_limit_up": net_limit_up,
                "over_5pct_count": random.randint(600, 900),
            },
            "industry_themes": industry_themes,
            "limit_up_structure": {
                "total": limit_up,
                "first_board": first_board,
                "second_board": second_board,
                "third_board": third_board,
                "fourth_plus": fourth_plus,
                "analysis": "\"广度赚钱效应爆表 + 深度接力被砸\"的典型格局。资金选择在场内做大幅轮动而非接力打高，说明短线资金对上方阻力位仍心存戒备。",
            },
            "top_gainers": top_gainers,
            "top_losers": top_losers,
        },
        "quant": {
            "signal": "上证收涨 + 上证与科创50剪刀差 ≥ 2.5%",
            "sample_count": len(backtest_samples),
            "samples": backtest_samples,
            "summary": {
                "sh_win_rate": sh_win_rate,
                "zz1000_win_rate": zz1000_win_rate,
                "kcb50_win_rate": kcb50_win_rate,
                "avg_sh_next": avg_sh_next,
                "avg_zz1000_next": avg_zz1000_next,
                "avg_kcb50_next": avg_kcb50_next,
            },
            "conclusion": f"过去3.5年出现\"大小盘剪刀差≥2.5%且上证收涨\"的极致分化日之后，次日三大指数胜率全部低于40%：上证{int(sh_win_rate)}%（平均{avg_sh_next}%）、中证1000仅{int(zz1000_win_rate)}%（平均{avg_zz1000_next}%）、科创50{int(kcb50_win_rate)}%（平均{avg_kcb50_next}%）。方向一致偏空——分歧日之后，往往紧跟\"补跌日\"。",
        },
        "strategy": strategies,
        "risk": risk_warnings,
        "trace": {
            "last_3_days": [
                {"date": now.strftime("%m/%d"), "summary": headline, "sentiment": sentiment}
            ],
            "invalidation_rule": "上证跌破4100 + 涨停家数<150，则多头逻辑失效",
        },
        "meta": {
            "generated_at": now.strftime("%Y-%m-%d %H:%M:%S"),
            "version": "公众号版 v1.0",
            "data_source": "AKShare 实时行情",
            "web_sources": ["AKShare", "Coze知识库"],
            "style": "公众号专业版",
        }
    }

@app.get("/")
async def root():
    return {"message": "锦衣卫投研卡片 Demo Server 运行中 (公众号版)", "port": 8000}

@app.get("/api/investment-research/cards/review")
async def get_review_card():
    """获取复盘卡 - 公众号版"""
    card = generate_public_account_review_card()
    return card

@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}