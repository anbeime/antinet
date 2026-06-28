# -*- coding: utf-8 -*-
"""
投研场景 API 路由
提供投资研究（行业分析、公司研究、策略研究、机会发现、风险预警）
相关的完整 API 接口，包含演示数据以便前端直接展示使用场景。
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/api/investment-research", tags=["投研场景"])


# ============================================================
# 数据模型
# ============================================================

class DashboardSummary(BaseModel):
    """投研首页总览"""
    total_reports: int
    total_companies: int
    active_strategies: int
    watchlist_items: int
    opportunity_count: int
    risk_warning_count: int
    hot_sectors: List[Dict[str, Any]]
    recent_activities: List[Dict[str, Any]]


class CompanyProfile(BaseModel):
    """公司概况（用于研究对象列表/详情）"""
    code: str
    name: str
    sector: str
    market_cap: str
    current_price: float
    change_pct: float
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    rating: str  # 买入/增持/持有/中性/减持
    target_price: Optional[float] = None
    tags: List[str]
    summary: str


class ResearchReport(BaseModel):
    """研究报告"""
    id: int
    title: str
    author: str
    published_at: str
    category: str  # 宏观/策略/行业/公司/转债/基金
    company_codes: List[str]
    tags: List[str]
    summary: str
    key_points: List[str]
    risk_points: List[str]
    investment_suggestion: str
    status: str  # published / draft / archived


class ResearchReportCreate(BaseModel):
    title: str
    author: Optional[str] = "研究员"
    category: str = "公司"
    company_codes: Optional[List[str]] = None
    summary: Optional[str] = ""
    key_points: Optional[List[str]] = None
    risk_points: Optional[List[str]] = None
    investment_suggestion: Optional[str] = ""


class MarketOpportunity(BaseModel):
    """市场机会"""
    id: int
    title: str
    sector: str
    signal_type: str  # 价值低估/技术突破/行业催化/资金流入
    score: float  # 0-100
    reason: str
    related_companies: List[str]
    suggested_action: str
    updated_at: str


class RiskWarning(BaseModel):
    """风险预警"""
    id: int
    level: str  # low / medium / high / critical
    title: str
    description: str
    affected_companies: List[str]
    affected_sectors: List[str]
    triggers: List[str]
    first_noticed_at: str


class ResearchNote(BaseModel):
    """研究笔记（卡片关联）"""
    id: int
    title: str
    content: str
    card_type: str  # blue 事实 / green 解释 / yellow 风险 / red 行动
    tags: List[str]
    related_company: Optional[str] = None
    related_report_id: Optional[int] = None
    created_at: str


class ResearchNoteCreate(BaseModel):
    title: str
    content: str
    card_type: str = "blue"
    tags: Optional[List[str]] = None
    related_company: Optional[str] = None
    related_report_id: Optional[int] = None


# ============================================================
# 演示数据（种子）
# ============================================================

_SECTORS = [
    "新能源", "半导体", "医药生物", "消费电子", "人工智能",
    "高端制造", "金融科技", "新材料", "数字经济", "军工航天"
]

_RATINGS = ["买入", "增持", "持有", "中性", "减持"]

_COMPANIES: List[Dict[str, Any]] = [
    {
        "code": "600519.SH",
        "name": "贵州茅台",
        "sector": "消费电子",
        "market_cap": "2.1 万亿",
        "current_price": 1680.5,
        "change_pct": 1.28,
        "pe_ratio": 28.5,
        "pb_ratio": 9.1,
        "rating": "买入",
        "target_price": 1900.0,
        "tags": ["龙头", "消费", "白马"],
        "summary": "国内白酒行业龙头，品牌护城河深厚，渠道体系完善。"
    },
    {
        "code": "300750.SZ",
        "name": "宁德时代",
        "sector": "新能源",
        "market_cap": "1.8 万亿",
        "current_price": 228.4,
        "change_pct": 3.12,
        "pe_ratio": 22.3,
        "pb_ratio": 4.8,
        "rating": "增持",
        "target_price": 265.0,
        "tags": ["动力电池", "新能源", "技术领先"],
        "summary": "全球动力电池龙头厂商，研发投入持续加码，海外扩张加速。"
    },
    {
        "code": "688981.SH",
        "name": "中芯国际",
        "sector": "半导体",
        "market_cap": "4800 亿",
        "current_price": 58.9,
        "change_pct": -0.84,
        "pe_ratio": 45.2,
        "pb_ratio": 2.6,
        "rating": "持有",
        "target_price": 62.0,
        "tags": ["晶圆代工", "国产替代", "重资产"],
        "summary": "中国大陆晶圆代工龙头，受益于国产替代趋势和国家扶持。"
    },
    {
        "code": "000858.SZ",
        "name": "五粮液",
        "sector": "消费电子",
        "market_cap": "5800 亿",
        "current_price": 148.2,
        "change_pct": 0.95,
        "pe_ratio": 18.4,
        "pb_ratio": 5.2,
        "rating": "增持",
        "target_price": 170.0,
        "tags": ["白酒", "高端消费", "业绩稳健"],
        "summary": "浓香型白酒代表，品牌力稳健，春节动销表现优秀。"
    },
    {
        "code": "601318.SH",
        "name": "中国平安",
        "sector": "金融科技",
        "market_cap": "1.2 万亿",
        "current_price": 48.6,
        "change_pct": -1.22,
        "pe_ratio": 8.2,
        "pb_ratio": 0.78,
        "rating": "中性",
        "target_price": 55.0,
        "tags": ["保险", "金融科技", "综合金融"],
        "summary": "综合金融集团，寿险改革进入见效期，新业务价值持续改善。"
    },
    {
        "code": "688256.SH",
        "name": "寒武纪",
        "sector": "人工智能",
        "market_cap": "980 亿",
        "current_price": 248.0,
        "change_pct": 5.62,
        "pe_ratio": None,
        "pb_ratio": 6.2,
        "rating": "买入",
        "target_price": 310.0,
        "tags": ["AI芯片", "大模型", "国产算力"],
        "summary": "国内领先的AI芯片公司，思元系列产品在大模型推理市场表现亮眼。"
    },
    {
        "code": "002594.SZ",
        "name": "比亚迪",
        "sector": "新能源",
        "market_cap": "7200 亿",
        "current_price": 248.5,
        "change_pct": 2.15,
        "pe_ratio": 25.6,
        "pb_ratio": 4.2,
        "rating": "买入",
        "target_price": 295.0,
        "tags": ["新能源车", "整车", "垂直整合"],
        "summary": "全球新能源汽车销量冠军，垂直整合能力突出，海外业务加速。"
    },
    {
        "code": "300059.SZ",
        "name": "东方财富",
        "sector": "金融科技",
        "market_cap": "2600 亿",
        "current_price": 15.48,
        "change_pct": 0.62,
        "pe_ratio": 22.0,
        "pb_ratio": 2.8,
        "rating": "增持",
        "target_price": 18.5,
        "tags": ["互联网券商", "基金代销", "活跃用户"],
        "summary": "互联网金融信息服务龙头，活跃用户数持续领先行业。"
    },
    {
        "code": "601012.SH",
        "name": "隆基绿能",
        "sector": "新材料",
        "market_cap": "2100 亿",
        "current_price": 22.18,
        "change_pct": -2.88,
        "pe_ratio": 12.5,
        "pb_ratio": 2.1,
        "rating": "持有",
        "target_price": 25.0,
        "tags": ["光伏", "硅片", "新技术路线"],
        "summary": "全球光伏组件龙头，BC 电池技术路线布局领先。"
    },
    {
        "code": "000725.SZ",
        "name": "京东方A",
        "sector": "消费电子",
        "market_cap": "1650 亿",
        "current_price": 4.28,
        "change_pct": -0.47,
        "pe_ratio": 35.2,
        "pb_ratio": 1.1,
        "rating": "中性",
        "target_price": 4.8,
        "tags": ["面板", "显示", "周期底部"],
        "summary": "全球显示面板龙头，大尺寸LCD份额第一，OLED产能快速释放。"
    },
    {
        "code": "688111.SH",
        "name": "金山办公",
        "sector": "数字经济",
        "market_cap": "1620 亿",
        "current_price": 352.4,
        "change_pct": 1.84,
        "pe_ratio": 52.8,
        "pb_ratio": 11.5,
        "rating": "增持",
        "target_price": 410.0,
        "tags": ["办公软件", "信创", "AI办公"],
        "summary": "国产办公软件龙头，WPS AI 功能落地，订阅收入持续增长。"
    },
    {
        "code": "600893.SH",
        "name": "航发动力",
        "sector": "军工航天",
        "market_cap": "1240 亿",
        "current_price": 48.5,
        "change_pct": 3.22,
        "pe_ratio": 68.5,
        "pb_ratio": 3.8,
        "rating": "买入",
        "target_price": 58.0,
        "tags": ["航空发动机", "军工", "国产替代"],
        "summary": "国内航空发动机整机制造平台，新型号放量驱动业绩增长。"
    },
]

_REPORTS: List[Dict[str, Any]] = [
    {
        "id": 1001,
        "title": "2026 年新能源汽车行业全景研究",
        "author": "张研",
        "published_at": (datetime.now() - timedelta(days=2)).isoformat(timespec="seconds"),
        "category": "行业",
        "company_codes": ["002594.SZ", "300750.SZ"],
        "tags": ["新能源", "智能驾驶", "出海"],
        "summary": "全球电动化趋势持续，中国车企加速出海。本报告从供需、价格、技术、政策四个维度系统梳理行业未来三年的投资机会。",
        "key_points": [
            "全球新能源汽车渗透率预计 2026 年达到 38%",
            "中国车企海外销量同比增长预计突破 60%",
            "800V 高压快充 + 固态电池进入产业化前夜",
            "智能化（城市 NOA）成为差异化关键竞争点"
        ],
        "risk_points": [
            "欧洲市场反补贴调查带来关税不确定性",
            "动力电池价格战可能压缩中游利润",
            "锂矿资源新产能释放，价格中枢下移"
        ],
        "investment_suggestion": "推荐关注整车出海能力强、智能化布局领先的企业；动力电池环节谨慎关注二线厂商。",
        "status": "published",
    },
    {
        "id": 1002,
        "title": "贵州茅台（600519）深度报告：品牌护城河再审视",
        "author": "李研",
        "published_at": (datetime.now() - timedelta(days=7)).isoformat(timespec="seconds"),
        "category": "公司",
        "company_codes": ["600519.SH"],
        "tags": ["白酒", "深度报告", "龙头"],
        "summary": "对茅台品牌力、渠道库存、价格体系、i 茅台数字化等方面进行系统梳理，重新评估其长期估值中枢。",
        "key_points": [
            "飞天茅台批价保持稳定，高端酒消费韧性显现",
            "i 茅台直销占比提升至 45%，渠道利润结构性改善",
            "系列酒（茅台1935）增长贡献约 30%",
            "2026 年目标营收复合增速约 12%"
        ],
        "risk_points": [
            "宏观消费复苏节奏不确定",
            "商务宴请结构性变化可能影响高端需求"
        ],
        "investment_suggestion": '维持"买入"评级，目标价 1900 元（对应 2026 年 32 倍 PE）。',
        "status": "published",
    },
    {
        "id": 1003,
        "title": "人工智能算力产业链跟踪报告",
        "author": "王研",
        "published_at": (datetime.now() - timedelta(days=12)).isoformat(timespec="seconds"),
        "category": "行业",
        "company_codes": ["688256.SH", "688981.SH"],
        "tags": ["AI", "算力", "国产替代"],
        "summary": "大模型训练与推理需求持续爆发，国产算力产业链正在快速补齐。",
        "key_points": [
            "国产 AI 芯片在推理场景替代进度超预期",
            "国产 GPU 性能已接近国际一线厂商中端水平",
            "运营商、互联网公司开始大规模采购国产推理卡"
        ],
        "risk_points": [
            "高端训练芯片仍受出口管制影响",
            "先进制程产能紧张可能制约国产替代节奏"
        ],
        "investment_suggestion": "重点布局国产 AI 芯片设计、封装测试、光模块与服务器整机环节。",
        "status": "published",
    },
    {
        "id": 1004,
        "title": "2026 年宏观经济与A股市场策略展望",
        "author": "陈策略",
        "published_at": (datetime.now() - timedelta(days=20)).isoformat(timespec="seconds"),
        "category": "策略",
        "company_codes": [],
        "tags": ["宏观", "策略", "A股"],
        "summary": "从增长、通胀、流动性、政策预期四个维度展望 2026 年 A 股市场表现及结构性机会。",
        "key_points": [
            "GDP 目标预计维持在 5% 左右",
            '货币政策保持"以我为主"，短端利率易下难上',
            "财政政策预计继续加力，重点投向科技新质生产力",
            "外资阶段性回流，A 股估值仍处于历史中位偏下区间"
        ],
        "risk_points": [
            "外部地缘政治冲突反复",
            "美债利率中枢上移对成长股估值形成压制"
        ],
        "investment_suggestion": "超配新质生产力（人工智能、先进制造、新能源中的新技术），标配必需消费。",
        "status": "published",
    },
    {
        "id": 1005,
        "title": "五粮液（000858）年报点评：改革成效显现",
        "author": "李研",
        "published_at": (datetime.now() - timedelta(days=1)).isoformat(timespec="seconds"),
        "category": "公司",
        "company_codes": ["000858.SZ"],
        "tags": ["白酒", "年报", "点评"],
        "summary": "年报业绩符合预期，渠道改革成效逐步显现，管理层换届后市场化机制有望加强。",
        "key_points": [
            "2025 年收入同比 +9.8%，净利润同比 +10.5%",
            "第八代普五价格体系稳定，动销改善",
            "高端产品毛利率提升 1.2pp 至 81.5%"
        ],
        "risk_points": [
            "春节消费节奏前置导致 Q1 高基数"
        ],
        "investment_suggestion": '维持"增持"评级，目标价 170 元。',
        "status": "published",
    },
]

_OPPORTUNITIES: List[Dict[str, Any]] = [
    {
        "id": 2001,
        "title": "固态电池产业链：从实验室到产业化",
        "sector": "新能源",
        "signal_type": "行业催化",
        "score": 86.0,
        "reason": "多家头部车企宣布 2027 年推出半固态电池车型，上游氧化物/硫化物材料供应商将明显受益。",
        "related_companies": ["300750.SZ", "002594.SZ"],
        "suggested_action": "关注上游关键材料供应商",
        "updated_at": (datetime.now() - timedelta(hours=6)).isoformat(timespec="seconds"),
    },
    {
        "id": 2002,
        "title": "国产大模型推理卡替换机会",
        "sector": "人工智能",
        "signal_type": "技术突破",
        "score": 92.0,
        "reason": "国产推理芯片实测性能接近 A10 水平，价格仅为进口方案 35%，三大运营商开启集采。",
        "related_companies": ["688256.SH"],
        "suggested_action": "关注国产 AI 芯片设计龙头",
        "updated_at": (datetime.now() - timedelta(hours=10)).isoformat(timespec="seconds"),
    },
    {
        "id": 2003,
        "title": "军工航天：新型号放量 + 出口订单共振",
        "sector": "军工航天",
        "signal_type": "资金流入",
        "score": 78.0,
        "reason": "近 30 日军工板块主力资金净流入超 80 亿，航空发动机、导弹产业链订单能见度高。",
        "related_companies": ["600893.SH"],
        "suggested_action": "关注有新型号批产预期的主机厂",
        "updated_at": (datetime.now() - timedelta(hours=24)).isoformat(timespec="seconds"),
    },
    {
        "id": 2004,
        "title": "光伏 BC 电池：新技术路线的结构性机会",
        "sector": "新材料",
        "signal_type": "价值低估",
        "score": 72.0,
        "reason": "主产业链估值已回落至历史 15% 分位，BC 电池渗透率快速提升，龙头盈利能力有望逆行业修复。",
        "related_companies": ["601012.SH"],
        "suggested_action": "关注差异化技术路线厂商",
        "updated_at": (datetime.now() - timedelta(hours=48)).isoformat(timespec="seconds"),
    },
]

_RISK_WARNINGS: List[Dict[str, Any]] = [
    {
        "id": 3001,
        "level": "high",
        "title": "欧洲反补贴调查：中国电动车关税风险",
        "description": "欧盟针对中国新能源车企的反补贴调查进入听证阶段，可能加征 10-15% 关税。",
        "affected_companies": ["002594.SZ"],
        "affected_sectors": ["新能源"],
        "triggers": ["关税预期", "汇率波动", "欧洲本地产能替代"],
        "first_noticed_at": (datetime.now() - timedelta(days=14)).isoformat(timespec="seconds"),
    },
    {
        "id": 3002,
        "level": "medium",
        "title": "光伏主产业链价格战风险",
        "description": "硅料、硅片环节价格竞争激烈，部分二线厂商已出现现金流压力。",
        "affected_companies": ["601012.SH"],
        "affected_sectors": ["新材料", "新能源"],
        "triggers": ["产能过剩", "价格战", "库存高企"],
        "first_noticed_at": (datetime.now() - timedelta(days=21)).isoformat(timespec="seconds"),
    },
    {
        "id": 3003,
        "level": "critical",
        "title": "出口管制升级：先进制程 GPU 供应链风险",
        "description": "海外出口管制进一步升级，国内大模型训练算力采购成本与交付周期承压。",
        "affected_companies": ["688981.SH", "688256.SH"],
        "affected_sectors": ["半导体", "人工智能"],
        "triggers": ["出口管制", "算力紧缺", "国产化替代"],
        "first_noticed_at": (datetime.now() - timedelta(days=40)).isoformat(timespec="seconds"),
    },
]

_NOTES: List[Dict[str, Any]] = [
    {
        "id": 4001,
        "title": "比亚迪 25Q4 海外销量首次突破 30 万辆",
        "content": "比亚迪披露 2025Q4 海外销量首次突破 30 万辆，同比增长 82%。海外毛利率高于国内，预计显著拉动整体盈利。",
        "card_type": "blue",
        "tags": ["新能源车", "出海", "事实数据"],
        "related_company": "002594.SZ",
        "related_report_id": 1001,
        "created_at": (datetime.now() - timedelta(hours=2)).isoformat(timespec="seconds"),
    },
    {
        "id": 4002,
        "title": "为什么看好国产 AI 推理芯片",
        "content": "1) 海外进口卡价格高昂且交付周期长；2) 推理场景对算力精度要求较低，更易替代；3) 国产方案在软件栈（算子、推理框架）上快速补齐。",
        "card_type": "green",
        "tags": ["AI", "推理", "逻辑推演"],
        "related_company": "688256.SH",
        "related_report_id": 1003,
        "created_at": (datetime.now() - timedelta(hours=5)).isoformat(timespec="seconds"),
    },
    {
        "id": 4003,
        "title": "警惕白酒板块 Q1 高基数效应",
        "content": "25Q1 白酒春节动销基数极高，叠加消费复苏节奏偏慢，26Q1 同比数据可能承压。建议组合适度均衡配置。",
        "card_type": "yellow",
        "tags": ["白酒", "风险提示", "季度数据"],
        "related_company": "600519.SH",
        "related_report_id": 1002,
        "created_at": (datetime.now() - timedelta(hours=8)).isoformat(timespec="seconds"),
    },
    {
        "id": 4004,
        "title": "行动：寒武纪建仓观察清单",
        "content": "将寒武纪加入重点观察清单，等待 AI 芯片业务订单披露与业绩拐点，计划在回调至 220 元附近分批建仓。",
        "card_type": "red",
        "tags": ["行动项", "AI", "建仓计划"],
        "related_company": "688256.SH",
        "related_report_id": 1003,
        "created_at": (datetime.now() - timedelta(hours=12)).isoformat(timespec="seconds"),
    },
]

_ACTIVITIES: List[Dict[str, Any]] = [
    {"id": 1, "type": "report", "title": "发布《2026 年新能源汽车行业全景研究》", "at": (datetime.now() - timedelta(hours=1)).isoformat(timespec="seconds")},
    {"id": 2, "type": "opportunity", "title": "发现 1 个新机会：国产大模型推理卡替换机会", "at": (datetime.now() - timedelta(hours=10)).isoformat(timespec="seconds")},
    {"id": 3, "type": "note", "title": "新建 4 张研究卡片（蓝/绿/黄/红）", "at": (datetime.now() - timedelta(hours=12)).isoformat(timespec="seconds")},
    {"id": 4, "type": "risk", "title": "触发 1 条高等级风险预警：欧洲反补贴调查", "at": (datetime.now() - timedelta(days=1)).isoformat(timespec="seconds")},
    {"id": 5, "type": "report", "title": "更新《贵州茅台深度报告》要点", "at": (datetime.now() - timedelta(days=3)).isoformat(timespec="seconds")},
]


# ============================================================
# 路由实现
# ============================================================

@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard():
    """投研首页总览：统计卡片 + 热门行业 + 近期活动"""
    sector_counts: Dict[str, int] = {}
    for c in _COMPANIES:
        sector_counts[c["sector"]] = sector_counts.get(c["sector"], 0) + 1
    hot_sectors = [
        {"name": name, "company_count": count, "heat_score": round(random.uniform(60, 98), 1)}
        for name, count in sector_counts.items()
    ]
    hot_sectors.sort(key=lambda s: s["heat_score"], reverse=True)

    return DashboardSummary(
        total_reports=len(_REPORTS),
        total_companies=len(_COMPANIES),
        active_strategies=4,
        watchlist_items=8,
        opportunity_count=len(_OPPORTUNITIES),
        risk_warning_count=len(_RISK_WARNINGS),
        hot_sectors=hot_sectors,
        recent_activities=_ACTIVITIES,
    )


@router.get("/companies", response_model=List[CompanyProfile])
async def list_companies(
    sector: Optional[str] = None,
    rating: Optional[str] = None,
    keyword: Optional[str] = None,
):
    """研究对象（公司/行业）列表"""
    result = _COMPANIES
    if sector:
        result = [c for c in result if c["sector"] == sector]
    if rating:
        result = [c for c in result if c["rating"] == rating]
    if keyword:
        kw = keyword.lower()
        result = [
            c for c in result
            if kw in c["name"].lower() or kw in c["code"].lower()
        ]
    return result


@router.get("/companies/{code}", response_model=CompanyProfile)
async def get_company(code: str):
    """单个公司详情"""
    for c in _COMPANIES:
        if c["code"] == code:
            return c
    raise HTTPException(status_code=404, detail="公司不存在")


@router.get("/reports", response_model=List[ResearchReport])
async def list_reports(
    category: Optional[str] = None,
    company_code: Optional[str] = None,
    keyword: Optional[str] = None,
):
    """研究报告列表"""
    result = list(_REPORTS)
    if category:
        result = [r for r in result if r["category"] == category]
    if company_code:
        result = [r for r in result if company_code in r["company_codes"]]
    if keyword:
        kw = keyword.lower()
        result = [
            r for r in result
            if kw in r["title"].lower() or any(kw in t.lower() for t in r["tags"])
        ]
    return result


@router.get("/reports/{report_id}", response_model=ResearchReport)
async def get_report(report_id: int):
    """研究报告详情"""
    for r in _REPORTS:
        if r["id"] == report_id:
            return r
    raise HTTPException(status_code=404, detail="报告不存在")


@router.post("/reports", response_model=ResearchReport)
async def create_report(payload: ResearchReportCreate):
    """新建研究报告（演示：返回一个带新 id 的对象，不落库）"""
    new_id = max((r["id"] for r in _REPORTS), default=1000) + 1
    now = datetime.now().isoformat(timespec="seconds")
    report: Dict[str, Any] = {
        "id": new_id,
        "title": payload.title,
        "author": payload.author or "研究员",
        "published_at": now,
        "category": payload.category or "公司",
        "company_codes": payload.company_codes or [],
        "tags": [],
        "summary": payload.summary or "",
        "key_points": payload.key_points or [],
        "risk_points": payload.risk_points or [],
        "investment_suggestion": payload.investment_suggestion or "",
        "status": "draft",
    }
    _REPORTS.append(report)
    return report


@router.get("/opportunities", response_model=List[MarketOpportunity])
async def list_opportunities(min_score: Optional[float] = None):
    """市场机会列表"""
    result = list(_OPPORTUNITIES)
    if min_score is not None:
        result = [o for o in result if o["score"] >= min_score]
    result.sort(key=lambda o: o["score"], reverse=True)
    return result


@router.get("/risk-warnings", response_model=List[RiskWarning])
async def list_risk_warnings(level: Optional[str] = None):
    """风险预警列表"""
    result = list(_RISK_WARNINGS)
    if level:
        result = [r for r in result if r["level"] == level]
    return result


@router.get("/notes", response_model=List[ResearchNote])
async def list_notes(
    card_type: Optional[str] = None,
    related_company: Optional[str] = None,
    related_report_id: Optional[int] = None,
):
    """研究卡片/笔记列表"""
    result = list(_NOTES)
    if card_type:
        result = [n for n in result if n["card_type"] == card_type]
    if related_company:
        result = [n for n in result if n["related_company"] == related_company]
    if related_report_id is not None:
        result = [n for n in result if n["related_report_id"] == related_report_id]
    return result


@router.post("/notes", response_model=ResearchNote)
async def create_note(payload: ResearchNoteCreate):
    """新建研究卡片（演示：只返回对象，不落库）"""
    new_id = max((n["id"] for n in _NOTES), default=4000) + 1
    note: Dict[str, Any] = {
        "id": new_id,
        "title": payload.title,
        "content": payload.content,
        "card_type": payload.card_type or "blue",
        "tags": payload.tags or [],
        "related_company": payload.related_company,
        "related_report_id": payload.related_report_id,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }
    _NOTES.append(note)
    return note


@router.get("/sectors", response_model=List[str])
async def list_sectors():
    """支持的行业分类"""
    return _SECTORS


@router.get("/ratings", response_model=List[str])
async def list_ratings():
    """支持的评级分类"""
    return _RATINGS


@router.get("/hot-topics")
async def get_hot_topics():
    """热门主题：展示与卡片、报告关联的研究主题"""
    topics: List[Dict[str, Any]] = []
    for tag in ["AI", "新能源", "半导体", "白酒", "军工", "信创", "数字经济"]:
        topic_notes = [n for n in _NOTES if any(tag in t for t in n["tags"])]
        topic_reports = [r for r in _REPORTS if any(tag in t for t in r["tags"])]
        topics.append({
            "tag": tag,
            "notes_count": len(topic_notes),
            "reports_count": len(topic_reports),
            "heat_score": round(random.uniform(55, 99), 1),
        })
    return {"hot_topics": topics}


# ============================================================
# 扩展功能：公司财务指标
# ============================================================

class FinancialMetric(BaseModel):
    """单季度财务指标"""
    period: str  # 2025Q3
    revenue: float  # 营收（亿元）
    revenue_yoy: float  # 营收同比 %
    net_profit: float  # 净利润（亿元）
    net_profit_yoy: float  # 净利润同比 %
    gross_margin: float  # 毛利率 %
    net_margin: float  # 净利率 %
    roe: float  # ROE %
    debt_ratio: float  # 资产负债率 %


class CompanyFinancials(BaseModel):
    """公司财务概况"""
    code: str
    name: str
    metrics: List[FinancialMetric]
    valuation: Dict[str, Any]  # pe / pb / ps / ev_ebitda
    dividend: Dict[str, Any]  # 股息率 / 分红比率


_FINANCIALS: Dict[str, CompanyFinancials] = {}


def _init_financials():
    """为每家公司生成演示财务数据"""
    for c in _COMPANIES:
        code = c["code"]
        metrics = []
        base_rev = random.uniform(50, 800)
        for i in range(8):
            q = 8 - i
            rev = round(base_rev * (1 + random.uniform(-0.15, 0.25)) * (1 + i * 0.03), 2)
            np = round(rev * random.uniform(0.08, 0.25), 2)
            metrics.append(FinancialMetric(
                period=f"2024Q{q}" if i < 4 else f"2025Q{i - 3}",
                revenue=rev,
                revenue_yoy=round(random.uniform(-5, 35), 1),
                net_profit=np,
                net_profit_yoy=round(random.uniform(-10, 40), 1),
                gross_margin=round(random.uniform(25, 85), 1),
                net_margin=round(random.uniform(8, 30), 1),
                roe=round(random.uniform(8, 35), 1),
                debt_ratio=round(random.uniform(20, 70), 1),
            ))
        _FINANCIALS[code] = CompanyFinancials(
            code=code,
            name=c["name"],
            metrics=metrics,
            valuation={
                "pe_ttm": c.get("pe_ratio") or round(random.uniform(15, 60), 1),
                "pb": c.get("pb_ratio") or round(random.uniform(1, 10), 2),
                "ps_ttm": round(random.uniform(1, 15), 1),
                "ev_ebitda": round(random.uniform(8, 30), 1),
            },
            dividend={
                "yield_pct": round(random.uniform(0, 5), 2),
                "payout_ratio": round(random.uniform(0, 80), 1),
            },
        )


_init_financials()


@router.get("/companies/{code}/financials", response_model=CompanyFinancials)
async def get_company_financials(code: str):
    """公司财务指标（8 个季度趋势）"""
    if code not in _FINANCIALS:
        raise HTTPException(status_code=404, detail="公司财务数据不存在")
    return _FINANCIALS[code]


# ============================================================
# 扩展功能：自选股管理
# ============================================================

class WatchlistItem(BaseModel):
    code: str
    name: str
    added_at: str
    note: Optional[str] = None
    alert_price: Optional[float] = None


class WatchlistAdd(BaseModel):
    code: str
    note: Optional[str] = None
    alert_price: Optional[float] = None


_WATCHLIST: List[Dict[str, Any]] = [
    {"code": "600519.SH", "name": "贵州茅台", "added_at": (datetime.now() - timedelta(days=5)).isoformat(timespec="seconds"), "note": "长期持有", "alert_price": 1600.0},
    {"code": "688256.SH", "name": "寒武纪", "added_at": (datetime.now() - timedelta(days=3)).isoformat(timespec="seconds"), "note": "AI 芯片观察", "alert_price": 220.0},
    {"code": "002594.SZ", "name": "比亚迪", "added_at": (datetime.now() - timedelta(days=1)).isoformat(timespec="seconds"), "note": None, "alert_price": 230.0},
]


@router.get("/watchlist", response_model=List[WatchlistItem])
async def get_watchlist():
    """自选股列表（含实时价格与预警检查）"""
    result = []
    for item in _WATCHLIST:
        company = next((c for c in _COMPANIES if c["code"] == item["code"]), None)
        entry = {
            **item,
            "current_price": company["current_price"] if company else None,
            "change_pct": company["change_pct"] if company else None,
            "alert_triggered": (
                company and item.get("alert_price") is not None
                and company["current_price"] <= item["alert_price"]
            ),
        }
        result.append(entry)
    return result


@router.post("/watchlist", response_model=WatchlistItem)
async def add_to_watchlist(payload: WatchlistAdd):
    """添加自选股"""
    if any(w["code"] == payload.code for w in _WATCHLIST):
        raise HTTPException(status_code=409, detail="该股票已在自选列表中")
    company = next((c for c in _COMPANIES if c["code"] == payload.code), None)
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")
    item = {
        "code": payload.code,
        "name": company["name"],
        "added_at": datetime.now().isoformat(timespec="seconds"),
        "note": payload.note,
        "alert_price": payload.alert_price,
    }
    _WATCHLIST.append(item)
    return item


@router.delete("/watchlist/{code}")
async def remove_from_watchlist(code: str):
    """移除自选股"""
    before = len(_WATCHLIST)
    _WATCHLIST[:] = [w for w in _WATCHLIST if w["code"] != code]
    if len(_WATCHLIST) == before:
        raise HTTPException(status_code=404, detail="自选股中不存在该股票")
    return {"message": f"已移除 {code}"}


# ============================================================
# 扩展功能：行业对比分析
# ============================================================

class SectorComparison(BaseModel):
    sector: str
    company_count: int
    avg_pe: Optional[float]
    avg_pb: Optional[float]
    avg_roe: Optional[float]
    avg_change_pct: float
    top_companies: List[Dict[str, Any]]
    market_cap_total: str


@router.get("/sector-comparison", response_model=List[SectorComparison])
async def get_sector_comparison():
    """行业对比分析：各行业平均 PE/PB/ROE/涨跌幅"""
    sector_data: Dict[str, List[Dict[str, Any]]] = {}
    for c in _COMPANIES:
        sector_data.setdefault(c["sector"], []).append(c)

    results = []
    for sector, comps in sector_data.items():
        pe_vals = [c["pe_ratio"] for c in comps if c["pe_ratio"] is not None]
        pb_vals = [c["pb_ratio"] for c in comps if c["pb_ratio"] is not None]
        roe_vals = [
            _FINANCIALS[c["code"]].metrics[-1].roe
            for c in comps if c["code"] in _FINANCIALS and _FINANCIALS[c["code"]].metrics
        ]
        change_vals = [c["change_pct"] for c in comps]
        results.append(SectorComparison(
            sector=sector,
            company_count=len(comps),
            avg_pe=round(sum(pe_vals) / len(pe_vals), 1) if pe_vals else None,
            avg_pb=round(sum(pb_vals) / len(pb_vals), 2) if pb_vals else None,
            avg_roe=round(sum(roe_vals) / len(roe_vals), 1) if roe_vals else None,
            avg_change_pct=round(sum(change_vals) / len(change_vals), 2),
            top_companies=[
                {"code": c["code"], "name": c["name"], "rating": c["rating"], "market_cap": c["market_cap"]}
                for c in sorted(comps, key=lambda x: x["change_pct"], reverse=True)[:3]
            ],
            market_cap_total=f"{len(comps)} 家公司",
        ))
    results.sort(key=lambda r: r.avg_change_pct, reverse=True)
    return results


# ============================================================
# 扩展功能：投资组合追踪
# ============================================================

class PortfolioHolding(BaseModel):
    code: str
    name: str
    shares: int
    cost_price: float
    current_price: float
    market_value: float
    profit_loss: float
    profit_pct: float
    weight: float


class PortfolioSummary(BaseModel):
    total_cost: float
    total_market_value: float
    total_profit_loss: float
    total_profit_pct: float
    holdings: List[PortfolioHolding]
    allocation_by_sector: List[Dict[str, Any]]


_PORTFOLIO: List[Dict[str, Any]] = [
    {"code": "600519.SH", "shares": 100, "cost_price": 1550.0},
    {"code": "300750.SZ", "shares": 500, "cost_price": 195.0},
    {"code": "688256.SH", "shares": 200, "cost_price": 180.0},
    {"code": "002594.SZ", "shares": 300, "cost_price": 210.0},
]


@router.get("/portfolio", response_model=PortfolioSummary)
async def get_portfolio():
    """投资组合追踪：持仓、盈亏、行业配置"""
    holdings = []
    total_cost = 0.0
    total_mv = 0.0
    for h in _PORTFOLIO:
        company = next((c for c in _COMPANIES if c["code"] == h["code"]), None)
        if not company:
            continue
        cur_price = company["current_price"]
        mv = round(cur_price * h["shares"], 2)
        cost = round(h["cost_price"] * h["shares"], 2)
        pl = round(mv - cost, 2)
        total_cost += cost
        total_mv += mv
        holdings.append(PortfolioHolding(
            code=h["code"],
            name=company["name"],
            shares=h["shares"],
            cost_price=h["cost_price"],
            current_price=cur_price,
            market_value=mv,
            profit_loss=pl,
            profit_pct=round(pl / cost * 100, 2),
            weight=0,  # filled later
        ))
    for h in holdings:
        h.weight = round(h.market_value / total_mv * 100, 2) if total_mv else 0

    # allocation by sector
    sector_map: Dict[str, float] = {}
    for h in holdings:
        company = next((c for c in _COMPANIES if c["code"] == h.code), None)
        if company:
            sector_map[company["sector"]] = sector_map.get(company["sector"], 0) + h.market_value
    allocation = [
        {"sector": s, "market_value": round(v, 2), "weight": round(v / total_mv * 100, 2)}
        for s, v in sorted(sector_map.items(), key=lambda x: x[1], reverse=True)
    ]

    return PortfolioSummary(
        total_cost=round(total_cost, 2),
        total_market_value=round(total_mv, 2),
        total_profit_loss=round(total_mv - total_cost, 2),
        total_profit_pct=round((total_mv - total_cost) / total_cost * 100, 2) if total_cost else 0,
        holdings=holdings,
        allocation_by_sector=allocation,
    )


# ============================================================
# 扩展功能：研报导出
# ============================================================

@router.get("/reports/{report_id}/export")
async def export_report(report_id: int, format: str = "markdown"):
    """导出研究报告为 Markdown / JSON 格式"""
    report = next((r for r in _REPORTS if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")

    if format == "json":
        return report

    # Markdown
    md_lines = [
        f"# {report['title']}",
        "",
        f"> **作者**：{report['author']}  ",
        f"> **发布日期**：{report['published_at']}  ",
        f"> **类别**：{report['category']}  ",
        f"> **状态**：{report['status']}",
        "",
        "## 摘要",
        "",
        report["summary"],
        "",
    ]
    if report["tags"]:
        md_lines.append("**标签**：" + " / ".join(report["tags"]))
        md_lines.append("")
    if report["company_codes"]:
        md_lines.append("**涉及公司**：" + " / ".join(report["company_codes"]))
        md_lines.append("")
    if report["key_points"]:
        md_lines.append("## 关键观点")
        md_lines.append("")
        for p in report["key_points"]:
            md_lines.append(f"- {p}")
        md_lines.append("")
    if report["risk_points"]:
        md_lines.append("## 风险提示")
        md_lines.append("")
        for p in report["risk_points"]:
            md_lines.append(f"- {p}")
        md_lines.append("")
    if report["investment_suggestion"]:
        md_lines.append("## 投资建议")
        md_lines.append("")
        md_lines.append(report["investment_suggestion"])
        md_lines.append("")

    related_notes = [n for n in _NOTES if n.get("related_report_id") == report_id]
    if related_notes:
        md_lines.append("## 关联研究卡片")
        md_lines.append("")
        type_labels = {"blue": "事实", "green": "解释", "yellow": "风险", "red": "行动"}
        for n in related_notes:
            label = type_labels.get(n["card_type"], n["card_type"])
            md_lines.append(f"### [{label}] {n['title']}")
            md_lines.append("")
            md_lines.append(n["content"])
            md_lines.append("")

    from fastapi.responses import PlainTextResponse
    filename = f"report_{report_id}.md"
    content = "\n".join(md_lines)
    return PlainTextResponse(
        content=content,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============================================================
# 扩展功能：市场情绪指数
# ============================================================

@router.get("/market-sentiment")
async def get_market_sentiment():
    """市场情绪指数：综合估值、资金、情绪指标"""
    # 基于 companies 数据模拟
    up_count = sum(1 for c in _COMPANIES if c["change_pct"] > 0)
    down_count = sum(1 for c in _COMPANIES if c["change_pct"] < 0)
    flat_count = len(_COMPANIES) - up_count - down_count

    avg_change = round(sum(c["change_pct"] for c in _COMPANIES) / len(_COMPANIES), 2)

    # 情绪指数 0-100
    breadth = (up_count / len(_COMPANIES)) * 100
    sentiment_score = round(50 + avg_change * 3 + (breadth - 50) * 0.3, 1)
    sentiment_score = max(0, min(100, sentiment_score))

    if sentiment_score >= 70:
        level = "贪婪"
    elif sentiment_score >= 55:
        level = "偏乐观"
    elif sentiment_score >= 45:
        level = "中性"
    elif sentiment_score >= 30:
        level = "偏谨慎"
    else:
        level = "恐惧"

    return {
        "sentiment_score": sentiment_score,
        "level": level,
        "market_breadth": {
            "up": up_count,
            "down": down_count,
            "flat": flat_count,
            "up_ratio": round(up_count / len(_COMPANIES) * 100, 1),
        },
        "avg_change_pct": avg_change,
        "hot_sectors": [s["name"] for s in sorted(
            [{"name": c["sector"], "avg": sum(x["change_pct"] for x in _COMPANIES if x["sector"] == c["sector"]) / sum(1 for x in _COMPANIES if x["sector"] == c["sector"])}
             for c in _COMPANIES
        ], key=lambda s: s["avg"], reverse=True)[:3]],
        "risk_warnings_count": len(_RISK_WARNINGS),
        "opportunities_count": len(_OPPORTUNITIES),
        "updated_at": datetime.now().isoformat(timespec="seconds"),
    }


# ============================================================
# 扩展功能：搜索（全量投研内容）
# ============================================================

@router.get("/search")
async def search_all(q: str, limit: int = 20):
    """全量搜索：公司、研报、机会、风险、卡片"""
    kw = q.lower().strip()
    if not kw:
        return {"results": [], "total": 0}

    results = []

    # 搜公司
    for c in _COMPANIES:
        if kw in c["name"].lower() or kw in c["code"].lower() or any(kw in t.lower() for t in c["tags"]):
            results.append({
                "type": "company",
                "id": c["code"],
                "title": c["name"],
                "subtitle": f"{c['code']} · {c['sector']} · {c['rating']}",
                "url": f"/investment-research?tab=companies&code={c['code']}",
                "relevance": 0.95,
            })

    # 搜研报
    for r in _REPORTS:
        if kw in r["title"].lower() or kw in r["summary"].lower() or any(kw in t.lower() for t in r["tags"]):
            results.append({
                "type": "report",
                "id": r["id"],
                "title": r["title"],
                "subtitle": f"{r['category']} · {r['author']} · {r['published_at'][:10]}",
                "url": f"/investment-research?tab=reports&id={r['id']}",
                "relevance": 0.90,
            })

    # 搜机会
    for o in _OPPORTUNITIES:
        if kw in o["title"].lower() or kw in o["reason"].lower() or kw in o["sector"].lower():
            results.append({
                "type": "opportunity",
                "id": o["id"],
                "title": o["title"],
                "subtitle": f"{o['sector']} · 信号强度 {o['score']}",
                "url": f"/investment-research?tab=opportunities",
                "relevance": 0.85,
            })

    # 搜风险
    for r in _RISK_WARNINGS:
        if kw in r["title"].lower() or kw in r["description"].lower():
            results.append({
                "type": "risk",
                "id": r["id"],
                "title": r["title"],
                "subtitle": f"等级 {r['level']} · {' / '.join(r['affected_sectors'])}",
                "url": f"/investment-research?tab=risks",
                "relevance": 0.80,
            })

    # 搜研究卡片
    for n in _NOTES:
        if kw in n["title"].lower() or kw in n["content"].lower() or any(kw in t.lower() for t in n["tags"]):
            results.append({
                "type": "note",
                "id": n["id"],
                "title": n["title"],
                "subtitle": f"{n['card_type']} · {n['created_at'][:10]}",
                "url": f"/investment-research?tab=notes",
                "relevance": 0.75,
            })

    results.sort(key=lambda x: x["relevance"], reverse=True)
    results = results[:limit]
    return {"results": results, "total": len(results), "query": q}
