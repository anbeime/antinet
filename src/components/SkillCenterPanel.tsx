// src/components/SkillCenterPanel.tsx - 技能中心面板
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Search, Play, TrendingUp, Loader } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000';

interface Skill {
  name: string;
  description: string;
  category: string;
  agent_name: string;
  enabled: boolean;
  usage_count: number;
  last_used?: string;
}

interface SkillStats {
  total_skills: number;
  enabled_skills: number;
  total_usage: number;
  skills_by_agent: Record<string, any>;
  skills_by_category: Record<string, any>;
}

const SkillCenterPanel: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stats, setStats] = useState<SkillStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchSkills();
    fetchStats();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/skill/list`);
      const data = await response.json();
      setSkills(data.skills || []);
    } catch (error) {
      console.error('获取技能列表失败:', error);
      toast('获取技能列表失败', { className: 'bg-red-50 text-red-800' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/skill/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('获取技能统计失败:', error);
    }
  };

  const handleExecuteSkill = async (skillName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/skill/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_name: skillName,
          parameters: {}
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast(`✓ 技能 "${skillName}" 执行成功`, {
          className: 'bg-green-50 text-green-800'
        });
        fetchSkills(); // 刷新列表
        fetchStats(); // 刷新统计
      } else {
        toast(`✗ 技能执行失败: ${result.error}`, {
          className: 'bg-red-50 text-red-800'
        });
      }
    } catch (error) {
      toast(`✗ 执行失败: ${error}`, {
        className: 'bg-red-50 text-red-800'
      });
    }
  };

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(skills.map(s => s.category)));

  return (
    <div className="space-y-6 p-6">
      {/* 标题 */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Zap className="w-8 h-8 mr-2" />
          技能中心
        </h1>
        <p className="text-purple-100">
          查看和执行系统中所有可用的技能，每个技能由特定的Agent提供
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">总技能数</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats?.total_skills || 0}
              </p>
            </div>
            <Zap className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">已启用</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats?.enabled_skills || 0}
              </p>
            </div>
            <Play className="w-12 h-12 text-green-400" />
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">总使用次数</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {stats?.total_usage || 0}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-400" />
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索技能名称或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700"
          >
            <option value="all">所有分类</option>
            {categories.map((cat, index) => (
              <option key={index} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 技能列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">技能列表 ({filteredSkills.length})</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery || selectedCategory !== 'all' ? '没有找到匹配的技能' : '暂无技能'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSkills.map((skill, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{skill.name}</h3>
                      {skill.enabled && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                          已启用
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {skill.description}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>分类: {skill.category}</span>
                      <span>Agent: {skill.agent_name}</span>
                      <span>使用次数: {skill.usage_count}</span>
                      {skill.last_used && (
                        <span>最后使用: {new Date(skill.last_used).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleExecuteSkill(skill.name)}
                    disabled={!skill.enabled}
                    className="ml-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <Play size={16} />
                    执行
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillCenterPanel;
