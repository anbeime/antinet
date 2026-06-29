import React from 'react';

/**
 * Badge 徽标占位组件
 *
 * 说明：项目原 @/components/ui/badge 文件缺失，此处提供与 shadcn/ui 风格一致的最小实现，
 * 保证 SkillManager 等依赖方可正常导入与渲染。
 */
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  variant?: BadgeVariant;
} & React.HTMLAttributes<HTMLSpanElement>;

const variantClass: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
  secondary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  outline: 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
};

export const Badge = ({ children, className = '', variant = 'default', ...props }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
