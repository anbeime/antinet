/**
 * 聊天按钮组件 - 触发增强版聊天机器人
 * 支持拖拽
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, GripVertical } from 'lucide-react';
import chatAvatar from '../pages/logo.gif';
import { EnhancedChatBot } from './EnhancedChatBot';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  className?: string;
  initialPosition?: { x: number; y: number };
  onCardClick?: (card: any) => void;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ 
  className,
  initialPosition = { x: 0, y: 0 },
  onCardClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
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
            key="chat-button"
            onMouseDown={handleMouseDown}
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px)`,
              right: '24px'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "fixed z-50 cursor-move bottom-24 sm:top-1/2 sm:bottom-auto",
              className
            )}
          >
            <div
              onClick={() => setIsOpen(true)}
              className="w-16 h-16 sm:w-14 sm:h-14 cursor-pointer relative"
            >
              <img src={chatAvatar} alt="智能助手" className="w-16 h-16 sm:w-14 sm:h-14 object-contain drop-shadow-lg hover:scale-110 transition-transform" />
            </div>

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
                <span className="text-sm font-medium">小易</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 聊天窗口 */}
      <EnhancedChatBot 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onCardClick={onCardClick}
      />
    </>
  );
};

export default ChatButton;
