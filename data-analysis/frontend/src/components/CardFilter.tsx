import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X } from 'lucide-react'

/**
 * 卡片筛选器组件
 */
interface CardFilterProps {
  onFilterChange: (filters: {
    color?: string
    category?: string
    keyword?: string
  }) => void
}

const colors = [
  { value: 'blue', label: '蓝色', bgColor: 'bg-blue-100' },
  { value: 'green', label: '绿色', bgColor: 'bg-green-100' },
  { value: 'yellow', label: '黄色', bgColor: 'bg-yellow-100' },
  { value: 'red', label: '红色', bgColor: 'bg-red-100' },
]

const categories = [
  '趋势分析',
  '异常检测',
  '风险评估',
  '行动建议',
  '知识总结',
]

const CardFilter: React.FC<CardFilterProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<{
    color?: string
    category?: string
    keyword?: string
  }>({})
  const [keyword, setKeyword] = useState('')

  const handleColorChange = (color: string) => {
    const newFilters = {
      ...filters,
      color: filters.color === color ? undefined : color,
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleCategoryChange = (category: string) => {
    const newFilters = {
      ...filters,
      category: filters.category === category ? undefined : category,
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value)
    const newFilters = {
      ...filters,
      keyword: e.target.value || undefined,
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
    setKeyword('')
    onFilterChange({})
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-4 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-800">卡片筛选</h3>
        </div>
        <button
          onClick={handleClearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          清除筛选
        </button>
      </div>

      <div className="space-y-4">
        {/* 关键词搜索 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            关键词搜索
          </label>
          <input
            type="text"
            value={keyword}
            onChange={handleKeywordChange}
            placeholder="搜索卡片标题或内容..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* 颜色筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            颜色筛选
          </label>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorChange(color.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.color === color.value
                    ? color.bgColor + ' ring-2 ring-offset-2 ring-primary-500'
                    : color.bgColor + ' hover:opacity-80'
                }`}
              >
                {color.label}
              </button>
            ))}
          </div>
        </div>

        {/* 分类筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分类筛选
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filters.category === category
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default CardFilter
