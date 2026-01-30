import React from 'react';

export const Button = ({ children, className = '', variant = 'default', ...props }: { children: React.ReactNode; className?: string; variant?: string; [key: string]: any }) => {
  const base = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800',
  };
  const variantClass = variants[variant as keyof typeof variants] || variants.default;
  return <button className={`${base} ${variantClass} ${className}`} {...props}>{children}</button>;
};