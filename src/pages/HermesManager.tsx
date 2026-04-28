// src/pages/HermesManager.tsx - Hermes Agent 管理页面
import React from 'react';
import HermesManagementPanel from '@/components/HermesManagementPanel';

const HermesManager: React.FC = () => {
  return (
    <div className="h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <HermesManagementPanel />
    </div>
  );
};

export default HermesManager;