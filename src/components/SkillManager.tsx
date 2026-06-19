/**
 * 技能管理器组件
 * 用于搜索、安装、管理技能
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Download, Trash2, RefreshCw, 
  CheckCircle, Package, Terminal,
  ExternalLink, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface SkillInfo {
  name: string;
  description: string;
  tags: string[];
  installed?: boolean;
}

// 预设的技能仓库来源
const SKILL_REPOS = [
  {
    name: 'anbeime/skill',
    url: 'https://github.com/anbeime/skill',
    description: '官方技能仓库'
  }
];

// 常用技能推荐
const RECOMMENDED_SKILLS = [
  {
    name: 'content-creation-publisher',
    description: '内容创作与发布全流程技能，支持微信公众号、X/Twitter 多平台发布',
    tags: ['content', 'publishing', 'social-media']
  },
  {
    name: 'tts-voice-synthesis',
    description: '智能语音合成服务，支持音色克隆、多语言与方言',
    tags: ['audio', 'tts', 'voice']
  },
  {
    name: 'obsidian-skills-integrated',
    description: 'Obsidian 官方技能集，提供专业的笔记操作能力',
    tags: ['obsidian', 'notes', 'productivity']
  },
  {
    name: 'infinitetalk',
    description: '音频驱动的视频配音工具，支持唇形、头部、身体姿态同步',
    tags: ['video', 'audio', 'lip-sync']
  }
];

export function SkillManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null);

  // 模拟已安装技能（实际应该从后端API获取）
  useEffect(() => {
    // 这里应该调用后端API获取已安装技能列表
    setInstalledSkills([
      'ppt_generator',
      'ppt_roadshow',
      'ppt_visualizer',
      'pptx',
      'pptx_generator',
      'xlsx'
    ]);
  }, []);

  // 过滤推荐技能
  const filteredSkills = RECOMMENDED_SKILLS.filter(skill => {
    const query = searchQuery.toLowerCase();
    return (
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query) ||
      skill.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // 检查技能是否已安装
  const isInstalled = (skillName: string) => {
    return installedSkills.includes(skillName);
  };

  // 安装技能
  const handleInstall = async (skillName: string) => {
    setIsLoading(true);
    try {
      // 这里应该调用后端API安装技能
      // const response = await api.post(`/api/skills/install`, { name: skillName });
      
      // 模拟安装过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setInstalledSkills(prev => [...prev, skillName]);
      toast.success(`技能 ${skillName} 安装成功！`);
    } catch (error) {
      toast.error(`安装失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 卸载技能
  const handleUninstall = async (skillName: string) => {
    setIsLoading(true);
    try {
      // 这里应该调用后端API卸载技能
      // const response = await api.post(`/api/skills/uninstall`, { name: skillName });
      
      // 模拟卸载过程
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setInstalledSkills(prev => prev.filter(name => name !== skillName));
      toast.success(`技能 ${skillName} 已卸载`);
    } catch (error) {
      toast.error(`卸载失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新技能列表
  const handleRefresh = () => {
    toast.info('正在刷新技能列表...');
    // 重新获取技能列表
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 头部 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">技能管理器</h1>
            <p className="text-muted-foreground">
              从 <a href="https://github.com/anbeime/skill" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">anbeime/skill</a> 搜索和安装技能
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button variant="outline" asChild>
              <a href="https://github.com/anbeime/skill" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                浏览仓库
              </a>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 搜索栏 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="搜索技能... (例如: docx, pdf, chart, video)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 技能列表 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                可用技能
                <Badge variant="secondary">{filteredSkills.length}</Badge>
              </CardTitle>
              <CardDescription>
                推荐技能列表，点击安装到您的项目中
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <AnimatePresence mode="popLayout">
                  {filteredSkills.map((skill, index) => (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedSkill?.name === skill.name ? 'border-primary' : ''
                        }`}
                        onClick={() => setSelectedSkill(skill)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{skill.name}</h3>
                                {isInstalled(skill.name) && (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    已安装
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {skill.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {skill.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="ml-4">
                              {isInstalled(skill.name) ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleUninstall(skill.name);
                                  }}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleInstall(skill.name);
                                  }}
                                  disabled={isLoading}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  安装
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
</motion.div>
                  ))}
                  </AnimatePresence>

                  {filteredSkills.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>没有找到匹配的技能</p>
                      <p className="text-sm">尝试其他关键词或浏览完整仓库</p>
                    </div>
                  )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* 侧边栏 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* 已安装技能 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                已安装
                <Badge variant="secondary">{installedSkills.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {installedSkills.map(skillName => (
                    <div
                      key={skillName}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted"
                    >
                      <span className="text-sm font-medium">{skillName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUninstall(skillName)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* 技能来源 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                技能来源
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SKILL_REPOS.map(repo => (
                  <a
                    key={repo.name}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{repo.name}</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {repo.description}
                    </p>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                命令行安装
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">使用命令行快速安装：</p>
                <code className="block p-2 bg-muted rounded text-xs">
                  python skill_installer.py list
                </code>
                <code className="block p-2 bg-muted rounded text-xs">
                  python skill_installer.py install docx
                </code>
                <code className="block p-2 bg-muted rounded text-xs">
                  python skill_installer.py search pdf
                </code>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SkillManager;
