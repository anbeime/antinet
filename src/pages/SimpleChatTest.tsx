import React, { useState } from 'react';
import { Bot, MessageSquare, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleChatBot } from '@/components/SimpleChatBot';

export const SimpleChatTest: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">简单版聊天机器人测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              这个版本修复了关闭问题，使用最简单的实现方式
            </p>
            <Button 
              size="lg" 
              onClick={() => setIsOpen(true)}
              className="gap-2"
            >
              <Play className="w-5 h-5" />
              打开聊天机器人
            </Button>
          </CardContent>
        </Card>
      </div>

      <SimpleChatBot isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};

export default SimpleChatTest;
