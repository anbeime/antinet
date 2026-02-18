/**
 * 聊天按钮组件 - 触发增强版聊天机器人
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedChatBot } from './EnhancedChatBot';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const ChatButton: React.FC<ChatButtonProps> = ({ 
  className,
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <>
      {/* 聊天按钮 */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "fixed z-40",
              positionClasses[position],
              className
            )}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <MessageCircle className="w-6 h-6" />
              
              {/* 通知红点 */}
              {hasNotification && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background" />
              )}

              {/* 闪烁效果 */}
              <motion.div
                className="absolute inset-0 rounded-full bg-white/20"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </Button>

            {/* 提示文字 */}
            <motion.div
              initial={{ opacity: 0, x: position.includes('right') ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 whitespace-nowrap",
                position.includes('right') ? "right-full mr-3" : "left-full ml-3"
              )}
            >
              <div className="bg-background border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">智能助手</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 聊天窗口 */}
      <EnhancedChatBot 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
};

export default ChatButton;
