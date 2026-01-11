import React from 'react';
import { motion } from 'framer-motion';

interface AttachSpriteProps {
  onClick?: () => void;
}

const AttachSprite: React.FC<AttachSpriteProps> = ({ onClick }) => {
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
    >
      <img 
        src="https://lf-code-agent.coze.cn/obj/x-ai-cn/265060818434/attachment/img-default_20251120183412.gif" 
        alt="精灵助手"
        className="w-24 h-24 object-contain"
      />
    </motion.div>
  );
};

export default AttachSprite;