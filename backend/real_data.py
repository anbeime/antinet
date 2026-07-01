# -*- coding: utf-8 -*-
"""
真实数据适配器
================================
提供两类真实数据接入能力，均带"失败回退模拟"机制：

1. AKShare 行情数据（新浪源，免 Token）
   - fetch_real_klines(code, days)：返回真实日 K 线（前复权）
   - get_real_company_price(code)：返回实时价格 + 涨跌幅

2. AGNES LLM（OpenAI 兼容接口）
   - call_agnes_llm(prompt)：调用真实 LLM 生成文本

所有函数返回 None 表示"获取真实数据失败"，调用方应回退到模拟数据。

参考开源能力：
- 行情源：akshare stock_zh_a_daily（新浪财经）
- LLM：AGNES agnes-2.0-flash（OpenAI Chat Completions 兼容）
"""
from __future__ import annotations

import os
import time
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger("real_data")

# ============================================================
# 配置加载
# ============================================================
try:
    # python-dotoken 未安装时手动加载 .env
    _env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(_env_path):
        with open(_env_path, "r", encoding="utf-8") as f:
            for _line in f:
                _line = _line.strip()
                if not _line or _line.startswith("#") or "=" not in _line:
                    continue
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())
except Exception as e:
    logger.warning(f"加载 .env 失败: {e}")

AGNES_BASE_URL = os.environ.get("AGNES_BASE_URL", "https://apihub.agnes-ai.com/v1")
AGNES_API_KEY = os.environ.get("AGNES_API_KEY", "")
AGNES_LLM_MODEL = os.environ.get("AGNES_LLM_MODEL", "agnes-2.0-flash")
USE_REAL_DATA = os.environ.get("USE_REAL_DATA", "true").lower() == "true"


# ============================================================
# 缓存：避免高频请求被限流
# ============================================================
# 缓存项：(过期时间戳, 数据)
_kline_cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
_price_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}

KLINE_CACHE_TTL = 300  # K 线缓存 5 分钟
PRICE_CACHE_TTL = 60  # 价格缓存 60 秒


# ============================================================
# AKShare 行情数据
# ============================================================
def _normalize_code(code: str) -> str:
    """
    将演示数据中的公司代码（600519.SH / 300750.SZ）转成 akshare 新浪格式（sh600519 / sz300750）。
    支持格式：
      - "600519.SH" / "300750.SZ"（演示数据格式：数字.市场）
      - "sh600519" / "sz300750"（已是新浪格式）
      - "600519" / "300750"（6 位纯数字）
    """
    code = code.strip().upper()
    if code.startswith(("SH", "SZ")) and "." not in code:
        return code.lower()
    if "." in code:
        # 演示数据格式 "600519.SH"：数字在前、市场在后
        num, market = code.split(".", 1)
        market = market.upper()
        if market in ("SH", "SZ"):
            return f"{market.lower()}{num}"
    # 6 位纯数字
    if code.isdigit() and len(code) == 6:
        return ("sh" if code.startswith(("6", "5", "9")) else "sz") + code
    return code.lower()


def fetch_real_klines(code: str, days: int = 60) -> Optional[List[Dict[str, Any]]]:
    """
    获取真实日 K 线（前复权）。

    :param code: 公司代码，支持 '600519.SH' / 'sh600519' / '600519' 等格式
    :param days: 需要的 K 线根数（建议 30-120）
    :return: [{date, open, high, low, close, volume, amount}, ...] 或 None
    """
    if not USE_REAL_DATA:
        return None

    sina_code = _normalize_code(code)
    cache_key = f"{sina_code}_{days}"
    now = time.time()
    cached = _kline_cache.get(cache_key)
    if cached and cached[0] > now:
        return cached[1]

    try:
        import akshare as ak
        df = ak.stock_zh_a_daily(symbol=sina_code, adjust="qfq")
        if df is None or len(df) == 0:
            logger.warning(f"akshare 返回空数据: {sina_code}")
            return None

        # 取最近 N 根
        df = df.tail(days).reset_index(drop=True)
        bars: List[Dict[str, Any]] = []
        for _, row in df.iterrows():
            bars.append({
                "date": str(row["date"])[:10],
                "open": round(float(row["open"]), 3),
                "high": round(float(row["high"]), 3),
                "low": round(float(row["low"]), 3),
                "close": round(float(row["close"]), 3),
                "volume": float(row["volume"]),
                "amount": float(row.get("amount", 0)),
            })

        _kline_cache[cache_key] = (now + KLINE_CACHE_TTL, bars)
        logger.info(f"[真实数据] {code} 获取 {len(bars)} 根 K 线，最新日期 {bars[-1]['date']}")
        return bars
    except Exception as e:
        logger.warning(f"fetch_real_klines 失败 {code}: {type(e).__name__} {str(e)[:200]}")
        return None


def get_real_company_price(code: str) -> Optional[Dict[str, Any]]:
    """
    获取公司实时价格 + 涨跌幅（基于最近两根日 K 推算）。

    :return: {current_price, change_pct, last_date, prev_close} 或 None
    """
    if not USE_REAL_DATA:
        return None

    sina_code = _normalize_code(code)
    cached = _price_cache.get(sina_code)
    if cached and cached[0] > time.time():
        return cached[1]

    # 复用 K 线缓存：取最近 5 根就能算出涨跌幅
    bars = fetch_real_klines(code, days=5)
    if not bars or len(bars) < 2:
        return None

    last = bars[-1]
    prev = bars[-2]
    close = last["close"]
    prev_close = prev["close"]
    change_pct = round((close - prev_close) / prev_close * 100, 2)

    result = {
        "current_price": close,
        "change_pct": change_pct,
        "last_date": last["date"],
        "prev_close": prev_close,
    }
    _price_cache[sina_code] = (time.time() + PRICE_CACHE_TTL, result)
    return result


# ============================================================
# AGNES LLM（OpenAI 兼容接口）
# ============================================================
_llm_client = None


def _get_llm_client():
    """懒加载 OpenAI 兼容客户端"""
    global _llm_client
    if _llm_client is not None:
        return _llm_client
    if not AGNES_API_KEY:
        return None
    try:
        from openai import OpenAI
        _llm_client = OpenAI(
            base_url=AGNES_BASE_URL,
            api_key=AGNES_API_KEY,
            timeout=30.0,
        )
        return _llm_client
    except Exception as e:
        logger.warning(f"初始化 LLM 客户端失败: {e}")
        return None


def call_agnes_llm(prompt: str, system_prompt: str = "") -> Optional[str]:
    """
    调用 AGNES LLM 生成文本。

    :param prompt: 用户提示
    :param system_prompt: 系统提示（可选）
    :return: LLM 生成的文本，或 None（失败时）
    """
    if not USE_REAL_DATA or not AGNES_API_KEY:
        return None

    client = _get_llm_client()
    if client is None:
        return None

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    try:
        resp = client.chat.completions.create(
            model=AGNES_LLM_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=2000,
        )
        text = resp.choices[0].message.content or ""
        text = text.strip()
        logger.info(f"[真实LLM] 生成 {len(text)} 字")
        return text if text else None
    except Exception as e:
        print(f"[LLM异常] {type(e).__name__}: {str(e)[:200]}")
        logger.warning(f"call_agnes_llm 失败: {type(e).__name__} {str(e)[:200]}")
        return None


def call_agnes_llm_json(prompt: str, system_prompt: str = "") -> Optional[Dict[str, Any]]:
    """
    调用 LLM 并解析 JSON 输出。LLM 偶尔会在 JSON 外层加 ```json ``` 标记，这里做容错。
    """
    text = call_agnes_llm(prompt, system_prompt)
    if not text:
        return None
    # 去除 markdown 代码块标记
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)
        if len(cleaned) >= 2:
            cleaned = cleaned[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
    cleaned = cleaned.strip()
    # 截取最外层 {...}
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start:end + 1]
    try:
        return json.loads(cleaned)
    except Exception as e:
        logger.warning(f"LLM 输出 JSON 解析失败: {e}; 原文前 200 字: {cleaned[:200]}")
        return None


# ============================================================
# 全市场股票搜索 + 任意公司档案
# ============================================================
_all_stocks_cache: Optional[Tuple[float, List[Dict[str, Any]]]] = None
ALL_STOCKS_CACHE_TTL = 600  # 全市场列表缓存 10 分钟


def _parse_sina_code(raw_code: str) -> Optional[Tuple[str, str, str]]:
    """
    解析新浪源代码字段（如 'sh600519' / 'sz000001' / 'bj920000'）。

    :return: (sina_code, display_code, market) 或 None（不支持的市场）
        - sina_code: 'sh600519'（用于 ak.stock_zh_a_daily）
        - display_code: '600519.SH'（用于演示数据格式兼容）
        - market: 'sh' / 'sz' / 'bj'
    """
    raw = raw_code.strip().lower()
    if len(raw) < 4:
        return None
    market = raw[:2]
    num = raw[2:]
    if market not in ("sh", "sz", "bj"):
        return None
    if not num.isdigit():
        return None
    if market == "bj":
        return None  # 北交所暂不支持（sina 源拉不到 K 线）
    display_code = num + "." + market.upper()
    return (raw, display_code, market)


def _load_all_stocks() -> Optional[List[Dict[str, Any]]]:
    """
    加载 A 股全市场股票列表（新浪源 stock_zh_a_spot，含 5500+ 只股票）。
    返回统一字段：[{code, name, price, change_pct, sina_code}, ...]
    """
    global _all_stocks_cache
    if not USE_REAL_DATA:
        return None
    cached = _all_stocks_cache
    if cached and cached[0] > time.time():
        return cached[1]
    try:
        import akshare as ak
        df = ak.stock_zh_a_spot()
        if df is None or len(df) == 0:
            return None
        stocks: List[Dict[str, Any]] = []
        for _, row in df.iterrows():
            raw_code = str(row.get("代码", "")).strip()
            name = str(row.get("名称", "")).strip()
            if not raw_code or not name:
                continue
            # 过滤 ST、*ST、新股（N 开头）
            if name.startswith(("ST", "*ST", "N")):
                continue
            parsed = _parse_sina_code(raw_code)
            if not parsed:
                continue  # 不支持的市场（如 bj）
            sina_code, display_code, market = parsed
            try:
                price = float(row.get("最新价", 0) or 0)
            except (TypeError, ValueError):
                price = 0.0
            try:
                chg = float(row.get("涨跌幅", 0) or 0)
            except (TypeError, ValueError):
                chg = 0.0
            stocks.append({
                "code": display_code,
                "sina_code": sina_code,
                "name": name,
                "price": price,
                "change_pct": chg,
            })
        _all_stocks_cache = (time.time() + ALL_STOCKS_CACHE_TTL, stocks)
        logger.info(f"[真实数据] 全市场股票列表加载 {len(stocks)} 只")
        return stocks
    except Exception as e:
        logger.warning(f"_load_all_stocks 失败: {type(e).__name__} {str(e)[:200]}")
        return None


def search_all_stocks(keyword: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    在 A 股全市场搜索股票（按名称或代码模糊匹配）。

    :param keyword: 搜索关键词（公司名/拼音/代码片段）
    :param limit: 最多返回条数
    :return: [{code, sina_code, name, price, change_pct}, ...]
    """
    if not USE_REAL_DATA:
        return []
    kw = keyword.strip().lower()
    if not kw or len(kw) < 1:
        return []
    all_stocks = _load_all_stocks()
    if not all_stocks:
        return []
    matched = []
    for s in all_stocks:
        # 优先名称包含 / 代码包含
        if kw in s["name"].lower() or kw in s["code"].lower() or kw in s["sina_code"]:
            matched.append(s)
            if len(matched) >= limit:
                break
    return matched


def fetch_company_profile(code: str) -> Optional[Dict[str, Any]]:
    """
    拉取任意 A 股公司的最小档案（用于不在 _COMPANIES 演示列表中的股票）。

    :return: {code, name, sector, current_price, change_pct, market_cap, ...} 或 None
    """
    if not USE_REAL_DATA:
        return None
    sina_code = _normalize_code(code)
    # 名称从全市场列表找
    all_stocks = _load_all_stocks()
    name = code
    if all_stocks:
        for s in all_stocks:
            if s["sina_code"] == sina_code or s["code"].upper() == code.upper():
                name = s["name"]
                break
    # 实时价
    price_info = get_real_company_price(code)
    if not price_info:
        return None
    return {
        "code": code.upper() if "." in code else _to_display_code(sina_code),
        "name": name,
        "sector": "其他",  # 全市场数据无行业字段，默认"其他"
        "market_cap": "—",
        "current_price": price_info["current_price"],
        "change_pct": price_info["change_pct"],
        "pe_ratio": None,
        "pb_ratio": None,
        "rating": "中性",  # 未在演示评级体系中的股票默认中性
        "target_price": None,
        "tags": ["全市场"],
        "summary": f"{name}（{code}）— 数据来源：AKShare 新浪实时行情",
    }


def _to_display_code(sina_code: str) -> str:
    """sh600519 → 600519.SH"""
    if sina_code.startswith("sh"):
        return sina_code[2:] + ".SH"
    if sina_code.startswith("sz"):
        return sina_code[2:] + ".SZ"
    return sina_code.upper()


# ============================================================
# AnySearch 联网搜索（完善卡片信息来源）
# AnySearch 是统一实时搜索引擎，支持通用搜索/垂直领域搜索/并行批量搜索/URL内容提取
# 通过 MCP JSON-RPC 2.0 接口调用，Bearer 认证
# ============================================================
ANYSEARCH_API_KEY = os.environ.get("ANYSEARCH_API_KEY", "as_sk_c17325cc2e2bea3d5a5cdc80c9d1cac2")
ANYSEARCH_ENDPOINT = "https://api.anysearch.com/mcp"

# 搜索结果缓存 10 分钟（避免相同 query 重复调用）
_search_cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
SEARCH_CACHE_TTL = 600


def anysearch_web(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    AnySearch 通用联网搜索（用于完善投研卡片信息来源）。

    :param query: 搜索关键词（如「贵州茅台 2026年业绩」「半导体设备 主线」）
    :param max_results: 最多返回条数
    :return: [{title, url, snippet}, ...] 或空列表（失败/无结果）
    """
    if not ANYSEARCH_API_KEY:
        return []
    kw = query.strip()
    if not kw:
        return []

    cache_key = f"{kw}|{max_results}"
    cached = _search_cache.get(cache_key)
    if cached and cached[0] > time.time():
        return cached[1]

    import urllib.request

    payload = json.dumps({
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "search",
            "arguments": {"query": kw, "max_results": max_results},
        },
        "id": int(time.time() * 1000) % 1000000,
    }).encode("utf-8")

    req = urllib.request.Request(
        ANYSEARCH_ENDPOINT,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ANYSEARCH_API_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        results = _parse_anysearch_results(data, max_results)
        _search_cache[cache_key] = (time.time() + SEARCH_CACHE_TTL, results)
        logger.info(f"[AnySearch] 查询「{kw}」返回 {len(results)} 条")
        return results
    except Exception as e:
        logger.warning(f"[AnySearch] 查询「{kw}」失败: {type(e).__name__} {str(e)[:150]}")
        return []


def _parse_anysearch_results(data: Dict[str, Any], max_results: int) -> List[Dict[str, Any]]:
    """解析 AnySearch MCP 返回的搜索结果文本，提取标题/URL/摘要"""
    content = (data.get("result") or {}).get("content") or []
    if not content:
        return []
    text = ""
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            text += block.get("text", "")
    if not text:
        return []

    # 文本格式：### 1. 标题 \n- **URL**: xxx \n- 摘要...
    results: List[Dict[str, Any]] = []
    blocks = text.split("### ")
    for blk in blocks[1:]:  # 跳过开头非结果部分
        lines = blk.strip().split("\n")
        if not lines:
            continue
        title = lines[0].strip()
        url = ""
        snippet_parts = []
        for ln in lines[1:]:
            ln = ln.strip()
            if ln.startswith("- **URL**:") or ln.startswith("- URL:"):
                url = ln.split(":", 1)[1].strip().lstrip("*").strip()
            elif ln.startswith("- "):
                snippet_parts.append(ln[2:].strip())
        snippet = " ".join(snippet_parts)[:200]
        if title:
            results.append({"title": title, "url": url, "snippet": snippet})
        if len(results) >= max_results:
            break
    return results


# ============================================================
# 调试入口
# ============================================================
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(f"USE_REAL_DATA = {USE_REAL_DATA}")
    print(f"AGNES_BASE_URL = {AGNES_BASE_URL}")
    print(f"AGNES_LLM_MODEL = {AGNES_LLM_MODEL}")
    print(f"AGNES_API_KEY = {AGNES_API_KEY[:10]}...{AGNES_API_KEY[-4:] if AGNES_API_KEY else ''}")
    print()

    # 1. 测试真实 K 线
    print("=== 测试 fetch_real_klines('600519.SH', 60) ===")
    bars = fetch_real_klines("600519.SH", days=60)
    if bars:
        print(f"K 线根数: {len(bars)}")
        print(f"首根: {bars[0]}")
        print(f"末根: {bars[-1]}")
    else:
        print("失败")
    print()

    # 2. 测试实时价格
    print("=== 测试 get_real_company_price('600519.SH') ===")
    price = get_real_company_price("600519.SH")
    print(price)
    print()

    # 3. 测试 LLM
    print("=== 测试 call_agnes_llm ===")
    txt = call_agnes_llm("用一句话（不超过 30 字）评价贵州茅台这家公司。")
    print(txt)
