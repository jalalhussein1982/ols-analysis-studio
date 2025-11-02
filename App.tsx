
import React, { useState, useCallback } from 'react';
import UploadStep from './components/UploadStep';
import ValidationStep from './components/ValidationStep';
import AnalysisStep from './components/AnalysisStep';
import { AppStep, UploadResponse, CleaningDecisions, CleanDataResponse } from './types';
import * as api from './services/apiService';
import { TrashIcon } from './components/icons';
import Button from './components/ui/Button';

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
    const [cleanedData, setCleanedData] = useState<CleanDataResponse | null>(null);

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
