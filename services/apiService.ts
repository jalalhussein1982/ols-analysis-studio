
import { UploadResponse, CleaningDecisions, CleanDataResponse, DescriptiveStats, OlsResult, PlotResponse } from '../types';

// Extend window interface to include PyScript functions
declare global {
    interface Window {
        pyAnalysisReady?: boolean;
        pyUploadFile?: (fileContent: string, fileName: string) => any;
        pyCleanData?: (sessionToken: string, decisions: any) => any;
        pyGetDescriptiveStats?: (sessionToken: string, dependentVar: string, independentVars: string[]) => any;
        pyGeneratePlots?: (sessionToken: string, variables: string[]) => any;
        pyRunOlsAnalysis?: (sessionToken: string, dependentVar: string, independentVars: string[], modelName: string) => any;
        pyEndSession?: (sessionToken: string) => any;
    }
}

// Wait for Python to be ready
const waitForPython = (): Promise<void> => {
    return new Promise((resolve) => {
        if (window.pyAnalysisReady) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.pyAnalysisReady) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
};

// Helper to convert PyScript result to JavaScript object
const convertPyResult = (pyResult: any): any => {
    if (!pyResult) return null;

    console.log('[JS] Converting Python result:', pyResult);

    // If it's already a plain object, return it
    if (typeof pyResult === 'object' && pyResult.constructor === Object) {
        console.log('[JS] Already plain object');
        return pyResult;
    }

    // Try to convert from Python proxy
    try {
        const converted = JSON.parse(JSON.stringify(pyResult));
        console.log('[JS] Converted result:', converted);
        return converted;
    } catch (e) {
        console.error('[JS] Conversion error:', e);
        console.log('[JS] Returning raw result');
        return pyResult;
    }
};

export const uploadFile = async (file: File): Promise<UploadResponse> => {
    await waitForPython();

    // Read file content
    const fileContent = await file.text();

    if (!window.pyUploadFile) {
        throw new Error('Python analysis module not loaded');
    }

    const result = window.pyUploadFile(fileContent, file.name);
    const jsResult = convertPyResult(result);

    if (jsResult.error) {
        throw new Error(jsResult.error);
    }

    return jsResult as UploadResponse;
};

export const cleanData = async (sessionToken: string, decisions: CleaningDecisions): Promise<CleanDataResponse> => {
    await waitForPython();

    if (!window.pyCleanData) {
        throw new Error('Python analysis module not loaded');
    }

    const result = window.pyCleanData(sessionToken, decisions);
    const jsResult = convertPyResult(result);

    if (jsResult.error) {
        throw new Error(jsResult.error);
    }

    return jsResult as CleanDataResponse;
};

export const getDescriptiveStats = async (sessionToken: string, dependentVar: string, independentVars: string[]): Promise<DescriptiveStats> => {
    await waitForPython();

    console.log('[JS] getDescriptiveStats called with:', { sessionToken, dependentVar, independentVars });

    if (!window.pyGetDescriptiveStats) {
        throw new Error('Python analysis module not loaded');
    }

    try {
        const result = window.pyGetDescriptiveStats(sessionToken, dependentVar, independentVars);
        const jsResult = convertPyResult(result);

        if (jsResult?.error) {
            console.error('[JS] Python error in getDescriptiveStats:', jsResult.error);
            throw new Error(jsResult.error);
        }

        return jsResult as DescriptiveStats;
    } catch (error) {
        console.error('[JS] Exception in getDescriptiveStats:', error);
        throw error;
    }
};

export const generatePlots = async (sessionToken: string, variables: string[]): Promise<PlotResponse> => {
    await waitForPython();

    console.log('[JS] generatePlots called with:', { sessionToken, variables });

    if (!window.pyGeneratePlots) {
        throw new Error('Python analysis module not loaded');
    }

    try {
        const result = window.pyGeneratePlots(sessionToken, variables);
        const jsResult = convertPyResult(result);

        if (jsResult?.error) {
            console.error('[JS] Python error in generatePlots:', jsResult.error);
            throw new Error(jsResult.error);
        }

        return jsResult as PlotResponse;
    } catch (error) {
        console.error('[JS] Exception in generatePlots:', error);
        throw error;
    }
};

export const runOlsAnalysis = async (sessionToken: string, dependentVar: string, independentVars: string[], modelName: string): Promise<OlsResult> => {
    await waitForPython();

    console.log('[JS] runOlsAnalysis called with:', { sessionToken, dependentVar, independentVars, modelName });

    if (!window.pyRunOlsAnalysis) {
        throw new Error('Python analysis module not loaded');
    }

    try {
        const result = window.pyRunOlsAnalysis(sessionToken, dependentVar, independentVars, modelName);
        const jsResult = convertPyResult(result);

        if (jsResult?.error) {
            console.error('[JS] Python error in runOlsAnalysis:', jsResult.error);
            throw new Error(jsResult.error);
        }

        return jsResult as OlsResult;
    } catch (error) {
        console.error('[JS] Exception in runOlsAnalysis:', error);
        throw error;
    }
};

export const endSession = async (sessionToken: string): Promise<{ status: string }> => {
    await waitForPython();

    if (!window.pyEndSession) {
        throw new Error('Python analysis module not loaded');
    }

    const result = window.pyEndSession(sessionToken);
    const jsResult = convertPyResult(result);

    if (jsResult.error) {
        throw new Error(jsResult.error);
    }

    return jsResult as { status: string };
};
