
import { UploadResponse, CleaningDecisions, CleanDataResponse, DescriptiveStats, OlsResult, PlotResponse } from '../types';

const MOCK_API_DELAY = 1000;

// Helper function to simulate network delay
const delay = <T,>(data: T): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, MOCK_API_DELAY);
    });
};

export const uploadFile = (file: File): Promise<UploadResponse> => {
    console.log(`Uploading file: ${file.name}`);
    
    const mockResponse: UploadResponse = {
        session_token: `mock_session_${Date.now()}`,
        columns: ['age', 'salary', 'years_experience', 'department', 'performance_score'],
        validation_results: {
            missing_data: { 'salary': 5, 'years_experience': 2 },
            type_mismatches: { 'performance_score': [12, 45, 67] },
            categorical_flags: ['department']
        },
        row_count: 1000,
        preview: [
            { 'age': 34, 'salary': 70000, 'years_experience': 10, 'department': 'Sales', 'performance_score': '8.5' },
            { 'age': 45, 'salary': 95000, 'years_experience': 20, 'department': 'Engineering', 'performance_score': 9.2 },
            { 'age': 28, 'salary': null, 'years_experience': 5, 'department': 'Marketing', 'performance_score': 7.8 },
            { 'age': 52, 'salary': 120000, 'years_experience': 30, 'department': 'Sales', 'performance_score': 9.8 },
            { 'age': 30, 'salary': 65000, 'years_experience': 7, 'department': 'Engineering', 'performance_score': 'err' },
        ],
    };
    
    return delay(mockResponse);
};

export const cleanData = (sessionToken: string, decisions: CleaningDecisions): Promise<CleanDataResponse> => {
    console.log(`Cleaning data for session ${sessionToken} with decisions:`, decisions);
    
    const mockResponse: CleanDataResponse = {
        columns: ['age', 'salary', 'years_experience', 'performance_score'],
        preview: [
            { 'age': 34, 'salary': 70000, 'years_experience': 10, 'performance_score': 8.5 },
            { 'age': 45, 'salary': 95000, 'years_experience': 20, 'performance_score': 9.2 },
            { 'age': 28, 'salary': 85000, 'years_experience': 5, 'performance_score': 7.8 }, // Imputed
            { 'age': 52, 'salary': 120000, 'years_experience': 30, 'performance_score': 9.8 },
            { 'age': 30, 'salary': 65000, 'years_experience': 7, 'performance_score': 8.2 }, // Converted
        ],
    };

    return delay(mockResponse);
};

export const getDescriptiveStats = (sessionToken: string, dependentVar: string, independentVars: string[]): Promise<DescriptiveStats> => {
    console.log('Getting descriptive stats for:', { dependentVar, independentVars });

    const mockStats: DescriptiveStats = {
        [dependentVar]: { mean: 85000, median: 82000, std_dev: 15000, min: 45000, max: 250000, skewness: 0.8, kurtosis: 1.2, outliers_count: 15 },
        ...independentVars.reduce((acc, v) => ({
            ...acc,
            [v]: { mean: 40 + Math.random()*10, median: 38 + Math.random()*10, std_dev: 8 + Math.random()*5, min: 22, max: 65, skewness: 0.2, kurtosis: -0.1, outliers_count: 5 }
        }), {})
    };

    return delay(mockStats);
};

export const generatePlots = (sessionToken: string, variables: string[]): Promise<PlotResponse> => {
    console.log('Generating plots for variables:', variables);
    const plot_urls = variables.map((_, i) => `https://picsum.photos/seed/${Date.now() + i}/600/400`);
    return delay({ plot_urls });
};

export const runOlsAnalysis = (sessionToken: string, dependentVar: string, independentVars: string[], modelName: string): Promise<OlsResult> => {
    console.log('Running OLS:', { dependentVar, independentVars, modelName });
    
    const mockResult: OlsResult = {
        model_name: modelName,
        coefficients: {
            'const': { coefficient: 25000, std_error: 5000, t_statistic: 5, p_value: 0.0001 },
            ...independentVars.reduce((acc, v) => ({
                ...acc,
                [v]: { coefficient: Math.random() * 2000, std_error: Math.random() * 500, t_statistic: 4 + Math.random(), p_value: Math.random() * 0.05 }
            }), {})
        },
        r_squared: 0.78 + Math.random() * 0.1,
        adj_r_squared: 0.77 + Math.random() * 0.1,
        f_statistic: 125.4 + Math.random() * 20,
        f_p_value: 0.00001,
        warnings: Math.random() > 0.7 ? ['High multicollinearity detected (Condition Number: 55.4). Results may be unreliable.'] : []
    };

    return delay(mockResult);
};

export const endSession = (sessionToken: string): Promise<{ status: string }> => {
    console.log(`Ending session: ${sessionToken}`);
    // In a real app, this would trigger backend cleanup
    return delay({ status: 'Session deleted successfully' });
};
