/**
 * 聊天按钮组件 - 触发增强版聊天机器人
 * 支持拖拽
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Sparkles, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedChatBot } from './EnhancedChatBot';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  className?: string;
  initialPosition?: { x: number; y: number };
}

export const ChatButton: React.FC<ChatButtonProps> = ({ 
  className,
  initialPosition = { x: 0, y: 0 }
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <>
      {/* 聊天按钮 */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            ref={dragRef}
            onMouseDown={handleMouseDown}
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            className={cn(
              "fixed z-40 cursor-move bottom-6 right-6",
              className
            )}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Shield className="w-6 h-6" />
              
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

            {/* 拖拽手柄 */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
              <GripVertical className="w-3 h-3 text-white" />
            </div>

            {/* 提示文字 */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-1/2 -translate-y-1/2 right-full mr-3"
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
