import React from 'react';
import { motion } from 'framer-motion';
import { Bot, AlertCircle } from 'lucide-react';

interface AttachSpriteProps {
  onClick?: () => void;
  serviceAvailable?: boolean;
}

const AttachSprite: React.FC<AttachSpriteProps> = ({ onClick, serviceAvailable = true }) => {
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40 cursor-pointer"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        transition: { 
          type: "spring", 
          stiffness: 100,
          damping: 15
        }
      }}
      whileHover={{ 
        scale: 1.1,
        rotate: [0, -5, 5, -5, 5, 0],
        transition: { 
          rotate: { duration: 0.5, ease: "easeInOut" }
        }
      }}
      whileTap={{ scale: 0.9 }}
      title={serviceAvailable ? "Antinet 使用答疑助手" : "答疑服务不可用，点击查看修复步骤"}
    >
      <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${serviceAvailable ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-gray-400 to-gray-600'}`}>
        {serviceAvailable ? (
          <Bot className="w-12 h-12 text-white" />
        ) : (
          <AlertCircle className="w-12 h-12 text-white" />
        )}
      </div>
      {!serviceAvailable && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">!</span>
        </div>
      )}
    </motion.div>
  );
};

export default AttachSprite;