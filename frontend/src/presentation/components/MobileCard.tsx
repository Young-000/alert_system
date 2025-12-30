import React from 'react';

interface MobileCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  icon?: string;
}

export function MobileCard({ title, children, className = '', onClick, icon }: MobileCardProps) {
  const baseClasses = 'bg-white rounded-2xl shadow-sm p-4 mb-3';
  const interactiveClasses = onClick ? 'active:scale-98 transition-transform cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {(title || icon) && (
        <div className="flex items-center mb-3">
          {icon && <span className="text-2xl mr-2">{icon}</span>}
          {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
}
