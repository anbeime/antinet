import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  Tag,
  Filter
} from 'lucide-react'

interface CardStats {
  total: number
  blue: number
  green: number
  yellow: number
  red: number
}

interface RecentCard {
  id: string
  title: string
  color: string
  created_at: string
}

interface KnowledgeOverviewProps {
  onCardClick?: (cardId: string) => void
}

/**
 * 知识概览组件
 * 展示知识库的总体统计信息和最近活动
 */
const KnowledgeOverview: React.FC<KnowledgeOverviewProps> = ({ onCardClick }) => {
  const [stats, setStats] = useState<CardStats>({
    total: 0,
    blue: 0,
    green: 0,
    yellow: 0,
    red: 0
  })
  const [recentCards, setRecentCards] = useState<RecentCard[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOverviewData()
  }, [])

  const fetchOverviewData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/cards?limit=100')
      if (response.ok) {
        const data = await response.json()
        const cards = data.cards || []
        
        const newStats: CardStats = {
          total: cards.length,
          blue: cards.filter((c: any) => c.card_type === 'blue').length,
          green: cards.filter((c: any) => c.card_type === 'green').length,
          yellow: cards.filter((c: any) => c.card_type === 'yellow').length,
          red: cards.filter((c: any) => c.card_type === 'red').length
        }
        
        setStats(newStats)
        
        const recent = cards.slice(0, 5).map((c: any) => ({
          id: c.id,
          title: c.title,
          color: c.card_type,
          created_at: c.created_at
        }))
        setRecentCards(recent)
      }
    } catch (error) {
      console.error('Failed to fetch overview data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const colorConfig = {
    blue: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', icon: FileText, label: '事实卡片' },
    green: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', icon: TrendingUp, label: '解释卡片' },
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', icon: AlertTriangle, label: '风险卡片' },
    red: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', icon: CheckCircle, label: '行动卡片' }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-800">知识概览</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">知识总量</p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-indigo-200" />
              </div>
            </motion.div>

            {Object.entries(colorConfig).map(([color, config], index) => {
              const count = stats[color as keyof CardStats]
              const Icon = config.icon
              return (
                <motion.div 
                  key={color}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index + 1) * 0.1 }}
                  className={`${config.bg} ${config.border} border-2 rounded-xl p-5 shadow-md`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`${config.text} text-sm`}>{config.label}</p>
                      <p className={`${config.text} text-2xl font-bold mt-1`}>{count}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${config.text}`} />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* 最近活动 */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">最近创建</h3>
            </div>
            
            {recentCards.length > 0 ? (
              <div className="space-y-3">
                {recentCards.map((card) => {
                  const config = colorConfig[card.color as keyof typeof colorConfig] || colorConfig.blue
                  return (
                    <motion.div 
                      key={card.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => onCardClick?.(card.id)}
                      className={`flex items-center justify-between p-3 ${config.bg} rounded-lg cursor-pointer border border-opacity-50 ${config.border}`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className={`w-4 h-4 ${config.text}`} />
                        <span className={`font-medium ${config.text}`}>{card.title}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {card.created_at ? new Date(card.created_at).toLocaleDateString() : ''}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">暂无最近创建的卡片</p>
            )}
          </div>

          {/* 快速操作 */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">快速筛选</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(colorConfig).map(([color, config]) => (
                <button
                  key={color}
                  onClick={() => onCardClick?.(color)}
                  className={`px-4 py-2 rounded-full ${config.bg} ${config.text} border-2 ${config.border} hover:opacity-80 transition-opacity`}
                >
                  {config.label}
                </button>
              ))}
              <button
                onClick={() => onCardClick?.('all')}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200 transition-colors"
              >
                查看全部
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default KnowledgeOverview