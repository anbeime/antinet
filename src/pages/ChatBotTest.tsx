/**
 * 聊天机器人测试页面
 * 用于测试修复后的聊天功能
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChatBotFix } from '@/components/ChatBotFix';

const testCases = [
  {
    name: '文本输入测试',
    description: '测试消息输入框是否可以正常输入和发送',
    status: 'ready'
  },
  {
    name: '图片上传测试',
    description: '测试图片选择、预览和发送功能',
    status: 'ready'
  },
  {
    name: '消息显示测试',
    description: '测试消息是否正确显示在聊天窗口',
    status: 'ready'
  },
  {
    name: '键盘快捷键测试',
    description: '测试 Enter 发送、Shift+Enter 换行',
    status: 'ready'
  }
];

export const ChatBotTest: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">聊天机器人修复测试</h1>
          <p className="text-muted-foreground">
            测试修复后的输入和图片发送功能
          </p>
        </motion.div>

        {/* 测试用例 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          {testCases.map((test, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{test.name}</CardTitle>
                  <Badge variant={test.status === 'ready' ? 'default' : 'secondary'}>
                    {test.status === 'ready' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <AlertCircle className="w-3 h-3 mr-1" />
                    )}
                    {test.status === 'ready' ? '就绪' : '待测试'}
                  </Badge>
                </div>
                <CardDescription>{test.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </motion.div>

        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <Card className="inline-block">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">开始测试</h3>
              <Button 
                size="lg" 
                onClick={() => setIsChatOpen(true)}
                className="gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                打开修复版聊天机器人
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* 修复说明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>修复内容</CardTitle>
              <CardDescription>本次修复解决的问题</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>修复了文本输入框无法输入的问题</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>修复了图片选择和预览功能</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>修复了消息发送逻辑</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>添加了键盘快捷键支持（Enter发送）</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>优化了错误处理和用户提示</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 聊天机器人组件 */}
      <ChatBotFix isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default ChatBotTest;
