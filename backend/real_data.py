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
