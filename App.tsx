
import React, { useState, useCallback, useEffect } from 'react';
import UploadStep from './components/UploadStep';
import ValidationStep from './components/ValidationStep';
import AnalysisStep from './components/AnalysisStep';
import { AppStep, UploadResponse, CleaningDecisions, CleanDataResponse } from './types';
import * as api from './services/apiService';
import { TrashIcon } from './components/icons';
import Button from './components/ui/Button';
import Spinner from './components/ui/Spinner';

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [pythonReady, setPythonReady] = useState<boolean>(false);
    const [loadingProgress, setLoadingProgress] = useState<number>(0);

    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
    const [cleanedData, setCleanedData] = useState<CleanDataResponse | null>(null);

    // Simulate progress bar loading
    useEffect(() => {
        const progressInterval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                // Slow down as we get closer to 100%
                if (prev >= 90) {
                    return prev + 0.5; // Very slow at the end
                } else if (prev >= 70) {
                    return prev + 1; // Slow down
                } else if (prev >= 40) {
                    return prev + 2; // Medium speed
                } else {
                    return prev + 3; // Fast at the beginning
                }
            });
        }, 100);

        return () => clearInterval(progressInterval);
    }, []);

    // Check if Python is ready
    useEffect(() => {
        const checkPythonReady = () => {
            if (window.pyAnalysisReady) {
                setLoadingProgress(100); // Jump to 100% when ready
                setTimeout(() => setPythonReady(true), 300); // Small delay for visual effect
            } else {
                setTimeout(checkPythonReady, 100);
            }
        };
        checkPythonReady();
    }, []);

    const resetState = () => {
        setStep(AppStep.UPLOAD);
        setIsLoading(false);
        setError(null);
        setSessionToken(null);
        setUploadData(null);
        setCleanedData(null);
    };

    const handleEndSession = async () => {
        if (sessionToken) {
            await api.endSession(sessionToken);
        }
        resetState();
    };

    const handleUpload = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.uploadFile(file);
            setUploadData(data);
            setSessionToken(data.session_token);
            setStep(AppStep.VALIDATION);
        } catch (err) {
            setError('File upload failed. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleClean = useCallback(async (decisions: CleaningDecisions) => {
        if (!sessionToken) {
            setError("Session expired. Please start over.");
            resetState();
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.cleanData(sessionToken, decisions);
            setCleanedData(data);
            setStep(AppStep.ANALYSIS);
        } catch (err) {
            setError('Data cleaning failed. Please review your choices.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [sessionToken]);


    const renderStep = () => {
        switch (step) {
            case AppStep.UPLOAD:
                return <UploadStep onUpload={handleUpload} isLoading={isLoading} error={error} />;
            case AppStep.VALIDATION:
                if (uploadData) {
                    return <ValidationStep uploadData={uploadData} onClean={handleClean} isLoading={isLoading} />;
                }
                return null;
            case AppStep.ANALYSIS:
                if (sessionToken && cleanedData) {
                    return <AnalysisStep sessionToken={sessionToken} cleanedData={cleanedData} />;
                }
                return null;
            default:
                return <div>Invalid state</div>;
        }
    };

    // Show loading screen while Python libraries are loading
    if (!pythonReady) {
        return (
            <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
                <div className="text-center space-y-8 max-w-2xl px-6">
                    {/* Title */}
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold text-slate-800">OLS Statistical Analyzer</h1>
                        <p className="text-slate-600 text-lg">Initializing Analysis Environment</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-3 w-full">
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                                style={{ width: `${loadingProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-slate-700 text-xl font-semibold">{Math.round(loadingProgress)}%</p>
                    </div>

                    {/* Loading message */}
                    <div className="space-y-3">
                        <p className="text-slate-700 text-base font-medium">Loading Python Libraries...</p>

                        {/* Library list */}
                        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-left">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    <span className="text-slate-700 font-medium">pandas</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    <span className="text-slate-700 font-medium">numpy</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    <span className="text-slate-700 font-medium">matplotlib</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    <span className="text-slate-700 font-medium">scipy</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    <span className="text-slate-700 font-medium">statsmodels</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    <span className="text-slate-700 font-medium">seaborn</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer message */}
                    <p className="text-slate-500 text-sm">This may take a few moments on first load...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 bg-brand-DEFAULT rounded-full flex items-center justify-center text-white font-bold text-xl">S</div>
                         <h1 className="text-2xl font-bold text-slate-800">Statistical Analyzer</h1>
                    </div>

                    {sessionToken && (
                        <Button variant="danger" onClick={handleEndSession} icon={<TrashIcon className="w-4 h-4"/>}>
                            End Session
                        </Button>
                    )}
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderStep()}
            </main>
            <footer className="text-center py-4 text-sm text-slate-500">
                <p>&copy; {new Date().getFullYear()} Statistical Analysis App. All Rights Reserved.</p>
                <a href="#" className="underline hover:text-brand-DEFAULT">Privacy Policy</a>
            </footer>
        </div>
    );
};

export default App;
