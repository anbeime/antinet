// src/pages/KnowledgeGraphWorkbenchPage.tsx
// 知识图谱工作台页面
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import KnowledgeGraphWorkbench from '@/components/KnowledgeGraphWorkbench';

const KnowledgeGraphWorkbenchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialColor = searchParams.get('color') || undefined;
  const projectId = searchParams.get('project_id') ? parseInt(searchParams.get('project_id')!) : undefined;

  useEffect(() => {
    document.title = '知识图谱工作台 - 知易';
    const params = new URLSearchParams(searchParams);
    let changed = false;
    if (params.has('color') && !params.get('color')) { params.delete('color'); changed = true; }
    if (params.has('project_id') && !params.get('project_id')) { params.delete('project_id'); changed = true; }
    if (changed) setSearchParams(params);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <KnowledgeGraphWorkbench initialColorFilter={initialColor} projectId={projectId} />
    </div>
  );
};

export default KnowledgeGraphWorkbenchPage;