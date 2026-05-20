import { useState, useEffect, useCallback } from 'react';
import { X, Save, Link, Search, FileText, FolderOpen, Tag, Plus, Trash2, Edit3, Eye, Network, ChevronRight, ChevronDown, Clock, Users, BarChart3, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';
import WikiGraphView from './WikiGraphView';
import KnowledgeGraph from './KnowledgeGraph';
import { renderMarkdown } from '@/lib/utils';

interface WikiPage {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  file_path: string;
  created_at: string;
  updated_at: string;
}

interface WikiLink {
  target_title: string;
  target_id: string | null;
}

interface WikiBacklink {
  page_id: string;
  title: string;
}

interface ConnectedNode {
  id: string;
  title: string;
  type: string;
  distance: number;
}

interface SearchResult {
  page_id: string;
  title: string;
  score: number;
  snippet: string;
}

interface WikiNode {
  id: string;
  title: string;
  type: string;
  tags: string[];
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

const WikiEditor = () => {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [currentPage, setCurrentPage] = useState<WikiPage | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [pageType, setPageType] = useState('note');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [links, setLinks] = useState<WikiLink[]>([]);
  const [backlinks, setBacklinks] = useState<WikiBacklink[]>([]);
  const [connected, setConnected] = useState<ConnectedNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'graph' | 'search'>('editor');
  const [graphSubTab, setGraphSubTab] = useState<'wiki' | 'cards'>('wiki');
  const [graphNodes, setGraphNodes] = useState<WikiNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['articles', 'concepts', 'entities']));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPages();
    loadGraph();
  }, []);

  const loadPages = async () => {
    try {
      const res = await fetch(getApiBaseUrl() + '/api/wiki/pages');
      if (!res.ok) {
        console.warn('Wiki API not available');
        return;
      }
      const data = await res.json();
      setPages(data.pages || []);
    } catch (e) {
      console.warn('Wiki API not available:', e);
    }
  };

  const loadGraph = async () => {
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        fetch(getApiBaseUrl() + '/api/wiki/graph/nodes'),
        fetch(getApiBaseUrl() + '/api/wiki/graph/edges')
      ]);
      if (!nodesRes.ok || !edgesRes.ok) {
        console.warn('Wiki graph API not available');
        return;
      }
      const nodesData = await nodesRes.json();
      const edgesData = await edgesRes.json();
      setGraphNodes(nodesData.nodes || []);
      setGraphEdges(edgesData.edges || []);
    } catch (e) {
      console.warn('Wiki graph API not available:', e);
    }
  };

  const loadPage = async (pageId: string) => {
    try {
      // 跳过无效的pageId
      if (!pageId || pageId.includes('undefined') || pageId.includes('md--md')) {
        console.warn('跳过无效的页面ID:', pageId);
        return;
      }
      // 确保pageId正确编码
      const encodedId = encodeURIComponent(pageId);
      const res = await fetch(getApiBaseUrl() + `/api/wiki/pages?page_id=${encodedId}`);
      if (!res.ok) {
        console.error('Failed to load page:', res.status);
        return;
      }
      const data = await res.json();
      if (data.page) {
        setCurrentPage(data.page);
        // Handle both string and dict content
        const rawContent = data.page.content || '';
        const contentStr = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        setContent(contentStr);
        setTitle(data.page.title || '');
        setPageType(data.page.type);
        setTags(data.page.tags || []);
        setLinks(data.links || []);
        setBacklinks(data.backlinks || []);
        setConnected(data.connected || []);
        setEditMode(false);
        setViewMode('preview');
      }
    } catch (e) {
      console.error('Failed to load page:', e);
    }
  };

  const createNewPage = () => {
    setCurrentPage(null);
    setTitle('');
    setContent('');
    setPageType('note');
    setTags([]);
    setLinks([]);
    setBacklinks([]);
    setConnected([]);
    setEditMode(true);
  };

  const copyRenderedContent = async () => {
    const renderedHtml = renderMarkdown(content);
    try {
      await navigator.clipboard.writeText(renderedHtml);
      setCopied(true);
      toast.success('排版内容已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const savePage = async () => {
    if (!title.trim()) {
      toast.error('请输入页面标题');
      return;
    }

    const pageId = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    try {
      if (currentPage) {
        await fetch(getApiBaseUrl() + `/api/wiki/pages?page_id=${encodeURIComponent(currentPage.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, node_type: pageType, tags })
        });
        toast.success('页面已更新');
      } else {
        await fetch(getApiBaseUrl() + '/api/wiki/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_id: pageId, title, content, node_type: pageType, tags })
        });
        toast.success('页面已创建');
      }
      loadPages();
      loadGraph();
      setEditMode(false);
    } catch (e) {
      toast.error('保存失败');
    }
  };

  const deletePage = async (pageId: string) => {
    if (!confirm('确定要删除这个页面吗？')) return;

    try {
      await fetch(getApiBaseUrl() + `/api/wiki/pages?page_id=${encodeURIComponent(pageId)}`, { method: 'DELETE' });
      toast.success('页面已删除');
      if (currentPage?.id === pageId) {
        setCurrentPage(null);
        setContent('');
      }
      loadPages();
      loadGraph();
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const search = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(getApiBaseUrl() + `/api/wiki/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (e) {
      console.error('Search failed:', e);
    }
    setIsSearching(false);
  };

  const insertLink = (linkTitle: string) => {
    setContent(prev => prev + `[[${linkTitle}]]`);
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '<a href="#" class="text-blue-600 hover:underline">$1</a>')
      .replace(/\n/g, '<br/>');
  };

  const groupedPages = pages.reduce((acc, page) => {
    const parts = page.id.split('/');
    const folder = parts.length > 1 ? parts[0] : 'root';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(page);
    return acc;
  }, {} as Record<string, WikiPage[]>);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-gray-200 overflow-hidden transition-all duration-200`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Network className="w-5 h-5" />
            知识网络
          </h2>
          <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2">
          <button
            onClick={createNewPage}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建页面
          </button>
        </div>

        <div className="p-2 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-200px)]">
          {Object.entries(groupedPages).map(([folder, folderPages]) => (
            <div key={folder} className="mb-1">
              <button
                onClick={() => toggleFolder(folder)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {expandedFolders.has(folder) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FolderOpen className="w-4 h-4" />
                {folder === 'root' ? '根目录' : folder}
                <span className="ml-auto text-xs text-gray-400">{folderPages.length}</span>
              </button>
              {expandedFolders.has(folder) && (
                <div className="ml-4">
                  {folderPages.map(page => (
                    <button
                      key={page.id}
                      onClick={() => {
                        if (page.id && !page.id.includes('undefined')) {
                          loadPage(page.id);
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg ${
                        currentPage?.id === page.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span className="truncate">{page.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar - Always visible */}
        <div className="p-2 bg-white border-b border-gray-200 flex items-center gap-2">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
              <FolderOpen className="w-5 h-5" />
            </button>
          )}
          <div className="h-6 w-px bg-gray-300" />
          <button
            onClick={() => setViewMode('edit')}
            className={`p-2 rounded-lg ${viewMode === 'edit' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
          >
            <Edit3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`p-2 rounded-lg ${viewMode === 'preview' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-2 rounded-lg ${viewMode === 'split' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
          >
            <span className="text-xs font-bold">二</span>
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <button
            onClick={copyRenderedContent}
            className={`p-2 rounded-lg hover:bg-gray-100 ${copied ? 'text-green-600' : ''}`}
            title="复制排版内容"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'editor' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            编辑
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'graph' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1" />
            图谱
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'search' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            搜索
          </button>
          </div>

        {/* Editor Area */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Editor/Preview */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 bg-white border-b border-gray-200">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="页面标题"
                  disabled={!editMode && !!currentPage}
                  className="text-2xl font-bold w-full border-none focus:outline-none disabled:text-gray-800"
                />
                <div className="flex items-center gap-4 mt-2">
                  <select
                    value={pageType}
                    onChange={e => setPageType(e.target.value)}
                    disabled={!editMode}
                    className="text-sm border border-gray-200 rounded px-2 py-1"
                  >
                    <option value="note">笔记</option>
                    <option value="concept">概念</option>
                    <option value="entity">实体</option>
                    <option value="query">问答</option>
                    <option value="comparison">对比</option>
                  </select>
                  <div className="flex items-center gap-1 flex-wrap">
                    {tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        <Tag className="w-3 h-3" />
                        {tag}
                        {editMode && (
                          <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-blue-900">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    {editMode && (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newTag}
                          onChange={e => setNewTag(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTag.trim()) {
                              setTags(prev => [...prev, newTag.trim()]);
                              setNewTag('');
                            }
                          }}
                          placeholder="添加标签"
                          className="text-xs border border-gray-200 rounded px-2 py-1 w-20"
                        />
                      </div>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {currentPage && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        更新于 {new Date(currentPage.updated_at).toLocaleString('zh-CN')}
                      </span>
                    )}
                    {editMode ? (
                      <>
                        <button onClick={savePage} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                          <Save className="w-4 h-4" />
                          保存
                        </button>
                        <button
                          onClick={() => {
                            if (currentPage) loadPage(currentPage.id);
                            else setEditMode(false);
                          }}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                      >
                        <Edit3 className="w-4 h-4" />
                        编辑
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {(viewMode === 'edit' || viewMode === 'split') && (
                  <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200`}>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                      编辑模式 {editMode ? '(可编辑)' : '(只读)'}
                    </div>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      disabled={!editMode}
                      placeholder="使用 [[页面标题]] 创建双向链接..."
                      className="flex-1 p-4 resize-none focus:outline-none disabled:bg-white"
                    />
                  </div>
                )}
                {(viewMode === 'preview' || viewMode === 'split') && (
                  <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto p-4 bg-white`}>
                    <div
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Side Panel */}
            {(links.length > 0 || backlinks.length > 0 || connected.length > 0) && (
              <div className="w-64 bg-gray-50 border-l border-gray-200 overflow-y-auto">
                {links.length > 0 && (
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Link className="w-4 h-4" />
                      出链 ({links.length})
                    </h3>
                    <div className="space-y-1">
                      {links.map((link, i) => (
                        <button
                          key={i}
                          onClick={() => link.target_id && loadPage(link.target_id)}
                          className="w-full text-left text-sm text-blue-600 hover:underline"
                        >
                          {link.target_title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {backlinks.length > 0 && (
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Link className="w-4 h-4 rotate-180" />
                      反链 ({backlinks.length})
                    </h3>
                    <div className="space-y-1">
                      {backlinks.map(link => (
                        <button
                          key={link.page_id}
                          onClick={() => loadPage(link.page_id)}
                          className="w-full text-left text-sm text-blue-600 hover:underline"
                        >
                          {link.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {connected.length > 0 && (
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Network className="w-4 h-4" />
                      关联节点 ({connected.length})
                    </h3>
                    <div className="space-y-1">
                      {connected.map(node => (
                        <button
                          key={node.id}
                          onClick={() => loadPage(node.id)}
                          className="w-full text-left text-sm hover:bg-gray-100 p-1 rounded"
                        >
                          <span className="text-gray-800">{node.title}</span>
                          <span className="text-xs text-gray-400 ml-1">({node.distance}度)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Graph View */}
        {activeTab === 'graph' && (
          <div className="flex-1 p-4 flex flex-col">
            {/* 图谱子标签 */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setGraphSubTab('wiki')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  graphSubTab === 'wiki'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-1" />
                Wiki页面图谱
              </button>
              <button
                onClick={() => setGraphSubTab('cards')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  graphSubTab === 'cards'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Network className="w-4 h-4 inline mr-1" />
                卡片知识网络
              </button>
            </div>

            {graphSubTab === 'wiki' ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex-1 overflow-auto">
                <div className="grid grid-cols-4 gap-4">
                  {graphNodes.map(node => {
                    const nodeEdges = graphEdges.filter(e => e.source === node.id || e.target === node.id);
                    return (
                      <div
                        key={node.id}
                        onClick={() => loadPage(node.id)}
                        className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <div className="font-medium text-sm">{node.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{node.type}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{nodeEdges.length} 个连接</div>
                      </div>
                    );
                  })}
                </div>
                {graphNodes.length === 0 && (
                  <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                    暂无Wiki知识节点，请创建页面
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-1 overflow-hidden">
                <KnowledgeGraph />
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {activeTab === 'search' && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder="搜索知识库..."
                  className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={search}
                  disabled={isSearching}
                  className="px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearching ? '搜索中...' : '搜索'}
                </button>
              </div>

              <div className="space-y-3">
                {searchResults.map(result => (
                  <div
                    key={result.page_id}
                    onClick={() => loadPage(result.page_id)}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="font-medium">{result.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{result.snippet}</div>
                    <div className="text-xs text-gray-400 mt-2">相关性: {result.score.toFixed(2)}</div>
                  </div>
                ))}
                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <div className="text-center text-gray-400 py-8">未找到相关结果</div>
                )}
              </div>
            </div>
          </div>
        )}

</div>
    </div>
  );
};
export default WikiEditor;