import React from 'react';

export const Card = ({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => {
  return <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`} onClick={onClick}>{children}</div>;
};

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${className}`}>{children}</div>;
};

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
};

export const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

export const CardDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
};