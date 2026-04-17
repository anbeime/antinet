import React from 'react';
import { Cloud, Flower2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DecoPatternProps } from '@/types/calendar';

export default function DecoPattern({ className = '' }: DecoPatternProps) {
  return (
    <motion.div
      className={`w-full h-20 flex items-center justify-center ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.6 }}
      transition={{ delay: 1.0, duration: 0.5 }}
    >
      <div className="flex items-center space-x-6">
        <motion.div
          animate={{ x: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Cloud className="w-8 h-8" style={{ color: 'rgba(212, 165, 116, 0.4)' }} />
        </motion.div>

        <div className="flex space-x-3">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-3 h-8 rounded-full"
              style={{ background: 'linear-gradient(to bottom, rgba(212, 165, 116, 0.4), transparent)' }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
            />
          ))}
        </div>

        <motion.div
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Flower2 className="w-8 h-8" style={{ color: 'rgba(212, 165, 116, 0.4)' }} />
        </motion.div>
      </div>
    </motion.div>
  );
}

