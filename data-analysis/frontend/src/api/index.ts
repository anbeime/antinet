import api from './api'

/**
 * 卡片API
 */
export const cardApi = {
  /**
   * 获取卡片列表
   */
  list: async (params?: {
    color?: string
    category?: string
    keyword?: string
  }) => {
    const response = await api.get('/cards', { params })
    return response.data
  },

  /**
   * 获取卡片详情
   */
  get: async (id: string) => {
    const response = await api.get(`/cards/${id}`)
    return response.data
  },

  /**
   * 创建卡片
   */
  create: async (data: {
    title: string
    content: string
    color: string
    category: string
    tags: string[]
  }) => {
    const response = await api.post('/cards', data)
    return response.data
  },

  /**
   * 更新卡片
   */
  update: async (id: string, data: {
    title?: string
    content?: string
    color?: string
    category?: string
    tags?: string[]
  }) => {
    const response = await api.put(`/cards/${id}`, data)
    return response.data
  },

  /**
   * 删除卡片
   */
  delete: async (id: string) => {
    const response = await api.delete(`/cards/${id}`)
    return response.data
  },
}

/**
 * 知识图谱API
 */
export const knowledgeApi = {
  /**
   * 获取知识图谱数据
   */
  getGraph: async (params?: {
    rootId?: string
    depth?: number
  }) => {
    const response = await api.get('/knowledge/graph', { params })
    return response.data
  },

  /**
   * 语义检索知识
   */
  search: async (query: string, limit?: number) => {
    const response = await api.post('/knowledge/search', { query, limit })
    return response.data
  },

  /**
   * 获取活动记录
   */
  getActivities: async (params?: {
    limit?: number
    offset?: number
  }) => {
    const response = await api.get('/knowledge/activities', { params })
    return response.data
  },
}

/**
 * 规则API
 */
export const ruleApi = {
  /**
   * 获取规则列表
   */
  list: async (params?: {
    enabled?: boolean
    type?: string
  }) => {
    const response = await api.get('/rules', { params })
    return response.data
  },

  /**
   * 获取规则详情
   */
  get: async (id: string) => {
    const response = await api.get(`/rules/${id}`)
    return response.data
  },

  /**
   * 创建规则
   */
  create: async (data: {
    name: string
    description: string
    type: string
    condition: string
    action: string
    enabled: boolean
  }) => {
    const response = await api.post('/rules', data)
    return response.data
  },

  /**
   * 更新规则
   */
  update: async (id: string, data: {
    name?: string
    description?: string
    condition?: string
    action?: string
    enabled?: boolean
  }) => {
    const response = await api.put(`/rules/${id}`, data)
    return response.data
  },

  /**
   * 删除规则
   */
  delete: async (id: string) => {
    const response = await api.delete(`/rules/${id}`)
    return response.data
  },

  /**
   * 切换规则状态
   */
  toggle: async (id: string) => {
    const response = await api.post(`/rules/${id}/toggle`)
    return response.data
  },
}

/**
 * 生成API
 */
export const generateApi = {
  /**
   * 生成四色卡片
   */
  generateCards: async (data: {
    userQuery: string
    currentDate: string
  }) => {
    const response = await api.post('/generate/cards', data)
    return response.data
  },

  /**
   * 生成完整报告
   */
  generateReport: async (data: {
    userQuery: string
    currentDate: string
  }) => {
    const response = await api.post('/generate/report', data)
    return response.data
  },

  /**
   * 批量生成
   */
  batchGenerate: async (data: {
    queries: string[]
    currentDate: string
  }) => {
    const response = await api.post('/generate/batch', data)
    return response.data
  },
}

/**
 * 健康检查API
 */
export const healthApi = {
  /**
   * 健康检查
   */
  check: async () => {
    const response = await api.get('/health')
    return response.data
  },
}

export default {
  card: cardApi,
  knowledge: knowledgeApi,
  rule: ruleApi,
  generate: generateApi,
  health: healthApi,
}
