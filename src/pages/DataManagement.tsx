import React from 'react';
import { motion } from 'framer-motion';
import GTDSystem from '@/components/GTDSystem';

const DataManagement: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <GTDSystem />
    </motion.div>
  );
};

export default DataManagement;
