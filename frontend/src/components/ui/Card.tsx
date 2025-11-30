import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <div 
      className={cn(
        "bg-card border border-border rounded-xl p-4 md:p-6 backdrop-blur-sm",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};



