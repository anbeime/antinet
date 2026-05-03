// src/pages/KnowledgeGraphWorkbenchPage.tsx
// 知识图谱工作台页面
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import KnowledgeGraphWorkbench from '@/components/KnowledgeGraphWorkbench';

const KnowledgeGraphWorkbenchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial color filter from URL if present
  const initialColor = searchParams.get('color') || undefined;
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <KnowledgeGraphWorkbench initialColorFilter={initialColor} />
    </div>
  );
};

export default KnowledgeGraphWorkbenchPage;