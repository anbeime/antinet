import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

/**
 * 报告生成组件
 */
interface ReportGeneratorProps {
  onGenerateCards: (data: { userQuery: string; currentDate: string }) => Promise<any>
  onGenerateReport: (data: { userQuery: string; currentDate: string }) => Promise<any>
  onBatchGenerate: (data: { queries: string[]; currentDate: string }) => Promise<any>
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  onGenerateCards,
  onGenerateReport,
  onBatchGenerate,
}) => {
  const [mode, setMode] = useState<'cards' | 'report' | 'batch'>('cards')
  const [userQuery, setUserQuery] = useState('')
  const [queries, setQueries] = useState<string[]>(['', ''])
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!userQuery.trim() && mode !== 'batch') return

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const currentDate = new Date().toISOString().split('T')[0]
      let data: any

      if (mode === 'cards') {
        data = await onGenerateCards({ userQuery, currentDate })
      } else if (mode === 'report') {
        data = await onGenerateReport({ userQuery, currentDate })
      } else if (mode === 'batch') {
        const validQueries = queries.filter((q) => q.trim())
        if (validQueries.length === 0) {
          setError('请输入至少一个查询')
          setIsGenerating(false)
          return
        }
        data = await onBatchGenerate({ queries: validQueries, currentDate })
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || '生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddQuery = () => {
    setQueries([...queries, ''])
  }

  const handleRemoveQuery = (index: number) => {
    setQueries(queries.filter((_, i) => i !== index))
  }

  const handleQueryChange = (index: number, value: string) => {
    const newQueries = [...queries]
    newQueries[index] = value
    setQueries(newQueries)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Wand2 className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-gray-800">报告生成</h3>
      </div>

      {/* 模式选择 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('cards')}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            mode === 'cards'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          生成四色卡片
        </button>
        <button
          onClick={() => setMode('report')}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            mode === 'report'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          生成完整报告
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            mode === 'batch'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          批量生成
        </button>
      </div>

      {/* 输入区域 */}
      <div className="mb-6">
        {mode === 'batch' ? (
          <div className="space-y-3">
            {queries.map((query, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(index, e.target.value)}
                  placeholder={`查询 ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {queries.length > 1 && (
                  <button
                    onClick={() => handleRemoveQuery(index)}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddQuery}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              + 添加查询
            </button>
          </div>
        ) : (
          <textarea
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="输入您的查询或需求..."
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={6}
          />
        )}
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`w-full px-4 py-3 rounded-md transition-colors ${
          isGenerating
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 text-white'
        }`}
      >
        {isGenerating ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>生成中...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Wand2 className="w-5 h-5" />
            <span>
              {mode === 'cards' ? '生成卡片' : mode === 'report' ? '生成报告' : '批量生成'}
            </span>
          </div>
        )}
      </button>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md"
          >
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">生成失败</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 结果展示 */}
      <AnimatePresence>
        {result && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6"
          >
            <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="font-semibold text-green-800">生成成功</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm overflow-x-auto">
                <code>{JSON.stringify(result, null, 2)}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ReportGenerator
