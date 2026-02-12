import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, AlertCircle } from 'lucide-react';

interface AttachSpriteProps {
  onClick?: () => void;
  serviceAvailable?: boolean;
}

const AttachSprite: React.FC<AttachSpriteProps> = ({ onClick, serviceAvailable = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  
  // 从 localStorage 读取位置或使用默认位置
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('attachSpritePosition');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        return { x: pos.x, y: pos.y };
      } catch (e) {
        console.error('Failed to parse position:', e);
      }
    }
    // 默认右下角位置
    return { x: window.innerWidth - 120, y: window.innerHeight - 120 };
  });

  // 处理拖动结束
  const handleDragEnd = (_: any, info: any) => {
    setIsDragging(false);
    setHasDragged(true);
    
    const newX = Math.max(0, Math.min(position.x + info.offset.x, window.innerWidth - 100));
    const newY = Math.max(0, Math.min(position.y + info.offset.y, window.innerHeight - 100));
    
    const newPosition = { x: newX, y: newY };
    setPosition(newPosition);
    localStorage.setItem('attachSpritePosition', JSON.stringify(newPosition));
  };

  // 处理点击 - 只有在没有拖动时才触发
  const handleClick = () => {
    if (!hasDragged && onClick) {
      onClick();
    }
    setHasDragged(false);
  };

  // 双击重置位置
  const handleDoubleClick = () => {
    const defaultPos = { x: window.innerWidth - 120, y: window.innerHeight - 120 };
    setPosition(defaultPos);
    localStorage.removeItem('attachSpritePosition');
  };

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 100),
        y: Math.min(prev.y, window.innerHeight - 100)
      }));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-40"
      style={{ overflow: 'hidden' }}
    >
      <motion.div
        className="absolute pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          width: 96,
          height: 96,
        }}
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={containerRef}
        onDragStart={() => {
          setIsDragging(true);
          setHasDragged(false);
        }}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
        }}
        whileHover={{ 
          scale: 1.1,
          rotate: [0, -5, 5, -5, 5, 0],
          transition: { 
            rotate: { duration: 0.5, ease: "easeInOut" }
          }
        }}
        whileTap={{ scale: 0.95 }}
        whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
        title={serviceAvailable ? "拖动移动，双击重置位置" : "服务不可用，双击重置位置"}
      >
        {/* 拖动手柄 */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 opacity-60">
          <div className="w-8 h-1 bg-gray-400 rounded-full" />
        </div>
        
        <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-shadow ${
          serviceAvailable 
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-xl' 
            : 'bg-gradient-to-r from-gray-400 to-gray-600'
        } ${isDragging ? 'shadow-2xl' : ''}`}>
          {serviceAvailable ? (
            <Bot className="w-12 h-12 text-white" />
          ) : (
            <AlertCircle className="w-12 h-12 text-white" />
          )}
        </div>
        
        {/* 拖动提示 */}
        {isDragging && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded whitespace-nowrap shadow-lg">
            拖动到任意位置
          </div>
        )}
        
        {!serviceAvailable && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md">
            <span className="text-xs text-white font-bold">!</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AttachSprite;
