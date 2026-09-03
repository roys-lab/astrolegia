import React from 'react';

export interface CardProps {
  title?: string;
  description?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  headerExtra,
  children,
  className = '',
}) => {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm ${className}`}>
      {(title || description || headerExtra) && (
        <div className="flex items-start justify-between gap-4 mb-5 border-b border-slate-800/80 pb-4">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
            {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
          </div>
          {headerExtra && <div>{headerExtra}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
