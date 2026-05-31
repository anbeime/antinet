import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Upload, Download, X, CheckCircle, XCircle,
  RefreshCw, Filter, Building2, DollarSign, AlertTriangle,
  Loader, ChevronDown, ChevronUp, Trash2, FileSpreadsheet,
  Clock, Tag, ShieldAlert,
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/apiConfig';

interface Invoice {
  id: number;
  filename: string;
  invoice_number: string | null;
  invoice_code: string | null;
  invoice_date: string | null;
  seller_name: string | null;
  seller_tax_id: string | null;
  buyer_name: string | null;
  buyer_tax_id: string | null;
  total_amount: number | null;
  amount: number | null;
  tax_amount: number | null;
  is_excluded: boolean;
  status: string;
  engine_used: string | null;
  created_at: string;
}

interface InvoiceItem {
  id: number;
  invoice_id: number;
  name: string;
  specification: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
}

interface Stats {
  total: number;
  active: number;
  excluded: number;
  failed: number;
  pdf_extracted: number;
  vision_ocr: number;
  total_amount: number;
}

const api = (path: string) => getApiBaseUrl() + path;

const InvoiceManager: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // filters
  const [sellerFilter, setSellerFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // upload
  const [uploading, setUploading] = useState(false);
  const [scanResults, setScanResults] = useState<any[]>([]);

  // exporting
  const [exporting, setExporting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sellerFilter) params.set('seller', sellerFilter);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);
      params.set('limit', '200');
      const res = await fetch(api(`/api/invoice/list?${params}`));
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setTotal(data.count || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [sellerFilter, fromDate, toDate]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(api('/api/invoice/stats'));
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, []);

  const handleScan = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setScanResults([]);
    try {
      const formData = new FormData();
      for (const f of files) formData.append('files', f);
      const res = await fetch(api('/api/invoice/scan'), { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setScanResults(data.results || []);
        await fetchInvoices();
        await fetchStats();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDetail = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const res = await fetch(api(`/api/invoice/detail/${inv.id}`));
      if (res.ok) {
        const data = await res.json();
        setInvoiceItems(data.items || []);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleExclude = async (inv: Invoice) => {
    const endpoint = inv.is_excluded ? 'include' : 'exclude';
    const res = await fetch(api(`/api/invoice/${endpoint}/${inv.id}`), { method: 'POST' });
    if (res.ok) {
      await fetchInvoices();
      await fetchStats();
      if (selectedInvoice?.id === inv.id) {
        setSelectedInvoice({ ...inv, is_excluded: !inv.is_excluded });
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此发票记录？')) return;
    const res = await fetch(api(`/api/invoice/delete/${id}`), { method: 'DELETE' });
    if (res.ok) {
      if (selectedInvoice?.id === id) setShowDetail(false);
      await fetchInvoices();
      await fetchStats();
    }
  };

  const handleExport = async (advanced = false) => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const ep = advanced ? '/api/invoice/export-advanced' : '/api/invoice/export';
      const res = await fetch(api(`${ep}?${params}`));
      if (res.ok) {
        const data = await res.json();
        const link = document.createElement('a');
        link.href = api(data.download_url);
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-blue-500 mb-1">
              <FileText className="w-4 h-4" /><span className="text-xs font-medium">全部发票</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-400">PDF: {stats.pdf_extracted} | 视觉: {stats.vision_ocr}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-green-500 mb-1">
              <CheckCircle className="w-4 h-4" /><span className="text-xs font-medium">可报销</span>
            </div>
            <p className="text-2xl font-bold">{stats.active}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-red-500 mb-1">
              <XCircle className="w-4 h-4" /><span className="text-xs font-medium">不报销</span>
            </div>
            <p className="text-2xl font-bold">{stats.excluded}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-yellow-500 mb-1">
              <DollarSign className="w-4 h-4" /><span className="text-xs font-medium">合计金额</span>
            </div>
            <p className="text-2xl font-bold text-green-600">¥{Number(stats.total_amount).toFixed(2)}</p>
            {stats.failed > 0 && <p className="text-xs text-red-400">({stats.failed} 条失败)</p>}
          </div>
        </div>
      )}

      {/* Upload & Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" /><span>{uploading ? '扫描中...' : '扫描发票'}</span>
            <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden"
              onChange={e => handleScan(e.target.files)} disabled={uploading} />
          </label>
          {uploading && <Loader className="w-5 h-5 animate-spin text-blue-500" />}
          <button onClick={() => handleExport(false)} disabled={exporting}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            <Download className="w-4 h-4" /><span>导出 xlsx</span>
          </button>
          <button onClick={() => handleExport(true)} disabled={exporting}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /><span>高级导出(公式)</span>
          </button>
          <button onClick={() => { fetchInvoices(); fetchStats(); }}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            <RefreshCw className="w-4 h-4" /><span>刷新</span>
          </button>
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            <Filter className="w-4 h-4" /><span>筛选</span>
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">销售方</label>
              <input value={sellerFilter} onChange={e => setSellerFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" placeholder="搜索商家名称..." />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">起始日期</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">截止日期</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            </div>
          </div>
        )}

        {/* Scan Results */}
        {scanResults.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm font-medium mb-2">扫描结果 ({scanResults.length})</p>
            <div className="space-y-1">
              {scanResults.map((r, i) => (
                <div key={i} className="text-xs flex items-center space-x-2">
                  {r.status === 'processed' ? <CheckCircle className="w-3 h-3 text-green-500" /> :
                   <XCircle className="w-3 h-3 text-red-500" />}
                  <span>{r.filename}</span>
                  <span className="text-gray-400">→ {r.engine_used || '失败'}</span>
                  {r.invoice_id && <span className="text-green-500">ID:{r.invoice_id}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold flex items-center">
            <FileText className="w-4 h-4 mr-2 text-blue-500" />
            发票列表
            <span className="ml-2 text-xs text-gray-400">({total} 条)</span>
          </h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <FileText className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">暂无发票数据，点击"扫描发票"上传</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">发票号码</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">开票日期</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">销售方</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">价税合计</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">引擎</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">状态</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => handleDetail(inv)}>
                    <td className="px-3 py-2 text-xs text-gray-400">{inv.id}</td>
                    <td className="px-3 py-2 font-mono text-xs">{inv.invoice_number || '-'}</td>
                    <td className="px-3 py-2 text-xs">{inv.invoice_date || '-'}</td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate">{inv.seller_name || '-'}</td>
                    <td className="px-3 py-2 text-xs text-right font-mono">
                      {inv.total_amount != null ? `¥${Number(inv.total_amount).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        inv.engine_used === 'pdfplumber' ? 'bg-blue-100 text-blue-700' :
                        inv.engine_used === 'qwen2.5vl' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {inv.engine_used === 'pdfplumber' ? 'PDF提取' :
                         inv.engine_used === 'qwen2.5vl' ? '视觉OCR' : inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {inv.status === 'failed' ? (
                        <ShieldAlert className="w-4 h-4 text-red-500 mx-auto" aria-label="识别失败" />
                      ) : inv.is_excluded ? (
                        <XCircle className="w-4 h-4 text-red-400 mx-auto" aria-label="不报销" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" aria-label="可报销" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center space-x-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleToggleExclude(inv)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          title={inv.is_excluded ? '恢复报销' : '标记不报销'}>
                          {inv.is_excluded ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> :
                           <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        </button>
                        <button onClick={() => handleDelete(inv.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-red-400"
                          title="删除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {showDetail && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDetail(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4"
            onClick={e => e.stopPropagation()}>
            
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-500" />
                发票详情 #{selectedInvoice.id}
              </h2>
              <button onClick={() => setShowDetail(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="flex justify-center py-8"><Loader className="w-6 h-6 animate-spin" /></div>
              ) : (
                <>
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-400">发票号码</p>
                      <p className="font-mono text-sm font-medium">{selectedInvoice.invoice_number || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-400">发票代码</p>
                      <p className="font-mono text-sm">{selectedInvoice.invoice_code || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-400">开票日期</p>
                      <p className="text-sm">{selectedInvoice.invoice_date || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-400">识别引擎</p>
                      <p className="text-sm">{selectedInvoice.engine_used === 'pdfplumber' ? 'PDF文本提取' :
                        selectedInvoice.engine_used === 'qwen2.5vl' ? 'Qwen2.5-VL 视觉OCR' : '-'}</p>
                    </div>
                  </div>

                  {/* Seller / Buyer */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-blue-500 mb-1 flex items-center"><Building2 className="w-3 h-3 mr-1" />销售方</p>
                      <p className="font-medium text-sm">{selectedInvoice.seller_name || '-'}</p>
                      <p className="text-xs text-gray-400 mt-1">税号: {selectedInvoice.seller_tax_id || '-'}</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                      <p className="text-xs text-green-500 mb-1 flex items-center"><Building2 className="w-3 h-3 mr-1" />购买方</p>
                      <p className="font-medium text-sm">{selectedInvoice.buyer_name || '-'}</p>
                      <p className="text-xs text-gray-400 mt-1">税号: {selectedInvoice.buyer_tax_id || '-'}</p>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                      <p className="text-xs text-gray-400">金额</p>
                      <p className="text-lg font-bold font-mono text-blue-600">
                        {selectedInvoice.amount != null ? `¥${Number(selectedInvoice.amount).toFixed(2)}` : '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                      <p className="text-xs text-gray-400">税额</p>
                      <p className="text-lg font-bold font-mono text-red-500">
                        {selectedInvoice.tax_amount != null ? `¥${Number(selectedInvoice.tax_amount).toFixed(2)}` : '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                      <p className="text-xs text-gray-400">价税合计</p>
                      <p className="text-lg font-bold font-mono text-green-600">
                        {selectedInvoice.total_amount != null ? `¥${Number(selectedInvoice.total_amount).toFixed(2)}` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Invoice Items */}
                  {invoiceItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center">
                        <Tag className="w-4 h-4 mr-1 text-gray-400" />
                        发票明细 ({invoiceItems.length})
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700">
                              <th className="px-2 py-1 text-left">名称</th>
                              <th className="px-2 py-1 text-left">规格</th>
                              <th className="px-2 py-1 text-right">数量</th>
                              <th className="px-2 py-1 text-right">单价</th>
                              <th className="px-2 py-1 text-right">金额</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {invoiceItems.map(item => (
                              <tr key={item.id}>
                                <td className="px-2 py-1">{item.name || '-'}</td>
                                <td className="px-2 py-1 text-gray-400">{item.specification || '-'}</td>
                                <td className="px-2 py-1 text-right">{item.quantity ?? '-'}</td>
                                <td className="px-2 py-1 text-right">{item.unit_price != null ? Number(item.unit_price).toFixed(2) : '-'}</td>
                                <td className="px-2 py-1 text-right">{item.amount != null ? Number(item.amount).toFixed(2) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">状态:</span>
                      {selectedInvoice.status === 'failed' ? (
                        <span className="text-xs text-red-500 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />识别失败
                        </span>
                      ) : selectedInvoice.is_excluded ? (
                        <span className="text-xs text-red-400 flex items-center">
                          <XCircle className="w-3 h-3 mr-1" />已标记不报销
                        </span>
                      ) : (
                        <span className="text-xs text-green-500 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />可报销
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">创建: {selectedInvoice.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <button onClick={() => handleToggleExclude(selectedInvoice)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        selectedInvoice.is_excluded
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-red-500 text-white hover:bg-red-600'
                      }`}>
                      {selectedInvoice.is_excluded ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      <span>{selectedInvoice.is_excluded ? '恢复报销' : '标记不报销'}</span>
                    </button>
                    <button onClick={() => handleDelete(selectedInvoice.id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>删除</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManager;
