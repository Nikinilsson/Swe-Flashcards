
import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const IconButton: React.FC<IconButtonProps> = ({ children, ...props }) => {
  return (
    <button
      {...props}
      className="w-14 h-14 bg-white/60 rounded-full flex items-center justify-center text-slate-800 shadow-lg hover:bg-white/90 active:shadow-inner active:bg-white/100 backdrop-blur-sm border border-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white"
    >
      {children}
    </button>
  );
};

export default IconButton;
