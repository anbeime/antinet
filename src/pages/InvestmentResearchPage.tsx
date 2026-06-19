import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, BarChart3,
  FileText, Building2, Zap, Shield, ChevronRight, Search, Plus,
  X, Clock, Tag, ArrowRight, RefreshCw, Filter
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

type TabKey = 'overview' | 'companies' | 'reports' | 'opportunities' | 'risks' | 'notes';

// ============================================================
// 样式工具
// ============================================================
const cardTypeStyles: Record<string, { bg: string; border: string; text: string; iconBg: string; label: string }> = {
  blue:   { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    iconBg: 'bg-blue-100 text-blue-600',    label: '事实' },
  green:  { bg: 'bg-green-50',   border: 'border-green-200',   text: 'text-green-700',   iconBg: 'bg-green-100 text-green-600',  label: '解释' },
  yellow: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   iconBg: 'bg-amber-100 text-amber-600',  label: '风险' },
  red:    { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     iconBg: 'bg-red-100 text-red-600',      label: '行动' },
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

  // 选中报告详情
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);

  // ============================================================
  // 数据加载
  // ============================================================
  async function loadAll() {
    setLoading(true);
    try {
      const [dashResp, compResp, repResp, oppResp, riskResp, noteResp, secResp, rateResp] =
        await Promise.all([
          fetch(getApiBaseUrl() + '/api/investment-research/dashboard'),
          fetch(getApiBaseUrl() + '/api/investment-research/companies'),
          fetch(getApiBaseUrl() + '/api/investment-research/reports'),
          fetch(getApiBaseUrl() + '/api/investment-research/opportunities'),
          fetch(getApiBaseUrl() + '/api/investment-research/risk-warnings'),
          fetch(getApiBaseUrl() + '/api/investment-research/notes'),
          fetch(getApiBaseUrl() + '/api/investment-research/sectors'),
          fetch(getApiBaseUrl() + '/api/investment-research/ratings'),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            { key: 'companies' as TabKey, label: '公司覆盖', icon: <Building2 size={16} /> },
            { key: 'reports' as TabKey, label: '研究报告', icon: <FileText size={16} /> },
            { key: 'opportunities' as TabKey, label: '市场机会', icon: <Zap size={16} /> },
            { key: 'risks' as TabKey, label: '风险预警', icon: <Shield size={16} /> },
            { key: 'notes' as TabKey, label: '研究卡片', icon: <Tag size={16} /> },
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
        </div>

        {/* 报告详情 Modal */}
        {selectedReport && (
          <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} notes={notes} companies={companies} />
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
}: {
  companies: CompanyProfile[];
  sectors: string[];
  ratings: string[];
  keyword: string; sector: string; rating: string;
  onKeywordChange: (v: string) => void;
  onSectorChange: (v: string) => void;
  onRatingChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索公司名称 / 代码"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
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
  onKeywordChange, onCategoryChange, onSelect,
}: {
  reports: ResearchReport[];
  keyword: string; category: string;
  onKeywordChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onSelect: (r: ResearchReport) => void;
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
                <div className="flex items-center text-gray-400 text-sm gap-1 flex-shrink-0">
                  查看 <ChevronRight className="w-4 h-4" />
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
  report, notes, companies, onClose,
}: {
  report: ResearchReport;
  notes: ResearchNote[];
  companies: CompanyProfile[];
  onClose: () => void;
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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
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

export default InvestmentResearchPage;
