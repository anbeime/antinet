// src/pages/KnowledgeGraphWorkbenchPage.tsx
// 知识图谱工作台页面

import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import KnowledgeGraphWorkbench from '@/components/KnowledgeGraphWorkbench';

const KnowledgeGraphWorkbenchPage: React.FC = () => {
  useTheme();
  
  return <KnowledgeGraphWorkbench />;
};

export default KnowledgeGraphWorkbenchPage;