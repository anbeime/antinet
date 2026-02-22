import React, { useState } from 'react';
import { Bot, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkingChatBot } from '@/components/WorkingChatBot';

const steps = [
  {
    title: '启动后端服务',
    command: 'cd backend && python main.py',
    description: '确保后端运行在 http://localhost:8000'
  },
  {
    title: '启动前端服务',
    command: 'npm run dev',
    description: '前端运行在 http://localhost:5173'
  },
  {
    title: '测试聊天功能',
    command: '点击打开聊天',
    description: '测试文本输入和图片上传'
  }
];

export const WorkingChatTest: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">图片解析修复测试</h1>
          <p className="text-gray-600 dark:text-gray-400">
            这个版本修复了图片上传和解析问题
          </p>
        </div>

        {/* 状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold">文本输入</h3>
              <p className="text-sm text-gray-500">已修复</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold">图片上传</h3>
              <p className="text-sm text-gray-500">已修复</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold">后端连接</h3>
              <p className="text-sm text-gray-500">已修复</p>
            </CardContent>
          </Card>
        </div>

        {/* 启动步骤 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>启动步骤</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <code className="block mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded text-sm">
                      {step.command}
                    </code>
                    <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 测试按钮 */}
        <div className="text-center">
          <Card className="inline-block">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">开始测试</h3>
              <Button 
                size="lg" 
                onClick={() => setIsOpen(true)}
                className="gap-2"
              >
                <Play className="w-5 h-5" />
                打开聊天机器人
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                确保后端已启动后再打开
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 注意事项 */}
        <Card className="mt-8 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">注意事项</h3>
                <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  <li>• 首次使用需要在 backend/main.py 中注册路由</li>
                  <li>• 确保后端服务运行在 http://localhost:8000</li>
                  <li>• 图片分析需要配置视觉服务才能获取详细结果</li>
                  <li>• 当前版本支持基础图片接收和简单分析</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <WorkingChatBot isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};

export default WorkingChatTest;
