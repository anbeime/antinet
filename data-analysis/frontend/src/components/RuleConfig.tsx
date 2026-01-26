import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

/**
 * 规则配置组件
 */
interface Rule {
  id: string
  name: string
  description: string
  type: string
  condition: string
  action: string
  enabled: boolean
}

interface RuleConfigProps {
  rules: Rule[]
  onCreateRule: (rule: Omit<Rule, 'id'>) => void
  onUpdateRule: (id: string, rule: Partial<Rule>) => void
  onDeleteRule: (id: string) => void
  onToggleRule: (id: string) => void
}

const RuleConfig: React.FC<RuleConfigProps> = ({
  rules,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Rule>>({})

  const handleCreate = () => {
    if (formData.name && formData.condition && formData.action) {
      onCreateRule({
        name: formData.name,
        description: formData.description || '',
        type: formData.type || 'custom',
        condition: formData.condition,
        action: formData.action,
        enabled: true,
      })
      setFormData({})
      setIsCreating(false)
    }
  }

  const handleUpdate = () => {
    if (editingId && formData.name && formData.condition && formData.action) {
      onUpdateRule(editingId, formData)
      setEditingId(null)
      setFormData({})
    }
  }

  const handleEdit = (rule: Rule) => {
    setEditingId(rule.id)
    setFormData(rule)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormData({})
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-800">规则配置</h3>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建规则
        </button>
      </div>

      {/* 创建/编辑表单 */}
      <AnimatePresence>
        {(isCreating || editingId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
          >
            <h4 className="font-semibold text-gray-700 mb-4">
              {isCreating ? '新建规则' : '编辑规则'}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  规则名称
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="输入规则名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  规则描述
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2}
                  placeholder="输入规则描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  规则类型
                </label>
                <select
                  value={formData.type || 'custom'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="custom">自定义</option>
                  <option value="risk_detection">风险检测</option>
                  <option value="trend_analysis">趋势分析</option>
                  <option value="data_validation">数据验证</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  触发条件
                </label>
                <textarea
                  value={formData.condition || ''}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="输入触发条件（支持SQL表达式或Python表达式）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  执行动作
                </label>
                <textarea
                  value={formData.action || ''}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="输入执行动作（支持API调用或脚本执行）"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={isCreating ? handleCreate : handleUpdate}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {isCreating ? '创建' : '更新'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 规则列表 */}
      <div className="space-y-4">
        {rules.map((rule, index) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border-2 transition-all ${
              rule.enabled
                ? 'border-gray-200 bg-white hover:border-primary-300'
                : 'border-gray-200 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-800">{rule.name}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                    {rule.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">条件：</span>
                    <span className="text-gray-700 font-mono">{rule.condition}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">动作：</span>
                    <span className="text-gray-700 font-mono">{rule.action}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onToggleRule(rule.id)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title={rule.enabled ? '禁用' : '启用'}
                >
                  {rule.enabled ? (
                    <ToggleRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(rule)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="编辑"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => onDeleteRule(rule.id)}
                  className="p-2 hover:bg-red-100 rounded-full transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {rules.length === 0 && !isCreating && (
        <div className="text-center py-12 text-gray-400">
          <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无规则，点击"新建规则"开始配置</p>
        </div>
      )}
    </motion.div>
  )
}

export default RuleConfig
