
import React, { useState } from 'react';

interface TooltipProps {
    children: React.ReactNode;
    text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
    const [visible, setVisible] = useState(false);

    return (
        <div 
            className="relative inline-flex items-center" 
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 bg-slate-800 text-white text-xs rounded-md shadow-lg z-10">
                    {text}
                </div>
            )}
        </div>
    );
};

export default Tooltip;
