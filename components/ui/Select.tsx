
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select: React.FC<SelectProps> = ({ label, children, className, ...props }) => {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-brand-DEFAULT focus:border-brand-DEFAULT sm:text-sm rounded-md ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

export default Select;
