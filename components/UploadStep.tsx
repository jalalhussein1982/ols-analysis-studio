
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

interface UploadStepProps {
    onUpload: (file: File) => void;
    isLoading: boolean;
    error: string | null;
}

const UploadStep: React.FC<UploadStepProps> = ({ onUpload, isLoading, error }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(e.dataTransfer.files[0]);
        }
    }, [onUpload]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files[0]);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragging ? 'border-brand-DEFAULT bg-brand-light' : 'border-slate-300 bg-white'}`}
            >
                {isLoading ? (
                    <div className="text-center">
                        <Spinner size="lg" className="mx-auto" />
                        <p className="mt-4 text-slate-600">Analyzing your dataset...</p>
                    </div>
                ) : (
                    <>
                        <UploadIcon className="w-16 h-16 text-slate-400" />
                        <p className="mt-4 text-lg font-semibold text-slate-700">Drag & drop your dataset here</p>
                        <p className="text-slate-500">or</p>
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".csv,.xls,.xlsx"
                        />
                        <Button onClick={() => document.getElementById('file-upload')?.click()} className="mt-4">
                            Browse Files
                        </Button>
                        <p className="mt-2 text-xs text-slate-400">CSV, XLS, XLSX up to 500MB</p>
                    </>
                )}
            </div>
            {error && <p className="mt-4 text-center text-red-600">{error}</p>}
        </div>
    );
};

export default UploadStep;
