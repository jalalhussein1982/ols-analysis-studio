
export enum AppStep {
  UPLOAD = 'UPLOAD',
  VALIDATION = 'VALIDATION',
  ANALYSIS = 'ANALYSIS',
}

export interface ValidationResults {
  missing_data: { [key: string]: number };
  type_mismatches: { [key: string]: number[] };
  categorical_flags: string[];
}

export interface UploadResponse {
  session_token: string;
  columns: string[];
  validation_results: ValidationResults;
  row_count: number;
  preview: Array<{ [key: string]: string | number }>;
}

export type CleaningDecision = 'delete_rows' | 'impute_mean' | 'impute_median' | 'forward_fill' | 'drop_column' | 'convert_to_numeric';
export type CleaningDecisions = { [key: string]: CleaningDecision };

export interface CleanDataResponse {
  columns: string[];
  preview: Array<{ [key: string]: string | number }>;
}

export interface DescriptiveStats {
  [key: string]: {
    mean: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
    skewness: number;
    kurtosis: number;
    outliers_count: number;
  };
}

export interface PlotResponse {
    plot_urls: string[];
}

export interface OlsResult {
    model_name: string;
    coefficients: { [key: string]: { coefficient: number; std_error: number; t_statistic: number; p_value: number; } };
    r_squared: number;
    adj_r_squared: number;
    f_statistic: number;
    f_p_value: number;
    warnings: string[];
}
