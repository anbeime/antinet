"""
添加 cards-management 的处理
"""
file_path = r'C:\test\antinet\src\pages\Home.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 在 {activeTab === 'data-management' && 之前添加 cards-management 的处理
target = "{activeTab === 'data-management' && ("

# 新的 cards-management 内容
new_section = """{activeTab === 'cards-management' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    卡片管理
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    管理所有知识卡片，支持批量操作
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle size={20} />
                  <span>新建卡片</span>
                </button>
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{cards.length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">总卡片数</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-blue-600">{cards.filter(c => c.color === 'blue').length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">事实类</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-green-600">{cards.filter(c => c.color === 'green').length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">解释类</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-yellow-600">{cards.filter(c => c.color === 'yellow').length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">风险类</div>
              </div>
            </div>

            {/* 卡片列表 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold">卡片列表</h2>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="搜索卡片..."
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{card.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            card.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            card.color === 'green' ? 'bg-green-100 text-green-800' :
                            card.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {cardTypeMap[card.color].name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{card.content}</p>
                        <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
                          <span>ID: {card.address}</span>
                          <span>创建于: {new Date(card.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedCard(card);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        """

if target in content:
    content = content.replace(target, new_section + target)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ cards-management 处理添加成功")
else:
    print("❌ 未找到插入点")
