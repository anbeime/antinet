import React from 'react';
import type { CSSProperties, MouseEventHandler } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
}

export function Card({ children, className = '', style, onMouseEnter, onMouseLeave }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}
