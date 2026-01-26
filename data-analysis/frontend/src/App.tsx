import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Network, Settings, BarChart3, Activity } from 'lucide-react'
import CardFilter from './components/CardFilter'
import Card from './components/Card'
import KnowledgeGraph from './components/KnowledgeGraph'
import RuleConfig from './components/RuleConfig'
import ReportGenerator from './components/ReportGenerator'
import api from './api'

/**
 * 卡片数据类型
 */
interface CardData {
  id: string
  title: string
  content: string
  color: 'blue' | 'green' | 'yellow' | 'red'
  category: string
  tags: string[]
  createdAt: string
}

/**
 * 规则数据类型
 */
interface RuleData {
  id: string
  name: string
  description: string
  type: string
  condition: string
  action: string
  enabled: boolean
}

/**
 * 主应用组件
 */
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cards' | 'graph' | 'rules' | 'generate'>('cards')
  const [cards, setCards] = useState<CardData[]>([])
  const [filteredCards, setFilteredCards] = useState<CardData[]>([])
  const [rules, setRules] = useState<RuleData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)

  // 加载卡片数据
  useEffect(() => {
    loadCards()
  }, [])

  // 加载规则数据
  useEffect(() => {
    loadRules()
  }, [])

  const loadCards = async () => {
    try {
      setIsLoading(true)
      const data = await api.card.list()
      setCards(data)
      setFilteredCards(data)
    } catch (error) {
      console.error('加载卡片失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRules = async () => {
    try {
      const data = await api.rule.list()
      setRules(data)
    } catch (error) {
      console.error('加载规则失败:', error)
    }
  }

  const handleFilterChange = async (filters: any) => {
    try {
      setIsLoading(true)
      const data = await api.card.list(filters)
      setFilteredCards(data)
    } catch (error) {
      console.error('筛选卡片失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCardClick = async (cardId: string) => {
    try {
      const data = await api.card.get(cardId)
      setSelectedCard(data)
    } catch (error) {
      console.error('获取卡片详情失败:', error)
    }
  }

  const handleCreateRule = async (rule: Omit<RuleData, 'id'>) => {
    try {
      const data = await api.rule.create(rule as any)
      setRules([...rules, data])
    } catch (error) {
      console.error('创建规则失败:', error)
    }
  }

  const handleUpdateRule = async (id: string, rule: Partial<RuleData>) => {
    try {
      const data = await api.rule.update(id, rule as any)
      setRules(rules.map((r) => (r.id === id ? data : r)))
    } catch (error) {
      console.error('更新规则失败:', error)
    }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      await api.rule.delete(id)
      setRules(rules.filter((r) => r.id !== id))
    } catch (error) {
      console.error('删除规则失败:', error)
    }
  }

  const handleToggleRule = async (id: string) => {
    try {
      const data = await api.rule.toggle(id)
      setRules(rules.map((r) => (r.id === id ? data : r)))
    } catch (error) {
      console.error('切换规则状态失败:', error)
    }
  }

  const handleGenerateCards = async (data: { userQuery: string; currentDate: string }) => {
    try {
      const result = await api.generate.generateCards(data)
      await loadCards()
      return result
    } catch (error: any) {
      throw new Error(error.message || '生成卡片失败')
    }
  }

  const handleGenerateReport = async (data: { userQuery: string; currentDate: string }) => {
    try {
      const result = await api.generate.generateReport(data)
      await loadCards()
      return result
    } catch (error: any) {
      throw new Error(error.message || '生成报告失败')
    }
  }

  const handleBatchGenerate = async (data: { queries: string[]; currentDate: string }) => {
    try {
      const result = await api.generate.batchGenerate(data)
      await loadCards()
      return result
    } catch (error: any) {
      throw new Error(error.message || '批量生成失败')
    }
  }

  // 知识图谱数据（示例）
  const graphData = {
    nodes: [
      { id: '1', label: '销售趋势', color: 'green', category: '趋势分析' },
      { id: '2', label: '用户增长', color: 'green', category: '趋势分析' },
      { id: '3', label: '异常检测', color: 'yellow', category: '风险监控' },
      { id: '4', label: '风险预警', color: 'red', category: '风险评估' },
      { id: '5', label: '行动建议', color: 'blue', category: '建议生成' },
      { id: '6', label: '知识总结', color: 'blue', category: '知识管理' },
    ],
    links: [
      { source: '1', target: '3', type: '相关' },
      { source: '2', target: '3', type: '相关' },
      { source: '3', target: '4', type: '导致' },
      { source: '4', target: '5', type: '需要' },
      { source: '1', target: '6', type: '总结' },
      { source: '2', target: '6', type: '总结' },
    ],
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-600">Antinet</h1>
            <p className="text-sm text-gray-500">端侧智能知识管家</p>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab导航 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'cards'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            卡片管理
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'graph'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Network className="w-4 h-4" />
            知识图谱
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'rules'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            规则配置
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'generate'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            报告生成
          </button>
        </div>

        {/* 内容区域 */}
        <AnimatePresence mode="wait">
          {activeTab === 'cards' && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <CardFilter onFilterChange={handleFilterChange} />
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Activity className="w-8 h-8 text-primary-600 animate-spin" />
                  <span className="ml-3 text-gray-600">加载中...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCards.map((card) => (
                    <Card
                      key={card.id}
                      title={card.title}
                      content={card.content}
                      color={card.color}
                      category={card.category}
                      tags={card.tags}
                      onClick={() => handleCardClick(card.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'graph' && (
            <motion.div
              key="graph"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <KnowledgeGraph
                data={graphData}
                onNodeClick={(nodeId) => console.log('点击节点:', nodeId)}
              />
            </motion.div>
          )}

          {activeTab === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <RuleConfig
                rules={rules}
                onCreateRule={handleCreateRule}
                onUpdateRule={handleUpdateRule}
                onDeleteRule={handleDeleteRule}
                onToggleRule={handleToggleRule}
              />
            </motion.div>
          )}

          {activeTab === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ReportGenerator
                onGenerateCards={handleGenerateCards}
                onGenerateReport={handleGenerateReport}
                onBatchGenerate={handleBatchGenerate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 卡片详情弹窗 */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">{selectedCard.title}</h2>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <div className="mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCard.color === 'blue'
                        ? 'bg-blue-100 text-blue-700'
                        : selectedCard.color === 'green'
                        ? 'bg-green-100 text-green-700'
                        : selectedCard.color === 'yellow'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {selectedCard.category}
                  </span>
                </div>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedCard.content}</p>
                </div>
                {selectedCard.tags && selectedCard.tags.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-800 mb-2">标签</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCard.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-6 text-sm text-gray-500">
                  创建时间：{new Date(selectedCard.createdAt).toLocaleString()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
