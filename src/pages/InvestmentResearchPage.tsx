import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, BarChart3,
  FileText, Building2, Zap, Shield, ChevronRight, Search, Plus,
  X, Clock, Tag, ArrowRight, RefreshCw, Filter, Star, Download,
  PieChart, Activity, Trash2, Eye, Wallet, Gauge, LineChart, CandlestickChart, Target
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { safeErrorDetail } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// 类型定义
// ============================================================
type DashboardSummary = {
  total_reports: number;
  total_companies: number;
  active_strategies: number;
  watchlist_items: number;
  opportunity_count: number;
  risk_warning_count: number;
  hot_sectors: { name: string; company_count: number; heat_score: number }[];
  recent_activities: { id: number; type: string; title: string; at: string }[];
};

type CompanyProfile = {
  code: string;
  name: string;
  sector: string;
  market_cap: string;
  current_price: number;
  change_pct: number;
  pe_ratio?: number | null;
  pb_ratio?: number | null;
  rating: string;
  target_price?: number | null;
  tags: string[];
  summary: string;
};

type ResearchReport = {
  id: number;
  title: string;
  author: string;
  published_at: string;
  category: string;
  company_codes: string[];
  tags: string[];
  summary: string;
  key_points: string[];
  risk_points: string[];
  investment_suggestion: string;
  status: string;
};

type MarketOpportunity = {
  id: number;
  title: string;
  sector: string;
  signal_type: string;
  score: number;
  reason: string;
  related_companies: string[];
  suggested_action: string;
  updated_at: string;
};

type RiskWarning = {
  id: number;
  level: string;
  title: string;
  description: string;
  affected_companies: string[];
  affected_sectors: string[];
  triggers: string[];
  first_noticed_at: string;
};

type ResearchNote = {
  id: number;
  title: string;
  content: string;
  card_type: string;
  tags: string[];
  related_company?: string | null;
  related_report_id?: number | null;
  created_at: string;
};

type TabKey = 'overview' | 'ai-brief' | 'technicals' | 'companies' | 'reports' | 'opportunities' | 'risks' | 'notes' | 'watchlist' | 'portfolio' | 'sectors' | 'sentiment';

type FinancialMetric = {
  period: string;
  revenue: number;
  revenue_yoy: number;
  net_profit: number;
  net_profit_yoy: number;
  gross_margin: number;
  net_margin: number;
  roe: number;
  debt_ratio: number;
};

type CompanyFinancials = {
  code: string;
  name: string;
  metrics: FinancialMetric[];
  valuation: Record<string, any>;
  dividend: Record<string, any>;
};

type WatchlistItem = {
  code: string;
  name: string;
  added_at: string;
  note?: string | null;
  alert_price?: number | null;
  current_price?: number | null;
  change_pct?: number | null;
  alert_triggered?: boolean;
};

type SectorComparison = {
  sector: string;
  company_count: number;
  avg_pe?: number | null;
  avg_pb?: number | null;
  avg_roe?: number | null;
  avg_change_pct: number;
  top_companies: { code: string; name: string; rating: string; market_cap: string }[];
  market_cap_total: string;
};

type PortfolioHolding = {
  code: string;
  name: string;
  shares: number;
  cost_price: number;
  current_price: number;
  market_value: number;
  profit_loss: number;
  profit_pct: number;
  weight: number;
};

type PortfolioSummary = {
  total_cost: number;
  total_market_value: number;
  total_profit_loss: number;
  total_profit_pct: number;
  holdings: PortfolioHolding[];
  allocation_by_sector: { sector: string; market_value: number; weight: number }[];
};

type MarketSentiment = {
  sentiment_score: number;
  level: string;
  market_breadth: { up: number; down: number; flat: number; up_ratio: number };
  avg_change_pct: number;
  hot_sectors: string[];
  risk_warnings_count: number;
  opportunities_count: number;
  updated_at: string;
};

type SearchResult = {
  type: string;
  id: string | number;
  title: string;
  subtitle: string;
  url: string;
  relevance: number;
};

type AIBriefCard = {
  card_type: string;  // blue 事实 / green 解释 / yellow 风险 / red 行动
  title: string;
  content: string;
  sources: string[];
};

type AIBrief = {
  query: string;
  title: string;
  summary: string;
  cards: AIBriefCard[];
  related_companies: string[];
  related_reports: number[];
  sentiment_hint: string;  // 偏多 / 偏空 / 中性
  generated_at: string;
};

type AIBriefSuggestion = {
  keyword: string;
  label: string;
};

// ============================================================
// 技术分析相关类型（参考 anbeime/skill 的 stock-analysis 与 finance-mcp）
// ============================================================
type KlineBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change_pct: number;
};

type TechnicalIndicators = {
  ma5: number[];
  ma10: number[];
  ma20: number[];
  ma60: number[];
  macd: { dif: number; dea: number; hist: number }[];
  rsi: number[];
  kdj: { k: number; d: number; j: number }[];
  boll: { upper: number; mid: number; lower: number }[];
};

type GapAnalysis = {
  direction: string;  // up / down
  date: string;
  gap_size: number;
  top: number;
  bottom: number;
  role: string;  // support / pressure
};

type SupportPressure = {
  supports: number[];
  pressures: number[];
  nearest_support: number | null;
  nearest_pressure: number | null;
};

type ThreeDayForecast = {
  trend: string;  // 上涨 / 下跌 / 震荡
  up_prob: number;
  down_prob: number;
  flat_prob: number;
  suggestion: string;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  reasoning: string;
};

type TechnicalAnalysis = {
  code: string;
  name: string;
  current_price: number;
  change_pct: number;
  klines: KlineBar[];
  indicators: TechnicalIndicators;
  gaps: GapAnalysis[];
  support_pressure: SupportPressure;
  forecast: ThreeDayForecast;
  trend_signal: string;
  indicator_summary: Record<string, string>;
};

// ============================================================
// 样式工具
// ============================================================
const cardTypeStyles: Record<string, { bg: string; border: string; text: string; iconBg: string; label: string }> = {
  blue:   { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    iconBg: 'bg-blue-100 text-blue-600',    label: '事实' },
  green:  { bg: 'bg-green-50',   border: 'border-green-200',   text: 'text-green-700',   iconBg: 'bg-green-100 text-green-600',  label: '解释' },
  yellow: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   iconBg: 'bg-amber-100 text-amber-600',  label: '风险' },
  red:    { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     iconBg: 'bg-red-100 text-red-600',      label: '行动' },
  purple: { bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-700', iconBg: 'bg-purple-100 text-purple-600', label: '预测' },
};

const riskLevelStyles: Record<string, { bg: string; border: string; text: string; label: string }> = {
  low:      { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    label: '低' },
  medium:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   label: '中' },
  high:     { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  label: '高' },
  critical: { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     label: '严重' },
};

function ratingColor(rating: string) {
  if (rating === '买入') return 'text-green-700 bg-green-100';
  if (rating === '增持') return 'text-blue-700 bg-blue-100';
  if (rating === '持有') return 'text-gray-700 bg-gray-100';
  if (rating === '中性') return 'text-gray-500 bg-gray-100';
  if (rating === '减持') return 'text-red-700 bg-red-100';
  return 'text-gray-700 bg-gray-100';
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso.replace(' ', 'T'));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

// ============================================================
// 主组件
// ============================================================
const InvestmentResearchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | 'unknown'>('unknown');

  // 数据
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [risks, setRisks] = useState<RiskWarning[]>([]);
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [ratings, setRatings] = useState<string[]>([]);

  // 新增数据
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [sectorComparison, setSectorComparison] = useState<SectorComparison[]>([]);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [companyFinancials, setCompanyFinancials] = useState<CompanyFinancials | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [newWatch, setNewWatch] = useState({ code: '', note: '', alert_price: '' });

  // AI 投研简报
  const [aiBrief, setAiBrief] = useState<AIBrief | null>(null);
  const [briefQuery, setBriefQuery] = useState('');
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [briefSuggestions, setBriefSuggestions] = useState<{
    company_examples: AIBriefSuggestion[];
    sector_examples: AIBriefSuggestion[];
    theme_examples: AIBriefSuggestion[];
  } | null>(null);

  // 技术分析
  const [technicalAnalysis, setTechnicalAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [technicalsLoading, setTechnicalsLoading] = useState(false);
  const [technicalsCode, setTechnicalsCode] = useState<string>('');

  // 筛选
  const [companyKeyword, setCompanyKeyword] = useState('');
  const [companySector, setCompanySector] = useState('');
  const [companyRating, setCompanyRating] = useState('');
  const [reportKeyword, setReportKeyword] = useState('');
  const [reportCategory, setReportCategory] = useState('');

  // 新建卡片
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', card_type: 'blue', tags: '', related_company: '' });
  const [creating, setCreating] = useState(false);

  // 选中报告详情 / 公司财务详情
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string | null>(null);

  // ============================================================
  // 数据加载
  // ============================================================
  async function loadAll() {
    setLoading(true);
    try {
      const [dashResp, compResp, repResp, oppResp, riskResp, noteResp, secResp, rateResp,
             watchResp, portResp, sectorResp, sentimentResp] =
        await Promise.all([
          fetch(getApiBaseUrl() + '/api/investment-research/dashboard'),
          fetch(getApiBaseUrl() + '/api/investment-research/companies'),
          fetch(getApiBaseUrl() + '/api/investment-research/reports'),
          fetch(getApiBaseUrl() + '/api/investment-research/opportunities'),
          fetch(getApiBaseUrl() + '/api/investment-research/risk-warnings'),
          fetch(getApiBaseUrl() + '/api/investment-research/notes'),
          fetch(getApiBaseUrl() + '/api/investment-research/sectors'),
          fetch(getApiBaseUrl() + '/api/investment-research/ratings'),
          fetch(getApiBaseUrl() + '/api/investment-research/watchlist'),
          fetch(getApiBaseUrl() + '/api/investment-research/portfolio'),
          fetch(getApiBaseUrl() + '/api/investment-research/sector-comparison'),
          fetch(getApiBaseUrl() + '/api/investment-research/market-sentiment'),
        ]);

      if (dashResp.ok && compResp.ok && repResp.ok) {
        setApiAvailable(true);
        setDashboard(await dashResp.json());
        setCompanies(await compResp.json());
        setReports(await repResp.json());
        if (oppResp.ok) setOpportunities(await oppResp.json());
        if (riskResp.ok) setRisks(await riskResp.json());
        if (noteResp.ok) setNotes(await noteResp.json());
        if (secResp.ok) setSectors(await secResp.json());
        if (rateResp.ok) setRatings(await rateResp.json());
        if (watchResp.ok) setWatchlist(await watchResp.json());
        if (portResp.ok) setPortfolio(await portResp.json());
        if (sectorResp.ok) setSectorComparison(await sectorResp.json());
        if (sentimentResp.ok) setSentiment(await sentimentResp.json());
      } else {
        setApiAvailable(false);
      }
    } catch (err) {
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // 加载 AI 简报关键词建议（不阻塞主流程）
    fetch(getApiBaseUrl() + '/api/investment-research/ai-brief/suggestions')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setBriefSuggestions(d); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // AI 投研简报生成
  // ============================================================
  async function handleGenerateBrief() {
    const q = briefQuery.trim();
    if (!q) {
      toast.error('请输入查询关键词');
      return;
    }
    setGeneratingBrief(true);
    try {
      const resp = await fetch(getApiBaseUrl() + '/api/investment-research/ai-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, depth: 'standard' }),
      });
      if (!resp.ok) {
        throw new Error('生成失败');
      }
      const data: AIBrief = await resp.json();
      setAiBrief(data);
      toast.success(`已生成「${q}」投研简报`);
    } catch (err) {
      toast.error('AI 简报生成失败：' + safeErrorDetail(err));
    } finally {
      setGeneratingBrief(false);
    }
  }

  // ============================================================
  // 技术分析加载（参考 anbeime/skill 的 stock-analysis 与 finance-mcp 能力）
  // ============================================================
  async function loadCompanyTechnicals(code: string, days: number = 60) {
    if (!code) return;
    setTechnicalsCode(code);
    setTechnicalsLoading(true);
    setTechnicalAnalysis(null);
    try {
      const resp = await fetch(getApiBaseUrl() + `/api/investment-research/companies/${code}/technicals?days=${days}`);
      if (!resp.ok) {
        throw new Error('加载失败');
      }
      const data: TechnicalAnalysis = await resp.json();
      setTechnicalAnalysis(data);
    } catch (err) {
      toast.error('技术分析加载失败：' + safeErrorDetail(err));
    } finally {
      setTechnicalsLoading(false);
    }
  }

  // ============================================================
  // 派生筛选结果
  // ============================================================
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (companySector && c.sector !== companySector) return false;
      if (companyRating && c.rating !== companyRating) return false;
      if (companyKeyword) {
        const kw = companyKeyword.toLowerCase();
        if (!c.name.toLowerCase().includes(kw) && !c.code.toLowerCase().includes(kw)) return false;
      }
      return true;
    });
  }, [companies, companyKeyword, companySector, companyRating]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (reportCategory && r.category !== reportCategory) return false;
      if (reportKeyword) {
        const kw = reportKeyword.toLowerCase();
        if (!r.title.toLowerCase().includes(kw) && !r.tags.some((t) => t.toLowerCase().includes(kw))) return false;
      }
      return true;
    });
  }, [reports, reportKeyword, reportCategory]);

  // ============================================================
  // 新建研究卡片
  // ============================================================
  async function handleCreateNote() {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    setCreating(true);
    try {
      const resp = await fetch(getApiBaseUrl() + '/api/investment-research/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNote.title.trim(),
          content: newNote.content.trim(),
          card_type: newNote.card_type,
          tags: newNote.tags ? newNote.tags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean) : [],
          related_company: newNote.related_company || null,
        }),
      });
      if (resp.ok) {
        const saved: ResearchNote = await resp.json();
        setNotes((prev) => [saved, ...prev]);
        toast.success('研究卡片已创建');
        setNewNote({ title: '', content: '', card_type: 'blue', tags: '', related_company: '' });
        setShowNewNote(false);
      } else {
        const err = await resp.json().catch(() => ({}));
        toast.error(safeErrorDetail(err.detail, '创建失败'));
      }
    } catch {
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  }

  // ============================================================
  // 自选股管理
  // ============================================================
  async function handleAddWatch() {
    if (!newWatch.code.trim()) {
      toast.error('请选择公司');
      return;
    }
    try {
      const resp = await fetch(getApiBaseUrl() + '/api/investment-research/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newWatch.code.trim(),
          note: newWatch.note || null,
          alert_price: newWatch.alert_price ? parseFloat(newWatch.alert_price) : null,
        }),
      });
      if (resp.ok) {
        const saved: WatchlistItem = await resp.json();
        setWatchlist((prev) => [...prev, { ...saved }]);
        toast.success('已添加到自选股');
        setNewWatch({ code: '', note: '', alert_price: '' });
        setShowAddWatch(false);
      } else {
        const err = await resp.json().catch(() => ({}));
        toast.error(safeErrorDetail(err.detail, '添加失败'));
      }
    } catch {
      toast.error('添加失败');
    }
  }

  async function handleRemoveWatch(code: string) {
    try {
      const resp = await fetch(getApiBaseUrl() + `/api/investment-research/watchlist/${code}`, { method: 'DELETE' });
      if (resp.ok) {
        setWatchlist((prev) => prev.filter((w) => w.code !== code));
        toast.success('已移除');
      }
    } catch {
      toast.error('移除失败');
    }
  }

  // ============================================================
  // 公司财务详情
  // ============================================================
  async function loadCompanyFinancials(code: string) {
    setSelectedCompanyCode(code);
    setCompanyFinancials(null);
    try {
      const resp = await fetch(getApiBaseUrl() + `/api/investment-research/companies/${code}/financials`);
      if (resp.ok) {
        setCompanyFinancials(await resp.json());
      }
    } catch {
      // ignore
    }
  }

  // ============================================================
  // 研报导出
  // ============================================================
  function handleExportReport(reportId: number) {
    window.open(getApiBaseUrl() + `/api/investment-research/reports/${reportId}/export?format=markdown`, '_blank');
  }

  // ============================================================
  // 全局搜索
  // ============================================================
  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const resp = await fetch(getApiBaseUrl() + `/api/investment-research/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (resp.ok) {
        const data = await resp.json();
        setSearchResults(data.results || []);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }

  // ============================================================
  // 渲染
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 顶部标题 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">投研工作台</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                行业分析 · 公司研究 · 策略研判 · 机会发掘 · 风险预警
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full ${
              apiAvailable === true
                ? 'bg-green-100 text-green-700'
                : apiAvailable === false
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {apiAvailable === true ? '后端已连接' : apiAvailable === false ? '后端不可用（请启动）' : '连接中...'}
            </span>
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
            >
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          {[
            { key: 'overview' as TabKey, label: '概览', icon: <Sparkles size={16} /> },
            { key: 'ai-brief' as TabKey, label: '✨ AI 简报', icon: <Sparkles size={16} /> },
            { key: 'technicals' as TabKey, label: '📈 技术分析', icon: <CandlestickChart size={16} /> },
            { key: 'companies' as TabKey, label: '公司覆盖', icon: <Building2 size={16} /> },
            { key: 'reports' as TabKey, label: '研究报告', icon: <FileText size={16} /> },
            { key: 'opportunities' as TabKey, label: '市场机会', icon: <Zap size={16} /> },
            { key: 'risks' as TabKey, label: '风险预警', icon: <Shield size={16} /> },
            { key: 'notes' as TabKey, label: '研究卡片', icon: <Tag size={16} /> },
            { key: 'watchlist' as TabKey, label: '自选股', icon: <Star size={16} /> },
            { key: 'portfolio' as TabKey, label: '投资组合', icon: <Wallet size={16} /> },
            { key: 'sectors' as TabKey, label: '行业对比', icon: <PieChart size={16} /> },
            { key: 'sentiment' as TabKey, label: '市场情绪', icon: <Gauge size={16} /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === t.key
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'overview' && <OverviewTab dashboard={dashboard} companies={companies} reports={reports} opportunities={opportunities} risks={risks} notes={notes} />}
          {activeTab === 'ai-brief' && (
            <AIBriefTab
              brief={aiBrief}
              query={briefQuery}
              setQuery={setBriefQuery}
              generating={generatingBrief}
              onGenerate={handleGenerateBrief}
              suggestions={briefSuggestions}
              companies={companies}
              onViewFinancials={loadCompanyFinancials}
            />
          )}
          {activeTab === 'technicals' && (
            <TechnicalsTab
              companies={companies}
              analysis={technicalAnalysis}
              loading={technicalsLoading}
              currentCode={technicalsCode}
              onLoad={loadCompanyTechnicals}
              onViewFinancials={loadCompanyFinancials}
            />
          )}
          {activeTab === 'companies' && (
            <CompaniesTab
              companies={filteredCompanies}
              sectors={sectors}
              ratings={ratings}
              keyword={companyKeyword}
              sector={companySector}
              rating={companyRating}
              onKeywordChange={setCompanyKeyword}
              onSectorChange={setCompanySector}
              onRatingChange={setCompanyRating}
              onViewFinancials={loadCompanyFinancials}
              onSelectStock={(code, name) => {
                setActiveTab('technicals');
                loadCompanyTechnicals(code, 60);
                toast.success(`已加载 ${name} 技术分析`);
              }}
            />
          )}
          {activeTab === 'reports' && (
            <ReportsTab
              reports={filteredReports}
              keyword={reportKeyword}
              category={reportCategory}
              onKeywordChange={setReportKeyword}
              onCategoryChange={setReportCategory}
              onSelect={setSelectedReport}
              onExport={handleExportReport}
            />
          )}
          {activeTab === 'opportunities' && <OpportunitiesTab opportunities={opportunities} companies={companies} />}
          {activeTab === 'risks' && <RisksTab risks={risks} companies={companies} />}
          {activeTab === 'notes' && (
            <NotesTab
              notes={notes}
              showNew={showNewNote}
              onToggleNew={() => setShowNewNote((v) => !v)}
              newNote={newNote}
              setNewNote={setNewNote}
              onCreate={handleCreateNote}
              creating={creating}
              companies={companies}
            />
          )}
          {activeTab === 'watchlist' && (
            <WatchlistTab
              watchlist={watchlist}
              companies={companies}
              showAdd={showAddWatch}
              onToggleAdd={() => setShowAddWatch((v) => !v)}
              newWatch={newWatch}
              setNewWatch={setNewWatch}
              onAdd={handleAddWatch}
              onRemove={handleRemoveWatch}
              onViewFinancials={loadCompanyFinancials}
            />
          )}
          {activeTab === 'portfolio' && <PortfolioTab portfolio={portfolio} onViewFinancials={loadCompanyFinancials} />}
          {activeTab === 'sectors' && <SectorsTab comparisons={sectorComparison} />}
          {activeTab === 'sentiment' && <SentimentTab sentiment={sentiment} />}
        </div>

        {/* 报告详情 Modal */}
        {selectedReport && (
          <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} notes={notes} companies={companies} onExport={handleExportReport} />
        )}

        {/* 公司财务详情 Modal */}
        {selectedCompanyCode && (
          <CompanyFinancialsModal code={selectedCompanyCode} financials={companyFinancials} companies={companies} onClose={() => setSelectedCompanyCode(null)} />
        )}

        {/* 全局搜索 Modal */}
        {showGlobalSearch && (
          <GlobalSearchModal
            query={searchQuery}
            setQuery={setSearchQuery}
            results={searchResults}
            searching={searching}
            onSearch={handleSearch}
            onClose={() => { setShowGlobalSearch(false); setSearchResults([]); setSearchQuery(''); }}
            onSelectResult={(r) => {
              // 关闭搜索框
              setShowGlobalSearch(false);
              setSearchResults([]);
              setSearchQuery('');
              // 公司 / 全市场股票 → 跳技术分析 Tab 并加载
              if (r.type === 'company' || r.type === 'stock_market') {
                setActiveTab('technicals');
                loadCompanyTechnicals(r.id, 60);
                toast.success(`已加载 ${r.title} 技术分析`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================
// 子组件：概览
// ============================================================
function OverviewTab({
  dashboard,
  companies,
  reports,
  opportunities,
  risks,
  notes,
}: {
  dashboard: DashboardSummary | null;
  companies: CompanyProfile[];
  reports: ResearchReport[];
  opportunities: MarketOpportunity[];
  risks: RiskWarning[];
  notes: ResearchNote[];
}) {
  const stats = [
    { label: '覆盖公司', value: dashboard?.total_companies ?? companies.length, icon: <Building2 className="w-5 h-5" />, color: 'from-indigo-500 to-blue-600' },
    { label: '研究报告', value: dashboard?.total_reports ?? reports.length, icon: <FileText className="w-5 h-5" />, color: 'from-emerald-500 to-teal-600' },
    { label: '市场机会', value: dashboard?.opportunity_count ?? opportunities.length, icon: <Zap className="w-5 h-5" />, color: 'from-amber-500 to-orange-600' },
    { label: '风险预警', value: dashboard?.risk_warning_count ?? risks.length, icon: <AlertTriangle className="w-5 h-5" />, color: 'from-rose-500 to-red-600' },
    { label: '研究卡片', value: notes.length, icon: <Tag className="w-5 h-5" />, color: 'from-violet-500 to-purple-600' },
    { label: '活跃策略', value: dashboard?.active_strategies ?? 0, icon: <BarChart3 className="w-5 h-5" />, color: 'from-cyan-500 to-sky-600' },
  ];

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
            <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md mb-3`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 热门行业 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">行业热度</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">基于覆盖公司数 + 研报数</span>
          </div>
          {dashboard?.hot_sectors?.length ? (
            <div className="space-y-3">
              {dashboard.hot_sectors.slice(0, 8).map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm text-gray-800 dark:text-gray-200 min-w-[7rem]">{s.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-blue-500"
                        style={{ width: `${Math.min(100, s.heat_score)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-3 w-16 text-right">
                    {s.heat_score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint text="暂无行业数据" />
          )}
        </div>

        {/* 最新活动 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">近期动态</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">时间线</span>
          </div>
          {dashboard?.recent_activities?.length ? (
            <div className="space-y-3">
              {dashboard.recent_activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 dark:text-gray-200">{a.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 inline-flex items-center gap-1">
                      <Clock size={12} /> {formatDateTime(a.at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint text="暂无动态" />
          )}
        </div>
      </div>

      {/* 最新研报 + 机会 + 风险摘要 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">最新研究报告</h2>
          {reports.length ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {reports.slice(0, 4).map((r) => (
                <div key={r.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {r.author} · {r.category} · {formatDateTime(r.published_at)}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {r.tags.slice(0, 4).map((t) => (
                        <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint text="暂无研报" />
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> 最新机会
            </h2>
            {opportunities.length ? (
              <div className="space-y-2">
                {opportunities.slice(0, 3).map((o) => (
                  <div key={o.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-amber-50/40 dark:bg-amber-900/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{o.title}</span>
                      <span className="text-xs font-bold text-amber-600 ml-2">{o.score}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{o.sector} · {o.signal_type}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint text="暂无机会" small />
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> 风险预警
            </h2>
            {risks.length ? (
              <div className="space-y-2">
                {risks.slice(0, 3).map((r) => {
                  const s = riskLevelStyles[r.level] || riskLevelStyles.medium;
                  return (
                    <div key={r.id} className={`p-3 rounded-xl border ${s.border} ${s.bg}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${s.text} truncate`}>{r.title}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${s.text} bg-white/60 dark:bg-gray-900/40 ml-2`}>{s.label}</span>
                      </div>
                      <div className={`text-xs mt-1 ${s.text} opacity-80 line-clamp-2`}>{r.description}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyHint text="暂无风险" small />
            )}
          </div>
        </div>
      </div>

      {/* 研究卡片 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">最新研究卡片</h2>
        <NoteGrid notes={notes.slice(0, 8)} />
      </div>
    </div>
  );
}

// ============================================================
// 子组件：公司覆盖
// ============================================================
function CompaniesTab({
  companies, sectors, ratings,
  keyword, sector, rating,
  onKeywordChange, onSectorChange, onRatingChange,
  onViewFinancials, onSelectStock,
}: {
  companies: CompanyProfile[];
  sectors: string[];
  ratings: string[];
  keyword: string; sector: string; rating: string;
  onKeywordChange: (v: string) => void;
  onSectorChange: (v: string) => void;
  onRatingChange: (v: string) => void;
  onViewFinancials: (code: string) => void;
  onSelectStock: (code: string, name: string) => void;
}) {
  // 全市场股票搜索（当演示公司未匹配时，搜索 A 股全市场）
  const [marketResults, setMarketResults] = useState<Array<{code: string; name: string; price: number; change_pct: number}>>([]);
  const [marketSearching, setMarketSearching] = useState(false);

  useEffect(() => {
    const kw = keyword.trim();
    if (!kw) { setMarketResults([]); return; }
    setMarketSearching(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`${getApiBaseUrl()}/api/investment-research/stocks/search?keyword=${encodeURIComponent(kw)}&limit=8`);
        if (resp.ok) {
          const data = await resp.json();
          setMarketResults(data.results || []);
        }
      } catch { /* 静默 */ } finally {
        setMarketSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索公司名称 / 代码（支持 A 股全市场）"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {marketSearching && (
            <RefreshCw className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          )}
          {/* 全市场搜索下拉 */}
          {keyword.trim() && marketResults.length > 0 && (
            <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-72 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] text-gray-400 border-b border-gray-100 dark:border-gray-700">全市场搜索结果（点击查看技术分析）</div>
              {marketResults.map((s) => (
                <button
                  key={s.code}
                  onClick={() => { onSelectStock(s.code, s.name); onKeywordChange(''); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-100">{s.name}</span>
                    <span className="text-xs text-gray-500">{s.code}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-300">{s.price.toFixed(2)}</span>
                    <span className={s.change_pct >= 0 ? 'text-red-600' : 'text-green-600'}>
                      {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={sector}
            onChange={(e) => onSectorChange(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">全部行业</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={rating}
            onChange={(e) => onRatingChange(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">全部评级</option>
            {ratings.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {companies.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {companies.map((c) => (
            <div key={c.code} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-gray-100">{c.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.code} · {c.sector}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ratingColor(c.rating)}`}>{c.rating}</span>
              </div>

              <div className="flex items-end gap-3 mt-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">当前价</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{c.current_price.toFixed(2)}</div>
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${c.change_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {c.change_pct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {(c.change_pct >= 0 ? '+' : '') + c.change_pct.toFixed(2)}%
                </div>
                {typeof c.target_price === 'number' && (
                  <div className="ml-auto text-right">
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">目标价</div>
                    <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{c.target_price.toFixed(2)}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {t}
                  </span>
                ))}
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">{c.summary}</p>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <span>市值：{c.market_cap}</span>
                <span>
                  PE: {c.pe_ratio ? c.pe_ratio.toFixed(1) : '-'} / PB: {c.pb_ratio ? c.pb_ratio.toFixed(2) : '-'}
                </span>
              </div>
              <button
                onClick={() => onViewFinancials(c.code)}
                className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium"
              >
                <Eye className="w-3.5 h-3.5" /> 查看财务详情
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 shadow-sm">
          <EmptyHint text="暂无匹配的公司" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// 子组件：研究报告
// ============================================================
function ReportsTab({
  reports, keyword, category,
  onKeywordChange, onCategoryChange, onSelect, onExport,
}: {
  reports: ResearchReport[];
  keyword: string; category: string;
  onKeywordChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onSelect: (r: ResearchReport) => void;
  onExport: (id: number) => void;
}) {
  const categories = useMemo(() => Array.from(new Set(reports.map((r) => r.category))), [reports]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索标题 / 标签"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">全部类别</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {reports.length ? (
        <div className="space-y-3">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold">
                      {r.category}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {r.status === 'published' ? '已发布' : '草稿'}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{formatDateTime(r.published_at)}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{r.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{r.summary}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {r.tags.map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        #{t}
                      </span>
                    ))}
                    {r.company_codes.map((c) => (
                      <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onExport(r.id); }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Download className="w-3.5 h-3.5" /> 导出
                  </button>
                  <div className="flex items-center text-gray-400 text-sm gap-1">
                    查看 <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 shadow-sm">
          <EmptyHint text="暂无匹配的研究报告" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// 报告详情 Modal
// ============================================================
function ReportDetailModal({
  report, notes, companies, onClose, onExport,
}: {
  report: ResearchReport;
  notes: ResearchNote[];
  companies: CompanyProfile[];
  onClose: () => void;
  onExport: (id: number) => void;
}) {
  const relatedNotes = notes.filter((n) => n.related_report_id === report.id);
  const relatedCompanies = companies.filter((c) => report.company_codes.includes(c.code));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full my-6 shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold">
                {report.category}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {report.author} · {formatDateTime(report.published_at)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{report.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport(report.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="w-3.5 h-3.5" /> 导出 Markdown
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">摘要</div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{report.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40">
              <div className="text-sm font-bold text-green-700 dark:text-green-300 mb-2">关键观点</div>
              <ul className="space-y-1.5">
                {report.key_points.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{p}</span>
                  </li>
                ))}
                {!report.key_points.length && <li className="text-xs text-gray-400">暂无</li>}
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40">
              <div className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-2">风险提示</div>
              <ul className="space-y-1.5">
                {report.risk_points.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>{p}</span>
                  </li>
                ))}
                {!report.risk_points.length && <li className="text-xs text-gray-400">暂无</li>}
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/40">
            <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-2">投资建议</div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{report.investment_suggestion}</p>
          </div>

          {report.company_codes.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">涉及公司</div>
              <div className="flex flex-wrap gap-2">
                {report.company_codes.map((c) => {
                  const prof = relatedCompanies.find((x) => x.code === c);
                  return (
                    <span key={c} className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                      {prof ? `${prof.name} (${c})` : c}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {relatedNotes.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">关联研究卡片</div>
              <NoteGrid notes={relatedNotes} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 子组件：市场机会
// ============================================================
function OpportunitiesTab({
  opportunities, companies,
}: {
  opportunities: MarketOpportunity[];
  companies: CompanyProfile[];
}) {
  if (!opportunities.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 shadow-sm">
        <EmptyHint text="暂无市场机会" />
      </div>
    );
  }

  const sorted = [...opportunities].sort((a, b) => b.score - a.score);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sorted.map((o) => (
        <div key={o.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="inline-flex p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{o.title}</h3>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{o.sector} · {o.signal_type}</div>
              </div>
            </div>
            <div className="flex flex-col items-end ml-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">信号强度</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{o.score}</div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 leading-relaxed">{o.reason}</p>

          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">相关公司</div>
            <div className="flex flex-wrap gap-1.5">
              {o.related_companies.map((c) => {
                const prof = companies.find((x) => x.code === c);
                return (
                  <span key={c} className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {prof ? prof.name : c}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">建议动作：{o.suggested_action}</span>
            <span className="text-xs text-gray-400">{formatDateTime(o.updated_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 子组件：风险预警
// ============================================================
function RisksTab({
  risks, companies,
}: {
  risks: RiskWarning[];
  companies: CompanyProfile[];
}) {
  if (!risks.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 shadow-sm">
        <EmptyHint text="暂无风险预警" />
      </div>
    );
  }

  const ordered = [...risks].sort((a, b) => {
    const levels: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return (levels[b.level] || 0) - (levels[a.level] || 0);
  });

  return (
    <div className="space-y-4">
      {ordered.map((r) => {
        const s = riskLevelStyles[r.level] || riskLevelStyles.medium;
        return (
          <div key={r.id} className={`rounded-2xl border ${s.border} bg-white dark:bg-gray-800 shadow-sm overflow-hidden`}>
            <div className={`${s.bg} px-5 py-3 border-b ${s.border} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${s.text}`} />
                <h3 className={`font-bold ${s.text}`}>{r.title}</h3>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-900 ${s.text} font-semibold`}>
                {s.label}
              </span>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 dark:text-gray-300">{r.description}</p>

              <div className="mt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">触发信号</div>
                <div className="flex flex-wrap gap-1.5">
                  {r.triggers.map((t) => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {r.affected_sectors.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">影响行业</div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.affected_sectors.map((s2) => (
                        <span key={s2} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {s2}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {r.affected_companies.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">影响公司</div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.affected_companies.map((c) => {
                        const prof = companies.find((x) => x.code === c);
                        return (
                          <span key={c} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {prof ? prof.name : c}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
                首次发现：{formatDateTime(r.first_noticed_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 子组件：研究卡片
// ============================================================
function NoteGrid({ notes }: { notes: ResearchNote[] }) {
  if (!notes.length) return <EmptyHint text="暂无研究卡片" small />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {notes.map((n) => {
        const s = cardTypeStyles[n.card_type] || cardTypeStyles.blue;
        return (
          <div key={n.id} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${s.iconBg}`}>
                {s.label}
              </span>
              <span className="text-[11px] text-gray-500">{formatDateTime(n.created_at)}</span>
            </div>
            <h4 className={`text-sm font-bold ${s.text} mb-1.5 line-clamp-2`}>{n.title}</h4>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-4 leading-relaxed">{n.content}</p>
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-white/60 dark:border-gray-700/50">
              {n.tags.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  #{t}
                </span>
              ))}
              {n.related_company && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {n.related_company}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotesTab({
  notes, showNew, onToggleNew, newNote, setNewNote, onCreate, creating, companies,
}: {
  notes: ResearchNote[];
  showNew: boolean;
  onToggleNew: () => void;
  newNote: { title: string; content: string; card_type: string; tags: string; related_company: string };
  setNewNote: React.Dispatch<React.SetStateAction<{ title: string; content: string; card_type: string; tags: string; related_company: string }>>;
  onCreate: () => void;
  creating: boolean;
  companies: CompanyProfile[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          共 {notes.length} 张研究卡片（蓝-事实 / 绿-解释 / 黄-风险 / 红-行动）
        </div>
        <button
          onClick={onToggleNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> 新建研究卡片
        </button>
      </div>

      {showNew && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">创建研究卡片</h3>
            <button onClick={onToggleNew} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            {(['blue', 'green', 'yellow', 'red'] as const).map((ct) => {
              const s = cardTypeStyles[ct];
              const selected = newNote.card_type === ct;
              return (
                <button
                  key={ct}
                  onClick={() => setNewNote((n) => ({ ...n, card_type: ct }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selected ? `${s.border} ${s.bg} shadow-sm` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-[11px] inline-block px-2 py-0.5 rounded-full font-semibold ${s.iconBg} mb-1.5`}>
                    {s.label}
                  </div>
                  <div className={`text-sm font-bold ${selected ? s.text : 'text-gray-800 dark:text-gray-200'}`}>
                    {ct === 'blue' ? '事实型卡片' : ct === 'green' ? '解释型卡片' : ct === 'yellow' ? '风险型卡片' : '行动型卡片'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="卡片标题（必填）"
              value={newNote.title}
              onChange={(e) => setNewNote((n) => ({ ...n, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <textarea
              rows={4}
              placeholder="卡片正文（必填）"
              value={newNote.content}
              onChange={(e) => setNewNote((n) => ({ ...n, content: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="标签（使用逗号分隔，例如 AI, 算力）"
                value={newNote.tags}
                onChange={(e) => setNewNote((n) => ({ ...n, tags: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <select
                value={newNote.related_company}
                onChange={(e) => setNewNote((n) => ({ ...n, related_company: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">关联公司（可选）</option>
                {companies.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end pt-2">
              <button
                onClick={onCreate}
                disabled={creating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm disabled:opacity-60"
              >
                {creating ? '保存中...' : '保存卡片'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <NoteGrid notes={notes} />
      </div>
    </div>
  );
}

// ============================================================
// 空状态
// ============================================================
function EmptyHint({ text, small }: { text: string; small?: boolean }) {
  return (
    <div className={`text-center ${small ? 'py-4' : 'py-8'}`}>
      <div className="inline-flex items-center justify-center text-gray-300 dark:text-gray-600 mb-2">
        <FileText className={small ? 'w-5 h-5' : 'w-8 h-8'} />
      </div>
      <div className={`${small ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>{text}</div>
    </div>
  );
}

// ============================================================
// 子组件：自选股
// ============================================================
function WatchlistTab({
  watchlist, companies, showAdd, onToggleAdd, newWatch, setNewWatch, onAdd, onRemove, onViewFinancials,
}: {
  watchlist: WatchlistItem[];
  companies: CompanyProfile[];
  showAdd: boolean;
  onToggleAdd: () => void;
  newWatch: { code: string; note: string; alert_price: string };
  setNewWatch: React.Dispatch<React.SetStateAction<{ code: string; note: string; alert_price: string }>>;
  onAdd: () => void;
  onRemove: (code: string) => void;
  onViewFinancials: (code: string) => void;
}) {
  // 全市场股票搜索（用于添加自选）
  const [watchSearch, setWatchSearch] = useState('');
  const [watchResults, setWatchResults] = useState<Array<{code: string; name: string; price: number; change_pct: number}>>([]);
  const [watchSearching, setWatchSearching] = useState(false);
  const [selectedName, setSelectedName] = useState('');

  useEffect(() => {
    const kw = watchSearch.trim();
    if (!kw) { setWatchResults([]); return; }
    setWatchSearching(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`${getApiBaseUrl()}/api/investment-research/stocks/search?keyword=${encodeURIComponent(kw)}&limit=8`);
        if (resp.ok) {
          const data = await resp.json();
          setWatchResults(data.results || []);
        }
      } catch { /* 静默 */ } finally {
        setWatchSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [watchSearch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500 dark:text-gray-400">共 {watchlist.length} 只自选股</div>
        <button onClick={onToggleAdd} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" /> 添加自选
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">添加自选股</h3>
            <button onClick={onToggleAdd} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            {/* 全市场股票搜索（替代原下拉选择） */}
            <div className="relative">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">股票（必填，支持 A 股全市场搜索）</label>
              {newWatch.code ? (
                <div className="flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20">
                  <span className="font-medium text-gray-800 dark:text-gray-100">{selectedName || newWatch.code} <span className="text-xs text-gray-500">{newWatch.code}</span></span>
                  <button onClick={() => { setNewWatch((n) => ({ ...n, code: '' })); setSelectedName(''); setWatchSearch(''); }} className="text-amber-600 hover:text-amber-700 text-xs">更换</button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={watchSearch}
                      onChange={(e) => setWatchSearch(e.target.value)}
                      placeholder="搜索股票名称或代码，如 招商银行 / 600036 / 300085"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {watchSearching && <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                  </div>
                  {watchSearch.trim() && watchResults.length > 0 && (
                    <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {watchResults.map((s) => (
                        <button
                          key={s.code}
                          onClick={() => { setNewWatch((n) => ({ ...n, code: s.code })); setSelectedName(s.name); setWatchSearch(''); setWatchResults([]); }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-amber-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-gray-100">{s.name}</span>
                            <span className="text-xs text-gray-500">{s.code}</span>
                          </span>
                          <span className="flex items-center gap-2 text-xs">
                            <span className="text-gray-600 dark:text-gray-300">{s.price.toFixed(2)}</span>
                            <span className={s.change_pct >= 0 ? 'text-red-600' : 'text-green-600'}>
                              {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <input type="text" placeholder="备注（可选）" value={newWatch.note}
              onChange={(e) => setNewWatch((n) => ({ ...n, note: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input type="number" step="0.01" placeholder="预警价（可选，低于此价提醒）" value={newWatch.alert_price}
              onChange={(e) => setNewWatch((n) => ({ ...n, alert_price: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="flex justify-end">
              <button onClick={onAdd} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium shadow-sm">添加</button>
            </div>
          </div>
        </div>
      )}

      {watchlist.length ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <th className="text-left px-5 py-3 font-medium">公司</th>
                <th className="text-right px-3 py-3 font-medium">现价</th>
                <th className="text-right px-3 py-3 font-medium">涨跌</th>
                <th className="text-right px-3 py-3 font-medium">预警价</th>
                <th className="text-left px-3 py-3 font-medium">备注</th>
                <th className="text-right px-5 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {watchlist.map((w) => (
                <tr key={w.code} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{w.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{w.code}</div>
                  </td>
                  <td className="text-right px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">{w.current_price?.toFixed(2) ?? '-'}</td>
                  <td className={`text-right px-3 py-3 font-semibold ${(w.change_pct ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(w.change_pct ?? 0) >= 0 ? '+' : ''}{(w.change_pct ?? 0).toFixed(2)}%
                  </td>
                  <td className="text-right px-3 py-3">
                    {w.alert_price ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${w.alert_triggered ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {w.alert_price.toFixed(2)} {w.alert_triggered ? '已触发' : ''}
                      </span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400">{w.note || '-'}</td>
                  <td className="text-right px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onViewFinancials(w.code)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="财务">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => onRemove(w.code)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" title="移除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 shadow-sm">
          <EmptyHint text="暂无自选股" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// 子组件：投资组合
// ============================================================
function PortfolioTab({ portfolio, onViewFinancials }: { portfolio: PortfolioSummary | null; onViewFinancials: (code: string) => void }) {
  if (!portfolio) return <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 shadow-sm"><EmptyHint text="暂无投资组合数据" /></div>;
  const plPositive = portfolio.total_profit_loss >= 0;

  return (
    <div className="space-y-6">
      {/* 总览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400">总成本</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{portfolio.total_cost.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400">总市值</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{portfolio.total_market_value.toLocaleString()}</div>
        </div>
        <div className={`border rounded-2xl p-5 shadow-sm ${plPositive ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40'}`}>
          <div className="text-xs text-gray-500 dark:text-gray-400">总盈亏</div>
          <div className={`text-xl font-bold mt-1 ${plPositive ? 'text-green-600' : 'text-red-600'}`}>
            {plPositive ? '+' : ''}{portfolio.total_profit_loss.toLocaleString()}
          </div>
        </div>
        <div className={`border rounded-2xl p-5 shadow-sm ${plPositive ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40'}`}>
          <div className="text-xs text-gray-500 dark:text-gray-400">收益率</div>
          <div className={`text-xl font-bold mt-1 ${plPositive ? 'text-green-600' : 'text-red-600'}`}>
            {plPositive ? '+' : ''}{portfolio.total_profit_pct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* 持仓列表 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">持仓明细</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              <th className="text-left px-5 py-3 font-medium">股票</th>
              <th className="text-right px-3 py-3 font-medium">持仓</th>
              <th className="text-right px-3 py-3 font-medium">成本价</th>
              <th className="text-right px-3 py-3 font-medium">现价</th>
              <th className="text-right px-3 py-3 font-medium">市值</th>
              <th className="text-right px-3 py-3 font-medium">盈亏</th>
              <th className="text-right px-3 py-3 font-medium">权重</th>
              <th className="text-right px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {portfolio.holdings.map((h) => {
              const plPos = h.profit_loss >= 0;
              return (
                <tr key={h.code} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{h.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{h.code}</div>
                  </td>
                  <td className="text-right px-3 py-3 text-gray-700 dark:text-gray-300">{h.shares}</td>
                  <td className="text-right px-3 py-3 text-gray-700 dark:text-gray-300">{h.cost_price.toFixed(2)}</td>
                  <td className="text-right px-3 py-3 text-gray-700 dark:text-gray-300">{h.current_price.toFixed(2)}</td>
                  <td className="text-right px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">{h.market_value.toLocaleString()}</td>
                  <td className={`text-right px-3 py-3 font-semibold ${plPos ? 'text-green-600' : 'text-red-600'}`}>
                    {plPos ? '+' : ''}{h.profit_loss.toLocaleString()} ({plPos ? '+' : ''}{h.profit_pct.toFixed(2)}%)
                  </td>
                  <td className="text-right px-3 py-3">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, h.weight)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-10">{h.weight.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="text-right px-5 py-3">
                    <button onClick={() => onViewFinancials(h.code)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="财务">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 行业配置 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">行业配置</h3>
        <div className="space-y-3">
          {portfolio.allocation_by_sector.map((a) => (
            <div key={a.sector} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm text-gray-800 dark:text-gray-200 min-w-[7rem]">{a.sector}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-blue-500" style={{ width: `${Math.min(100, a.weight)}%` }} />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-3 w-20 text-right">
                {a.weight.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 子组件：行业对比
// ============================================================
function SectorsTab({ comparisons }: { comparisons: SectorComparison[] }) {
  if (!comparisons.length) return <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 shadow-sm"><EmptyHint text="暂无行业对比数据" /></div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {comparisons.map((s) => (
        <div key={s.sector} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{s.sector}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.avg_change_pct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {s.avg_change_pct >= 0 ? '+' : ''}{s.avg_change_pct.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40">
              <div className="text-xs text-gray-500 dark:text-gray-400">平均 PE</div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.avg_pe?.toFixed(1) ?? '-'}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40">
              <div className="text-xs text-gray-500 dark:text-gray-400">平均 PB</div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.avg_pb?.toFixed(2) ?? '-'}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40">
              <div className="text-xs text-gray-500 dark:text-gray-400">平均 ROE</div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.avg_roe?.toFixed(1) ?? '-'}%</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">龙头公司（{s.company_count} 家）</div>
          <div className="space-y-1">
            {s.top_companies.map((c) => (
              <div key={c.code} className="flex items-center justify-between text-sm">
                <span className="text-gray-800 dark:text-gray-200">{c.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${ratingColor(c.rating)}`}>{c.rating}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 子组件：市场情绪
// ============================================================
function SentimentTab({ sentiment }: { sentiment: MarketSentiment | null }) {
  if (!sentiment) return <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 shadow-sm"><EmptyHint text="暂无市场情绪数据" /></div>;
  const score = sentiment.sentiment_score;
  const gaugeColor = score >= 70 ? 'from-green-400 to-emerald-600' : score >= 55 ? 'from-blue-400 to-indigo-600' : score >= 45 ? 'from-yellow-400 to-amber-500' : score >= 30 ? 'from-orange-400 to-red-500' : 'from-red-500 to-rose-700';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 情绪指数仪表盘 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm text-center">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">市场情绪指数</h3>
          <div className="relative inline-flex items-center justify-center w-40 h-40">
            <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-700" />
              <circle cx="80" cy="80" r="68" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 427} 427`} />
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={score >= 70 ? '#10b981' : score >= 55 ? '#3b82f6' : score >= 45 ? '#f59e0b' : '#ef4444'} />
                  <stop offset="100%" stopColor={score >= 70 ? '#059669' : score >= 55 ? '#6366f1' : score >= 45 ? '#d97706' : '#dc2626'} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{score.toFixed(1)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sentiment.level}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-xs text-gray-400">
            <span>恐惧</span><span>中性</span><span>贪婪</span>
          </div>
        </div>

        {/* 市场广度 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">市场广度</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">上涨</span>
              <span className="text-lg font-bold text-green-600">{sentiment.market_breadth.up}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">下跌</span>
              <span className="text-lg font-bold text-red-600">{sentiment.market_breadth.down}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">平盘</span>
              <span className="text-lg font-bold text-gray-500">{sentiment.market_breadth.flat}</span>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">上涨比例</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{sentiment.market_breadth.up_ratio.toFixed(1)}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${sentiment.market_breadth.up_ratio}%` }} />
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">平均涨跌</span>
                <span className={`text-lg font-bold ${sentiment.avg_change_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {sentiment.avg_change_pct >= 0 ? '+' : ''}{sentiment.avg_change_pct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 热门行业 & 信号 */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" /> 热门行业
            </h3>
            <div className="space-y-2">
              {sentiment.hot_sectors.map((s, i) => (
                <div key={s} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{i + 1}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{s}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> 信号概览
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40">
                <div className="text-xs text-amber-700 dark:text-amber-300">市场机会</div>
                <div className="text-2xl font-bold text-amber-600">{sentiment.opportunities_count}</div>
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40">
                <div className="text-xs text-red-700 dark:text-red-300">风险预警</div>
                <div className="text-2xl font-bold text-red-600">{sentiment.risk_warnings_count}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 子组件：公司财务详情 Modal
// ============================================================
function CompanyFinancialsModal({ code, financials, companies, onClose }: {
  code: string;
  financials: CompanyFinancials | null;
  companies: CompanyProfile[];
  onClose: () => void;
}) {
  const company = companies.find((c) => c.code === code);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full my-6 shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{company?.name || code} 财务详情</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{code} · {company?.sector}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {!financials ? (
            <div className="py-12 text-center"><div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" /><div className="text-sm text-gray-500">加载财务数据...</div></div>
          ) : (
            <div className="space-y-6">
              {/* 估值指标 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">估值指标</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(financials.valuation).map(([k, v]) => (
                    <div key={k} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">{k.replace(/_/g, ' ')}</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{typeof v === 'number' ? v.toFixed(2) : String(v)}</div>
                    </div>
                  ))}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">股息率</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{financials.dividend?.yield_pct?.toFixed(2) ?? '-'}%</div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">分红比率</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{financials.dividend?.payout_ratio?.toFixed(1) ?? '-'}%</div>
                  </div>
                </div>
              </div>

              {/* 财务趋势表格 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">季度财务趋势</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                        <th className="text-left py-2 px-2 font-medium">季度</th>
                        <th className="text-right py-2 px-2 font-medium">营收(亿)</th>
                        <th className="text-right py-2 px-2 font-medium">同比</th>
                        <th className="text-right py-2 px-2 font-medium">净利(亿)</th>
                        <th className="text-right py-2 px-2 font-medium">同比</th>
                        <th className="text-right py-2 px-2 font-medium">毛利率</th>
                        <th className="text-right py-2 px-2 font-medium">净利率</th>
                        <th className="text-right py-2 px-2 font-medium">ROE</th>
                        <th className="text-right py-2 px-2 font-medium">负债率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {financials.metrics.map((m) => (
                        <tr key={m.period} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">{m.period}</td>
                          <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{m.revenue.toFixed(1)}</td>
                          <td className={`text-right py-2 px-2 ${m.revenue_yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>{m.revenue_yoy >= 0 ? '+' : ''}{m.revenue_yoy.toFixed(1)}%</td>
                          <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{m.net_profit.toFixed(1)}</td>
                          <td className={`text-right py-2 px-2 ${m.net_profit_yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>{m.net_profit_yoy >= 0 ? '+' : ''}{m.net_profit_yoy.toFixed(1)}%</td>
                          <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{m.gross_margin.toFixed(1)}%</td>
                          <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{m.net_margin.toFixed(1)}%</td>
                          <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{m.roe.toFixed(1)}%</td>
                          <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">{m.debt_ratio.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 子组件：全局搜索 Modal
// ============================================================
function GlobalSearchModal({ query, setQuery, results, searching, onSearch, onClose, onSelectResult }: {
  query: string;
  setQuery: (v: string) => void;
  results: SearchResult[];
  searching: boolean;
  onSearch: () => void;
  onClose: () => void;
  onSelectResult: (r: SearchResult) => void;
}) {
  const typeStyles: Record<string, { bg: string; text: string; label: string }> = {
    company:      { bg: 'bg-blue-100 dark:bg-blue-900/40',       text: 'text-blue-700 dark:text-blue-300',       label: '公司' },
    stock_market: { bg: 'bg-purple-100 dark:bg-purple-900/40',   text: 'text-purple-700 dark:text-purple-300',   label: '全市场股票' },
    report:       { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', label: '研报' },
    opportunity:  { bg: 'bg-amber-100 dark:bg-amber-900/40',     text: 'text-amber-700 dark:text-amber-300',     label: '机会' },
    risk:         { bg: 'bg-red-100 dark:bg-red-900/40',         text: 'text-red-700 dark:text-red-300',         label: '风险' },
    note:         { bg: 'bg-violet-100 dark:bg-violet-900/40',   text: 'text-violet-700 dark:text-violet-300',   label: '卡片' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full mt-20 shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="搜索公司、研报、机会、风险、研究卡片..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
          />
          <button onClick={onSearch} disabled={searching} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-60">
            {searching ? '搜索中...' : '搜索'}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {results.map((r, i) => {
                const s = typeStyles[r.type] || typeStyles.company;
                return (
                  <div
                    key={`${r.type}-${r.id}-${i}`}
                    onClick={() => onSelectResult(r)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.title}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{r.subtitle}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : query.trim() && !searching ? (
            <div className="p-12 text-center">
              <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <div className="text-sm text-gray-500 dark:text-gray-400">未找到与 "{query}" 相关的结果</div>
            </div>
          ) : !query.trim() ? (
            <div className="p-12 text-center">
              <div className="text-sm text-gray-400">输入关键词搜索投研内容</div>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {['AI', '新能源', '茅台', '半导体', '白酒'].map((tag) => (
                  <button key={tag} onClick={() => { setQuery(tag); }} className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 子组件：AI 投研简报生成（核心创新点）
// ============================================================
function AIBriefTab({ brief, query, setQuery, generating, onGenerate, suggestions, companies, onViewFinancials }: {
  brief: AIBrief | null;
  query: string;
  setQuery: (v: string) => void;
  generating: boolean;
  onGenerate: () => void;
  suggestions: { company_examples: AIBriefSuggestion[]; sector_examples: AIBriefSuggestion[]; theme_examples: AIBriefSuggestion[] } | null;
  companies: CompanyProfile[];
  onViewFinancials: (code: string) => void;
}) {
  const sentimentStyle: Record<string, string> = {
    '偏多': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    '偏空': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
    '中性': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* 输入区 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">AI 投研简报生成</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">创新功能</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          输入公司名、股票代码、行业或主题关键词，AI 将自动检索全量投研数据，按「事实-解释-风险-行动」四色卡片体系生成结构化投研简报。
        </p>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !generating) onGenerate(); }}
            placeholder="例如：茅台、宁德时代、新能源、固态电池、国产算力..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-400"
            disabled={generating}
          />
          <button
            onClick={onGenerate}
            disabled={generating || !query.trim()}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium flex items-center gap-2 transition-colors"
          >
            {generating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                生成简报
              </>
            )}
          </button>
        </div>

        {/* 快捷关键词建议 */}
        {suggestions && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">公司：</span>
              {suggestions.company_examples.map((s) => (
                <button key={s.keyword} onClick={() => { setQuery(s.keyword); }} className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900 transition-colors">
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">行业：</span>
              {suggestions.sector_examples.map((s) => (
                <button key={s.keyword} onClick={() => { setQuery(s.keyword); }} className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900 transition-colors">
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">主题：</span>
              {suggestions.theme_examples.map((s) => (
                <button key={s.keyword} onClick={() => { setQuery(s.keyword); }} className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900 transition-colors">
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 生成结果 */}
      {brief ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
          {/* 简报头部 */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{brief.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{brief.summary}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sentimentStyle[brief.sentiment_hint] || sentimentStyle['中性']}`}>
                  情绪：{brief.sentiment_hint}
                </span>
                <span className="text-xs text-gray-400">{brief.generated_at.replace('T', ' ')}</span>
              </div>
            </div>
            {/* 关联实体 */}
            {(brief.related_companies.length > 0 || brief.related_reports.length > 0) && (
              <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-gray-500 dark:text-gray-400">关联：</span>
                {brief.related_companies.map((code) => {
                  const c = companies.find((x) => x.code === code);
                  return (
                    <button
                      key={code}
                      onClick={() => onViewFinancials(code)}
                      className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
                    >
                      {c ? c.name : code} ({code})
                    </button>
                  );
                })}
                {brief.related_reports.map((id) => (
                  <span key={id} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    研报 #{id}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 四色卡片 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {brief.cards.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-400">暂无卡片内容</div>
            ) : (
              brief.cards.map((card, idx) => {
                const style = cardTypeStyles[card.card_type] || cardTypeStyles['blue'];
                return (
                  <div key={idx} className={`rounded-xl border-2 ${style.border} ${style.bg} dark:bg-opacity-20 p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${style.iconBg}`}>{style.label}</span>
                      <h4 className={`text-sm font-semibold ${style.text}`}>{card.title}</h4>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                      {card.content}
                    </div>
                    {card.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-gray-400">来源：</span>
                        {card.sources.map((s, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 简报底部说明 */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Sparkles size={12} />
              本简报由 AI 基于投研工作台全量数据智能检索与结构化生成，事实/解释/风险/行动/预测五色卡片体系便于快速决策。
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center shadow-sm">
          <Sparkles size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">输入关键词并点击「生成简报」，AI 将为你输出结构化投研简报</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 子组件：技术分析（参考 anbeime/skill 的 stock-analysis 与 finance-mcp 能力）
// K 线 + 5 大指标 + 缺口 + 支撑压力 + 3 天预测
// ============================================================
function TechnicalsTab({
  companies,
  analysis,
  loading,
  currentCode,
  onLoad,
  onViewFinancials,
}: {
  companies: CompanyProfile[];
  analysis: TechnicalAnalysis | null;
  loading: boolean;
  currentCode: string;
  onLoad: (code: string, days?: number) => void;
  onViewFinancials: (code: string) => void;
}) {
  // K 线图 SVG 尺寸
  const W = 760, H = 320, PAD = 32;
  const bars = analysis?.klines || [];
  const hasData = bars.length > 0;

  // 全市场股票搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{code: string; name: string; price: number; change_pct: number}>>([]);
  const [searching, setSearching] = useState(false);

  // 搜索全市场股票（防抖）
  useEffect(() => {
    const kw = searchKeyword.trim();
    if (!kw || kw.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`${getApiBaseUrl()}/api/investment-research/stocks/search?keyword=${encodeURIComponent(kw)}&limit=8`);
        if (resp.ok) {
          const data = await resp.json();
          setSearchResults(data.results || []);
        }
      } catch (e) {
        // 静默失败
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 计算 K 线图坐标范围
  const allHighs = bars.map((b) => b.high);
  const allLows = bars.map((b) => b.low);
  const maxPrice = hasData ? Math.max(...allHighs) * 1.02 : 100;
  const minPrice = hasData ? Math.min(...allLows) * 0.98 : 0;
  const priceRange = maxPrice - minPrice || 1;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;
  const barW = hasData ? Math.max(2, chartW / bars.length - 1) : 0;
  const xOf = (i: number) => PAD + i * (chartW / Math.max(bars.length, 1)) + barW / 2;
  const yOf = (p: number) => PAD + (maxPrice - p) / priceRange * chartH;

  // 均线点位（用 SVG path 连线）
  const maPath = (ma: number[]) => {
    if (!ma.length) return '';
    return ma
      .map((v, i) => (v > 0 ? `${i === 0 || ma[i - 1] === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(v)}` : ''))
      .filter(Boolean)
      .join(' ');
  };

  const maLineStyles: Record<string, { color: string; label: string }> = {
    ma5:  { color: '#f59e0b', label: 'MA5' },
    ma10: { color: '#3b82f6', label: 'MA10' },
    ma20: { color: '#a855f7', label: 'MA20' },
    ma60: { color: '#10b981', label: 'MA60' },
  };

  const trendBadgeStyle: Record<string, string> = {
    '多头排列': 'bg-green-100 text-green-700',
    '空头排列': 'bg-red-100 text-red-700',
    '均线缠绕': 'bg-gray-100 text-gray-700',
    '震荡': 'bg-amber-100 text-amber-700',
  };

  const forecastStyle: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    '上涨': { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: <TrendingUp className="w-5 h-5" /> },
    '下跌': { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: <TrendingDown className="w-5 h-5" /> },
    '震荡': { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', icon: <Activity className="w-5 h-5" /> },
  };

  return (
    <div className="space-y-6">
      {/* 顶部公司选择器 */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-purple-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CandlestickChart size={20} className="text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">技术分析工作台</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200">参考 finance-mcp + stock-analysis</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          选择公司查看完整技术分析：K 线 + MA/MACD/RSI/KDJ/BOLL 五大指标 + 缺口识别 + 支撑压力位 + 3 天走势预测。
          <span className="ml-2 text-purple-600 dark:text-purple-400 font-medium">支持 A 股全市场搜索（5500+ 只）</span>
        </p>

        {/* 全市场股票搜索框 */}
        <div className="mb-4 relative">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索任意 A 股股票（名称或代码，如 招商银行 / 600036）..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
            {searching && (
              <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-72 overflow-y-auto">
              {searchResults.map((s) => (
                <button
                  key={s.code}
                  onClick={() => {
                    onLoad(s.code, 60);
                    setSearchKeyword('');
                    setSearchResults([]);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-100">{s.name}</span>
                    <span className="text-xs text-gray-500">{s.code}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-300">{s.price.toFixed(2)}</span>
                    <span className={s.change_pct >= 0 ? 'text-red-600' : 'text-green-600'}>
                      {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {searchKeyword.trim() && !searching && searchResults.length === 0 && (
            <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
              未找到匹配的股票，请检查代码或名称（仅支持沪深 A 股，不含北交所/ST）
            </div>
          )}
        </div>

        {/* 演示股票快捷选择 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">演示股票快捷选择：</div>
        <div className="flex flex-wrap gap-2">
          {companies.map((c) => (
            <button
              key={c.code}
              onClick={() => onLoad(c.code, 60)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                currentCode === c.code
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-purple-50 hover:border-purple-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {!analysis && !loading && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center shadow-sm">
          <CandlestickChart size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">选择上方任意公司，查看完整技术分析报告</p>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center shadow-sm">
          <RefreshCw size={32} className="mx-auto text-purple-500 animate-spin mb-3" />
          <p className="text-gray-500 dark:text-gray-400">正在生成 K 线与技术指标...</p>
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* 价格头部 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <CandlestickChart className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{analysis.name}</h2>
                    <span className="text-xs text-gray-500">{analysis.code}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    现价 <span className="font-semibold text-gray-900 dark:text-gray-100">{analysis.current_price}</span>
                    <span className={`ml-2 ${analysis.change_pct >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {analysis.change_pct >= 0 ? '+' : ''}{analysis.change_pct}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${trendBadgeStyle[analysis.trend_signal] || trendBadgeStyle['震荡']}`}>
                  {analysis.trend_signal}
                </span>
                <button
                  onClick={() => onViewFinancials(analysis.code)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  查看财务
                </button>
              </div>
            </div>
          </div>

          {/* K 线图 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">K 线 + 均线</h3>
              <div className="flex items-center gap-3 text-xs">
                {Object.values(maLineStyles).map((s) => (
                  <span key={s.label} className="inline-flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5" style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <svg width={W} height={H} className="block">
                {/* 背景网格 */}
                {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                  <line key={r} x1={PAD} y1={PAD + chartH * r} x2={W - PAD} y2={PAD + chartH * r}
                    stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="1" />
                ))}
                {/* Y 轴价格刻度 */}
                {[0, 0.25, 0.5, 0.75, 1].map((r) => {
                  const p = maxPrice - priceRange * r;
                  return (
                    <text key={r} x={W - PAD + 4} y={PAD + chartH * r + 3}
                      className="fill-gray-400" fontSize="9">{p.toFixed(1)}</text>
                  );
                })}
                {/* K 线柱体 */}
                {bars.map((b, i) => {
                  const x = xOf(i) - barW / 2;
                  const yOpen = yOf(b.open);
                  const yClose = yOf(b.close);
                  const isUp = b.close >= b.open;
                  const color = isUp ? '#ef4444' : '#10b981';  // A股红涨绿跌
                  const bodyTop = Math.min(yOpen, yClose);
                  const bodyH = Math.max(1, Math.abs(yClose - yOpen));
                  return (
                    <g key={i}>
                      <line x1={xOf(i)} y1={yOf(b.high)} x2={xOf(i)} y2={yOf(b.low)} stroke={color} strokeWidth="1" />
                      <rect x={x} y={bodyTop} width={barW} height={bodyH} fill={color} opacity={isUp ? 0.9 : 0.7} />
                    </g>
                  );
                })}
                {/* 均线 */}
                <path d={maPath(analysis.indicators.ma5)} stroke={maLineStyles.ma5.color} strokeWidth="1.2" fill="none" />
                <path d={maPath(analysis.indicators.ma10)} stroke={maLineStyles.ma10.color} strokeWidth="1.2" fill="none" />
                <path d={maPath(analysis.indicators.ma20)} stroke={maLineStyles.ma20.color} strokeWidth="1.2" fill="none" />
                <path d={maPath(analysis.indicators.ma60)} stroke={maLineStyles.ma60.color} strokeWidth="1.2" fill="none" />
                {/* X 轴日期 */}
                {bars.length > 0 && [0, Math.floor(bars.length / 4), Math.floor(bars.length / 2), Math.floor(bars.length * 3 / 4), bars.length - 1].map((i, k) => (
                  <text key={k} x={xOf(i)} y={H - 8} textAnchor="middle" className="fill-gray-400" fontSize="9">
                    {bars[i].date.slice(5)}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* 指标摘要 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analysis.indicator_summary).map(([k, v]) => (
              <div key={k} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  <Activity size={12} />
                  {k}
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-200">{v}</div>
              </div>
            ))}
          </div>

          {/* 支撑压力位 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">支撑位 / 压力位</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">压力位（由近及远）</div>
                  <div className="flex gap-2 flex-wrap">
                    {analysis.support_pressure.pressures.length ? analysis.support_pressure.pressures.map((p, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs">
                        {p.toFixed(2)}
                      </span>
                    )) : <span className="text-xs text-gray-400">暂无</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">支撑位（由近及远）</div>
                  <div className="flex gap-2 flex-wrap">
                    {analysis.support_pressure.supports.length ? analysis.support_pressure.supports.map((p, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                        {p.toFixed(2)}
                      </span>
                    )) : <span className="text-xs text-gray-400">暂无</span>}
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  最近支撑：<span className="font-semibold text-gray-800 dark:text-gray-200">{analysis.support_pressure.nearest_support ?? '—'}</span>
                  ｜最近压力：<span className="font-semibold text-gray-800 dark:text-gray-200">{analysis.support_pressure.nearest_pressure ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* 缺口分析 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <LineChart className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">缺口识别</h3>
              </div>
              {analysis.gaps.length ? (
                <div className="space-y-2">
                  {analysis.gaps.map((g, i) => (
                    <div key={i} className={`p-2.5 rounded-lg border text-xs ${g.direction === 'up' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-green-200 bg-green-50 dark:bg-green-900/20'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {g.direction === 'up' ? '⬆️ 向上缺口' : '⬇️ 向下缺口'} {g.date}
                        </span>
                        <span className="text-gray-500">大小 {g.gap_size.toFixed(2)}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        区间 {g.bottom.toFixed(2)} → {g.top.toFixed(2)}，作用：<span className="font-medium">{g.role === 'support' ? '支撑' : '压力'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-6">近期无明显缺口</div>
              )}
            </div>
          </div>

          {/* 3 天走势预测 */}
          {(() => {
            const f = analysis.forecast;
            const s = forecastStyle[f.trend] || forecastStyle['震荡'];
            return (
              <div className={`rounded-2xl border-2 p-6 shadow-sm ${s.bg} dark:bg-opacity-20`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`${s.text}`}>{s.icon}</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">3 天走势预测</h3>
                  </div>
                  <span className={`text-sm font-medium ${s.text}`}>建议：{f.suggestion}</span>
                </div>

                {/* 概率条 */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">上涨概率</div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${f.up_prob * 100}%` }} />
                    </div>
                    <div className="text-sm font-semibold text-green-700 dark:text-green-300 mt-1">{(f.up_prob * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">震荡概率</div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-400" style={{ width: `${f.flat_prob * 100}%` }} />
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">{(f.flat_prob * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">下跌概率</div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${f.down_prob * 100}%` }} />
                    </div>
                    <div className="text-sm font-semibold text-red-700 dark:text-red-300 mt-1">{(f.down_prob * 100).toFixed(0)}%</div>
                  </div>
                </div>

                {/* 操作建议 */}
                <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-gray-900/40">
                    <div className="text-xs text-gray-500 dark:text-gray-400">建议入场</div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{f.entry_price ?? '—'}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-gray-900/40">
                    <div className="text-xs text-gray-500 dark:text-gray-400">止损位</div>
                    <div className="text-sm font-semibold text-red-700 dark:text-red-300">{f.stop_loss ?? '—'}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-gray-900/40">
                    <div className="text-xs text-gray-500 dark:text-gray-400">止盈位</div>
                    <div className="text-sm font-semibold text-green-700 dark:text-green-300">{f.take_profit ?? '—'}</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {f.reasoning}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  ⚠️ 本预测基于技术指标与评级综合判断，仅供参考，不构成投资建议。
                </div>
              </div>
            );
          })()}

          {/* 数据来源说明 */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400">
            📊 数据来源：本技术分析模块参考 <a href="https://github.com/anbeime/skill" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">anbeime/skill</a> 仓库
            中的 stock-analysis 与 finance-mcp（finance-skills）技能实现思路，使用确定性模拟数据生成 K 线与技术指标，无需外部 API Token 即可演示完整投研体验。
          </div>
        </>
      )}
    </div>
  );
}

export default InvestmentResearchPage;
