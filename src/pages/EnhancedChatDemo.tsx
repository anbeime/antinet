/**
 * 增强版聊天机器人演示页面
 * 展示所有互动功能
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, MessageSquare, Image as ImageIcon, 
  FileText, Table, Presentation, Search,
  Sparkles, ArrowRight, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChatButton } from '@/components/ChatButton';
import { EnhancedChatBot } from '@/components/EnhancedChatBot';

const features = [
  {
    icon: <Search className="w-6 h-6" />,
    title: "智能知识库查询",
    description: "基于语义搜索查询四色卡片知识库，支持事实、解释、风险、行动卡片",
    color: "bg-blue-500",
    examples: [
      "查找关于项目管理的事实卡片",
      "搜索风险相关的知识",
      "有哪些行动建议卡片？"
    ]
  },
  {
    icon: <ImageIcon className="w-6 h-6" />,
    title: "图片智能解析",
    description: "上传图片进行智能分析，自动提取关键信息并生成知识卡片",
    color: "bg-green-500",
    examples: [
      "分析这张图表",
      "识别图片中的关键数据",
      "从图片提取事实信息"
    ]
  },
  {
    icon: <Presentation className="w-6 h-6" />,
    title: "PPT 自动生成",
    description: "根据需求自动生成专业的 PowerPoint 演示文稿",
    color: "bg-purple-500",
    examples: [
      "生成年终总结PPT",
      "制作项目汇报演示文稿",
      "创建产品介绍幻灯片"
    ]
  },
  {
    icon: <Table className="w-6 h-6" />,
    title: "Excel 数据分析",
    description: "智能分析 Excel 文件，生成数据报告和可视化图表",
    color: "bg-orange-500",
    examples: [
      "分析销售数据表格",
      "生成财务报表分析",
      "创建数据可视化图表"
    ]
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "Word 文档生成",
    description: "自动生成专业的 Word 文档，支持多种模板",
    color: "bg-indigo-500",
    examples: [
      "生成项目计划书",
      "创建工作总结文档",
      "编写技术方案文档"
    ]
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "智能场景识别",
    description: "自动识别用户意图，智能匹配最佳响应策略",
    color: "bg-pink-500",
    examples: [
      "自然语言对话",
      "上下文感知",
      "个性化推荐"
    ]
  }
];

const usageSteps = [
  {
    step: 1,
    title: "打开聊天窗口",
    description: "点击右下角的聊天按钮，打开增强版聊天机器人"
  },
  {
    step: 2,
    title: "选择功能",
    description: "使用快捷按钮或直接输入自然语言描述您的需求"
  },
  {
    step: 3,
    title: "获取结果",
    description: "系统自动识别场景，执行相应功能并展示结果"
  },
  {
    step: 4,
    title: "继续交互",
    description: "根据建议问题继续对话，或提出新的需求"
  }
];

export const EnhancedChatDemo: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* 头部 */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">增强版聊天机器人</h1>
                <p className="text-sm text-muted-foreground">智能知识库 · 图片解析 · 技能调用</p>
              </div>
            </div>
            <Button onClick={() => setIsChatOpen(true)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              打开聊天
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* 功能介绍 */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              全新升级
            </Badge>
            <h2 className="text-3xl font-bold mb-4">更智能的交互体验</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              参考 anbeime/skill 项目设计，为 antinet 聊天机器人添加知识库查询、
              图片解析、技能调用等增强功能
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4",
                      feature.color
                    )}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">示例：</p>
                      {feature.examples.map((example, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <ArrowRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{example}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <Separator />

        {/* 使用步骤 */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">快速开始</h2>
            <p className="text-muted-foreground">只需简单几步，即可体验增强功能</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {usageSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{step.step}</span>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <Separator />

        {/* 技术架构 */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">技术架构</h2>
            <p className="text-muted-foreground">基于现代技术栈构建，确保性能和可扩展性</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">场景检测引擎</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 正则表达式模式匹配</li>
                  <li>• 关键词提取</li>
                  <li>• 上下文感知</li>
                  <li>• 多场景支持</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">知识库系统</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 语义搜索</li>
                  <li>• 相似度排序</li>
                  <li>• 四色卡片分类</li>
                  <li>• 智能推荐</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">技能框架</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 插件化架构</li>
                  <li>• 动态注册</li>
                  <li>• 参数验证</li>
                  <li>• 错误处理</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 参考项目 */}
        <section className="bg-muted/50 rounded-2xl p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">参考项目</h2>
            <p className="text-muted-foreground mb-6">
              本实现参考了 anbeime/skill 项目的设计模式和最佳实践
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href="https://github.com/anbeime/skill/tree/main/projects/assistant" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Bot className="w-4 h-4" />
                assistant - 智能代理框架
              </a>
              <a 
                href="https://github.com/anbeime/skill/tree/main/projects/companion-skill" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Sparkles className="w-4 h-4" />
                companion-skill - 技能系统
              </a>
              <a 
                href="https://github.com/anbeime/skill/tree/main/projects/xiaoyue-web" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <MessageSquare className="w-4 h-4" />
                xiaoyue-web - Web界面
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 聊天组件 */}
      <EnhancedChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* 悬浮按钮 */}
      {!isChatOpen && (
        <ChatButton position="bottom-right" />
      )}
    </div>
  );
};

// 辅助函数
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default EnhancedChatDemo;
