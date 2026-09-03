import React from 'react';

export type BadgeVariant = 'default' | 'user' | 'viewer' | 'editor' | 'super_admin' | 'success' | 'warning';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
  icon,
}) => {
  const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    user: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
    viewer: 'bg-teal-950/80 text-teal-300 border-teal-800/60',
    editor: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    super_admin: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    warning: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};
