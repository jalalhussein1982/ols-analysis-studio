
import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-16 w-16',
    };

    return (
        <div className={`animate-spin rounded-full border-4 border-slate-300 border-t-brand-DEFAULT border-b-brand-DEFAULT ${sizeClasses[size]} ${className}`}></div>
    );
};

export default Spinner;
