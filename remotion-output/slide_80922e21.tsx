import { AbsoluteFill, interpolate, useVideoConfig, spring, useCurrentFrame, Sequence, Composition, registerRoot } from 'remotion';
import React from 'react';

// Slide 0: Cover
const CoverSlide0 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 }
  });
  return (
    <AbsoluteFill style={{ background: '#0f172a' }}>
      <div style={{
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
        fontSize: 72, color: '#ffffff', textAlign: 'center', padding: '40vh 0'
      }}>
        智能分析报告
      </div>
    </AbsoluteFill>
  );
};

// Slide 1: Content - 核心事实
const ContentSlide1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 }
  });
  return (
    <AbsoluteFill style={{ background: '#0f172a', padding: 40 }}>
      <div style={{ fontSize: 36, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 20 }}>
        核心事实
      </div>
            <div style={{
        backgroundColor: '#3b82f6',
        borderRadius: 12, padding: 20, marginBottom: 16,
        opacity: interpolate(progress, [0.15, 0.45], [0, 1]),
        transform: `translateX(${interpolate(progress, [0.15, 0.65], [-50, 0])}px)`
      }}>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>擒龙选股</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>#coding:gbk
"""
QMT 短线强势股擒龙策略 v7.0 (纯净精简版)
数据源: QMT API (中证1000为主) + HTTP信号服务(可选)
零文件IO, 零子进程调用, 完全兼容君弘沙箱
形态: 突破/涨停整理/平台突破/连续大涨/倍量/SK多空能
风控: 止损6%/ATR止损/时间止损/移动止盈/盈利回撤保护/旧仓保护
"""

import math
import sys
import numpy as np
import datetime
import json
from collections import defaultdict

try:
    import socket as _socket
    import json as _json
    REQ_OK = True
except:
    REQ_OK = False


def _http_get(url, timeout=10):
    """纯socket实现HTTP GET，绕开QMT沙箱对urllib.idna的限制"""
    # 解析 URL: http://host:port/path
    _u = url.replace('http://', '', 1)
    _si = _u.find('/')
    if _si < 0: _path = '/'; _hostport = _u
    else: _path = _u[_si:]; _hostport = _u[:_si]
    _ci = _hostport.find(':')
    if _ci > 0: _host = _hostport[:_ci]; _port = int(_hostport[_ci+1:])
    else: _host = _hostport; _port = 80
    # 发送原始HTTP请求
    _s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    _s.settimeout(timeout)
    try:
        _s.connect((_host, _port))
        _s.sendall(('GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\nUser-Agent: QMT-Strategy/7.0\r\nAccept: application/json\r\n\r\n').format(_path, _hostport).encode())
        _resp = b''
        while True:
            _chunk = _s.recv(4096)
            if not _chunk: break
            _resp += _chunk
        # 分离header和body
        _hdr_end = _resp.find(b'\r\n\r\n')
        if _hdr_end < 0: return ''
        return _resp[_hdr_end+4:].decode('utf-8')
    finally:
        _s.close()

# ==================== 参数 ====================
account = 'test'
accountType = 'STOCK'

MIN_PRICE, MAX_PRICE = 3.0, 200.0
MIN_AMOUNT, MIN_STOCK_AMOUNT = 30000000, 100000000
MA_FAST, MA_MEDIUM, MA_SLOW, MA_TREND = 5, 10, 20, 60
MACD_FAST, MACD_SLOW, MACD_SIGNAL = 12, 26, 9
RSI_PERIOD, RSI_OVERBOUGHT = 14, 85
VOL_MA = 5
BULL_BREAK_SCORE = 75
PARKING_LOOKBACK, PARKING_LIMIT_UP, PARKING_MAX_AMP, PARKING_MAX_CHG, PARKING_MIN_DAYS, PARKING_MAX_DAYS = 15, 9.5, 3.0, 5.0, 2, 4
PLATFORM_PERIOD = 60
PLATFORM_DEV_LOW, PLATFORM_DEV_HIGH = -0.05, 0.15
HTF_MIN_GAIN, HTF_CONSEC_LIMIT, HTF_LOOKBACK = 0.9, 9.5, 24
DOUBLE_VOL_RATIO = 2.0
MAX_MOM_10_PCT, MAX_MOM_20_PCT = 0.20, 0.30
MA_TANGLE_THRESHOLD = 0.02
DRAWDOWN_FROM_HIGH_PCT = 0.12
SECTOR_WEAK_THRESHOLD = -0.02
MAX_CANDIDATES = 5
MIN_SCORE = 70
MAX_SINGLE_VALUE = 200000
MAX_POSITI 0.20
MIN_TRADE_AMOUNT = 50000
STOP_LOSS_PCT = 0.06
STOP_LOSS_ATR_MULT = 2.5
TIME_STOP_DAYS = 10
TRAILING_START_PCT = 0.08
TRAILING_ATR_MULT = 1.5
PROFIT_DRAWDOWN_PCT = 0.02
MIN_PROFIT_THRESHOLD = 0.002
SCALE_DOWN_PCT = 0.15
MARKET_WEAK_THRESHOLD = -0.08
TRADE_FEE, SLIPPAGE = 0.001, 0.003
DEEP_LOSS_PCT = 0.10

HTTP_SIGNAL_URL = 'http://127.0.0.1:18888'
INVALID_CODES = {'300379','300208','600277','000976','601258',
                 '000982','600565','300114','300799','002435',
                 '601028','000627','600811','002610','000851'}


# ==================== 工具函数 ====================
def wlog(msg):
    print('{} {}'.format(datetime.datetime.now(), msg))

class A: pass

def _fmt_code(code):
    code = str(code).strip()
    if not code: return ''
    if '.' in code: return code
    return (code + '.SH') if code.startswith('6') else (code + '.SZ')

def _is_index(code):
    p = code.split('.')[0] if '.' in code else code
    return p.startswith('399') or (p.startswith('000') and len(p) == 6 and int(p) <= 1000) or p.startswith('880') or p.startswith('9')


# ==================== 雪球人气股 ====================
XUEQIU_SIZE = 50

def get_xueqiu_hot(size=50):
    """获取雪球人气股（纯socket实现，兼容QMT沙箱）"""
    if not REQ_OK:
        return []
    try:
        import ssl as _ssl
        # 纯socket获取雪球cookie和人气股
        ctx = _ssl.create_default_context()
        h = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        # 第一步：访问首页获取cookie
        s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
        s.settimeout(15)
        ss = ctx.wrap_socket(s, server_hostname='xueqiu.com')
        ss.connect(('xueqiu.com', 443))
        ss.sendall(b'GET /hq HTTP/1.1\r\nHost: xueqiu.com\r\n' +
                   ('User-Agent: {}\r\n'.format(h['User-Agent'])).encode() +
                   b'Connection: close\r\n\r\n')
        resp1 = b''
        while True:
            ch = ss.recv(4096)
            if not ch: break
            resp1 += ch
        ss.close()
        # 提取set-cookie
        cookie_str = ''
        for line in resp1.split(b'\r\n'):
            if line.lower().startswith(b'set-cookie:'):
                cv = line.split(b':', 1)[1].strip().split(b';')[0].strip().decode('utf-8','ignore')
                cookie_str += ('; ' if cookie_str else '') + cv
        if not cookie_str: return []
        # 第二步：获取人气股
        url_path = '/v5/stock/hot_stock/list.json?size={}&_type=10&type=10'.format(size)
        s2 = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
        s2.settimeout(15)
        ss2 = ctx.wrap_socket(s2, server_hostname='stock.xueqiu.com')
        ss2.connect(('stock.xueqiu.com', 443))
        ss2.sendall(
            ('GET {} HTTP/1.1\r\nHost: stock.xueqiu.com\r\n'.format(url_path)).encode() +
            ('User-Agent: {}\r\n'.format(h['User-Agent'])).encode() +
            ('Cookie: {}\r\n'.format(cookie_str)).encode() +
            b'Connection: close\r\n\r\n')
        resp2 = b''
        while True:
            ch2 = ss2.recv(4096)
            if not ch2: break
            resp2 += ch2
        ss2.close()
        body_start = resp2.find(b'\r\n\r\n')
        if body_start < 0: return []
        d = _json.loads(resp2[body_start+4:].decode())
        items = d.get('data', {}).get('items', [])
        stocks = []
        for it in items:
            if it.get('ad'): continue
            code = it.get('code', '')
            if code.startswith('SH'): nc = code[2:] + '.SH'
            elif code.startswith('SZ'): nc = code[2:] + '.SZ'
            else: continue
            name = it.get('name', '')
            if 'ST' in name or '退' in name or '*ST' in name: continue
            if nc[:2] in ['60','00','30','68','688']:
                stocks.append({'code': nc, 'name': name, 'pct': it.get('percent', 0)})
        return stocks
    except Exception as e:
        wlog('[雪球] 获取失败:{}'.format(str(e)[:60]))
        return []


# ==================== 候选股池 ====================
def get_candidate_pool(C):
    """
    获取候选股池(多源合并模式):
    
    全部尝试，合并去重:
    1. HTTP信号服务(通达信预警) - 最高优先级，带信号类型
    2. 雪球人气股 - 市场热点，缩小范围到约50只
    3. 中证1000成分股 - 兜底(仅在前两者不足100只时补充)
    """
    candidates, data = set(), {}
    
    # === 1. HTTP信号服务 (纯socket实现，兼容QMT沙箱) ===
    http_count = 0
    if REQ_OK:
        wlog('[候选池] 正在从本地HTTP服务获取通达信预警...')
        try:
            raw = _http_get(HTTP_SIGNAL_URL + '/signals', timeout=10)
            if raw:
                jd = _json.loads(raw)
                sigs = jd.get('signals', [])
                for s in sigs:
                    c = s.get('code', '')
                    if not c: continue
                    pc = c.split('.')[0] if '.' in c else c
                    if pc in INVALID_CODES: continue
                    candidates.add(c)
                    data[c] = {'source': '通达信预警(HTTP)', 'name': s.get('name', ''),
                               'time': s.get('time', ''), 'price': s.get('price', 0),
                               'signal_type': s.get('signal_type', ''), 'change_pct': s.get('change_pct', 0)}
                    http_count += 1
                if http_count > 0:
                    wlog('[候选池] [核心] 通达信预警(HTTP): {}只'.format(http_count))
                else:
                    wlog('[候选池] HTTP返回空列表(服务未启动或无预警)')
            else:
                wlog('[候选池] HTTP返回空响应(服务未启动?)')
        except Exception as e:
            wlog('[候选池] HTTP获取预警失败: {}'.format(str(e)[:80]))
    
    # === 2. 雪球人气股 ===
    xq_count = 0
    try:
        hot = get_xueqiu_hot(XUEQIU_SIZE)
        if hot:
            for s in hot:
                c = s['code']
                if c not in candidates:
                    candidates.add(c)
                    data[c] = {'source': '雪球人气', 'name': s.get('name', ''), 'pct': s.get('pct', 0)}
                xq_count += 1
            wlog('[候选池] [核心] 雪球人气: {}只'.format(xq_count))
        else:
            wlog('[候选池] 雪球人气为空')
    except Exception as e:
        wlog('[候选池] 雪球异常:{}'.format(str(e)[:50]))
    
    # === 3. 补充: 仅当总数不足100只时才加中证1000 ===
    if len(candidates) < 100:
        idx_count = 0
        try:
            stocks = C.get_sector('000852.SH')
            if stocks:
                for raw in stocks:
                    fc = _fmt_code(raw)
                    if fc and not _is_index(fc) and fc not in INVALID_CODES:
                        if fc not in candidates:
                            candidates.add(fc)
                            data[fc] = {'source': '中证1000'}
                        idx_count += 1
                new_add = len([c for c in candidates if data.get(c,{}).get('source')=='中证1000'])
                wlog('[候选池] [补充] 中证1000: 新增{}只 累计{}只'.format(new_add, len(candidates)))
        except Exception as e:
            wlog('[候选池] 中证1000失败:{}'.format(str(e)[:80]))
        
        if len(candidates) < 20:
            try:
                my_sel = C.get_stock_list_in_sector('我的自选')
                if my_sel:
                    for raw in my_sel:
                        fc = _fmt_code(raw)
                        if fc and not _is_index(fc) and fc not in candidates:
                            candidates.add(fc); data[fc] = {'source': '我的自选'}
                    wlog('[候选池] [兜底] 我的自选 累计{}只'.format(len(candidates)))
            except: pass
            if len(candidates) < 20:
                try:
                    hs300 = C.get_sector('000300.SH')
                    if hs300:
                        for raw in hs300:
                            fc = _fmt_code(raw)
                            if fc and fc not in candidates:
                                candidates.add(fc); data[fc] = {'source': '沪深300'}
                        wlog('[候选池] [兜底] 沪深300 累计{}只'.format(len(candidates)))
                except: pass
    else:
        wlog('[候选池] 预警+雪球已{}只>100，跳过中证1000'.format(len(candidates)))
    
    # 来源统计
    src_stats = {}
    for c in candidates:
        s = data.get(c, {}).get('source', '?')
        src_stats[s] = src_stats.get(s, 0) + 1
    src_str = ', '.join(['{}:{}'.format(k,v) for k,v in sorted(src_stats.items(), key=lambda x:-x[1])])
    wlog('[候选池] 合计: {}只 ({})'.format(len(candidates), src_str))
    return list(candidates), data


# ==================== 技术指标 ====================
def calc_sma(data, period):
    r = np.full(len(data), np.nan)
    for i in range(period - 1, len(data)): r[i] = np.mean(data[i - period + 1:i + 1])
    return r

def calc_ema(data, period):
    r = np.full(len(data), np.nan)
    r[period - 1] = np.mean(data[:period])
    m = 2.0 / (period + 1)
    for i in range(period, len(data)): r[i] = (data[i] - r[i - 1]) * m + r[i - 1]
    return r

def calc_macd(closes, fast=12, slow=26, signal=9):
    ef, es = calc_ema(closes, fast), calc_ema(closes, slow)
    ml = ef - es
    v = ml[~np.isnan(ml)]
    sl = np.full(len(closes), np.nan) if len(v) < signal else None
    if sl is None:
        sr = calc_ema(v, signal)
        sl = np.full(len(closes), np.nan)
        sl[len(closes) - len(sr):] = sr
    return ml, sl, ml - sl

def calc_rsi(closes, period=14):
    if len(closes) < period + 1: return 50.0
    d = np.diff(closes[-period - 1:])
    g, l = np.where(d > 0, d, 0), np.where(d < 0, -d, 0)
    ag, al = np.mean(g), np.mean(l)
    return 100.0 if al == 0 else 100.0 - (100.0 / (1.0 + ag / al))

def calc_atr(highs, lows, closes, period=14):
    if len(highs) < period + 1: return 1.0
    tr = np.zeros(len(highs) - 1)
    for i in range(1, len(highs)):
        tr[i - 1] = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
    return np.mean(tr[-period:])

def _estimate_atr(code, price):
    if price <= 0: return 1.0
    if price < 10:   return price * 0.035
    if price < 30:   return price * 0.028
    if price < 60:   return price * 0.022
    if price < 100:  return price * 0.018
    return price * 0.015


# ==================== SK多空能 ====================
def calc_sk(closes, highs, lows):
    try:
        n = len(closes)
        if n < 25: return None
        xn1 = (closes * 2 + highs + lows) / 4.0
        sk = calc_ema(xn1, 13) - calc_ema(xn1, 21)
        sd = calc_ema(sk, 2)
        duo, k 2.0 * (sk - sd) * 5.5, -2.0 * (sk - sd) * 5.5
        if len(sk) < 3 or np.isnan(sk[-1]): return None
        sn, sp, spp = float(sk[-1]), float(duo[-1]), float(kong[-1])
        ew = abs(duo[-1] - kong[-1]) / (abs(duo[-1]) + abs(kong[-1]) + 0.001)
        ra = (float(np.max(highs[-3:])) - float(np.min(lows[-3:]))) / closes[-3]
        return {'sk_now': sn, 'duo_now': sp, 'kong_now': spp,
                'strong_bull': sn > duo and sn > kong and duo > 0.25,
                'small_eye': ew < 0.15, 'is_consolidating': ra < 0.10,
                'eye_width': ew, 'sk_above_both': sn > duo and sn > kong,
                'sk_below_both': not (sn > duo) and not (sn > kong),
                'duo_cross_sk': False, 'sk_cross_kong': False, 'duo_cross_kong': False}
    except: return None

def check_sk_pattern(sd):
    if not sd: return {}
    p = {}
    if sd.get('strong_bull'): p['sk_strong_bull'] = True
    if sd.get('small_eye') and sd.get('is_consolidating'): p['sk_small_eye'] = True
    if sd.get('sk_above_both') and sd.get('eye_width', 1) < 0.3: p['sk_top_wide'] = True
    return p


# ==================== 形态识别 ====================
def check_bull_break(price, op, vol, ma5, ma10, ma20, ma60, mh, ml, sl, vr, rsi):
    sc, c = 0, 0
    if ma5 > ma10 > ma20 > ma60: c += 1; sc += 30
    elif ma5 > ma10 > ma20: c += 1; sc += 20
    if price > ma5 > ma10 > ma20: c += 1; sc += 20
    if len(mh) >= 2 and (mh[-1] > 0 and mh[-2] <= 0 or (ml[-1] > 0 and sl[-1] > 0 and mh[-1] > 0)): c += 1; sc += 20
    if vr > 1.5: c += 1; sc += 15 + (10 if vr > 2.0 else 0)
    if price > op: c += 1; sc += 10
    if rsi < RSI_OVERBOUGHT: sc += 5
    return c >= 3 and sc >= BULL_BREAK_SCORE - 20

def check_parking(closes, opens, highs, lows, tc, ta):
    if len(closes) < PARKING_LOOKBACK + 5: return False
    ld = -1
    for i in range(-2, -(PARKING_LOOKBACK + 1), -1):
        if len(closes) + i < 1: break
        pc = (closes[i] - closes[i - 1]) / closes[i - 1] if closes[i - 1] > 0 else 0
        if pc >= PARKING_LIMIT_UP / 100.0: ld = i; break
    if ld == -1: return False
    ni = ld + 1
    if ni >= len(closes) - 1: return False
    if opens[ni] <= closes[ld] or closes[ni] <= opens[ni]: return False
    da = (highs[ni] - lows[ni]) / opens[ni] if opens[ni] > 0 else 1
    if da > PARKING_MAX_AMP / 100.0: return False
    cd = 0
    for j in range(ni + 1, min(ni + PARKING_MAX_DAYS + 1, len(closes) - 1)):
        dc = (closes[j] - opens[j]) / opens[j] if opens[j] > 0 else 0
        dj = (highs[j] - lows[j]) / opens[j] if opens[j] > 0 else 1
        if opens[j] > closes[j - 1] and abs(dc) < PARKING_MAX_CHG / 100.0 and dj < PARKING_MAX_AMP / 100.0: cd += 1
        else: break
    return cd >= PARKING_MIN_DAYS

def check_platform(price, op, closes, ma60, vr):
    if len(closes) < PLATFORM_PERIOD + 10: return False
    nc, tc = 0, min(PLATFORM_PERIOD, len(closes) - len(ma60))
    for i in range(-tc, 0):
        idx = len(ma60) + i
        if idx < 0 or idx >= len(ma60) or np.isnan(ma60[idx]): continue
        ci = len(closes) + i
        if ci < 0 or ci >= len(closes): continue
        dv = (closes[ci] - ma60[idx]) / ma60[idx] if ma60[idx] > 0 else 0
        if PLATFORM_DEV_LOW <= dv <= PLATFORM_DEV_HIGH: nc += 1
    if nc < tc * 0.4: return False
    cm = ma60[-1]
    if np.isnan(cm) or cm <= 0: return False
    if not (op < cm <= price): return False
    if vr < 1.3: return False
    return True

def check_htf(closes, highs, lows):
    if len(closes) < HTF_LOOKBACK + 5: return False
    si, ei = len(closes) - HTF_LOOKBACK, len(closes) - 10
    if si < 0 or ei <= si: return False
    sl, sh = lows[si:ei], highs[si:ei]
    if len(sl) == 0: return False
    if np.max(sh) / np.min(sl) < (1 + HTF_MIN_GAIN): return False
    for i in range(si, ei - 1):
        p1 = (closes[i] - closes[i - 1]) / closes[i - 1] if closes[i - 1] > 0 else 0
        p2 = (closes[i + 1] - closes[i]) / closes[i] if closes[i] > 0 else 0
        if p1 >= HTF_CONSEC_LIMIT / 100.0 and p2 >= HTF_CONSEC_LIMIT / 100.0: return True
    return False

def check_double_vol(price, op, pc, po, cv, pv, vr, tc):
    if pv <= 0 or pc <= 0: return False
    if cv < pv * DOUBLE_VOL_RATIO: return False
    if price <= op or tc < 0.02 or vr < 1.8: return False
    return True


# ==================== 评分与风控 ====================
def calc_score(ma5, ma10, ma20, ma60, price, vr, mhist, mline, sl, rsi,
               mom5, mom10, mom20, patterns, signal_type='', sk_data=None):
    score = 0
    if ma5 > ma10 > ma20 > ma60: score += 15
    elif ma5 > ma10 > ma20: score += 10
    if price > ma5: score += 5
    if price > ma60: score += 5
    if mom5 > 0.05: score += 7
    elif mom5 > 0.02: score += 4
    if mom10 > 0.10: score += 7
    elif mom10 > 0.05: score += 4
    if mom20 > 0.15: score += 6
    elif mom20 > 0.08: score += 3
    if vr > 2.0: score += 10
    elif vr > 1.5: score += 7
    elif vr > 1.2: score += 4
    if mline > 0 and sl > 0: score += 5
    if mhist > 0: score += 5
    w = {'bull_break':10,'parking':8,'platform':7,'htf':8,'double_vol':6,
         'sk_strong_bull':12,'sk_launch':10,'sk_turn_strong':8,
         'sk_bottom_rebound':8,'sk_small_eye':6,'sk_top_wide':-5}
    det = [k for k, v in patterns.items() if v]
    for p in det: score += w.get(p, 5)
    if len(det) >= 2: score += 5
    if len(det) >= 3: score += 5
    if sk_
        if sk_data.get('strong_bull'): score += 8
        if sk_data.get('duo_cross_sk'): score += 10
        if sk_data.get('sk_cross_kong'): score += 6
        if sk_data.get('duo_cross_kong'): score += 7
        if sk_data.get('small_eye') and sk_data.get('is_consolidating'): score += 5
        if not sk_data.get('sk_above_both') and not sk_data.get('sk_below_both') and sk_data.get('duo_now', 0) > 0: score += 3
        if sk_data.get('sk_below_both'): score -= 8
    if signal_type:
        st = signal_type.lower()
        if any(k in st for k in ['逃顶','见顶','清仓','止损']): score -= 30
        elif any(k in st for k in ['卖出','减仓','高位','风险']): score -= 20
        elif any(k in st for k in ['背离','死叉']): score -= 15
    return score

def is_sell_signal(st):
    if not st: return False
    return any(k in st for k in ['逃顶','卖出','减仓','高位','风险','背离','死叉','见顶','清仓','止损'])

def check_risk_filters(price, closes, highs, ma5, ma10, ma20, mom10, mom20):
    try:
        if mom10 > MAX_MOM_10_PCT: return '10日涨幅{:.1f}%追高'.format(mom10 * 100)
        if mom20 > MAX_MOM_20_PCT: return '20日涨幅{:.1f}%赶顶'.format(mom20 * 100)
        mas = [ma5, ma10, ma20]
        mx, mn = max(mas), min(mas)
        if mn > 0 and (mx - mn) / mn < MA_TANGLE_THRESHOLD: return '均线粘合方向不明'
        if len(highs) >= 20:
            h20 = float(np.max(highs[-20:]))
            dd = (h20 - price) / h20
            if dd > DRAWDOWN_FROM_HIGH_PCT and price < ma20: return '距高点回撤{:.1f}%顶部反弹'.format(dd * 100)
        return None
    except Exception as e: return '异常:{}'.format(str(e))


# ==================== 板块检查 ====================
def check_sector_state(C, code):
    try:
        cn = code.split('.')[0]
        secs = ['000001.SH', '399001.SZ', '399006.SZ']
        wc, tc = 0, 0
        for sc in secs:
            try:
                tk = C.get_full_tick([sc])
                if tk and sc in tk:
                    t = tk[sc]; pc = float(t.get('lastClose', 0)); lp = float(t.get('lastPrice', 0))
                    if pc > 0 and lp > 0: tc += 1; wc += (1 if (lp - pc) / pc * 100 < SECTOR_WEAK_THRESHOLD * 100 else 0)
            except: pass
        if tc >= 2 and wc >= 2: return False, '{}只指数弱势'.format(wc)
        if cn.startswith('30') or cn.startswith('688'):
            try:
                tk = C.get_full_tick(['399006.SZ'])
                if tk and '399006.SZ' in tk:
                    t = tk['399006.SZ']; pc, lp = float(t.get('lastClose', 0)), float(t.get('lastPrice', 0))
                    if pc > 0 and lp > 0 and (lp - pc) / pc * 100 < -2.5: return False, '创业板跌{:.1f}%'.format((lp - pc) / pc * 100)
            except: pass
        td, ti = get_stock_sector_trend(C, code)
        if td == 'down': return False, '板块下行({})'.format(ti)
        return True, ''
    except Exception as e: return True, str(e)

def get_stock_sector_trend(C, code):
    try:
        cn = code.split('.')[0]
        pc = ('399006.SZ' if (cn.startswith('30') or cn.startswith('688')) else
              ('399001.SZ' if cn.startswith('00') else '000001.SH'))
        d = C.get_market_data_ex(fields=['close'], stock_code=[pc], period='1d', count=80, dividend_type='follow', fill_data=True)
        if d and pc in d and not d[pc].empty:
            cl = d[pc]['close'].values.astype(float)
            if len(cl) >= 60:
                m20, m60 = np.mean(cl[-21:-1]), np.mean(cl[-61:-1]); cur = cl[-1]
                if m20 > m60 and cur > m20: return 'up', 'MA20>MA60'
                if m20 < m60: return 'down', 'MA20<MA60'
                return 'unknown', 'MA纠缠'
        return 'unknown', '不足'
    except Exception as e: return 'unknown', str(e)


# ==================== 大盘判断 ====================
def check_market_state(C):
    ic = '000001.SH'; ts = 'unknown'
    try:
        d = C.get_market_data_ex(fields=['close'], stock_code=[ic], period='1d', count=80, dividend_type='follow', fill_data=True, subscribe=True)
        if d and ic in d and not d[ic].empty:
            cl = d[ic]['close'].values.astype(float)
            if len(cl) >= 60:
                m20, m60 = np.mean(cl[-21:-1]), np.mean(cl[-61:-1]); yc, cur = cl[-2], cl[-1]
                tc = (cur - yc) / yc * 100 if yc > 0 else 0
                am, aam, abm = cur > m20, cur > m60, m20 > m60; nm = abs(cur - m20) / m20 < 0.02
                if aam: ts = 'bull' if (am or nm or tc > 1.0) else 'bottoming'
                else:
                    if tc > 1.5: ts = 'bottoming'
                    elif not am and not aam: ts = 'bottoming' if (abs(cur - m20) / m20 < 0.01 or tc > 1.0) else 'bear'
                    elif aam or am: ts = 'bottoming'
                    else: ts = 'bear'
                wlog('[大盘趋势] MA20:{:.2f} MA60:{:.2f} 今日{:+.2f}% 趋势:{}'.format(
                    m20, m60, tc, {'bull':'多头','bear':'空头','bottoming':'筑底'}.get(ts, ts)))
    except Exception as e: wlog('[大盘趋势] 异常: {}'.format(str(e)))

    try:
        tk = C.get_full_tick([ic])
        if tk and ic in tk:
            t = tk[ic]; lp, op, pc = float(t.get('lastPrice', 0)), float(t.get('open', 0)), float(t.get('lastClose', 0))
            if lp > 0 and op > 0 and pc > 0:
                cp, oc, icg = (lp - pc) / pc * 100, (op - pc) / pc * 100, (lp - op) / op * 100
                ho, lo, fl, ri = op > pc, op < pc, lp < op * 0.995, lp > op * 1.001
                wlog('[大盘日内] 开盘{:+.2f}% 日内{:+.2f}% 总{:+.2f}%'.format(oc, icg, cp))

                if ts == 'bear':
                    if ho and fl: A.market_state = 'weak'; wlog('[大盘] 空头+高开低走 禁止!'); return
                    if lo and ri and cp > 0: A.market_state = 'normal'; wlog('[大盘] 空头+低开高走 允许'); return
                    A.market_state = 'weak'; wlog('[大盘] 空头 禁止!'); return
                if ho and fl: A.market_state = 'weak'; wlog('[大盘] 高开低走 禁止!'); return
                if cp < -3.0:
                    A.market_state = 'weak'
                    if not A.circuit_breaker: A.circuit_breaker = True; wlog('[熔断] {:.1f}%'.format(cp)); return
                else:
                    if A.circuit_breaker: A.circuit_breaker = False; wlog('[熔断解除]')
                if cp < -2.0: A.market_state = 'weak'; wlog('[大盘] 弱势 禁止!'); return
                if lo and ri and ts in ['bull', 'bottoming']:
                    A.market_state = 'strong'; wlog('[大盘] 低开高走+{} 最佳!'.format({'bull':'多头','bottoming':'筑底'}.get(ts))); return
                if ts == 'bull': A.market_state = 'normal'; wlog('[大盘] 多头 允许'); return
                if ts == 'bottoming': A.market_state = 'normal'; wlog('[筑底] 允许'); return
                A.market_state = 'normal'; wlog('[大盘] 正常'); return
    except Exception as e: wlog('[大盘] 异常: {}'.format(str(e)))
    wlog('[大盘] 默认禁止!')
    A.market_state = 'weak'


# ==================== ATR诊断日志 ====================
def _log_atr_diagnosis(code, ep, cp, h, atr, pnl, bd='', mp=0, mcp=0, ta=False):
    try:
        fs = ep * (1 - STOP_LOSS_PCT)
        asl = ep - atr * STOP_LOSS_ATR_MULT
        scl = ep * (1 + SCALE_DOWN_PCT)
        if ta and mcp > 0:
            tl = mcp - atr * TRAILING_ATR_MULT
            ts = '{:.2f}(ATR移动)'.format(tl)
        elif pnl >= TRAILING_START_PCT:
            tl = h - atr * TRAILING_ATR_MULT
            ts = '{:.2f}(启动中)'.format(tl)
        else:
            tl = None
            ts = '未启动(需+{:.0f}%)'.format(max(0, (TRAILING_START_PCT - pnl) * 100))
        hd = ''
        if bd:
            try: hd = '{}天'.format((datetime.datetime.now() - datetime.datetime.strptime(bd, '%Y%m%d')).days)
            except: hd = '未知'
        if pnl <= -STOP_LOSS_PCT: st = '应止损!'
        elif cp <= asl: st = '应ATR止损!'
        elif bd and pnl < 0:
            try:
                if (datetime.datetime.now() - datetime.datetime.strptime(bd, '%Y%m%d')).days >= TIME_STOP_DAYS: st = '应时间止损!'
                else: st = ''
            except: st = ''
        elif ta and tl and cp <= tl: st = '应ATR移动止盈!'
        elif pnl > 0 and not ta:
            pd = mp - pnl
            if mp >= (PROFIT_DRAWDOWN_PCT + MIN_PROFIT_THRESHOLD):
                if pd >= PROFIT_DRAWDOWN_PCT and pnl >= MIN_PROFIT_THRESHOLD: st = '应盈利回撤保护!'
                else: st = '安全'
            elif pnl <= MIN_PROFIT_THRESHOLD: st = '应微小盈利保护!'
            else: st = '安全'
        elif pnl >= SCALE_DOWN_PCT: st = '可减仓'
        else: st = '安全'
        pi = '最高盈利{:.1f}%'.format(mp * 100) if mp > 0 else ''
        wlog('[风控线] {} 止损{:.2f} ATR止损{:.2f} 减仓{:.2f} 移动止盈{} {} [{}]'.format(
            code, fs, asl, scl, ts, pi, st))
    except: pass


# ==================== 分析单只股票 ====================
def analyze_stock(closes, opens, highs, lows, volumes, amounts, signal_type=''):
    try:
        cp, co, cv = closes[-1], opens[-1], volumes[-1]
        ma5, ma10, ma20, ma60 = calc_sma(closes, MA_FAST), calc_sma(closes, MA_MEDIUM), calc_sma(closes, MA_SLOW), calc_sma(closes, MA_TREND)
        if np.isnan(ma5[-1]) or np.isnan(ma10[-1]) or np.isnan(ma20[-1]): return None
        vm5 = calc_sma(volumes, VOL_MA)
        vr = cv / vm5[-1] if vm5[-1] > 0 else 0
        ml, sl, mh = calc_macd(closes)
        rsi = calc_rsi(closes)
        atr = calc_atr(highs, lows, closes)
        sk_data = calc_sk(closes, highs, lows)
        mom5 = (closes[-1] / closes[-5] - 1) if len(closes) > 5 else 0
        mom10 = (closes[-1] / closes[-10] - 1) if len(closes) > 10 else 0
        mom20 = (closes[-1] / closes[-20] - 1) if len(closes) > 20 else 0
        tc = (cp - closes[-2]) / closes[-2] if closes[-2] > 0 else 0
        ta = (highs[-1] - lows[-1]) / closes[-2] if closes[-2] > 0 else 0
        patterns = {}
        patterns['bull_break'] = check_bull_break(cp, co, cv, ma5[-1], ma10[-1], ma20[-1], ma60[-1], mh, ml, sl, vr, rsi)
        patterns['parking'] = check_parking(closes, opens, highs, lows, tc, ta)
        patterns['platform'] = check_platform(cp, co, closes, ma60, vr)
        patterns['htf'] = check_htf(closes, highs, lows)
        patterns['double_vol'] = check_double_vol(cp, co, closes[-2], opens[-2], cv, volumes[-2] if len(volumes) > 1 else 0, vr, tc)
        sp = check_sk_pattern(sk_data) if sk_data else {}
        patterns.update(sp)
        if not any(patterns.values()): return None
        rr = check_risk_filters(cp, closes, highs, ma5[-1], ma10[-1], ma20[-1], mom10, mom20)
        if rr: return None
        sc = calc_score(ma5[-1], ma10[-1], ma20[-1], ma60[-1], cp, vr,
                        mh[-1] if not np.isnan(mh[-1]) else 0, ml[-1] if not np.isnan(ml[-1]) else 0,
                        sl[-1] if not np.isnan(sl[-1]) else 0, rsi, mom5, mom10, mom20, patterns, signal_type, sk_data)
        return {'score': sc, 'price': cp, 'atr': atr, 'patterns': [k for k, v in patterns.items() if v]}
    except: return None


# ==================== 扫描候选池 ====================
def scan_from_pool(C, holdings):
    min_bars = MA_TREND + 30
    pool = A.candidate_pool if hasattr(A, 'candidate_pool') else []
    if not pool: wlog('[候选池为空]'); return
    try:
        data = C.get_market_data_ex(fields=['open','high','low','close','volume','amount'],
                                     stock_code=pool, period='1d', count=min_bars + 10,
                                     dividend_type='follow', fill_data=True, subscribe=True)
        if not  wlog('[数据获取失败] 返回空'); return
        wlog('[扫描候选池] {}只, 获取数据{}只'.format(len(pool), len(data)))
    except Exception as e:
        wlog('[数据获取失败] {}'.format(str(e))); return
    cands, below, cnt = {}, {}, 0
    for code in pool:
        if code in holdings: continue
        try:
            if code not in data or data[code].empty: continue
            df = data[code]
            if len(df) < min_bars: continue
            cl, op, hi, lo, vl, am = df['close'].values.astype(float), df['open'].values.astype(float), \
                df['high'].values.astype(float), df['low'].values.astype(float), \
                df['volume'].values.astype(float), df['amount'].values.astype(float)
            pr = cl[-1]
            if pr < MIN_PRICE or pr > MAX_PRICE: continue
            if np.mean(am[-5:]) < MIN_AMOUNT: continue
            if am[-1] < MIN_STOCK_AMOUNT: cnt += 1; continue
            try:
                tk = C.get_full_tick([code])
                if tk and code in tk:
                    t = tk[code]; lpr = float(t.get('lastPrice', 0)); prc = float(t.get('lastClose', 0))
                    if lpr > 0 and prc > 0:
                        chg = (lpr - prc) / prc * 100
                        if chg >= 7.5: continue
                        pr = lpr
            except: pass
            ci = A.candidate_data.get(code, {})
            st = ci.get('signal_type', '')
            res = analyze_stock(cl, op, hi, lo, vl, am, st)
            if res and res['score'] >= MIN_SCORE:
                res['source'] = ci.get('source', ''); cands[code] = res
            elif res: below[code] = res
            cnt += 1
        except: continue
    sc = dict(sorted(cands.items(), key=lambda x: x[1]['score'], reverse=True)[:MAX_CANDIDATES * 2])
    A.candidates = sc
    if sc:
        wlog('[扫描结果] 扫描{}只, 筛选出{}只:'.format(cnt, len(sc)))
        try: td = C.get_full_tick(list(sc.keys()))
        except: td = None
        for code, info in list(sc.items())[:8]:
            ei = ''
            if td and code in td:
                try:
                    t = td[code]; lp = float(t.get('lastPrice', 0)); prc = float(t.get('lastClose', 0))
                    if lp > 0 and prc > 0: ei = ' 现价:{:.2f} 涨幅:{:+.2f}%'.format(lp, (lp - prc) / prc * 100)
                except: pass
            si = A.candidate_data.get(code, {})
            ns = si.get('name', '')
            ss = si.get('signal_type', '')
            wlog('  {}{} 评分:{} 来源:{} 形态:{}{}{}'.format(
                code, (' '+ns) if ns else '', int(info['score']), info.get('source', ''),
                ','.join(info.get('patterns', [])), ei, (' [{}]'.format(ss)) if ss else ''))
        if len(sc) > 8: wlog('  ... 共{}只候选（前8只已显示）'.format(len(sc)))
    else:
        wlog('[扫描结果] 扫描{}只, 无符合条件的股票(门槛{}分)'.format(cnt, MIN_SCORE))
        if below:
            tb = sorted(below.items(), key=lambda x: x[1]['score'], reverse=True)[:5]
            wlog('[未通过Top5] (均低于{}分):'.format(MIN_SCORE))
            for code, info in tb:
                ns = A.candidate_data.get(code, {}).get('name', '')
                ps = ','.join(info.get('patterns', [])) if info.get('patterns') else '-'
                wlog('  {}{} 评分:{} 形态:{}'.format(code, (' '+ns) if ns else '', int(info['score']), ps))


# ==================== 持仓管理 ====================
def manage_positions(C, holdings):
    if not holdings: return
    now = datetime.datetime.now(); nt = now.strftime('%H%M%S'); today = now.strftime('%Y%m%d')
    ie = nt < '100000'
    try: ft = C.get_full_tick(list(holdings.keys()))
    except: ft = None
    for code, pos in list(holdings.items()):
        vol = pos.get('canuse', 0)
        if vol <= 0: continue
        cp = 0
        if ft and code in ft:
            try: cp = float(ft[code].get('lastPrice', 0))
            except: pass
        if cp <= 0:
            wlog('[持仓跳过] {} 无法获取现价 可卖:{}股 跳过'.format(code, vol)); continue
        if code in A.positions:
            det = A.positions[code]; ep = det['entry_price']; hp = det.get('highest', ep)
            ah = det.get('atr', 1.0); sd = det.get('scaled_down', False)
            bd = det.get('buy_date', ''); ii = det.get('is_intraday', False)
            mp = det.get('max_profit_pct', 0); mcp = det.get('max_close_price', 0)
            ta = det.get('trailing_activated', False)
            sn = A.candidate_data.get(code, {}).get('name', '')
            pp = (cp - ep) / ep if ep > 0 else 0
            hd = ''
            if bd:
                try: hd = ' 持{}天'.format((now - datetime.datetime.strptime(bd, '%Y%m%d')).days)
                except: hd = ''
            wlog('[持仓] {}{} 成本{:.2f} 现价{:.2f} {:+.1f}%{} ATR={:.2f}'.format(
                code, (' '+sn) if sn else '', ep, cp, pp * 100, hd, ah, ' 当日买' if ii else ''))
        else:
            ep = pos['cost']; hp = max(ep, cp); ah = _estimate_atr(code, ep); sd = False; bd = ''; ii = False
            mp, mcp, ta = 0, 0, False
            A.positions[code] = {'entry_price': ep, 'highest': hp, 'atr': ah, 'scaled_down': False,
                                 'buy_date': '', 'is_intraday': False, 'max_profit_pct': 0,
                                 'max_close_price': 0, 'trailing_activated': False}
            sn = A.candidate_data.get(code, {}).get('name', '')
            wlog('[持仓] {} {} 新建记录 成本={:.2f}'.format(code, (' '+sn) if sn else '', ep))
        if cp > hp: A.positions[code]['highest'] = cp; hp = cp
        pp = (cp - ep) / ep if ep > 0 else 0
        if pp > mp: mp = pp; A.positions[code]['max_profit_pct'] = mp
        if pp >= TRAILING_START_PCT:
            if cp > mcp: mcp = cp; A.positions[code]['max_close_price'] = mcp
            if not ta: ta = True; A.positions[code]['trailing_activated'] = True; wlog('[移动止盈] {} 已启动 盈利{:.1f}% 最高价{:.2f}'.format(code, pp*100, mcp))
        _log_atr_diagnosis(code, ep, cp, hp, ah, pp, bd, mp, mcp, ta)
        ss, sr = False, ''
        # 逃顶信号检查
        try:
            if REQ_OK:
                try:
                    sraw = _http_get(HTTP_SIGNAL_URL + '/sell', timeout=5)
                    if sraw:
                        sd = _json.loads(sraw).get('by_code', {})
                        if code in sd:
                            for st in sd[code].get('signals', []):
                                ss = True; sr = '逃顶信号({})'.format(st)
                                wlog('[逃顶卖出] {} 信号:{} 现价:{:.2f} => 清仓'.format(code, st, cp)); break
                except: pass
        except: pass
        skip = ''
        dl = pp <= -DEEP_LOSS_PCT
        if dl:
            if not ss: skip = '旧仓等待模式(亏损{:.1f}%)'.format(pp * 100)
        else:
            if not ss and pp <= -STOP_LOSS_PCT: ss = True; sr = '硬性止损(亏损{:.1f}%)'.format(pp * 100)
            elif not ss and cp <= ep - ah * STOP_LOSS_ATR_MULT: ss = True; sr = 'ATR止损(现价{:.2f}<线{:.2f})'.format(cp, ep - ah * STOP_LOSS_ATR_MULT)
            elif not ss and bd and not ie:
                try:
                    hd2 = (now - datetime.datetime.strptime(bd, '%Y%m%d')).days
                    if hd2 >= TIME_STOP_DAYS and pp < 0: ss = True; sr = '时间止损(持{}天)'.format(hd2)
                except: pass
            elif not ss and pp > 0:
                if ta and mcp > 0 and cp <= mcp - ah * TRAILING_ATR_MULT:
                    ss = True; sr = 'ATR移动止盈(最高{:.2f})'.format(mcp)
                elif not ta:
                    pd = mp - pp
                    if mp >= (PROFIT_DRAWDOWN_PCT + MIN_PROFIT_THRESHOLD):
                        if pd >= PROFIT_DRAWDOWN_PCT and pp >= MIN_PROFIT_THRESHOLD: ss = True; sr = '盈利回撤(最高{:.1f}%)'.format(mp * 100)
                        elif pp <= MIN_PROFIT_THRESHOLD: ss = True; sr = '微小盈利保护'
            if not ss and pp >= SCALE_DOWN_PCT and not sd:
                hv = vol // 2
                if hv >= 100:
                    csd = True; srl = ''
                    if ie: csd = False; srl = '开盘30分钟内'
                    if ii: csd = False; srl = '当日买入'
                    if csd:
                        wlog('[减仓] {} 盈利{:.1f}% 减半'.format(code, pp*100))
                        A.positions[code]['scaled_down'] = True
                        if do_sell(code, hv, cp, '盈利减仓', C): wlog('[减仓成功]')
                        else: A.positions[code]['scaled_down'] = False
                    else: wlog('[减仓跳过] {}'.format(srl))
        if not ss and not skip and bd:
            try: skip = '持{}天 盈{:.1f}%'.format((now - datetime.datetime.strptime(bd, '%Y%m%d')).days, pp*100)
            except: pass
        if ss:
            sn2 = A.candidate_data.get(code, {}).get('name', '')
            wlog('[卖出] {}{} {} 现价{:.2f} 成本{:.2f} {:+.1f}% {}股'.format(
                code, ('('+sn2+')') if sn2 else '', sr, cp, ep, pp * 100, vol))
            if do_sell(code, vol, cp, sr, C):
                if code in A.positions: del A.positions[code]
                A.today_sold[code] = cp; A.recently_sold[code] = today
        elif skip: wlog('[跳过] {} {:+.1%} {}'.format(code, pp, skip))


# ==================== 交易执行 ====================
def do_buy(code, shares, price, reason, C):
    if code in A.pending_orders: wlog('[买入跳过] {} 有待处理委托'.format(code)); return False
    try:
        passorder(23, 1101, A.acct, code, 14, -1, shares, A.strategy_name, 2, reason, C)
        A.trade_count += 1; A.pending_orders[code] = datetime.datetime.now()
        wlog('[买入] {} {}股 @{:.2f} {}'.format(code, shares, price, reason)); return True
    except Exception as e: wlog('[买入失败] {} {}'.format(code, str(e))); return False

def do_sell(code, shares, price, reason, C):
    if code in A.pending_orders: wlog('[卖出跳过] {} 有待处理委托'.format(code)); return False
    try:
        pl = get_trade_detail_data(A.acct, A.acct_type, 'position')
        rcu, rt = 0, 0
        if pl:
            for p in pl:
                pc = p.m_strInstrumentID + '.' + p.m_strExchangeID
                if pc == code: rt = p.m_nVolume; rcu = p.m_nCanUseVolume; break
        if rcu <= 0: wlog('[卖出跳过] {} 无可卖持仓'.format(code)); return False
        passorder(24, 1101, A.acct, code, 14, -1, rcu, A.strategy_name, 2, reason, C)
        A.trade_count += 1; A.pending_orders[code] = datetime.datetime.now()
        if '止盈' in reason: A.win_count += 1
        else: A.loss_count += 1
        wlog('[卖出] {} {}股(总{}股) @{:.2f} {}'.format(code, rcu, rt, price, reason)); return True
    except Exception as e: wlog('[卖出失败] {} {}'.format(code, str(e))); return False


# ==================== 熔断止损 ====================
def check_stop_loss_only(C, holdings):
    if not holdings: return
    try: ft = C.get_full_tick(list(holdings.keys()))
    except: ft = None
    for code, pos in holdings.items():
        cp = 0
        if ft and code in ft:
            try: cp = float(ft[code].get('lastPrice', 0))
            except: pass
        if cp <= 0: continue
        ep = A.positions.get(code, {}).get('entry_price', pos['cost'])
        pp = (cp - ep) / ep if ep > 0 else 0
        if pp <= -0.10:
            do_sell(code, pos['canuse'], cp, '熔断强制止损', C)
            if code in A.positions: del A.positions[code]


# ==================== 买入逻辑 ====================
def try_buy_candidates(C, holdings, available_cash):
    if not A.candidates: wlog('[买入] 无候选股票'); return
    hc = len([h for h in holdings.values() if h.get('vol', 0) > 0])
    wlog('[买入] 候选{}只 持仓{}只 可用资金{:.0f}'.format(len(A.candidates), hc, available_cash))
    if hc >= MAX_CANDIDATES: wlog('[买入] 持仓已满{}只'.format(hc)); return

    def sort_key(item):
        code, cand = item; sc = cand['score']
        pc = code.split('.')[0] if '.' in code else code
        return (sc + (3 if (pc.startswith('30') or pc.startswith('688') or pc.startswith('689')) else 0), sc)

    sorted_cands = sorted(A.candidates.items(), key=sort_key, reverse=True)
    bc = 0
    for code, cand in sorted_cands:
        if code in holdings and holdings[code].get('vol', 0) > 0: continue
        if code in A.today_bought or code in A.today_sold: continue
        if hc + bc >= MAX_CANDIDATES: break
        price = cand['price']; score = cand['score']; atr = cand['atr']
        patterns = cand.get('patterns', []); source = cand.get('source', '')
        pc = code.split('.')[0] if '.' in code else code
        bt = ''
        if pc.startswith('688') or pc.startswith('689'): bt = '[科创板]'
        elif pc.startswith('30') or pc.startswith('301'): bt = '[创业板]'
        try:
            tk = C.get_full_tick([code])
            if tk and code in tk:
                t = tk[code]; lp = float(t.get('lastPrice', 0)); prc = float(t.get('lastClose', 0))
                if lp > 0 and prc > 0:
                    chg = (lp - prc) / prc * 100
                    if chg >= 9.5: wlog('[跳过] {} 涨停 {:.1f}%'.format(code, chg)); continue
                    price = lp
        except: pass
        try:
            ad = C.get_market_data_ex(stock_code=[code], period='1d', count=1, fill_up=True, dividend_type='front', fields=['amount'])
            if ad and code in ad and ad[code] is not None and len(ad[code]) > 0:
                if float(ad[code]['amount'].iloc[-1]) < MIN_STOCK_AMOUNT: continue
        except: pass
        sk_ok, _ = check_sector_state(C, code)
        if not sk_ok: continue
        try:
            m5d = C.get_market_data_ex(stock_code=[code], period='1d', count=6, fill_up=True, dividend_type='front', fields=['close'])
            if m5d and code in m5d and m5d[code] is not None and len(m5d[code]) >= 6:
                c5 = m5d[code]['close'].values.astype(float); mv = calc_sma(c5, 5)
                if not np.isnan(mv) and mv > 0 and (price - mv) / mv * 100 > 5: continue
        except: pass
        ta2 = available_cash
        try:
            acc = get_trade_detail_data(A.acct, A.acct_type, 'account')
            if acc and len(acc) > 0: ta2 = float(acc[0].m_dBalance)
        except: pass
        tps = 200000 / MAX_CANDIDATES
        pv = min(tps, available_cash, ta2 * MAX_POSITION_PCT, MAX_SINGLE_VALUE)
        shares = int(pv / (price * (1 + SLIPPAGE)) / 100) * 100
        if shares * price < MIN_TRADE_AMOUNT: continue
        if shares * price * (1 + TRADE_FEE + SLIPPAGE) > available_cash: continue
        if shares >= 100:
            sn = A.candidate_data.get(code, {}).get('name', '')
            rs = '评分:{} 来源:{} 形态:{} {}'.format(int(score), source, ','.join(patterns) if patterns else '-', bt)
            if do_buy(code, shares, price, rs, C):
                bc += 1; available_cash -= shares * price * (1 + TRADE_FEE + SLIPPAGE)
                td2 = datetime.datetime.now().strftime('%Y%m%d')
                A.positions[code] = {'entry_price': price, 'highest': price, 'atr': atr,
                                     'scaled_down': False, 'buy_date': td2, 'is_intraday': True}
                A.today_bought[code] = price


# ==================== 策略生命周期 ====================

def init(C):
    """策略初始化"""
    wlog('=' * 60)
    wlog('  短线强势股擒龙策略 v7.0 (纯净精简版)')
    wlog('=' * 60)
    try:
        al = get_trade_detail_data('', 'STOCK', 'account')
        if al and len(al) > 0: A.acct = al[0].m_strAccountID; wlog('[账户] 自动获取: {}'.format(A.acct))
        else: A.acct = account; wlog('[账户] 使用默认: {}'.format(account))
    except Exception as e: A.acct = account; wlog('[账户] 使用默认: {} ({})'.format(account, str(e)))
    A.acct_type = accountType; A.strategy_name = 'DHS_v7.0'
    A.candidates = {}; A.candidate_data = {}; A.positi {}
    A.today_bought = {}; A.today_sold = {}; A.recently_sold = {}
    A.last_bar_time = None; A.last_scan_date = ''; A.last_pool_update = None
    A.pending_orders = {}; A.trade_count = 0; A.win_count = 0; A.loss_count = 0
    A.market_state = 'normal'; A.circuit_breaker = False
    pool, data = get_candidate_pool(C)
    A.candidate_pool = pool; A.candidate_data = data
    if pool:
        universe = pool + ['000001.SH']
        C.set_universe(universe); wlog('[universe] 设置{}只'.format(len(universe)))
    restore_positions(C)
    wlog('  [数据源] QMT API (中证1000为主) + HTTP信号服务(可选)')
    wlog('  [驱动模式] handlebar + is_last_bar()')
    wlog('  [频率控制] 每3秒执行一次')
    wlog('  初始化完成 (v7.0 纯净精简版)')


def restore_positions(C):
    """恢复持仓状态"""
    try:
        hold = get_all_positions()
        today = datetime.datetime.now().strftime('%Y%m%d')
        if not hold: wlog('[恢复持仓] 无持仓'); return
        hc = list(hold.keys()); ra = {}; rh = {}
        rbd = {}
        try:
            tr = get_trade_detail_data(A.acct, A.acct_type, 'stock')
            if tr:
                bt2 = defaultdict(list)
                for t in tr:
                    if t.m_nVolume > 0:
                        ct = t.m_strInstrumentID + '.' + t.m_strExchangeID
                        dt = str(t.m_strTradeDate).replace('-', '')[:8]
                        bt2[ct].append({'date': dt, 'price': t.m_dTradePrice, 'vol': t.m_nVolume})
                for code in hc:
                    if code in bt2 and bt2[code]:
                        ts2 = sorted(bt2[code], key=lambda x: x['date'], reverse=True)
                        rbd[code] = ts2[0]['date']
                wlog('[恢复持仓] 从成交记录获取买入日期 {}/只成功'.format(sum(1 for v in rbd.values() if v)))
        except Exception as e: wlog('[警告] 获取历史成交失败: {}'.format(str(e)))
        try:
            hd2 = C.get_market_data_ex(stock_code=hc, period='1d', count=30, fill_data=True, dividend_type='front')
            if hd2 is not None:
                for code in hc:
                    try:
                        df = hd2[code]
                        if df is not None and len(df) >= 15:
                            hi = df['high'].astype(float).values; lo = df['low'].astype(float).values; cl = df['close'].astype(float).values
                            ra[code] = calc_atr(hi, lo, cl, 14); rh[code] = float(np.max(hi[-10:]))
                        else: ra[code] = None
                    except: ra[code] = None
                wlog('[恢复持仓] ATR计算完成 {}/只成功'.format(sum(1 for v in ra.values() if v is not None)))
            else: wlog('[警告] get_market_data_ex返回空，将使用估算ATR')
        except Exception as e: wlog('[警告] 获取历史K线失败: {}'.format(str(e)))
        for code, pos in hold.items():
            cost = pos['cost']
            av = ra.get(code)
            if av is None or av <= 0: av = _estimate_atr(code, cost); asrc = '估算'
            else: asrc = '实算'
            hv = rh.get(code)
            if hv is None or hv <= 0: hv = cost * 1.05
            ebd = A.positions.get(code, {}).get('buy_date', '')
            if rbd.get(code): est_bd = rbd[code]; bds = '成交记录'
            elif ebd: est_bd = ebd; bds = '内存'
            else: est_bd = (datetime.datetime.now() - datetime.timedelta(days=10)).strftime('%Y%m%d'); bds = '默认'
            A.positions[code] = {'entry_price': cost, 'highest': hv, 'atr': av,
                                 'scaled_down': False, 'buy_date': est_bd, 'is_intraday': False}
            wlog('[恢复持仓] {} 成本:{:.2f} ATR:{:.2f}({}) 最高:{:.2f} 买入日期:{}({})'.format(
                code, cost, av, asrc, hv, est_bd, bds))
    except Exception as e: wlog('[恢复持仓失败] {}'.format(str(e)))


def handlebar(C):
    """每根K线触发"""
    try: _handlebar_impl(C)
    except Exception as e: wlog('[handlebar致命异常] {} (继续运行)'.format(str(e)))


def _handlebar_impl(C):
    """handlebar 实现"""
    try:
        if not C.is_last_bar(): return
    except AttributeError: pass
    except Exception as e: wlog('[is_last_bar异常] {}'.format(str(e)))

    now = datetime.datetime.now(); nt = now.strftime('%H%M%S')
    if nt < '093000' or nt > '150000': return
    if A.last_bar_time is not None and (now - A.last_bar_time).total_seconds() < 3: return
    A.last_bar_time = now
    today = now.strftime('%Y%m%d')
    if A.last_scan_date != today:
        A.last_scan_date = today; A.today_bought = {}; A.today_sold = {}
        A.recently_sold = {}; A.candidates = {}; A.pending_orders = {}
        wlog('=' * 50); wlog('[{}] 新交易日'.format(today)); wlog('=' * 50)

    et = now - datetime.timedelta(minutes=3)
    for k in [k for k, v in A.pending_orders.items() if v < et]:
        del A.pending_orders[k]; wlog('[委托] 清理过期: {}'.format(k))

    try:
        ol = get_trade_detail_data(A.acct, A.acct_type, 'order')
        for code in list(A.pending_orders.keys()):
            ha = False
            if ol:
                for o in ol:
                    oc = o.m_strInstrumentID + '.' + o.m_strExchangeID
                    if oc == code and getattr(o, 'm_nOrderStatus', -1) in [0, 1, 2, 3, 4, 7]: ha = True; break
            if not ha: del A.pending_orders[code]; wlog('[委托] 移除无效委托: {}'.format(code))
    except Exception as e: wlog('[委托检查异常] {}'.format(str(e)[:50]))

    if int(now.strftime('%S')) % 10 == 0: wlog('heartbeat {}'.format(now.strftime('%H:%M:%S')))

    fr = False
    if A.last_pool_update is None or (now - A.last_pool_update).total_seconds() > 60:
        ops = set(A.candidate_pool) if A.candidate_pool else set(); oc2 = len(ops)
        A.last_pool_update = now; pool, data = get_candidate_pool(C); nc = len(pool) if pool else 0
        nps = set(pool) if pool else set()
        ns, rm = nps - ops, ops - nps
        if nc != oc2:
            wlog('[候选池刷新] {} -> {} (新增{} 移除{})'.format(oc2, nc, len(ns), len(rm)))
            if ns:
                for n in list(ns)[:5]: wlog('  [新票] {} {}'.format(n, data.get(n, {}).get('name', '')))
        A.candidate_pool = pool; A.candidate_data = data; fr = True
        if pool:
            universe = pool + ['000001.SH']; C.set_universe(universe)

    acash = 1000000; aok = False
    try:
        acc = get_trade_detail_data(A.acct, A.acct_type, 'account')
        if acc and len(acc) > 0: acash = float(acc[0].m_dAvailable); aok = True
    except: pass
    hold = {}
    if aok:
        try:
            pl = get_trade_detail_data(A.acct, A.acct_type, 'position')
            for p in pl:
                code = p.m_strInstrumentID + '.' + p.m_strExchangeID
                if p.m_nVolume > 0:
                    ex = A.positions.get(code, {})
                    oe = ex.get('entry_price', p.m_dOpenPrice) if ex else p.m_dOpenPrice
                    oa = ex.get('atr', _estimate_atr(code, p.m_dOpenPrice)) if ex else _estimate_atr(code, p.m_dOpenPrice)
                    oh = max(oe, p.m_dOpenPrice * 1.05) if ex else max(oe, p.m_dOpenPrice * 1.05)
                    osd = ex.get('scaled_down', False) if ex else False
                    hold[code] = {'vol': p.m_nVolume, 'canuse': p.m_nCanUseVolume, 'cost': p.m_dOpenPrice,
                                   'entry_price': oe, 'atr': oa, 'highest': oh, 'scaled_down': osd}
                    if p.m_nVolume % 100 != 0:
                        wlog('[持仓] {} 总{}股 可卖{}股 (含碎股{})'.format(code, p.m_nVolume, p.m_nCanUseVolume, p.m_nVolume % 100))
        except: pass
    if hold:
        for code in hold:
            if code not in A.positions:
                pos = hold[code]
                A.positions[code] = {'entry_price': pos['cost'], 'highest': max(pos['cost'], pos.get('current_price', pos['cost'])),
                                      'atr': _estimate_atr(code, pos['cost']), 'scaled_down': False,
                                      'buy_date': '', 'is_intraday': False}

    op2 = now.strftime('%H%M%S')
    if op2 < '093500': wlog('[开盘保护] 09:35前不执行卖出')

    check_market_state(C)
    if A.circuit_breaker: check_stop_loss_only(C, hold); return

    if not A.candidates or A.last_scan_date != today or len(A.candidates) < MAX_CANDIDATES or fr:
        if fr and A.candidates and A.last_scan_date == today: wlog('[扫描] 检测到新票/定时重扫...')
        else: wlog('[扫描] 开始扫描候选池...')
        scan_from_pool(C, hold); A.last_scan_date = today
    else: wlog('[扫描] 候选{}只(今日已扫描)，跳过'.format(len(A.candidates)))

    if not (op2 < '093500'): manage_positions(C, hold)

    if now.strftime('%H%M%S').endswith('00'):
        wlog('[状态监控] 持仓:{}只 候选:{}只 大盘:{} 委托:{}只'.format(
            len([h for h in hold.values() if h.get('vol', 0) > 0]),
            len(A.candidates) if A.candidates else 0, A.market_state,
            len(A.pending_orders) if hasattr(A, 'pending_orders') else 0))
        if hold:
            for code in list(hold.keys())[:3]:
                entry = A.positions.get(code, {}).get('entry_price', hold.get(code, {}).get('cost', 0))
                try:
                    tk = C.get_full_tick([code])
                    if tk and code in tk:
                        cur = float(tk[code].get('lastPrice', 0)); pnl = (cur - entry) / entry * 100 if entry > 0 else 0
                        wlog('[持仓] {} 现价:{:.2f} 成本:{:.2f} {:+.1f}%'.format(code, cur, entry, pnl))
                except: pass

    if A.market_state != 'weak': try_buy_candidates(C, hold, acash)
    else: wlog('[买入] 大盘弱势，暂不买入')


def stop(C):
    """策略结束"""
    wlog('=' * 60)
    wlog('  擒龙策略 v7.0 交易报告')
    wlog('=' * 60)
    try:
        acc = get_trade_detail_data(A.acct, A.acct_type, 'account')
        if acc: wlog('  总资产: {:,.2f} 可用: {:,.2f}'.format(acc[0].m_dBalance, acc[0].m_dAvailable))
    except: pass
    wlog('  交易次数: {} 胜: {} 负: {}'.format(A.trade_count, A.win_count, A.loss_count))
    hold = get_all_positions()
    if hold: wlog('  持仓: {}只'.format(len(hold)))
    wlog('=' * 60)


def get_all_positions():
    r = {}
    try:
        pl = get_trade_detail_data(A.acct, A.acct_type, 'position')
        if pl:
            for p in pl:
                if p.m_nVolume > 0: r[p.m_strInstrumentID + '.' + p.m_strExchangeID] = {'volume': p.m_nVolume, 'cost': p.m_dOpenPrice}
    except: pass
    return r</div>
      </div>
    </AbsoluteFill>
  );
};

// Slide 2: Summary
const SummarySlide2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 }
  });
  return (
    <AbsoluteFill style={{ background: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: 48, color: '#8b5cf6', marginBottom: 40 }}>总结</div>
              <div style={{
          fontSize: 24, color: '#ffffff', marginBottom: 16,
          opacity: interpolate(progress, [0.0, 0.3], [0, 1])
        }}>
          1. 擒龙选股
        </div>
    </AbsoluteFill>
  );
};


const TOTAL_FRAMES = 540;

const SlideSequence = () => (
  <>
      <Sequence from={0} durationInFrames={180}>
        <CoverSlide0 />
      </Sequence>
      <Sequence from={180} durationInFrames={180}>
        <ContentSlide1 />
      </Sequence>
      <Sequence from={360} durationInFrames={180}>
        <SummarySlide2 />
      </Sequence>
  </>
);

const RemotionRoot = () => {
  return (
    <Composition
      id="SlideSequence"
      component={SlideSequence}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
