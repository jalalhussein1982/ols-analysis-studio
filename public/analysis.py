"""
OLS Analysis Studio - PyScript Module
Python code that runs in the browser via WebAssembly
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('module://matplotlib_pyodide.html5_canvas_backend')
import matplotlib.pyplot as plt
import io
import base64
from scipy import stats
import statsmodels.api as sm
from statsmodels.stats.diagnostic import het_breuschpagan
from js import window, Object, console
from pyodide.ffi import to_js, create_proxy
import json

# Store data in memory (cleared when page closes)
_sessions = {}
_cleaned_sessions = {}


def create_response(data):
    """Convert Python dict to JavaScript object"""
    return to_js(data, dict_converter=Object.fromEntries)


def upload_file_handler(file_content, file_name):
    """
    Handle CSV file upload
    Returns validation results
    """
    try:
        # Read CSV from string
        df = pd.read_csv(io.StringIO(file_content))

        # Generate session token
        session_token = f"session_{np.random.randint(1000000, 9999999)}"
        _sessions[session_token] = df

        # Validation results
        validation_results = {
            "missing_data": {},
            "type_mismatches": {},
            "categorical_flags": []
        }

        # Check for missing data
        for col in df.columns:
            missing_count = df[col].isnull().sum()
            if missing_count > 0:
                validation_results["missing_data"][col] = int(missing_count)

        # Check for type mismatches and categorical columns
        for col in df.columns:
            try:
                pd.to_numeric(df[col], errors='raise')
            except (ValueError, TypeError):
                if df[col].dtype == 'object':
                    validation_results["categorical_flags"].append(col)
                else:
                    numeric_mask = pd.to_numeric(df[col], errors='coerce').notna()
                    non_null_mask = df[col].notna()
                    mismatch_indices = df[~numeric_mask & non_null_mask].index.tolist()
                    if mismatch_indices:
                        validation_results["type_mismatches"][col] = mismatch_indices[:10]

        # Prepare preview
        preview = df.head(5).replace({np.nan: None}).to_dict('records')

        result = {
            "session_token": session_token,
            "columns": df.columns.tolist(),
            "validation_results": validation_results,
            "row_count": len(df),
            "preview": preview
        }

        return create_response(result)

    except Exception as e:
        return create_response({"error": str(e)})


def clean_data_handler(session_token, decisions):
    """
    Clean data based on user decisions
    """
    try:
        if session_token not in _sessions:
            return create_response({"error": "Session not found"})

        df = _sessions[session_token].copy()

        # Convert JS object to Python dict
        if hasattr(decisions, 'object_entries'):
            decisions = dict(decisions.object_entries())

        for column, decision in decisions.items():
            if column not in df.columns:
                continue

            if decision == "delete_rows":
                df = df.dropna(subset=[column])
            elif decision == "impute_mean":
                df[column] = pd.to_numeric(df[column], errors='coerce')
                df[column].fillna(df[column].mean(), inplace=True)
            elif decision == "impute_median":
                df[column] = pd.to_numeric(df[column], errors='coerce')
                df[column].fillna(df[column].median(), inplace=True)
            elif decision == "forward_fill":
                df[column].fillna(method='ffill', inplace=True)
            elif decision == "drop_column":
                df = df.drop(columns=[column])
            elif decision == "convert_to_numeric":
                df[column] = pd.to_numeric(df[column], errors='coerce')

        # Store cleaned data
        _cleaned_sessions[session_token] = df

        # Prepare preview
        preview = df.head(5).replace({np.nan: None}).to_dict('records')

        result = {
            "columns": df.columns.tolist(),
            "preview": preview
        }

        return create_response(result)

    except Exception as e:
        return create_response({"error": str(e)})


def get_descriptive_stats_handler(session_token, dependent_var, independent_vars):
    """
    Calculate descriptive statistics
    """
    try:
        if session_token not in _cleaned_sessions:
            return create_response({"error": "Cleaned session not found"})

        df = _cleaned_sessions[session_token]

        # Convert JS array to Python list
        if hasattr(independent_vars, 'to_py'):
            independent_vars = independent_vars.to_py()

        variables = [dependent_var] + list(independent_vars)
        stats_result = {}

        for var in variables:
            if var not in df.columns:
                continue

            series = pd.to_numeric(df[var], errors='coerce').dropna()

            if len(series) == 0:
                continue

            # Calculate outliers using IQR method
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            outliers = series[(series < Q1 - 1.5 * IQR) | (series > Q3 + 1.5 * IQR)]

            stats_result[var] = {
                "mean": float(series.mean()),
                "median": float(series.median()),
                "std_dev": float(series.std()),
                "min": float(series.min()),
                "max": float(series.max()),
                "skewness": float(series.skew()),
                "kurtosis": float(series.kurtosis()),
                "outliers_count": len(outliers)
            }

        return create_response(stats_result)

    except Exception as e:
        return create_response({"error": str(e)})


def generate_plots_handler(session_token, variables):
    """
    Generate distribution plots
    """
    try:
        if session_token not in _cleaned_sessions:
            return create_response({"error": "Cleaned session not found"})

        df = _cleaned_sessions[session_token]

        # Convert JS array to Python list
        if hasattr(variables, 'to_py'):
            variables = variables.to_py()

        plot_urls = []

        for var in variables:
            if var not in df.columns:
                continue

            series = pd.to_numeric(df[var], errors='coerce').dropna()

            if len(series) == 0:
                continue

            # Use Agg backend explicitly for PyScript
            import matplotlib
            matplotlib.use('Agg')  # Force non-interactive backend

            # Create figure with two subplots
            fig, axes = plt.subplots(1, 2, figsize=(12, 5))
            fig.suptitle(f'Distribution of {var}', fontsize=16, fontweight='bold')

            # Histogram
            axes[0].hist(series, bins=30, edgecolor='black', alpha=0.7, color='steelblue')
            axes[0].set_xlabel(var)
            axes[0].set_ylabel('Frequency')
            axes[0].set_title('Histogram')
            axes[0].grid(True, alpha=0.3)

            # Add KDE on secondary axis
            ax_kde = axes[0].twinx()
            series.plot.kde(ax=ax_kde, color='red', linewidth=2)
            ax_kde.set_ylabel('Density', color='red')
            ax_kde.tick_params(axis='y', labelcolor='red')

            # Box plot
            axes[1].boxplot(series, vert=True)
            axes[1].set_ylabel(var)
            axes[1].set_title('Box Plot')
            axes[1].grid(True, alpha=0.3)

            # Add statistics text
            stats_text = f"Mean: {series.mean():.2f}\nMedian: {series.median():.2f}\nStd: {series.std():.2f}"
            axes[1].text(0.02, 0.98, stats_text, transform=axes[1].transAxes,
                        verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

            plt.tight_layout()

            # Convert plot to base64 string using Agg backend
            buffer = io.BytesIO()

            try:
                # Force matplotlib to render to the buffer
                plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
                buffer.seek(0)

                # Encode to base64
                image_data = buffer.read()
                if len(image_data) > 0:
                    image_base64 = base64.b64encode(image_data).decode('utf-8')
                    plot_urls.append(f"data:image/png;base64,{image_base64}")
                else:
                    console.error("[Python] Empty plot buffer")

            except Exception as save_error:
                console.error(f"[Python] Plot save error: {str(save_error)}")
                import traceback
                console.error(traceback.format_exc())
            finally:
                plt.close(fig)

        result = {"plot_urls": plot_urls}
        return create_response(result)

    except Exception as e:
        import traceback
        console.error(f"[Python] Plot generation error: {str(e)}")
        console.error(traceback.format_exc())
        return create_response({"error": str(e)})


def run_ols_analysis_handler(session_token, dependent_var, independent_vars, model_name):
    """
    Run OLS regression analysis
    """
    try:
        if session_token not in _cleaned_sessions:
            return create_response({"error": "Cleaned session not found"})

        df = _cleaned_sessions[session_token]

        # Convert JS array to Python list
        if hasattr(independent_vars, 'to_py'):
            independent_vars = independent_vars.to_py()

        # Prepare data
        y = pd.to_numeric(df[dependent_var], errors='coerce').dropna()
        X_data = df[list(independent_vars)].apply(pd.to_numeric, errors='coerce')

        # Align X and y indices
        common_idx = y.index.intersection(X_data.dropna().index)
        y = y.loc[common_idx]
        X_data = X_data.loc[common_idx]

        # Add constant
        X = sm.add_constant(X_data)

        # Fit model
        model = sm.OLS(y, X)
        results = model.fit()

        # Extract coefficients
        coefficients = {}
        for i, var in enumerate(X.columns):
            coefficients[var] = {
                "coefficient": float(results.params[i]),
                "std_error": float(results.bse[i]),
                "t_statistic": float(results.tvalues[i]),
                "p_value": float(results.pvalues[i])
            }

        # Check for warnings
        warnings = []

        # Check condition number for multicollinearity
        if results.condition_number > 30:
            warnings.append(f"High multicollinearity detected (Condition Number: {results.condition_number:.1f}). Results may be unreliable.")

        # Check for heteroscedasticity
        try:
            bp_test = het_breuschpagan(results.resid, results.model.exog)
            if bp_test[1] < 0.05:
                warnings.append("Heteroscedasticity detected (Breusch-Pagan test p < 0.05). Consider using robust standard errors.")
        except:
            pass

        result = {
            "model_name": model_name,
            "coefficients": coefficients,
            "r_squared": float(results.rsquared),
            "adj_r_squared": float(results.rsquared_adj),
            "f_statistic": float(results.fvalue),
            "f_p_value": float(results.f_pvalue),
            "warnings": warnings
        }

        return create_response(result)

    except Exception as e:
        return create_response({"error": str(e)})


def end_session_handler(session_token):
    """
    Delete session data
    """
    try:
        if session_token in _sessions:
            del _sessions[session_token]
        if session_token in _cleaned_sessions:
            del _cleaned_sessions[session_token]

        return create_response({"status": "Session deleted successfully"})

    except Exception as e:
        return create_response({"error": str(e)})


# Expose functions to JavaScript with error wrapping
def safe_wrapper(func):
    """Wrap functions to catch and log errors"""
    def wrapper(*args, **kwargs):
        try:
            console.log(f"[Python] Calling {func.__name__} with args:", args)
            result = func(*args, **kwargs)
            console.log(f"[Python] {func.__name__} completed successfully")
            return result
        except Exception as e:
            console.error(f"[Python] Error in {func.__name__}:", str(e))
            import traceback
            console.error(f"[Python] Traceback:", traceback.format_exc())
            return create_response({"error": f"{func.__name__}: {str(e)}"})
    return wrapper

window.pyUploadFile = create_proxy(safe_wrapper(upload_file_handler))
window.pyCleanData = create_proxy(safe_wrapper(clean_data_handler))
window.pyGetDescriptiveStats = create_proxy(safe_wrapper(get_descriptive_stats_handler))
window.pyGeneratePlots = create_proxy(safe_wrapper(generate_plots_handler))
window.pyRunOlsAnalysis = create_proxy(safe_wrapper(run_ols_analysis_handler))
window.pyEndSession = create_proxy(safe_wrapper(end_session_handler))

# Signal that Python is ready
window.pyAnalysisReady = True
console.log("[Python] ✅ OLS Analysis Studio - Python module loaded successfully!")
print("OLS Analysis Studio - Python module loaded successfully!")
